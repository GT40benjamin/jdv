-- Borne d'arcade entre amis : base de données avec salles (à coller dans Supabase > SQL Editor, puis Run)
-- Le script peut être relancé sans risque. Remplace CHANGE-MOI par le mot de passe du site (ligne 8).
create extension if not exists pgcrypto with schema extensions;

-- Mot de passe du site (stocké chiffré, invisible depuis le site)
create table if not exists public.club (id int primary key default 1 check (id = 1), pass_hash text not null);
alter table public.club enable row level security;
insert into public.club (pass_hash) values (extensions.crypt('CHANGE-MOI', extensions.gen_salt('bf')))
  on conflict (id) do update set pass_hash = excluded.pass_hash;

-- Salles
create table if not exists public.rooms (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 24),
  code_hash text,
  owner text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists rooms_name_uq on public.rooms (upper(name));
alter table public.rooms enable row level security;

create table if not exists public.room_members (
  room_id bigint not null references public.rooms(id) on delete cascade,
  name text not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, name)
);
alter table public.room_members add column if not exists last_seen timestamptz;
alter table public.room_members add column if not exists last_version text;
alter table public.room_members enable row level security;

-- Scores (par salle)
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  game text not null,
  name text not null check (char_length(name) between 1 and 12),
  score integer not null check (score between 0 and 10000000),
  created_at timestamptz not null default now()
);
alter table public.scores add column if not exists room_id bigint references public.rooms(id) on delete cascade;
alter table public.scores drop constraint if exists scores_game_check;
alter table public.scores add constraint scores_game_check
  check (game ~ '^[a-z0-9_-]{2,20}$');
alter table public.scores enable row level security;

-- Joueurs et photos (communs à toutes les salles ; photo partagée seulement avec accord)
create table if not exists public.players (
  name text primary key check (char_length(name) between 1 and 12),
  photo text check (photo is null or char_length(photo) < 400000),
  consent boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.players add column if not exists sound text;
alter table public.players drop constraint if exists players_sound_check;
alter table public.players add constraint players_sound_check check (sound is null or char_length(sound) < 300000);
alter table public.players enable row level security;

-- Joueurs connectés
create table if not exists public.presence (
  client_id text primary key,
  name text,
  game text,
  seen_at timestamptz not null default now()
);
alter table public.presence add column if not exists room_id bigint;
alter table public.presence enable row level security;

-- Notifications « X a battu ton record »
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.rooms(id) on delete cascade,
  target text not null,                 -- celui dont le record est battu
  actor text not null,                  -- celui qui l'a battu
  game text not null,
  score integer not null,               -- nouveau score de actor
  prev integer not null,                -- ancien record de target
  created_at timestamptz not null default now()
);
create index if not exists notifications_target_idx on public.notifications (room_id, target, id desc);
alter table public.notifications enable row level security;

-- Chat de chaque salle (messages des joueurs + annonces de records)
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.rooms(id) on delete cascade,
  name text not null,
  body text not null check (char_length(body) between 1 and 300),
  kind text not null default 'msg' check (kind in ('msg', 'record')),
  game text, score integer, beaten text, beaten_score integer,
  created_at timestamptz not null default now()
);
create index if not exists messages_room_idx on public.messages (room_id, id desc);
alter table public.messages enable row level security;

-- Réactions aux messages (comme WhatsApp : une réaction par personne et par message)
create table if not exists public.reactions (
  message_id bigint not null references public.messages(id) on delete cascade,
  name text not null,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, name)
);
alter table public.reactions enable row level security;

-- Erreurs remontées par les appareils des joueurs (pour corriger les plantages)
create table if not exists public.errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text, room_id bigint, game text, message text, detail text, ua text, version text
);
alter table public.errors enable row level security;


