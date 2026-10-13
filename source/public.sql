-- Site public, sans mot de passe du site (à coller dans Supabase > SQL Editor, puis Run). Peut être relancé sans risque : garde toutes les données.
-- CE QUI CHANGE :
--   * Le mot de passe du site (p_code) n'est plus demandé : chaque fonction garde EXACTEMENT ses paramètres (p_code reste le 1er), mais l'ignore.
--     Le nouveau site envoie p_code = ''. Exceptions : login_email (ancienne connexion par pseudo) et get_errors (outil d'admin) l'exigent encore ;
--     le mot de passe reste dans club.pass_hash, jamais publié.
--   * C'est le COMPTE (Supabase Auth, auth.uid()) qui ouvre les portes :
--       - lire ou écrire dans une salle : être connecté ET avoir un pseudo du compte membre de la salle (sinon « connexion requise » / « membre requis ») ;
--         le code de salle n'est plus demandé à un membre ; il sert seulement à REJOINDRE (join_room), sauf si un autre pseudo du même compte
--         est déjà membre (famille) ;
--       - agir au nom d'un pseudo : le pseudo doit appartenir au compte connecté (« compte requis : NOM »), plus de « pseudo sans compte = libre » ;
--       - list_rooms ne montre que les salles du compte ; find_room cherche une salle par son nom exact (30 essais / 10 min par compte).
--   * Public (sans connexion) : check_name (sans photo ni cri, sauf pour soi ou un copain de salle), get_world_scores, log_error (20 / min
--     sans connexion), login_name (e-mail du compte seulement avec le BON mot de passe du compte), recover_hint (e-mail masqué).
--   * Direct (Supabase Realtime) : canaux PRIVÉS, règles sur realtime.messages (jdw-room-<id> : membres ; jdw-all et jdw-duel-<code> : connectés).
-- ORDRE : appliquer ce fichier AVANT de publier le nouveau site.
--   PUBLIER LE SITE 1.7 JUSTE APRÈS (dans les minutes qui suivent) : les vieux appareils (site 1.6) connectés à un compte peuvent encore
--   enregistrer (scores, chat, tête…), mais leurs LECTURES de salle (classement, joueurs, chat) partaient sans jeton : refusées jusqu'à ce
--   qu'ils rechargent le site 1.7 (automatique dès la publication, quand l'appareil est au calme).
--   Les profils sans compte perdent l'accès aux salles (il faut créer un compte et protéger son pseudo).
--   APRÈS la mise en ligne du nouveau site : Supabase > Realtime > Settings, désactiver « Allow public access » (sinon les canaux publics restent ouverts).
-- Si members.sql, room-look.sql, progress.sql, accounts.sql ou turn.sql sont relancés seuls APRÈS ce fichier, relancer ce fichier ensuite.

-- essais de find_room (anti-devinette des noms de salle) : illisible depuis le site
create table if not exists public.room_tries (
  uid uuid not null,
  at timestamptz not null default now()
);
create index if not exists room_tries_idx on public.room_tries (uid, at);
alter table public.room_tries enable row level security;
revoke all on public.room_tries from anon, authenticated;

-- erreurs envoyées sans connexion (limite à part : 20 par minute)
alter table public.errors add column if not exists anon boolean not null default false;

-- ---- aides (internes, jamais appelables depuis le site) ----

