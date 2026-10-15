-- Mode COOP (« à deux, ensemble contre le jeu ») : scores d'ÉQUIPE par salle. APPLIQUÉ le 15 oct. 2026 (migration coop_mode_scores, connecteur Supabase).
-- À coller dans Supabase > SQL Editor, puis Run (projet wplictorvvtkfikpfdnl), ou à passer par le connecteur Supabase (apply_migration).
-- Peut être relancé sans risque : garde toutes les données.
-- ORDRE : APRÈS public.sql (et map-est.sql) : se sert de room_guard, room_access, acct_check, acct_own, member_purge_mode.
--   Ne redéfinit AUCUNE fonction de public.sql / map-est.sql : relancer public.sql seul ne casse rien ici, et inversement.
--   Une fois appliqué : le recopier dans source/coop.sql et à la fin de source/supabase.sql (après map-est.sql).
--
-- CE QUE ÇA AJOUTE
--   * Deux classements par jeu coop et par salle : 'ami' (« Avec un copain » : deux pseudos, chacun sur son appareil) et 'ia'
--     (« Avec l'IA » : un pseudo + le robot). Un seul meilleur score par ÉQUIPE : (p1, p2) triés pour 'ami', (p1, '') pour 'ia'.
--     Le niveau (difficulté de la partie : facile / moyen / difficile / extreme) est OBLIGATOIRE pour les deux sortes ; il est gardé
--     avec le meilleur score et affiché (« PATOU + 🤖 Robot Difficile », « PATOU + JUJU · Difficile »).
--   * Un score « avec un copain » ne compte que CONFIRMÉ par les deux comptes : chaque appareil envoie add_coop_score avec le même
--     numéro de partie (p_run, tiré par l'hôte) ; le 2e envoi valide (score retenu = le plus petit des deux, sécurité). Les deux pseudos
--     sur le MÊME compte (famille) : un seul envoi suffit. 'ia' : un seul envoi (un seul humain).
--   * Un envoi répété (file d'attente, nouvel essai après « attente ») répond 'deja-record' ou 'deja-moins' : chaque appareil sait
--     si la partie a fait un record, même celui qui a envoyé le premier.
--   * Notifications « X et Y ont battu votre record » (table coop_notifs, get_coop_notifs) : les membres des équipes dépassées.
--   * Nouveau record d'équipe de la salle : carte « record à deux » dans le chat (messages.kind = 'coop', détails dans messages.meta).
--     get_messages (public.sql) ne renvoie pas meta : le nouveau site lit get_messages2 (mêmes colonnes + r_meta) ; les anciens sites
--     voient la carte comme un message ordinaire (le texte est lisible tout seul).
--   * Classement mondial à deux : get_world_coop_scores (public, sans photo), avec coop_world_bests (records gardés après un retrait).
--   * Un joueur retiré de la salle (remove_member, mode 'salle' ou 'tout') emporte ses scores à deux de cette salle : déclencheur sur
--     room_members (comme ça, public.sql n'est pas touché ; en mode 'salle' son meilleur score d'équipe reste au mondial).
--   * Rien pour le direct : la partie à deux passe par le canal jdw-duel-<code> déjà permis (rt_topic_ok) et l'invitation par celui de la salle.
--
-- VÉRIFIER APRÈS (SQL Editor) :
--   select proname from pg_proc where proname like '%coop%' or proname = 'get_messages2' order by 1;
--     → add_coop_score, coop_apply, coop_member_gone, coop_members_ok, coop_n, get_coop_notifs, get_coop_scores, get_messages2,
--       get_world_coop_scores (9 lignes)
--   select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.messages'::regclass and contype = 'c';
--     → une seule contrainte sur kind : messages_kind_check … ('msg', 'record', 'coop')

do $$ begin
  if to_regprocedure('public.room_guard(bigint)') is null or to_regprocedure('public.acct_check(text)') is null then
    raise exception 'Lance d''abord source/public.sql (room_guard / acct_check manquantes)';
  end if;
  if to_regprocedure('public.member_purge_mode()') is null then raise exception 'Lance d''abord source/members.sql (member_purge_mode manquante)'; end if;
end $$;

-- ---- tables (illisibles depuis le site : seulement par les fonctions ci-dessous) ----

-- meilleur score de chaque équipe, par salle, jeu et sorte
create table if not exists public.coop_scores (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.rooms(id) on delete cascade,
  game text not null check (game ~ '^[a-z0-9_-]{2,20}$'),
  kind text not null check (kind in ('ami', 'ia')),
  p1 text not null check (char_length(p1) between 1 and 12),
  p2 text not null default '' check (char_length(p2) <= 12),           -- '' : le robot (sorte 'ia')
  lvl text not null check (lvl in ('facile', 'moyen', 'difficile', 'extreme')),   -- difficulté de la partie qui a fait ce record
  score integer not null check (score between 0 and 10000000),
  stage integer check (stage is null or stage between 1 and 9999),    -- niveau / vague / secteur / manche atteint (affiché, ne départage pas)
  run text,                                                            -- la partie qui a fait ce record
  created_at timestamptz not null default now(),
  constraint coop_scores_team check ((kind = 'ia' and p2 = '') or (kind = 'ami' and p2 <> '' and p1 < p2))
);
create unique index if not exists coop_scores_team_uq on public.coop_scores (room_id, game, kind, p1, p2);
create index if not exists coop_scores_board_idx on public.coop_scores (room_id, game, kind, score desc);
alter table public.coop_scores enable row level security;
revoke all on public.coop_scores from anon, authenticated;

-- chaque envoi d'un appareil (une ligne par partie et par pseudo) ; done = la partie a été comptée, res = ce que ça a donné
-- ('record' | 'moins') ; gardé 2 jours (anti-doublon)
create table if not exists public.coop_claims (
  room_id bigint not null references public.rooms(id) on delete cascade,
  run text not null,
  name text not null,
  partner text not null default '',
  game text not null,
  kind text not null,
  lvl text,
  score integer not null,
  stage integer,
  done boolean not null default false,
  res text,
  at timestamptz not null default now(),
  primary key (room_id, run, name)
);
alter table public.coop_claims add column if not exists res text;
create index if not exists coop_claims_name_idx on public.coop_claims (name, at);
alter table public.coop_claims enable row level security;
revoke all on public.coop_claims from anon, authenticated;

-- « PATOU et JUJU ont battu votre record » : target = un membre d'une équipe dépassée, mate = son coéquipier ('' : son robot)
create table if not exists public.coop_notifs (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.rooms(id) on delete cascade,
  target text not null,
  kind text not null,
  game text not null,
  actor1 text not null,
  actor2 text not null default '',
  lvl text,
  score integer not null,
  mate text not null default '',
  prev integer not null,
  created_at timestamptz not null default now()
);
create index if not exists coop_notifs_target_idx on public.coop_notifs (room_id, target, id desc);
alter table public.coop_notifs enable row level security;
revoke all on public.coop_notifs from anon, authenticated;

-- records d'équipe gardés pour le mondial quand les lignes d'une salle sont effacées (retrait d'un membre, mode 'salle')
create table if not exists public.coop_world_bests (
  game text not null,
  kind text not null,
  p1 text not null,
  p2 text not null default '',
  lvl text,
  score integer not null,
  stage integer,
  created_at timestamptz not null default now(),
  primary key (game, kind, p1, p2)
);
alter table public.coop_world_bests enable row level security;
revoke all on public.coop_world_bests from anon, authenticated;

-- carte « record à deux » du chat : sorte 'coop' + détails (k, a2, b2, lvl, blvl) dans meta.
-- La contrainte sur kind est refaite quel que soit son nom dans la vraie base (une table plus ancienne a pu lui donner un autre nom :
-- l'ancienne resterait et bloquerait toute carte 'coop', donc tout record à deux) : on retire toute contrainte CHECK de messages qui
-- parle de kind, puis on pose la nouvelle.
alter table public.messages add column if not exists meta jsonb;
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.messages'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~* '\mkind\M'
  loop
    execute format('alter table public.messages drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.messages add constraint messages_kind_check check (kind in ('msg', 'record', 'coop'));

-- ---- aides (internes, jamais appelables depuis le site) ----

create or replace function public.coop_n(p text) returns text
language sql immutable as $$ select upper(left(trim(coalesce(p, '')), 12)) $$;

-- les deux joueurs de l'équipe sont membres de la salle ('' = le robot)
create or replace function public.coop_members_ok(p_room bigint, a text, b text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.room_members m where m.room_id = p_room and m.name = a)
     and (coalesce(b, '') = '' or exists (select 1 from public.room_members m where m.room_id = p_room and m.name = b));
$$;

-- enregistre un score d'équipe CONFIRMÉ : meilleur de l'équipe, notifications, record de la salle dans le chat
create or replace function public.coop_apply(p_room bigint, p_game text, k text, a1 text, a2 text, s int, st int, lv text, r text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_prev int; v_top int; v_t1 text; v_t2 text; v_tl text; body text;
begin
  perform pg_advisory_xact_lock(hashtext('coopteam:' || p_room || ':' || p_game || ':' || k || ':' || a1 || ':' || a2));
  select c.score into v_prev from public.coop_scores c
    where c.room_id = p_room and c.game = p_game and c.kind = k and c.p1 = a1 and c.p2 = a2;
  if v_prev is not null and s <= v_prev then return 'moins'; end if;
  -- record de la salle (les AUTRES équipes, membres actuels seulement)
  select c.score, c.p1, c.p2, c.lvl into v_top, v_t1, v_t2, v_tl from public.coop_scores c
    where c.room_id = p_room and c.game = p_game and c.kind = k and not (c.p1 = a1 and c.p2 = a2)
      and public.coop_members_ok(p_room, c.p1, c.p2)
    order by c.score desc, c.created_at limit 1;
  -- prévient les membres des équipes que ce score vient de dépasser (celles qui étaient devant ou à égalité avant), un message par personne
  insert into public.coop_notifs (room_id, target, kind, game, actor1, actor2, lvl, score, mate, prev)
    select distinct on (x.target) p_room, x.target, k, p_game, a1, a2, lv, s, x.mate, x.best
    from (select c.p1 as target, c.p2 as mate, c.score as best from public.coop_scores c
            where c.room_id = p_room and c.game = p_game and c.kind = k and not (c.p1 = a1 and c.p2 = a2)
              and public.coop_members_ok(p_room, c.p1, c.p2) and c.score > 0 and c.score < s and c.score >= coalesce(v_prev, 0)
          union all
          select c.p2, c.p1, c.score from public.coop_scores c
            where c.room_id = p_room and c.game = p_game and c.kind = k and c.p2 <> '' and not (c.p1 = a1 and c.p2 = a2)
              and public.coop_members_ok(p_room, c.p1, c.p2) and c.score > 0 and c.score < s and c.score >= coalesce(v_prev, 0)) x
    where x.target <> a1 and x.target <> a2
    order by x.target, x.best desc;
  -- nouveau record d'équipe de la salle : annoncé dans le chat (lisible tel quel par les anciens sites)
  if v_top is not null and v_top > 0 and s > v_top and v_top >= coalesce(v_prev, 0) then
    body := case when k = 'ami'
      then '🤝 ' || a1 || ' et ' || a2 || ' battent le record à deux de ' || v_t1 || ' et ' || v_t2 || ' !'
      else '🤖 ' || a1 || ' et son robot battent le record de ' || v_t1 || ' et son robot !' end;
    insert into public.messages (room_id, name, body, kind, game, score, beaten, beaten_score, meta)
      values (p_room, a1, left(body, 300), 'coop', p_game, s, v_t1, v_top,
              jsonb_build_object('k', k, 'a2', a2, 'b2', v_t2, 'lvl', lv, 'blvl', v_tl));
  end if;
  insert into public.coop_scores as c (room_id, game, kind, p1, p2, lvl, score, stage, run)
    values (p_room, p_game, k, a1, a2, lv, s, st, r)
  on conflict (room_id, game, kind, p1, p2) do update
    set lvl = excluded.lvl, score = excluded.score, stage = excluded.stage, run = excluded.run, created_at = now()
    where excluded.score > c.score;
  delete from public.coop_notifs where created_at < now() - interval '60 days';
  return 'record';
end $$;

revoke all on function public.coop_n(text), public.coop_members_ok(bigint, text, text),
  public.coop_apply(bigint, text, text, text, text, int, int, text, text) from public, anon, authenticated;

-- ---- écrire : le pseudo doit être au compte connecté ET membre de la salle ----

-- p_kind 'ami' | 'ia' ; p_partner : le copain ('ami'), ignoré pour 'ia' ; p_level : difficulté de la partie (obligatoire, les deux sortes) ;
-- p_stage : niveau atteint (facultatif) ; p_run : numéro de la partie, le même sur les deux appareils.
-- Renvoie 'record' (meilleur score de l'équipe, enregistré), 'moins' (l'équipe a déjà mieux), 'attente' (en attente du copain),
-- 'deja-record' / 'deja-moins' (cette partie est déjà comptée : envoi répété ; dit ce que la partie avait donné),
-- 'hors-salle' (un des deux pseudos n'est pas membre de la salle : rien, sans erreur).
create or replace function public.add_coop_score(p_code text, p_room bigint, p_room_code text, p_game text, p_kind text,
  p_name text, p_partner text, p_level text, p_score int, p_stage int, p_run text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.coop_n(p_name); m text := public.coop_n(p_partner); k text := lower(trim(coalesce(p_kind, '')));
  lv text := nullif(lower(trim(coalesce(p_level, ''))), ''); r text := lower(trim(coalesce(p_run, '')));
  st int := case when p_stage between 1 and 9999 then p_stage end; s int := p_score; o public.coop_claims; v_res text;
begin
  perform public.room_guard(p_room);
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if p_game is null or p_game !~ '^[a-z0-9_-]{2,20}$' then raise exception 'jeu invalide'; end if;
  if k not in ('ami', 'ia') then raise exception 'sorte invalide'; end if;
  if lv is null then raise exception 'niveau requis'; end if;
  if lv not in ('facile', 'moyen', 'difficile', 'extreme') then raise exception 'niveau invalide'; end if;
  if p_score is null or p_score < 0 or p_score > 10000000 then raise exception 'score invalide'; end if;
  if r !~ '^[a-z0-9]{6,24}$' then raise exception 'partie invalide'; end if;
  if (select count(*) from public.coop_claims c where c.name = n and c.at > now() - interval '1 minute') >= 30 then raise exception 'trop de scores'; end if;
  if not exists (select 1 from public.room_members x where x.room_id = p_room and x.name = n) then return 'hors-salle'; end if;
  if k = 'ia' then m := '';
  else
    if m = '' or m = n then raise exception 'copain invalide'; end if;
    if not exists (select 1 from public.room_members x where x.room_id = p_room and x.name = m) then return 'hors-salle'; end if;
  end if;
  -- les deux appareils d'une même partie passent l'un après l'autre (sinon chacun attendrait l'autre pour toujours)
  perform pg_advisory_xact_lock(hashtext('cooprun:' || p_room || ':' || r));
  select c.res into v_res from public.coop_claims c where c.room_id = p_room and c.run = r and c.done limit 1;
  if found then return 'deja-' || coalesce(v_res, 'moins'); end if;
  insert into public.coop_claims as c (room_id, run, name, partner, game, kind, lvl, score, stage)
    values (p_room, r, n, m, p_game, k, lv, p_score, st)
  on conflict (room_id, run, name) do update set partner = excluded.partner, game = excluded.game, kind = excluded.kind,
    lvl = excluded.lvl, score = excluded.score, stage = excluded.stage, at = now();
  delete from public.coop_claims where at < now() - interval '2 days';
  if k = 'ami' and not public.acct_own(m) then      -- deux comptes : il faut l'envoi du copain pour la même partie
    select * into o from public.coop_claims c
      where c.room_id = p_room and c.run = r and c.name = m and c.partner = n and c.game = p_game and c.kind = 'ami';
    if not found then return 'attente'; end if;
    s := least(p_score, o.score);
    st := case when st is null then o.stage when o.stage is null then st else least(st, o.stage) end;
    lv := coalesce(o.lvl, lv);
  end if;
  v_res := public.coop_apply(p_room, p_game, k, least(n, case when m = '' then n else m end),
    case when m = '' then '' else greatest(n, m) end, s, st, lv, r);
  update public.coop_claims c set done = true, res = v_res where c.room_id = p_room and c.run = r;
  return v_res;
end $$;

-- ---- lire ----

-- top 10 de chaque jeu coop et de chaque sorte, dans la salle (équipes de membres actuels seulement)
create or replace function public.get_coop_scores(p_code text, p_room bigint, p_room_code text)
returns table(r_game text, r_kind text, r_p1 text, r_p2 text, r_level text, r_score int, r_stage int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  return query
    select t.game, t.kind, t.p1, t.p2, t.lvl, t.score, t.stage, t.created_at from (
      select c.game, c.kind, c.p1, c.p2, c.lvl, c.score, c.stage, c.created_at,
             row_number() over (partition by c.game, c.kind order by c.score desc, c.created_at) as rn
      from public.coop_scores c
      where c.room_id = p_room and public.coop_members_ok(p_room, c.p1, c.p2)) t
    where t.rn <= 10
    order by t.game, t.kind, t.score desc, t.created_at;
end $$;

-- classement mondial à deux (public, sans photo) : une ligne par équipe (son meilleur score, toutes salles réunies), top 10
create or replace function public.get_world_coop_scores(p_code text)
returns table(r_game text, r_kind text, r_p1 text, r_p2 text, r_level text, r_score int, r_stage int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  return query
    select t.game, t.kind, t.p1, t.p2, t.lvl, t.score, t.stage, t.created_at from (
      select b.game, b.kind, b.p1, b.p2, b.lvl, b.score, b.stage, b.created_at,
             row_number() over (partition by b.game, b.kind order by b.score desc, b.created_at) as rn
      from (select distinct on (a.game, a.kind, a.p1, a.p2) a.game, a.kind, a.p1, a.p2, a.lvl, a.score, a.stage, a.created_at
            from (select c.game, c.kind, c.p1, c.p2, c.lvl, c.score, c.stage, c.created_at from public.coop_scores c
                  union all
                  select w.game, w.kind, w.p1, w.p2, w.lvl, w.score, w.stage, w.created_at from public.coop_world_bests w) a
            order by a.game, a.kind, a.p1, a.p2, a.score desc, a.created_at) b) t
    where t.rn <= 10
    order by t.game, t.kind, t.score desc, t.created_at;
end $$;

-- les notifications « à deux » d'un pseudo : seulement pour son compte (rien sinon, sans erreur)
create or replace function public.get_coop_notifs(p_code text, p_room bigint, p_room_code text, p_name text)
returns table(r_id bigint, r_kind text, r_game text, r_actor1 text, r_actor2 text, r_level text, r_score int, r_mate text, r_prev int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  if not public.acct_own(p_name) then return; end if;
  return query
    select x.id, x.kind, x.game, x.actor1, x.actor2, x.lvl, x.score, x.mate, x.prev, x.created_at from public.coop_notifs x
    where x.room_id = p_room and x.target = public.coop_n(p_name) and x.created_at > now() - interval '30 days'
    order by x.id desc limit 30;
end $$;

-- le chat de la salle (comme get_messages de public.sql — à garder identique si celle-ci change) + r_meta (carte « record à deux »)
create or replace function public.get_messages2(p_code text, p_room bigint, p_room_code text, p_after bigint)
returns table(r_id bigint, r_name text, r_body text, r_kind text, r_game text, r_score int, r_beaten text, r_beaten_score int, r_at timestamptz, r_meta jsonb)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  if coalesce(p_after, 0) = 0 then
    return query select * from (
      select m.id, m.name, m.body, m.kind, m.game, m.score, m.beaten, m.beaten_score, m.created_at, m.meta
      from public.messages m where m.room_id = p_room order by m.id desc limit 80) t order by 1;
  else
    return query select m.id, m.name, m.body, m.kind, m.game, m.score, m.beaten, m.beaten_score, m.created_at, m.meta
      from public.messages m where m.room_id = p_room and m.id > p_after order by m.id limit 100;
  end if;
end $$;

-- ---- un membre retiré de la salle emporte ses scores à deux (mêmes modes que remove_member : member_purge_mode) ----
create or replace function public.coop_member_gone() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare mode text := public.member_purge_mode();
begin
  if mode not in ('salle', 'tout') then return old; end if;
  -- 'salle' : ses meilleurs scores d'équipe restent au mondial (pas quand c'est la salle entière qui est supprimée)
  if mode = 'salle' and exists (select 1 from public.rooms r where r.id = old.room_id) then
    insert into public.coop_world_bests (game, kind, p1, p2, lvl, score, stage, created_at)
      select c.game, c.kind, c.p1, c.p2, c.lvl, c.score, c.stage, c.created_at from public.coop_scores c
      where c.room_id = old.room_id and (c.p1 = old.name or c.p2 = old.name)
    on conflict (game, kind, p1, p2) do update set lvl = excluded.lvl, score = excluded.score, stage = excluded.stage, created_at = excluded.created_at
      where excluded.score > public.coop_world_bests.score;
  end if;
  delete from public.coop_scores c where c.room_id = old.room_id and (c.p1 = old.name or c.p2 = old.name);
  delete from public.coop_claims c where c.room_id = old.room_id and (c.name = old.name or c.partner = old.name);
  delete from public.coop_notifs x where x.room_id = old.room_id
    and (x.target = old.name or x.actor1 = old.name or x.actor2 = old.name or x.mate = old.name);
  -- ses cartes « record à deux » (remove_member efface déjà celles où il est le 1er nom : messages.name)
  delete from public.messages mm where mm.room_id = old.room_id and mm.kind = 'coop' and mm.meta ->> 'a2' = old.name;
  return old;
end $$;
drop trigger if exists coop_member_gone on public.room_members;
create trigger coop_member_gone after delete on public.room_members for each row execute function public.coop_member_gone();
revoke all on function public.coop_member_gone() from public, anon, authenticated;

-- ---- droits : les fonctions du site pour anon ET authenticated (elles vérifient elles-mêmes le compte), rien pour PUBLIC ----
revoke all on function public.add_coop_score(text, bigint, text, text, text, text, text, text, int, int, text),
  public.get_coop_scores(text, bigint, text), public.get_world_coop_scores(text),
  public.get_coop_notifs(text, bigint, text, text), public.get_messages2(text, bigint, text, bigint) from public;
grant execute on function public.add_coop_score(text, bigint, text, text, text, text, text, text, int, int, text),
  public.get_coop_scores(text, bigint, text), public.get_world_coop_scores(text),
  public.get_coop_notifs(text, bigint, text, text), public.get_messages2(text, bigint, text, bigint) to anon, authenticated;
