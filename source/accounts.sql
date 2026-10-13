-- Comptes des joueurs (à coller dans Supabase > SQL Editor, puis Run). Peut être relancé sans risque.
-- Un pseudo peut être lié à un compte Supabase Auth (e-mail + mot de passe). UN compte peut avoir PLUSIEURS joueurs (ex. PATOU, LOUIS,
-- LÉONIE sur le compte de Benjamin). Le site envoie le jeton du compte connecté (Authorization: Bearer <jeton>, apikey = clé publique)
-- et auth.uid() dit qui appelle. Le mot de passe du site (p_code) reste exigé partout.
--   * pseudo lié à un compte : seules les requêtes de CE compte peuvent agir en son nom (scores, chat, réactions, tête, cri,
--     salles, carte d'avancement, présence) ; les autres reçoivent l'erreur « compte requis ».
--   * pseudo encore sans compte : tout marche comme avant (période de transition).
-- claim_name : lie un pseudo au compte connecté. Pseudo nouveau : lié tout de suite. Pseudo existant SANS compte : le premier compte qui
--   le réclame le protège (le serveur ne peut pas savoir quel appareil l'utilisait avant : voir ACCOUNTS.md, « Risques »). Pseudo déjà
--   lié à un autre compte : refusé. 20 joueurs au plus par compte.
-- get_my_players : les joueurs (pseudo, tête, cri) du compte connecté ; liste vide sans connexion.
-- login_email : l'e-mail du compte d'un pseudo (connexion « e-mail ou pseudo », mot de passe oublié depuis le pseudo) ; rien pour un
--   pseudo sans compte ; essais limités (10 par pseudo et 60 en tout par tranche de 10 minutes).
-- check_name renvoie en plus r_protected (le pseudo a un compte).
-- Les fonctions qui agissent au nom d'un joueur sont recopiées ici (mêmes paramètres, même résultat) avec la vérification en plus :
-- si members.sql, room-look.sql ou progress.sql sont relancés seuls APRÈS ce fichier, relancer ce fichier ensuite.
-- Pour libérer un pseudo (compte perdu, pseudo pris par erreur) : update public.players set user_id = null where name = 'REMS';

alter table public.players add column if not exists user_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'players_user_id_fkey' and conrelid = 'public.players'::regclass) then
    alter table public.players add constraint players_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;
drop index if exists public.players_user_id_uq;          -- plusieurs joueurs par compte
create index if not exists players_user_id_idx on public.players (user_id);

-- essais de login_email (anti-devinette) : illisible depuis le site
create table if not exists public.login_tries (
  id bigint generated always as identity primary key,
  name text not null,
  at timestamptz not null default now()
);
create index if not exists login_tries_idx on public.login_tries (name, at);
alter table public.login_tries enable row level security;
revoke all on public.login_tries from anon, authenticated;

-- vrai si l'appelant peut agir au nom de ce pseudo : pseudo sans compte, ou compte = celui qui appelle
create or replace function public.acct_ok(p_name text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select not exists (select 1 from public.players p where p.name = upper(left(trim(coalesce(p_name, '')), 12))
    and p.user_id is not null and p.user_id is distinct from auth.uid());
$$;
create or replace function public.acct_check(p_name text) returns void
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.acct_ok(p_name) then raise exception 'compte requis : %', upper(left(trim(coalesce(p_name, '')), 12)); end if;
end $$;
revoke all on function public.acct_ok(text), public.acct_check(text) from public, anon, authenticated;

drop function if exists public.claim_name(text, text);
drop function if exists public.get_my_player(text);
drop function if exists public.get_my_players(text);
drop function if exists public.login_email(text, text);
drop function if exists public.check_name(text, text);

-- lie le pseudo au compte connecté ; renvoie 'nouveau' (pseudo créé), 'protege' (pseudo existant protégé) ou 'deja' (déjà à ce compte)
create function public.claim_name(p_code text, p_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>]', '', 'g')), 12)); u uuid := auth.uid();
  owner uuid; existed boolean;
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
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

create function public.get_my_players(p_code text)
returns table(r_name text, r_photo text, r_consent boolean, r_sound text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  return query select p.name, case when p.consent then p.photo end, p.consent, p.sound
    from public.players p where auth.uid() is not null and p.user_id = auth.uid() order by p.name;
end $$;

-- e-mail du compte propriétaire d'un pseudo (se connecter ou retrouver son mot de passe avec le pseudo) ; null : pseudo sans compte
create function public.login_email(p_code text, p_name text) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); e text;
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  if n = '' then return null; end if;
  if (select count(*) from public.login_tries t where t.name = n and t.at > now() - interval '10 minutes') >= 10
    or (select count(*) from public.login_tries t where t.at > now() - interval '10 minutes') >= 60 then raise exception 'trop d essais'; end if;
  insert into public.login_tries (name) values (n);
  delete from public.login_tries where at < now() - interval '1 day';
  select u.email into e from public.players p join auth.users u on u.id = p.user_id where p.name = n;
  return e;
end $$;

-- un pseudo existe-t-il déjà ? (« c'est toi ? » avec sa tête) + r_protected : il a un compte (il faut se connecter)
create function public.check_name(p_code text, p_name text)
returns table(r_exists boolean, r_photo text, r_sound text, r_protected boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12));
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  return query select
    exists (select 1 from public.players p where p.name = n) or exists (select 1 from public.room_members m where m.name = n)
      or exists (select 1 from public.scores s where s.name = n),
    (select case when p.consent then p.photo end from public.players p where p.name = n),
    (select p.sound from public.players p where p.name = n),
    exists (select 1 from public.players p where p.name = n and p.user_id is not null);
end $$;

-- ---- fonctions qui agissent au nom d'un joueur : mêmes que avant + public.acct_check ----

create or replace function public.save_player(p_code text, p_name text, p_photo text, p_consent boolean, p_sound text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12));
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if p_sound is not null and p_sound <> '' and p_sound !~ '^data:audio/' then raise exception 'son invalide'; end if;
  insert into public.players (name, photo, consent, sound, updated_at)
    values (n, case when coalesce(p_consent, false) then p_photo end, coalesce(p_consent, false), nullif(p_sound, ''), now())
  on conflict (name) do update set photo = excluded.photo, consent = excluded.consent,
    sound = case when p_sound is null then public.players.sound else nullif(p_sound, '') end, updated_at = now();
end $$;

create or replace function public.create_room(p_code text, p_name text, p_room_code text, p_owner text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare rid bigint; n text := left(trim(p_name), 24); o text := upper(left(trim(p_owner), 12));
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  perform public.acct_check(o);
  if char_length(n) < 2 then raise exception 'nom de salle trop court'; end if;
  if exists (select 1 from public.rooms x where upper(x.name) = upper(n)) then raise exception 'cette salle existe deja'; end if;
  insert into public.rooms (name, code_hash, owner)
    values (n, case when coalesce(trim(p_room_code), '') = '' then null else crypt(trim(p_room_code), gen_salt('bf')) end, o)
    returning id into rid;
  insert into public.room_members (room_id, name) values (rid, o) on conflict do nothing;
  return rid;
end $$;

create or replace function public.join_room(p_code text, p_room bigint, p_room_code text, p_name text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  if not public.room_ok(p_room, p_room_code) then return false; end if;
  perform public.acct_check(p_name);
  insert into public.room_members (room_id, name) values (p_room, upper(left(trim(p_name), 12))) on conflict do nothing;
  return true;
end $$;

create or replace function public.add_score(p_code text, p_room bigint, p_room_code text, p_game text, p_name text, p_score int)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12)); v_prev int; v_top int; v_top_name text; v_member boolean;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  perform public.acct_check(n);
  -- records de la salle : seulement entre membres actuels (un non-membre enregistre son score, sans annonce ni notification)
  v_member := exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n);
  select s.score, s.name into v_top, v_top_name from public.scores s where s.room_id = p_room and s.game = p_game and s.name <> n
    and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = s.name)
    order by s.score desc, s.created_at limit 1;
  select max(s.score) into v_prev from public.scores s where s.room_id = p_room and s.game = p_game and s.name = n;
  if v_member and (v_prev is null or p_score > v_prev) then
    insert into public.notifications (room_id, target, actor, game, score, prev)
      select p_room, b.name, n, p_game, p_score, b.best
      from (select s.name, max(s.score) as best from public.scores s
            where s.room_id = p_room and s.game = p_game and s.name <> n
              and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = s.name) group by s.name) b
      where b.best > 0 and b.best < p_score and b.best >= coalesce(v_prev, 0);
    if v_top is not null and v_top > 0 and p_score > v_top and v_top >= coalesce(v_prev, 0) then
      insert into public.messages (room_id, name, body, kind, game, score, beaten, beaten_score)
        values (p_room, n, n || ' a battu le record de ' || v_top_name, 'record', p_game, p_score, v_top_name, v_top);
    end if;
  end if;
  insert into public.scores (room_id, game, name, score) values (p_room, p_game, n, p_score);
  delete from public.scores s where s.room_id = p_room and s.game = p_game and s.name = n and s.id <> (
    select x.id from public.scores x where x.room_id = p_room and x.game = p_game and x.name = n
    order by x.score desc, x.created_at limit 1);
  delete from public.notifications where created_at < now() - interval '60 days';