-- Anciennes fonctions (sans salles) et nouvelles : on repart propre
drop function if exists public.get_scores(text);
drop function if exists public.add_score(text, text, text, int);
drop function if exists public.get_players(text);
drop function if exists public.heartbeat(text, text, text, text);
drop function if exists public.list_rooms(text);
drop function if exists public.list_rooms(text, text);
drop function if exists public.get_world_scores(text);
drop function if exists public.create_room(text, text, text, text);
drop function if exists public.join_room(text, bigint, text, text);
drop function if exists public.get_scores(text, bigint, text);
drop function if exists public.add_score(text, bigint, text, text, text, int);
drop function if exists public.get_players(text, bigint, text);
drop function if exists public.save_player(text, text, text, boolean);
drop function if exists public.save_player(text, text, text, boolean, text);
drop function if exists public.heartbeat(text, bigint, text, text, text, text);
drop function if exists public.heartbeat(text, bigint, text, text, text, text);
drop function if exists public.room_ok(bigint, text);
drop function if exists public.get_notifications(text, bigint, text, text);
drop function if exists public.get_messages(text, bigint, text, bigint);
drop function if exists public.check_name(text, text);
drop function if exists public.get_presence(text, bigint, text);
drop function if exists public.react(text, bigint, text, bigint, text, text);
drop function if exists public.get_reactions(text, bigint, text);
drop function if exists public.log_error(text, text, bigint, text, text, text, text, text);
drop function if exists public.get_errors(text, int);
drop function if exists public.post_message(text, bigint, text, text, text);

create or replace function public.check_code(p_code text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.club where pass_hash = crypt(p_code, pass_hash));
$$;

create function public.room_ok(p_room bigint, p_room_code text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.rooms r where r.id = p_room
    and (r.code_hash is null or r.code_hash = crypt(coalesce(p_room_code, ''), r.code_hash)));
$$;