-- vrai si le pseudo appartient au compte connecté
create or replace function public.acct_own(p_name text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select auth.uid() is not null and exists (select 1 from public.players p
    where p.name = upper(left(trim(coalesce(p_name, '')), 12)) and p.user_id = auth.uid());
$$;
-- gardée pour compatibilité : désormais identique à acct_own (plus de pseudo libre sans compte)
create or replace function public.acct_ok(p_name text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select public.acct_own(p_name);
$$;
create or replace function public.acct_check(p_name text) returns void
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.acct_own(p_name) then raise exception 'compte requis : %', upper(left(trim(coalesce(p_name, '')), 12)); end if;
end $$;
-- vrai si un pseudo du compte connecté est membre de la salle
create or replace function public.room_access(p_room bigint) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select auth.uid() is not null and exists (select 1 from public.room_members m join public.players p on p.name = m.name
    where m.room_id = p_room and p.user_id = auth.uid());
$$;
create or replace function public.room_guard(p_room bigint) returns void
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  if not public.room_access(p_room) then raise exception 'membre requis'; end if;
end $$;
revoke all on function public.acct_own(text), public.acct_ok(text), public.acct_check(text), public.room_access(bigint), public.room_guard(bigint)
  from public, anon, authenticated;

-- ---- lectures d'une salle : membres (par un pseudo du compte) seulement ----

create or replace function public.get_scores(p_code text, p_room bigint, p_room_code text)
returns table(r_game text, r_name text, r_score int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  return query
    select t.game, t.name, t.score, t.created_at from (
      select b.game, b.name, b.score, b.created_at,
             row_number() over (partition by b.game order by b.score desc, b.created_at) as rn
      from (select distinct on (s.game, s.name) s.game, s.name, s.score, s.created_at
            from public.scores s
            where s.room_id = p_room and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = s.name)
            order by s.game, s.name, s.score desc, s.created_at) b) t
    where t.rn <= 10;
end $$;

create or replace function public.get_players(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_photo text, r_updated timestamptz, r_sound text, r_seen timestamptz, r_game text, r_version text, r_alias text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  return query
    select m.name, coalesce(m.photo, case when pl.consent then pl.photo end),
      greatest(coalesce(pl.updated_at, m.joined_at), m.look_at), coalesce(m.sound, pl.sound), m.last_seen,
      (select pr.game from public.presence pr where pr.room_id = p_room and pr.name = m.name and pr.seen_at > now() - interval '45 seconds'
        order by pr.seen_at desc limit 1), m.last_version, m.alias
    from public.room_members m left join public.players pl on pl.name = m.name
    where m.room_id = p_room;
end $$;

create or replace function public.get_presence(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_updated timestamptz, r_seen timestamptz, r_game text, r_version text, r_alias text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  return query
    select m.name, greatest(coalesce(pl.updated_at, m.joined_at), m.look_at), m.last_seen,
      (select pr.game from public.presence pr where pr.room_id = p_room and pr.name = m.name and pr.seen_at > now() - interval '45 seconds'
        order by pr.seen_at desc limit 1), m.last_version, m.alias
    from public.room_members m left join public.players pl on pl.name = m.name
    where m.room_id = p_room;
end $$;

create or replace function public.get_messages(p_code text, p_room bigint, p_room_code text, p_after bigint)
returns table(r_id bigint, r_name text, r_body text, r_kind text, r_game text, r_score int, r_beaten text, r_beaten_score int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  if coalesce(p_after, 0) = 0 then
    return query select * from (
      select m.id, m.name, m.body, m.kind, m.game, m.score, m.beaten, m.beaten_score, m.created_at
      from public.messages m where m.room_id = p_room order by m.id desc limit 80) t order by 1;
  else
    return query select m.id, m.name, m.body, m.kind, m.game, m.score, m.beaten, m.beaten_score, m.created_at
      from public.messages m where m.room_id = p_room and m.id > p_after order by m.id limit 100;
  end if;
end $$;

create or replace function public.get_reactions(p_code text, p_room bigint, p_room_code text)
returns table(r_message bigint, r_emoji text, r_names text[])
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  return query
    select r.message_id, r.emoji, array_agg(r.name order by r.created_at)
    from public.reactions r
    where r.message_id in (select x.id from public.messages x where x.room_id = p_room order by x.id desc limit 150)
    group by r.message_id, r.emoji;
end $$;

create or replace function public.get_progress(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_game text, r_level int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  return query
    select g.name, g.game, g.level, g.at from public.progress g
    where g.room_id = p_room and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = g.name)
    order by g.game, g.level desc, g.at;
end $$;

-- les notifications d'un pseudo : seulement pour son compte (rien sinon, sans erreur)
create or replace function public.get_notifications(p_code text, p_room bigint, p_room_code text, p_name text)
returns table(r_id bigint, r_actor text, r_game text, r_score int, r_prev int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  if not public.acct_own(p_name) then return; end if;
  return query
    select x.id, x.actor, x.game, x.score, x.prev, x.created_at from public.notifications x
    where x.room_id = p_room and x.target = upper(left(trim(coalesce(p_name, '')), 12)) and x.created_at > now() - interval '30 days'
    order by x.id desc limit 30;
end $$;

-- ---- écritures dans une salle : le pseudo doit être au compte connecté ET membre de la salle ----

-- un pseudo qui n'est pas (ou plus) membre : rien d'enregistré, sans erreur (les files d'attente des appareils se vident)
create or replace function public.add_score(p_code text, p_room bigint, p_room_code text, p_game text, p_name text, p_score int)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); v_prev int; v_top int; v_top_name text;
begin
  perform public.room_guard(p_room);
  perform public.acct_check(n);
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then return; end if;
  -- records de la salle : seulement entre membres actuels
  select s.score, s.name into v_top, v_top_name from public.scores s where s.room_id = p_room and s.game = p_game and s.name <> n
    and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = s.name)
    order by s.score desc, s.created_at limit 1;
  select max(s.score) into v_prev from public.scores s where s.room_id = p_room and s.game = p_game and s.name = n;
  -- prévient les joueurs que ce score vient de dépasser (ceux qui étaient devant ou à égalité avant)
  if v_prev is null or p_score > v_prev then
    insert into public.notifications (room_id, target, actor, game, score, prev)
      select p_room, b.name, n, p_game, p_score, b.best
      from (select s.name, max(s.score) as best from public.scores s
            where s.room_id = p_room and s.game = p_game and s.name <> n
              and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = s.name) group by s.name) b
      where b.best > 0 and b.best < p_score and b.best >= coalesce(v_prev, 0);
    -- nouveau record de la salle : annoncé dans le chat
    if v_top is not null and v_top > 0 and p_score > v_top and v_top >= coalesce(v_prev, 0) then
      insert into public.messages (room_id, name, body, kind, game, score, beaten, beaten_score)
        values (p_room, n, n || ' a battu le record de ' || v_top_name, 'record', p_game, p_score, v_top_name, v_top);
    end if;
  end if;
  insert into public.scores (room_id, game, name, score) values (p_room, p_game, n, p_score);
  -- un seul meilleur score par joueur, par jeu et par salle
  delete from public.scores s where s.room_id = p_room and s.game = p_game and s.name = n and s.id <> (
    select x.id from public.scores x where x.room_id = p_room and x.game = p_game and x.name = n
    order by x.score desc, x.created_at limit 1);
  delete from public.notifications where created_at < now() - interval '60 days';
end $$;

create or replace function public.post_message(p_code text, p_room bigint, p_room_code text, p_name text, p_body text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); b text := left(trim(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]+', ' ', 'g')), 300); mid bigint;
begin
  perform public.room_guard(p_room);
  if n = '' or b = '' then raise exception 'message vide'; end if;
  perform public.acct_check(n);
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then raise exception 'membre requis'; end if;
  if (select count(*) from public.messages m where m.room_id = p_room and m.name = n and m.created_at > now() - interval '10 seconds') >= 5
    then raise exception 'trop de messages'; end if;
  insert into public.messages (room_id, name, body) values (p_room, n, b) returning id into mid;
  delete from public.messages where created_at < now() - interval '90 days';
  return mid;
end $$;

create or replace function public.react(p_code text, p_room bigint, p_room_code text, p_message bigint, p_name text, p_emoji text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); e text := left(trim(coalesce(p_emoji, '')), 16);
begin
  perform public.room_guard(p_room);
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then raise exception 'membre requis'; end if;
  if not exists (select 1 from public.messages m where m.id = p_message and m.room_id = p_room) then raise exception 'message inconnu'; end if;
  if e = '' then
    delete from public.reactions r where r.message_id = p_message and r.name = n;
  else
    insert into public.reactions (message_id, name, emoji) values (p_message, n, e)
      on conflict (message_id, name) do update set emoji = excluded.emoji, created_at = now();
  end if;
end $$;

-- ne touche qu'à un membre existant
create or replace function public.save_room_look(p_code text, p_room bigint, p_room_code text, p_name text, p_photo text default null, p_sound text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  perform public.room_guard(p_room);
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if p_photo is not null and p_photo <> '' and (p_photo !~ '^data:image/' or char_length(p_photo) >= 400000) then raise exception 'photo invalide'; end if;
  if p_sound is not null and p_sound <> '' and (p_sound !~ '^data:audio/' or char_length(p_sound) >= 300000) then raise exception 'son invalide'; end if;
  update public.room_members m set
    photo = case when p_photo is null then m.photo else nullif(p_photo, '') end,
    sound = case when p_sound is null then m.sound else nullif(p_sound, '') end,
    look_at = now()
  where m.room_id = p_room and m.name = n;
end $$;

create or replace function public.save_room_alias(p_code text, p_room bigint, p_room_code text, p_name text, p_alias text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
  a text := upper(left(trim(regexp_replace(coalesce(p_alias, ''), '[[:cntrl:]<>]', '', 'g')), 12));
begin
  perform public.room_guard(p_room);
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then raise exception 'pas membre de la salle'; end if;
  if a = '' or a = n then a := null; end if;
  if a is not null then
    if char_length(a) < 2 then raise exception 'pseudo de salle trop court'; end if;
    if exists (select 1 from public.room_members m where m.room_id = p_room and m.name <> n and (m.name = a or m.alias = a)) then
      raise exception 'pseudo de salle deja pris';
    end if;
  end if;
  update public.room_members m set alias = a, look_at = now() where m.room_id = p_room and m.name = n;
  return a;
end $$;

-- renvoie le meilleur niveau gardé pour ce joueur et ce jeu (null : pas membre de la salle, rien d'enregistré)
create or replace function public.save_progress(p_code text, p_room bigint, p_room_code text, p_name text, p_game text, p_level int) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); v int;
begin
  perform public.room_guard(p_room);
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if p_game is null or p_game !~ '^[a-z0-9_-]{2,20}$' then raise exception 'jeu invalide'; end if;
  if p_level is null or p_level < 1 or p_level > 9999 then raise exception 'niveau invalide'; end if;
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then return null; end if;
  insert into public.progress as g (room_id, name, game, level, at) values (p_room, n, p_game, p_level, now())
    on conflict (room_id, name, game) do update set level = excluded.level, at = excluded.at
    where excluded.level > g.level;
  select g.level into v from public.progress g where g.room_id = p_room and g.name = n and g.game = p_game;
  return v;
end $$;

-- p_by (celui qui retire) doit être au compte connecté ; le créateur retire n'importe qui, chacun peut se retirer lui-même
create or replace function public.remove_member(p_code text, p_room bigint, p_room_code text, p_name text, p_by text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); b text := upper(left(trim(coalesce(p_by, '')), 12)); o text;
  mode text := public.member_purge_mode(); was boolean;
begin
  perform public.room_guard(p_room);
  if n = '' or b = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(b);
  select r.owner into o from public.rooms r where r.id = p_room;
  if b <> n and b is distinct from upper(o) then raise exception 'seul le createur de la salle peut retirer un joueur'; end if;
  delete from public.room_members m where m.room_id = p_room and m.name = n;   -- emporte aussi la tête et le cri de salle
  was := found;
  delete from public.presence pr where pr.room_id = p_room and pr.name = n;
  if mode in ('salle', 'tout') then
    if mode = 'salle' then   -- le meilleur score de chaque jeu reste au classement mondial
      insert into public.world_bests (game, name, score, created_at)
        select distinct on (s.game) s.game, s.name, s.score, s.created_at from public.scores s
        where s.room_id = p_room and s.name = n order by s.game, s.score desc, s.created_at
      on conflict (game, name) do update set score = excluded.score, created_at = excluded.created_at
        where excluded.score > public.world_bests.score;
    end if;
    delete from public.scores s where s.room_id = p_room and s.name = n;
    delete from public.notifications x where x.room_id = p_room and (x.target = n or x.actor = n);
    delete from public.reactions r where r.name = n and r.message_id in (select m.id from public.messages m where m.room_id = p_room);
    delete from public.messages m where m.room_id = p_room and m.name = n;   -- les réactions reçues partent avec (cascade)
    delete from public.progress g where g.room_id = p_room and g.name = n;   -- carte d'avancement
  end if;
  return was;
end $$;

-- ---- salles : créer, rejoindre, lister, chercher ----

create or replace function public.create_room(p_code text, p_name text, p_room_code text, p_owner text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare rid bigint; n text := left(trim(coalesce(p_name, '')), 24); o text := upper(left(trim(coalesce(p_owner, '')), 12));
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  perform public.acct_check(o);
  if char_length(n) < 2 then raise exception 'nom de salle trop court'; end if;
  if exists (select 1 from public.rooms x where upper(x.name) = upper(n)) then raise exception 'cette salle existe deja'; end if;
  insert into public.rooms (name, code_hash, owner)
    values (n, case when coalesce(trim(p_room_code), '') = '' then null else crypt(trim(p_room_code), gen_salt('bf')) end, o)
    returning id into rid;
  insert into public.room_members (room_id, name) values (rid, o) on conflict do nothing;
  return rid;
end $$;

-- le code de salle est exigé, sauf si un autre pseudo du même compte est déjà membre (famille) ; false : mauvais code (ou salle inconnue)
create or replace function public.join_room(p_code text, p_room bigint, p_room_code text, p_name text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  perform public.acct_check(p_name);
  if not exists (select 1 from public.rooms r where r.id = p_room) then return false; end if;
  if not public.room_access(p_room) and not public.room_ok(p_room, p_room_code) then return false; end if;
  insert into public.room_members (room_id, name) values (p_room, upper(left(trim(coalesce(p_name, '')), 12))) on conflict do nothing;
  return true;
end $$;

-- seulement les salles du compte connecté (un de ses pseudos est membre) ; rien sans connexion
create or replace function public.list_rooms(p_code text, p_name text default null)
returns table(r_id bigint, r_name text, r_private boolean, r_owner text, r_members int, r_online int, r_member boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then return; end if;
  return query
    select r.id, r.name, r.code_hash is not null, r.owner,
      (select count(*)::int from public.room_members m where m.room_id = r.id),
      (select count(*)::int from public.presence pr where pr.room_id = r.id and pr.seen_at > now() - interval '45 seconds'),
      exists (select 1 from public.room_members m where m.room_id = r.id and m.name = upper(left(trim(coalesce(p_name, '')), 12)))
    from public.rooms r
    where exists (select 1 from public.room_members m join public.players p on p.name = m.name where m.room_id = r.id and p.user_id = auth.uid())
    order by r.created_at;
end $$;

drop function if exists public.find_room(text, text);
-- chercher une salle par son nom exact (sans casse) pour la rejoindre ; r_member : un pseudo du compte en fait partie
create function public.find_room(p_code text, p_room_name text)
returns table(r_id bigint, r_name text, r_private boolean, r_owner text, r_members int, r_online int, r_member boolean)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare u uuid := auth.uid(); n text := upper(trim(coalesce(p_room_name, '')));
begin
  if u is null then raise exception 'connexion requise'; end if;
  if (select count(*) from public.room_tries t where t.uid = u and t.at > now() - interval '10 minutes') >= 30 then raise exception 'trop d essais'; end if;
  insert into public.room_tries (uid) values (u);
  delete from public.room_tries where at < now() - interval '1 day';
  if n = '' then return; end if;
  return query
    select r.id, r.name, r.code_hash is not null, r.owner,
      (select count(*)::int from public.room_members m where m.room_id = r.id),
      (select count(*)::int from public.presence pr where pr.room_id = r.id and pr.seen_at > now() - interval '45 seconds'),
      exists (select 1 from public.room_members m join public.players p on p.name = m.name where m.room_id = r.id and p.user_id = u)
    from public.rooms r where upper(r.name) = n;
end $$;

-- ---- présence ----

-- connecté obligatoire ; le nom n'est gardé que s'il est au compte ; hors de ses salles : compté sans salle, rien renvoyé
create or replace function public.heartbeat(p_code text, p_room bigint, p_client text, p_name text, p_game text, p_version text default null)
returns table(r_game text, r_count int)
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); ok boolean;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  if not public.acct_own(n) then n := null; end if;
  ok := public.room_access(p_room);
  insert into public.presence (client_id, room_id, name, game, seen_at)
    values (left(p_client, 40), case when ok then p_room end, n, left(coalesce(p_game, 'menu'), 20), now())
  on conflict (client_id) do update set room_id = excluded.room_id, name = excluded.name, game = excluded.game, seen_at = now();
  delete from public.presence where seen_at < now() - interval '3 minutes';
  if not ok then return; end if;
  if n is not null then
    update public.room_members m set last_seen = now(), last_version = coalesce(left(p_version, 40), m.last_version)
      where m.room_id = p_room and m.name = n;
  end if;
  return query select pr.game, count(*)::int from public.presence pr
    where pr.room_id = p_room and pr.seen_at > now() - interval '45 seconds' group by pr.game;
end $$;

-- ---- joueurs et comptes ----

create or replace function public.save_player(p_code text, p_name text, p_photo text, p_consent boolean, p_sound text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if p_sound is not null and p_sound <> '' and p_sound !~ '^data:audio/' then raise exception 'son invalide'; end if;
  insert into public.players (name, photo, consent, sound, updated_at)
    values (n, case when coalesce(p_consent, false) then p_photo end, coalesce(p_consent, false), nullif(p_sound, ''), now())
  on conflict (name) do update set photo = excluded.photo, consent = excluded.consent,
    sound = case when p_sound is null then public.players.sound else nullif(p_sound, '') end, updated_at = now();
end $$;

-- public : le pseudo existe-t-il, a-t-il un compte ; tête et cri seulement pour soi ou un copain de salle (jamais au public)
create or replace function public.check_name(p_code text, p_name text)
returns table(r_exists boolean, r_photo text, r_sound text, r_protected boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); see boolean;
begin
  see := auth.uid() is not null and (public.acct_own(n) or exists (
    select 1 from public.room_members a join public.players p on p.name = a.name
      join public.room_members b on b.room_id = a.room_id
    where p.user_id = auth.uid() and b.name = n));
  return query select
    exists (select 1 from public.players p where p.name = n) or exists (select 1 from public.room_members m where m.name = n)
      or exists (select 1 from public.scores s where s.name = n),
    case when see then (select case when p.consent then p.photo end from public.players p where p.name = n) end,
    case when see then (select p.sound from public.players p where p.name = n) end,
    exists (select 1 from public.players p where p.name = n and p.user_id is not null);
end $$;

-- lie le pseudo au compte connecté ; renvoie 'nouveau' (pseudo créé), 'protege' (pseudo existant protégé) ou 'deja' (déjà à ce compte)
create or replace function public.claim_name(p_code text, p_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>]', '', 'g')), 12)); u uuid := auth.uid();
  owner uuid; existed boolean;
begin
  if u is null then raise exception 'connexion requise'; end if;
  if char_length(n) < 2 then raise exception 'nom trop court'; end if;
  select p.user_id into owner from public.players p where p.name = n;
  if owner = u then return 'deja'; end if;
  if owner is null and (select count(*) from public.players p where p.user_id = u) >= 20 then raise exception 'trop de joueurs sur ce compte'; end if;
  existed := exists (select 1 from public.players p where p.name = n) or exists (select 1 from public.room_members m where m.name = n)
    or exists (select 1 from public.scores s where s.name = n);
  insert into public.players as pl (name, consent, user_id, updated_at) values (n, false, u, now())
    on conflict (name) do update set user_id = u where pl.user_id is null;
  if not found then raise exception 'pseudo deja protege'; end if;
  return case when existed then 'protege' else 'nouveau' end;
end $$;

create or replace function public.get_my_players(p_code text)
returns table(r_name text, r_photo text, r_consent boolean, r_sound text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  return query select p.name, case when p.consent then p.photo end, p.consent, p.sound
    from public.players p where auth.uid() is not null and p.user_id = auth.uid() order by p.name;
end $$;

-- connexion avec le pseudo : l'e-mail du compte, SEULEMENT avec le bon mot de passe du compte (sinon null) ; essais limités
-- (login_email, gardée pour les vieux appareils, exige encore le mot de passe du site : elle n'est pas modifiée ici)
drop function if exists public.login_name(text, text, text);
create function public.login_name(p_code text, p_name text, p_password text) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); e text;
begin
  if n = '' then return null; end if;
  if (select count(*) from public.login_tries t where t.name = n and t.at > now() - interval '10 minutes') >= 10
    or (select count(*) from public.login_tries t where t.at > now() - interval '10 minutes') >= 60 then raise exception 'trop d essais'; end if;
  insert into public.login_tries (name) values (n);
  delete from public.login_tries where at < now() - interval '1 day';
  if coalesce(p_password, '') = '' then return null; end if;
  select u.email into e from public.players p join auth.users u on u.id = p.user_id
    where p.name = n and u.encrypted_password is not null and u.encrypted_password <> ''
      and u.encrypted_password = crypt(p_password, u.encrypted_password);
  return e;
end $$;

-- mot de passe oublié depuis le pseudo : l'e-mail MASQUÉ du compte (ex. « be•••@gmail.com »), null sans compte ; essais limités
drop function if exists public.recover_hint(text, text);
create function public.recover_hint(p_code text, p_name text) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); e text;
begin
  if n = '' then return null; end if;
  if (select count(*) from public.login_tries t where t.name = n and t.at > now() - interval '10 minutes') >= 10
    or (select count(*) from public.login_tries t where t.at > now() - interval '10 minutes') >= 60 then raise exception 'trop d essais'; end if;
  insert into public.login_tries (name) values (n);
  delete from public.login_tries where at < now() - interval '1 day';
  select u.email into e from public.players p join auth.users u on u.id = p.user_id where p.name = n;
  if e is null or e !~ '^(.{1,2})[^@]*(@.+)$' then return null; end if;
  return regexp_replace(e, '^(.{1,2})[^@]*(@.+)$', '\1•••\2');
end $$;

-- ---- public ----

-- erreurs des appareils : 60 par minute en tout, 20 par minute sans connexion
create or replace function public.log_error(p_code text, p_name text, p_room bigint, p_game text, p_message text, p_detail text, p_ua text, p_version text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare a boolean := auth.uid() is null;
begin
  if (select count(*) from public.errors e where e.created_at > now() - interval '1 minute') > 60 then return; end if;   -- anti-avalanche
  if a and (select count(*) from public.errors e where e.anon and e.created_at > now() - interval '1 minute') >= 20 then return; end if;
  insert into public.errors (name, room_id, game, message, detail, ua, version, anon)
    values (upper(left(trim(coalesce(p_name, '')), 12)), p_room, left(p_game, 20), left(p_message, 500), left(p_detail, 4000), left(p_ua, 300), left(p_version, 40), a);
  delete from public.errors where created_at < now() - interval '30 days';
end $$;

-- classement mondial (sans photo) : table scores + meilleurs scores gardés après un retrait (world_bests)
create or replace function public.get_world_scores(p_code text)
returns table(r_game text, r_name text, r_score int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  return query
    select t.game, t.name, t.score, t.created_at from (
      select b.game, b.name, b.score, b.created_at,
             row_number() over (partition by b.game order by b.score desc, b.created_at) as rn
      from (select distinct on (a.game, a.name) a.game, a.name, a.score, a.created_at
            from (select s.game, s.name, s.score, s.created_at from public.scores s
                  union all select w.game, w.name, w.score, w.created_at from public.world_bests w) a
            order by a.game, a.name, a.score desc, a.created_at) b) t
    where t.rn <= 10;
end $$;

-- relais TURN : seulement pour un joueur connecté (seulement si turn.sql a été appliqué : extension http)
do $do$ begin
  if to_regprocedure('public.get_turn(text)') is not null and to_regtype('extensions.http_response') is not null then
    execute $f$
create or replace function public.get_turn(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c public.turn_cfg; r extensions.http_response;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select * into c from public.turn_cfg where id = 1;
  if not found then return null; end if;
  if c.ice is null or c.until < now() + interval '3 hours' then
    r := extensions.http((
      'POST',
      'https://rtc.live.cloudflare.com/v1/turn/keys/' || c.key_id || '/credentials/generate-ice-servers',
      array[extensions.http_header('Authorization', 'Bearer ' || c.token)],
      'application/json',
      '{"ttl": 86400}'
    )::extensions.http_request);
    if r.status in (200, 201) then
      update public.turn_cfg set ice = r.content::jsonb, until = now() + interval '24 hours' where id = 1
        returning * into c;
    elsif c.ice is null then
      return jsonb_build_object('erreur', r.status);
    end if;
  end if;
  return jsonb_build_object('iceServers', c.ice -> 'iceServers', 'until', floor(extract(epoch from c.until) * 1000));
end $$;
$f$;
    execute 'revoke all on function public.get_turn(text) from public';
    execute 'grant execute on function public.get_turn(text) to anon, authenticated';
  end if;
end $do$;

-- ---- droits : toutes les fonctions du site pour anon ET authenticated, rien pour PUBLIC ----
revoke all on function public.list_rooms(text, text), public.get_world_scores(text),
  public.create_room(text, text, text, text), public.join_room(text, bigint, text, text),
  public.get_scores(text, bigint, text), public.add_score(text, bigint, text, text, text, int),
  public.get_players(text, bigint, text), public.save_player(text, text, text, boolean, text),
  public.heartbeat(text, bigint, text, text, text, text), public.get_notifications(text, bigint, text, text),
  public.get_messages(text, bigint, text, bigint), public.post_message(text, bigint, text, text, text),
  public.check_name(text, text), public.log_error(text, text, bigint, text, text, text, text, text), public.get_presence(text, bigint, text),
  public.react(text, bigint, text, bigint, text, text), public.get_reactions(text, bigint, text),
  public.save_room_look(text, bigint, text, text, text, text), public.save_room_alias(text, bigint, text, text, text),
  public.remove_member(text, bigint, text, text, text), public.save_progress(text, bigint, text, text, text, int), public.get_progress(text, bigint, text),
  public.claim_name(text, text), public.get_my_players(text), public.login_email(text, text),
  public.find_room(text, text), public.login_name(text, text, text), public.recover_hint(text, text) from public;
grant execute on function public.list_rooms(text, text), public.get_world_scores(text),
  public.create_room(text, text, text, text), public.join_room(text, bigint, text, text),
  public.get_scores(text, bigint, text), public.add_score(text, bigint, text, text, text, int),
  public.get_players(text, bigint, text), public.save_player(text, text, text, boolean, text),
  public.heartbeat(text, bigint, text, text, text, text), public.get_notifications(text, bigint, text, text),
  public.get_messages(text, bigint, text, bigint), public.post_message(text, bigint, text, text, text),
  public.check_name(text, text), public.log_error(text, text, bigint, text, text, text, text, text), public.get_presence(text, bigint, text),
  public.react(text, bigint, text, bigint, text, text), public.get_reactions(text, bigint, text),
  public.save_room_look(text, bigint, text, text, text, text), public.save_room_alias(text, bigint, text, text, text),
  public.remove_member(text, bigint, text, text, text), public.save_progress(text, bigint, text, text, text, int), public.get_progress(text, bigint, text),
  public.claim_name(text, text), public.get_my_players(text), public.login_email(text, text),
  public.find_room(text, text), public.login_name(text, text, text), public.recover_hint(text, text) to anon, authenticated;

-- ---- Direct (Supabase Realtime Authorization) : canaux PRIVÉS ----
-- jdw-room-<id> : un pseudo du compte connecté est membre de la salle ; jdw-all et jdw-duel-<code> : tout joueur connecté ; le reste : refusé.
create or replace function public.rt_topic_ok(p_topic text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare t text := regexp_replace(coalesce(p_topic, ''), '^realtime:', ''); m text[];
begin
  if auth.uid() is null then return false; end if;
  if t = 'jdw-all' then return true; end if;
  if t ~ '^jdw-duel-[a-z0-9]{4,12}$' then return true; end if;
  m := regexp_match(t, '^jdw-room-([0-9]{1,18})$');
  if m is not null then return public.room_access(m[1]::bigint); end if;
  return false;
end $$;
revoke all on function public.rt_topic_ok(text) from public, anon;
grant execute on function public.rt_topic_ok(text) to authenticated;

-- règles sur realtime.messages (lire = recevoir broadcast / presence, écrire = envoyer) ; sans schéma realtime : rien à faire
do $do$ begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "jdw lire" on realtime.messages';
    execute 'create policy "jdw lire" on realtime.messages for select to authenticated using (public.rt_topic_ok(realtime.topic()))';
    execute 'drop policy if exists "jdw ecrire" on realtime.messages';
    execute 'create policy "jdw ecrire" on realtime.messages for insert to authenticated with check (public.rt_topic_ok(realtime.topic()))';
  end if;
end $do$;