end $$;

create or replace function public.post_message(p_code text, p_room bigint, p_room_code text, p_name text, p_body text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12)); b text := left(trim(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]+', ' ', 'g')), 300); mid bigint;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' or b = '' then raise exception 'message vide'; end if;
  perform public.acct_check(n);
  if (select count(*) from public.messages m where m.room_id = p_room and m.name = n and m.created_at > now() - interval '10 seconds') >= 5
    then raise exception 'trop de messages'; end if;
  insert into public.messages (room_id, name, body) values (p_room, n, b) returning id into mid;
  delete from public.messages where created_at < now() - interval '90 days';
  return mid;
end $$;

create or replace function public.react(p_code text, p_room bigint, p_room_code text, p_message bigint, p_name text, p_emoji text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12)); e text := left(trim(coalesce(p_emoji, '')), 16);
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if not exists (select 1 from public.messages m where m.id = p_message and m.room_id = p_room) then raise exception 'message inconnu'; end if;
  if e = '' then
    delete from public.reactions r where r.message_id = p_message and r.name = n;
  else
    insert into public.reactions (message_id, name, emoji) values (p_message, n, e)
      on conflict (message_id, name) do update set emoji = excluded.emoji, created_at = now();
  end if;
end $$;

create or replace function public.save_room_look(p_code text, p_room bigint, p_room_code text, p_name text, p_photo text default null, p_sound text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
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

create or replace function public.save_progress(p_code text, p_room bigint, p_room_code text, p_name text, p_game text, p_level int) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); v int;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
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