create function public.list_rooms(p_code text, p_name text default null)
returns table(r_id bigint, r_name text, r_private boolean, r_owner text, r_members int, r_online int, r_member boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  return query
    select r.id, r.name, r.code_hash is not null, r.owner,
      (select count(*)::int from public.room_members m where m.room_id = r.id),
      (select count(*)::int from public.presence pr where pr.room_id = r.id and pr.seen_at > now() - interval '45 seconds'),
      exists (select 1 from public.room_members m where m.room_id = r.id and m.name = upper(left(trim(coalesce(p_name, '')), 12)))
    from public.rooms r order by r.created_at;
end $$;

create function public.create_room(p_code text, p_name text, p_room_code text, p_owner text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare rid bigint; n text := left(trim(p_name), 24); o text := upper(left(trim(p_owner), 12));
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  if char_length(n) < 2 then raise exception 'nom de salle trop court'; end if;
  if exists (select 1 from public.rooms x where upper(x.name) = upper(n)) then raise exception 'cette salle existe deja'; end if;
  insert into public.rooms (name, code_hash, owner)
    values (n, case when coalesce(trim(p_room_code), '') = '' then null else crypt(trim(p_room_code), gen_salt('bf')) end, o)
    returning id into rid;
  insert into public.room_members (room_id, name) values (rid, o) on conflict do nothing;
  return rid;
end $$;

create function public.join_room(p_code text, p_room bigint, p_room_code text, p_name text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  if not public.room_ok(p_room, p_room_code) then return false; end if;
  insert into public.room_members (room_id, name) values (p_room, upper(left(trim(p_name), 12))) on conflict do nothing;
  return true;
end $$;

create function public.get_scores(p_code text, p_room bigint, p_room_code text)
returns table(r_game text, r_name text, r_score int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  return query
    select t.game, t.name, t.score, t.created_at from (
      select b.game, b.name, b.score, b.created_at,
             row_number() over (partition by b.game order by b.score desc, b.created_at) as rn
      from (select distinct on (s.game, s.name) s.game, s.name, s.score, s.created_at
            from public.scores s where s.room_id = p_room
            order by s.game, s.name, s.score desc, s.created_at) b) t
    where t.rn <= 10;
end $$;

create function public.add_score(p_code text, p_room bigint, p_room_code text, p_game text, p_name text, p_score int)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12)); v_prev int; v_top int; v_top_name text;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  select s.score, s.name into v_top, v_top_name from public.scores s where s.room_id = p_room and s.game = p_game and s.name <> n
    order by s.score desc, s.created_at limit 1;
  select max(s.score) into v_prev from public.scores s where s.room_id = p_room and s.game = p_game and s.name = n;
  -- prévient les joueurs que ce score vient de dépasser (ceux qui étaient devant ou à égalité avant)
  if v_prev is null or p_score > v_prev then
    insert into public.notifications (room_id, target, actor, game, score, prev)
      select p_room, b.name, n, p_game, p_score, b.best
      from (select s.name, max(s.score) as best from public.scores s
            where s.room_id = p_room and s.game = p_game and s.name <> n group by s.name) b
      where b.best > 0 and b.best < p_score and b.best >= coalesce(v_prev, 0);
    -- nouveau record de la salle : annoncé dans le chat
    if v_top is not null and v_top > 0 and p_score > v_top and v_top >= coalesce(v_prev, 0) then
      insert into public.messages (room_id, name, body, kind, game, score, beaten, beaten_score)
        values (p_room, n, n || ' a battu le record de ' || v_top_name, 'record', p_game, p_score, v_top_name, v_top);
    end if;
  end if;
  insert into public.scores (room_id, game, name, score) values (p_room, p_game, n, p_score);
  insert into public.room_members (room_id, name) values (p_room, n) on conflict do nothing;
  -- un seul meilleur score par joueur, par jeu et par salle
  delete from public.scores s where s.room_id = p_room and s.game = p_game and s.name = n and s.id <> (
    select x.id from public.scores x where x.room_id = p_room and x.game = p_game and x.name = n
    order by x.score desc, x.created_at limit 1);
  delete from public.notifications where created_at < now() - interval '60 days';
end $$;


create function public.get_players(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_photo text, r_updated timestamptz, r_sound text, r_seen timestamptz, r_game text, r_version text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  return query
    select m.name, case when pl.consent then pl.photo end, coalesce(pl.updated_at, m.joined_at), pl.sound, m.last_seen,
      (select pr.game from public.presence pr where pr.room_id = p_room and pr.name = m.name and pr.seen_at > now() - interval '45 seconds'
        order by pr.seen_at desc limit 1), m.last_version
    from public.room_members m left join public.players pl on pl.name = m.name
    where m.room_id = p_room;
end $$;

-- p_sound : null = ne pas toucher au cri, '' = le retirer, sinon le nouveau cri (data:audio/…)
create function public.save_player(p_code text, p_name text, p_photo text, p_consent boolean, p_sound text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12));
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  if n = '' then raise exception 'nom vide'; end if;
  if p_sound is not null and p_sound <> '' and p_sound !~ '^data:audio/' then raise exception 'son invalide'; end if;
  insert into public.players (name, photo, consent, sound, updated_at)
    values (n, case when coalesce(p_consent, false) then p_photo end, coalesce(p_consent, false), nullif(p_sound, ''), now())
  on conflict (name) do update set photo = excluded.photo, consent = excluded.consent,
    sound = case when p_sound is null then public.players.sound else nullif(p_sound, '') end, updated_at = now();
end $$;

create function public.get_notifications(p_code text, p_room bigint, p_room_code text, p_name text)
returns table(r_id bigint, r_actor text, r_game text, r_score int, r_prev int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  return query
    select x.id, x.actor, x.game, x.score, x.prev, x.created_at from public.notifications x
    where x.room_id = p_room and x.target = upper(left(trim(p_name), 12)) and x.created_at > now() - interval '30 days'
    order by x.id desc limit 30;
end $$;


create function public.get_messages(p_code text, p_room bigint, p_room_code text, p_after bigint)
returns table(r_id bigint, r_name text, r_body text, r_kind text, r_game text, r_score int, r_beaten text, r_beaten_score int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if coalesce(p_after, 0) = 0 then
    return query select * from (
      select m.id, m.name, m.body, m.kind, m.game, m.score, m.beaten, m.beaten_score, m.created_at
      from public.messages m where m.room_id = p_room order by m.id desc limit 80) t order by 1;
  else
    return query select m.id, m.name, m.body, m.kind, m.game, m.score, m.beaten, m.beaten_score, m.created_at
      from public.messages m where m.room_id = p_room and m.id > p_after order by m.id limit 100;
  end if;
end $$;

create function public.post_message(p_code text, p_room bigint, p_room_code text, p_name text, p_body text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12)); b text := left(trim(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]+', ' ', 'g')), 300); mid bigint;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' or b = '' then raise exception 'message vide'; end if;
  if (select count(*) from public.messages m where m.room_id = p_room and m.name = n and m.created_at > now() - interval '10 seconds') >= 5
    then raise exception 'trop de messages'; end if;
  insert into public.messages (room_id, name, body) values (p_room, n, b) returning id into mid;
  insert into public.room_members (room_id, name) values (p_room, n) on conflict do nothing;
  delete from public.messages where created_at < now() - interval '90 days';
  return mid;
end $$;

-- un pseudo existe-t-il déjà ? (création d'un joueur : « c'est toi ? » avec sa tête)
create function public.check_name(p_code text, p_name text)
returns table(r_exists boolean, r_photo text, r_sound text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12));
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  return query select
    exists (select 1 from public.players p where p.name = n) or exists (select 1 from public.room_members m where m.name = n)
      or exists (select 1 from public.scores s where s.name = n),
    (select case when p.consent then p.photo end from public.players p where p.name = n),
    (select p.sound from public.players p where p.name = n);
end $$;

create function public.log_error(p_code text, p_name text, p_room bigint, p_game text, p_message text, p_detail text, p_ua text, p_version text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) then return; end if;
  if (select count(*) from public.errors e where e.created_at > now() - interval '1 minute') > 60 then return; end if;   -- anti-avalanche
  insert into public.errors (name, room_id, game, message, detail, ua, version)
    values (upper(left(trim(coalesce(p_name, '')), 12)), p_room, left(p_game, 20), left(p_message, 500), left(p_detail, 4000), left(p_ua, 300), left(p_version, 40));
  delete from public.errors where created_at < now() - interval '30 days';
end $$;

create function public.get_errors(p_code text, p_limit int)
returns table(r_id bigint, r_at timestamptz, r_name text, r_room bigint, r_game text, r_message text, r_detail text, r_ua text, r_version text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  return query select e.id, e.created_at, e.name, e.room_id, e.game, e.message, e.detail, e.ua, e.version
    from public.errors e order by e.id desc limit least(greatest(coalesce(p_limit, 50), 1), 300);
end $$;

-- qui est là, sans les photos ni les cris (appel léger, fait souvent) ; r_updated change quand la tête ou le cri change
create function public.get_presence(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_updated timestamptz, r_seen timestamptz, r_game text, r_version text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  return query
    select m.name, coalesce(pl.updated_at, m.joined_at), m.last_seen,
      (select pr.game from public.presence pr where pr.room_id = p_room and pr.name = m.name and pr.seen_at > now() - interval '45 seconds'
        order by pr.seen_at desc limit 1), m.last_version
    from public.room_members m left join public.players pl on pl.name = m.name
    where m.room_id = p_room;
end $$;

create function public.react(p_code text, p_room bigint, p_room_code text, p_message bigint, p_name text, p_emoji text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12)); e text := left(trim(coalesce(p_emoji, '')), 16);
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' then raise exception 'nom vide'; end if;
  if not exists (select 1 from public.messages m where m.id = p_message and m.room_id = p_room) then raise exception 'message inconnu'; end if;
  if e = '' then
    delete from public.reactions r where r.message_id = p_message and r.name = n;
  else
    insert into public.reactions (message_id, name, emoji) values (p_message, n, e)
      on conflict (message_id, name) do update set emoji = excluded.emoji, created_at = now();
  end if;
end $$;

create function public.get_reactions(p_code text, p_room bigint, p_room_code text)
returns table(r_message bigint, r_emoji text, r_names text[])
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  return query
    select r.message_id, r.emoji, array_agg(r.name order by r.created_at)
    from public.reactions r
    where r.message_id in (select x.id from public.messages x where x.room_id = p_room order by x.id desc limit 150)
    group by r.message_id, r.emoji;
end $$;

-- classement mondial : le meilleur score de chaque joueur, toutes salles confondues (top 10 par jeu)
create function public.get_world_scores(p_code text)
returns table(r_game text, r_name text, r_score int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  return query
    select t.game, t.name, t.score, t.created_at from (
      select b.game, b.name, b.score, b.created_at,
             row_number() over (partition by b.game order by b.score desc, b.created_at) as rn
      from (select distinct on (s.game, s.name) s.game, s.name, s.score, s.created_at
            from public.scores s order by s.game, s.name, s.score desc, s.created_at) b) t
    where t.rn <= 10;
end $$;

create function public.heartbeat(p_code text, p_room bigint, p_client text, p_name text, p_game text, p_version text default null)
returns table(r_game text, r_count int)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  insert into public.presence (client_id, room_id, name, game, seen_at)
    values (left(p_client, 40), p_room, upper(left(trim(p_name), 12)), left(coalesce(p_game, 'menu'), 20), now())
  on conflict (client_id) do update set room_id = excluded.room_id, name = excluded.name, game = excluded.game, seen_at = now();
  delete from public.presence where seen_at < now() - interval '3 minutes';
  -- dernière connexion de chaque membre (pour « vu il y a… »)
  update public.room_members m set last_seen = now(), last_version = coalesce(left(p_version, 40), m.last_version)
    where m.room_id = p_room and m.name = upper(left(trim(p_name), 12));
  return query select pr.game, count(*)::int from public.presence pr
    where pr.room_id = p_room and pr.seen_at > now() - interval '45 seconds' group by pr.game;
end $$;

revoke all on function public.check_code(text), public.room_ok(bigint, text), public.list_rooms(text, text), public.get_world_scores(text),
  public.create_room(text, text, text, text), public.join_room(text, bigint, text, text),
  public.get_scores(text, bigint, text), public.add_score(text, bigint, text, text, text, int),
  public.get_players(text, bigint, text), public.save_player(text, text, text, boolean, text),
  public.heartbeat(text, bigint, text, text, text, text), public.get_notifications(text, bigint, text, text),
  public.get_messages(text, bigint, text, bigint), public.post_message(text, bigint, text, text, text),
  public.check_name(text, text), public.log_error(text, text, bigint, text, text, text, text, text), public.get_errors(text, int), public.get_presence(text, bigint, text),
  public.react(text, bigint, text, bigint, text, text), public.get_reactions(text, bigint, text) from public;
grant execute on function public.check_code(text), public.list_rooms(text, text), public.get_world_scores(text),
  public.create_room(text, text, text, text), public.join_room(text, bigint, text, text),
  public.get_scores(text, bigint, text), public.add_score(text, bigint, text, text, text, int),
  public.get_players(text, bigint, text), public.save_player(text, text, text, boolean, text),
  public.heartbeat(text, bigint, text, text, text, text), public.get_notifications(text, bigint, text, text),
  public.get_messages(text, bigint, text, bigint), public.post_message(text, bigint, text, text, text),
  public.check_name(text, text), public.log_error(text, text, bigint, text, text, text, text, text), public.get_errors(text, int), public.get_presence(text, bigint, text),
  public.react(text, bigint, text, bigint, text, text), public.get_reactions(text, bigint, text) to anon;

-- Relais TURN (Cloudflare Realtime) pour les liaisons de téléphone à téléphone : duel en ligne, regarder un copain jouer.
-- La clé reste ici, sur le serveur : le site ne reçoit que des identifiants temporaires (24 h), et seulement avec le mot de passe du site.
-- Remplace CHANGE-MOI-TURN-ID et CHANGE-MOI-TURN-TOKEN (ligne 10) par les deux codes de la clé TURN Cloudflare. Peut être relancé.
create extension if not exists http with schema extensions;
create table if not exists public.turn_cfg (
  id int primary key default 1 check (id = 1), key_id text not null, token text not null, ice jsonb, until timestamptz);
alter table public.turn_cfg enable row level security;   -- aucune règle : illisible depuis le site
revoke all on public.turn_cfg from anon, authenticated;
insert into public.turn_cfg (id, key_id, token)
  values (1, 'CHANGE-MOI-TURN-ID', 'CHANGE-MOI-TURN-TOKEN')
  on conflict (id) do update set key_id = excluded.key_id, token = excluded.token, ice = null, until = null;

create or replace function public.get_turn(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c public.turn_cfg; r extensions.http_response;
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
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
revoke all on function public.get_turn(text) from public;
grant execute on function public.get_turn(text) to anon;

-- Tête et cri par salle (à coller dans Supabase > SQL Editor, puis Run). Peut être relancé sans risque.
-- Chaque joueur peut avoir, dans une salle, une photo et un cri différents de son profil principal.
-- Rien de spécial pour la salle (null) = la tête et le cri du profil principal (table players).
alter table public.room_members add column if not exists photo text;
alter table public.room_members add column if not exists sound text;
alter table public.room_members add column if not exists look_at timestamptz;
alter table public.room_members drop constraint if exists room_members_photo_check;
alter table public.room_members add constraint room_members_photo_check check (photo is null or char_length(photo) < 400000);
alter table public.room_members drop constraint if exists room_members_sound_check;
alter table public.room_members add constraint room_members_sound_check check (sound is null or char_length(sound) < 300000);

drop function if exists public.save_room_look(text, bigint, text, text, text, text);
drop function if exists public.get_players(text, bigint, text);
drop function if exists public.get_presence(text, bigint, text);

-- p_photo / p_sound : null = ne pas toucher, '' = retirer (on revient au profil principal), sinon la nouvelle valeur
create function public.save_room_look(p_code text, p_room bigint, p_room_code text, p_name text, p_photo text default null, p_sound text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' then raise exception 'nom vide'; end if;
  if p_photo is not null and p_photo <> '' and (p_photo !~ '^data:image/' or char_length(p_photo) >= 400000) then raise exception 'photo invalide'; end if;
  if p_sound is not null and p_sound <> '' and (p_sound !~ '^data:audio/' or char_length(p_sound) >= 300000) then raise exception 'son invalide'; end if;
  insert into public.room_members (room_id, name) values (p_room, n) on conflict do nothing;
  update public.room_members m set
    photo = case when p_photo is null then m.photo else nullif(p_photo, '') end,
    sound = case when p_sound is null then m.sound else nullif(p_sound, '') end,
    look_at = now()
  where m.room_id = p_room and m.name = n;
end $$;

-- la photo et le cri de la salle s'ils existent, sinon ceux du profil principal ; r_updated change aussi quand la tête de la salle change
create function public.get_players(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_photo text, r_updated timestamptz, r_sound text, r_seen timestamptz, r_game text, r_version text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  return query
    select m.name, coalesce(m.photo, case when pl.consent then pl.photo end),
      greatest(coalesce(pl.updated_at, m.joined_at), m.look_at), coalesce(m.sound, pl.sound), m.last_seen,
      (select pr.game from public.presence pr where pr.room_id = p_room and pr.name = m.name and pr.seen_at > now() - interval '45 seconds'
        order by pr.seen_at desc limit 1), m.last_version
    from public.room_members m left join public.players pl on pl.name = m.name
    where m.room_id = p_room;
end $$;

-- qui est là, sans les photos ni les cris (appel léger, fait souvent) ; r_updated change quand la tête ou le cri change
create function public.get_presence(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_updated timestamptz, r_seen timestamptz, r_game text, r_version text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  return query
    select m.name, greatest(coalesce(pl.updated_at, m.joined_at), m.look_at), m.last_seen,
      (select pr.game from public.presence pr where pr.room_id = p_room and pr.name = m.name and pr.seen_at > now() - interval '45 seconds'
        order by pr.seen_at desc limit 1), m.last_version
    from public.room_members m left join public.players pl on pl.name = m.name
    where m.room_id = p_room;
end $$;

revoke all on function public.save_room_look(text, bigint, text, text, text, text), public.get_players(text, bigint, text),
  public.get_presence(text, bigint, text) from public;
grant execute on function public.save_room_look(text, bigint, text, text, text, text), public.get_players(text, bigint, text),
  public.get_presence(text, bigint, text) to anon;

-- Membres des salles (à coller dans Supabase > SQL Editor, puis Run). Peut être relancé sans risque.
-- 1) remove_member : retirer un joueur d'une salle. Le créateur de la salle (rooms.owner) peut retirer n'importe qui ;
--    chacun peut se retirer lui-même (p_by = p_name). Ce qu'on efface en même temps dépend du CHOIX ci-dessous.
--    Quoi qu'on choisisse, le classement de la salle ne montre que les membres actuels (get_scores, records, notifications).
-- 2) On ne devient plus membre « tout seul » : add_score, post_message et save_room_look n'ajoutent plus le joueur à la salle.
--    Seuls create_room (le créateur) et join_room (rejoindre volontairement) ajoutent un membre.

-- >>> CHOIX DE L'EFFACEMENT au retrait d'un membre (choisi : 'salle', option 1 ; le retrait est définitif) : changer UNIQUEMENT le mot entre apostrophes de la ligne « select » ci-dessous.
--   'aucun' : on retire seulement le membre ; ses scores restent en base (cachés dans la salle, visibles au mondial, retrouvés s'il revient).
--   'salle' : option 1, on efface tout ce qui est propre à la salle (scores de la salle, tête et cri de salle, notifications,
--             messages et réactions du chat de la salle, présence) ; son meilleur score par jeu est d'abord recopié dans
--             world_bests pour rester au classement mondial.
--   'tout'  : option 2, pareil que 'salle' mais sans rien garder pour le mondial (les scores faits dans cette salle disparaissent partout ;
--             ceux faits dans d'autres salles ne sont pas touchés).
create or replace function public.member_purge_mode() returns text language sql immutable as $$
  select 'salle'
$$;
revoke all on function public.member_purge_mode() from public;

-- meilleurs scores gardés pour le classement mondial quand les lignes d'une salle sont effacées (option 'salle')
create table if not exists public.world_bests (
  game text not null,
  name text not null,
  score integer not null,
  created_at timestamptz not null default now(),
  primary key (game, name)
);
alter table public.world_bests enable row level security;   -- aucune règle : lu seulement par get_world_scores
revoke all on public.world_bests from anon, authenticated;

drop function if exists public.remove_member(text, bigint, text, text, text);

create function public.remove_member(p_code text, p_room bigint, p_room_code text, p_name text, p_by text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); b text := upper(left(trim(coalesce(p_by, '')), 12)); o text;
  mode text := public.member_purge_mode(); was boolean;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' or b = '' then raise exception 'nom vide'; end if;
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
  end if;
  return was;
end $$;

-- classement de la salle : seulement les membres actuels (un joueur retiré garde ses scores, visibles au mondial)
create or replace function public.get_scores(p_code text, p_room bigint, p_room_code text)
returns table(r_game text, r_name text, r_score int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
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

-- même fonction qu'avant, sans « insert into room_members »
create or replace function public.add_score(p_code text, p_room bigint, p_room_code text, p_game text, p_name text, p_score int)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12)); v_prev int; v_top int; v_top_name text; v_member boolean;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  -- records de la salle : seulement entre membres actuels (un non-membre enregistre son score, sans annonce ni notification)
  v_member := exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n);
  select s.score, s.name into v_top, v_top_name from public.scores s where s.room_id = p_room and s.game = p_game and s.name <> n
    and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = s.name)
    order by s.score desc, s.created_at limit 1;
  select max(s.score) into v_prev from public.scores s where s.room_id = p_room and s.game = p_game and s.name = n;
  -- prévient les joueurs que ce score vient de dépasser (ceux qui étaient devant ou à égalité avant)
  if v_member and (v_prev is null or p_score > v_prev) then
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

-- même fonction qu'avant, sans « insert into room_members »
create or replace function public.post_message(p_code text, p_room bigint, p_room_code text, p_name text, p_body text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(p_name), 12)); b text := left(trim(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]+', ' ', 'g')), 300); mid bigint;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' or b = '' then raise exception 'message vide'; end if;
  if (select count(*) from public.messages m where m.room_id = p_room and m.name = n and m.created_at > now() - interval '10 seconds') >= 5
    then raise exception 'trop de messages'; end if;
  insert into public.messages (room_id, name, body) values (p_room, n, b) returning id into mid;
  delete from public.messages where created_at < now() - interval '90 days';
  return mid;
end $$;

-- même fonction qu'avant (room-look.sql) : ne touche qu'à un membre existant, n'en crée plus
create or replace function public.save_room_look(p_code text, p_room bigint, p_room_code text, p_name text, p_photo text default null, p_sound text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' then raise exception 'nom vide'; end if;
  if p_photo is not null and p_photo <> '' and (p_photo !~ '^data:image/' or char_length(p_photo) >= 400000) then raise exception 'photo invalide'; end if;
  if p_sound is not null and p_sound <> '' and (p_sound !~ '^data:audio/' or char_length(p_sound) >= 300000) then raise exception 'son invalide'; end if;
  update public.room_members m set
    photo = case when p_photo is null then m.photo else nullif(p_photo, '') end,
    sound = case when p_sound is null then m.sound else nullif(p_sound, '') end,
    look_at = now()
  where m.room_id = p_room and m.name = n;
end $$;

-- classement mondial : table scores + meilleurs scores gardés après un retrait (world_bests)
create or replace function public.get_world_scores(p_code text)
returns table(r_game text, r_name text, r_score int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
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

revoke all on function public.remove_member(text, bigint, text, text, text), public.get_scores(text, bigint, text), public.get_world_scores(text), public.add_score(text, bigint, text, text, text, int),
  public.post_message(text, bigint, text, text, text), public.save_room_look(text, bigint, text, text, text, text) from public;
grant execute on function public.remove_member(text, bigint, text, text, text), public.get_scores(text, bigint, text), public.get_world_scores(text), public.add_score(text, bigint, text, text, text, int),
  public.post_message(text, bigint, text, text, text), public.save_room_look(text, bigint, text, text, text, text) to anon;

-- Carte d'avancement (à coller dans Supabase > SQL Editor, puis Run). Peut être relancé sans risque.
-- Le meilleur niveau atteint par chaque joueur, pour chaque jeu, dans chaque salle (Galaxy Wars : secteur, cycles compris ;
-- Plein Gaz : niveau). Le site l'envoie dès qu'un nouveau record de niveau tombe en pleine partie (seulement quand il monte).
-- save_progress : membres de la salle seulement, garde le plus haut niveau. get_progress : la progression des membres actuels.
-- remove_member (members.sql) est remis à jour : retirer un membre efface aussi sa progression dans la salle (options 'salle' et 'tout').
create table if not exists public.progress (
  room_id bigint not null references public.rooms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 12),
  game text not null check (game ~ '^[a-z0-9_-]{2,20}$'),
  level integer not null check (level between 1 and 9999),
  at timestamptz not null default now(),
  primary key (room_id, name, game)
);
alter table public.progress enable row level security;   -- aucune règle : lu et écrit seulement par les fonctions ci-dessous
revoke all on public.progress from anon, authenticated;

drop function if exists public.save_progress(text, bigint, text, text, text, int);
drop function if exists public.get_progress(text, bigint, text);

-- renvoie le meilleur niveau gardé pour ce joueur et ce jeu (null : pas membre de la salle, rien d'enregistré)
create function public.save_progress(p_code text, p_room bigint, p_room_code text, p_name text, p_game text, p_level int) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); v int;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' then raise exception 'nom vide'; end if;
  if p_game is null or p_game !~ '^[a-z0-9_-]{2,20}$' then raise exception 'jeu invalide'; end if;
  if p_level is null or p_level < 1 or p_level > 9999 then raise exception 'niveau invalide'; end if;
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then return null; end if;
  insert into public.progress as g (room_id, name, game, level, at) values (p_room, n, p_game, p_level, now())
    on conflict (room_id, name, game) do update set level = excluded.level, at = excluded.at
    where excluded.level > g.level;
  select g.level into v from public.progress g where g.room_id = p_room and g.name = n and g.game = p_game;
  return v;
end $$;

create function public.get_progress(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_game text, r_level int, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  return query
    select g.name, g.game, g.level, g.at from public.progress g
    where g.room_id = p_room and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = g.name)
    order by g.game, g.level desc, g.at;
end $$;

-- même fonction que members.sql (mêmes paramètres, même résultat), + la progression de la salle effacée avec le reste
create or replace function public.remove_member(p_code text, p_room bigint, p_room_code text, p_name text, p_by text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); b text := upper(left(trim(coalesce(p_by, '')), 12)); o text;
  mode text := public.member_purge_mode(); was boolean;
begin
  if not public.check_code(p_code) or not public.room_ok(p_room, p_room_code) then raise exception 'acces refuse'; end if;
  if n = '' or b = '' then raise exception 'nom vide'; end if;
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
    delete from public.progress g where g.room_id = p_room and g.name = n;   -- carte d'avancement : sa progression dans la salle
  end if;
  return was;
end $$;

revoke all on function public.save_progress(text, bigint, text, text, text, int), public.get_progress(text, bigint, text),
  public.remove_member(text, bigint, text, text, text) from public;
grant execute on function public.save_progress(text, bigint, text, text, text, int), public.get_progress(text, bigint, text),
  public.remove_member(text, bigint, text, text, text) to anon;

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