-- p_by (celui qui retire) doit être le compte connecté si son pseudo est protégé
create or replace function public.remove_member(p_code text, p_room bigint, p_room_code text, p_name text, p_by text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); b text := upper(left(trim(coalesce(p_by, '')), 12)); o text;
  mode text := public.member_purge_mode(); was boolean;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' or b = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(b);
  select r.owner into o from public.rooms r where r.id = p_room;
  if b <> n and b is distinct from upper(o) then raise exception 'seul le createur de la salle peut retirer un joueur'; end if;
  delete from public.room_members m where m.room_id = p_room and m.name = n;
  was := found;
  delete from public.presence pr where pr.room_id = p_room and pr.name = n;
  if mode in ('salle', 'tout') then
    if mode = 'salle' then
      insert into public.world_bests (game, name, score, created_at)
        select distinct on (s.game) s.game, s.name, s.score, s.created_at from public.scores s
        where s.room_id = p_room and s.name = n order by s.game, s.score desc, s.created_at
      on conflict (game, name) do update set score = excluded.score, created_at = excluded.created_at
        where excluded.score > public.world_bests.score;
    end if;
    delete from public.scores s where s.room_id = p_room and s.name = n;
    delete from public.notifications x where x.room_id = p_room and (x.target = n or x.actor = n);
    delete from public.reactions r where r.name = n and r.message_id in (select m.id from public.messages m where m.room_id = p_room);
    delete from public.messages m where m.room_id = p_room and m.name = n;
    delete from public.progress g where g.room_id = p_room and g.name = n;
  end if;
  return was;
end $$;

-- présence : un pseudo protégé n'est compté sous son nom que pour son compte (sinon l'appareil est compté sans nom) ; pas d'erreur
create or replace function public.heartbeat(p_code text, p_room bigint, p_client text, p_name text, p_game text, p_version text default null)
returns table(r_game text, r_count int)
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  if not public.acct_ok(n) then n := null; end if;
  insert into public.presence (client_id, room_id, name, game, seen_at)
    values (left(p_client, 40), p_room, n, left(coalesce(p_game, 'menu'), 20), now())
  on conflict (client_id) do update set room_id = excluded.room_id, name = excluded.name, game = excluded.game, seen_at = now();
  delete from public.presence where seen_at < now() - interval '3 minutes';
  if n is not null then
    update public.room_members m set last_seen = now(), last_version = coalesce(left(p_version, 40), m.last_version)
      where m.room_id = p_room and m.name = n;
  end if;
  return query select pr.game, count(*)::int from public.presence pr
    where pr.room_id = p_room and pr.seen_at > now() - interval '45 seconds' group by pr.game;
end $$;

revoke all on function public.claim_name(text, text), public.get_my_players(text), public.login_email(text, text), public.check_name(text, text) from public;
grant execute on function public.claim_name(text, text), public.get_my_players(text), public.login_email(text, text), public.check_name(text, text) to anon, authenticated;
-- un joueur connecté appelle les fonctions avec le rôle « authenticated » : il a droit à tout ce que « anon » peut appeler
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute') loop
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;

-- ---- Pseudo par salle (comme la tête et le cri par salle) ----
-- room_members.alias : le nom affiché DANS cette salle (liste des joueurs, classement de la salle, chat, jeux, duels, compétition,
-- carte, « regarder »). Le pseudo principal reste l'identité (clé des scores, membres, messages…) et s'affiche au classement mondial
-- et dans les autres salles. Unique dans la salle : ni le pseudo de salle d'un autre membre, ni le pseudo principal d'un autre membre.
alter table public.room_members add column if not exists alias text;
alter table public.room_members drop constraint if exists room_members_alias_check;
alter table public.room_members add constraint room_members_alias_check check (alias is null or char_length(alias) between 2 and 12);
create unique index if not exists room_members_alias_uq on public.room_members (room_id, alias) where alias is not null;

drop function if exists public.save_room_alias(text, bigint, text, text, text);
drop function if exists public.get_players(text, bigint, text);
drop function if exists public.get_presence(text, bigint, text);

-- p_alias : '' (ou le pseudo principal) = plus de pseudo de salle ; renvoie le pseudo de salle gardé (null = aucun)
create function public.save_room_alias(p_code text, p_room bigint, p_room_code text, p_name text, p_alias text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
  a text := upper(left(trim(regexp_replace(coalesce(p_alias, ''), '[[:cntrl:]<>]', '', 'g')), 12));
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
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

-- mêmes fonctions que room-look.sql, + r_alias (pseudo de salle, null = le pseudo principal)
create function public.get_players(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_photo text, r_updated timestamptz, r_sound text, r_seen timestamptz, r_game text, r_version text, r_alias text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  return query
    select m.name, coalesce(m.photo, case when pl.consent then pl.photo end),
      greatest(coalesce(pl.updated_at, m.joined_at), m.look_at), coalesce(m.sound, pl.sound), m.last_seen,
      (select pr.game from public.presence pr where pr.room_id = p_room and pr.name = m.name and pr.seen_at > now() - interval '45 seconds'
        order by pr.seen_at desc limit 1), m.last_version, m.alias
    from public.room_members m left join public.players pl on pl.name = m.name
    where m.room_id = p_room;
end $$;

create function public.get_presence(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_updated timestamptz, r_seen timestamptz, r_game text, r_version text, r_alias text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  return query
    select m.name, greatest(coalesce(pl.updated_at, m.joined_at), m.look_at), m.last_seen,
      (select pr.game from public.presence pr where pr.room_id = p_room and pr.name = m.name and pr.seen_at > now() - interval '45 seconds'
        order by pr.seen_at desc limit 1), m.last_version, m.alias
    from public.room_members m left join public.players pl on pl.name = m.name
    where m.room_id = p_room;
end $$;

revoke all on function public.save_room_alias(text, bigint, text, text, text), public.get_players(text, bigint, text), public.get_presence(text, bigint, text) from public;
grant execute on function public.save_room_alias(text, bigint, text, text, text), public.get_players(text, bigint, text), public.get_presence(text, bigint, text) to anon, authenticated;
