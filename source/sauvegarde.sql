-- ===== sauvegarde.sql : la partie GARDÉE d'un jeu + les meilleurs coups par niveau (borne 1.43, 27 oct. 2026) =====
-- Premier utilisateur : Coffres à Secrets (casse-tête). On peut quitter à tout moment et retrouver chaque coffre exactement où on l'a laissé,
-- sur un autre appareil aussi (même compte). Invité : rien ici (sauvegarde sur l'appareil seulement, côté borne).
-- game_saves  : UN document JSON par pseudo et par jeu (≤ 200 000 caractères). Le plus RÉCENT gagne : `at` (millisecondes, horloge de
--               l'appareil qui a écrit) ; un appareil resté hors ligne qui renvoie une vieille copie est refusé et reçoit la copie du serveur.
-- level_bests : le meilleur (moins de coups, puis moins de temps) de chaque pseudo sur chaque niveau ; lu par salle (membres seulement).
-- ORDRE : après public.sql (acct_check, room_guard). Relançable : il garde les données. Fonctions à part : rien d'autre ne change.

create table if not exists public.game_saves (
  name text not null,
  game text not null check (game ~ '^[a-z0-9_-]{2,20}$'),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 200000),
  at bigint not null default 0,
  rev integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (name, game)
);
alter table public.game_saves enable row level security;       -- aucune politique : seulement par les fonctions ci-dessous
revoke all on public.game_saves from anon, authenticated;

create table if not exists public.level_bests (
  name text not null,
  game text not null check (game ~ '^[a-z0-9_-]{2,20}$'),
  level text not null check (level ~ '^[a-z0-9_-]{1,20}$'),
  moves integer not null check (moves between 1 and 100000),
  ms integer not null check (ms between 0 and 864000000),
  at timestamptz not null default now(),
  primary key (name, game, level)
);
alter table public.level_bests enable row level security;
revoke all on public.level_bests from anon, authenticated;

-- écrire la partie gardée : p_at = heure de la copie (ms) ; refusée si le serveur a plus récent (r_ok = false + la copie du serveur)
create or replace function public.save_game(p_code text, p_name text, p_game text, p_data jsonb, p_at bigint)
returns table(r_ok boolean, r_at bigint, r_rev integer, r_data jsonb)
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); cur public.game_saves;
begin
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if p_game is null or p_game !~ '^[a-z0-9_-]{2,20}$' then raise exception 'jeu invalide'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) >= 200000 then raise exception 'sauvegarde invalide'; end if;
  if p_at is null or p_at < 0 then raise exception 'heure invalide'; end if;
  select * into cur from public.game_saves g where g.name = n and g.game = p_game for update;
  if found and cur.at > p_at then
    return query select false, cur.at, cur.rev, cur.data; return;
  end if;
  insert into public.game_saves as g (name, game, data, at, rev, updated_at) values (n, p_game, p_data, p_at, 1, now())
    on conflict (name, game) do update set data = excluded.data, at = excluded.at, rev = g.rev + 1, updated_at = now();
  return query select true, p_at, coalesce(cur.rev, 0) + 1, null::jsonb;
end $$;

-- lire la partie gardée (null si aucune)
create or replace function public.get_game_save(p_code text, p_name text, p_game text)
returns table(r_data jsonb, r_at bigint, r_rev integer)
language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  return query select g.data, g.at, g.rev from public.game_saves g where g.name = n and g.game = p_game;
end $$;

-- un niveau réussi : garde le meilleur (moins de coups, puis moins de temps) ; rend vrai si c'est un nouveau record perso
create or replace function public.put_level_best(p_code text, p_name text, p_game text, p_level text, p_moves integer, p_ms integer)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); cur public.level_bests;
begin
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if p_game is null or p_game !~ '^[a-z0-9_-]{2,20}$' or p_level is null or p_level !~ '^[a-z0-9_-]{1,20}$' then raise exception 'niveau invalide'; end if;
  if p_moves is null or p_moves < 1 or p_moves > 100000 or p_ms is null or p_ms < 0 or p_ms > 864000000 then raise exception 'valeur invalide'; end if;
  select * into cur from public.level_bests b where b.name = n and b.game = p_game and b.level = p_level for update;
  if found and (cur.moves < p_moves or (cur.moves = p_moves and cur.ms <= p_ms)) then return false; end if;
  insert into public.level_bests as b (name, game, level, moves, ms, at) values (n, p_game, p_level, p_moves, p_ms, now())
    on conflict (name, game, level) do update set moves = excluded.moves, ms = excluded.ms, at = now();
  return true;
end $$;

-- les meilleurs de la salle sur un niveau (membres seulement)
create or replace function public.get_level_bests(p_code text, p_room bigint, p_room_code text, p_game text, p_level text)
returns table(r_name text, r_moves integer, r_ms integer, r_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  return query select b.name, b.moves, b.ms, b.at from public.level_bests b
    join public.room_members m on m.room_id = p_room and m.name = b.name
    where b.game = p_game and b.level = p_level order by b.moves, b.ms, b.at limit 20;
end $$;

revoke all on function public.save_game(text, text, text, jsonb, bigint), public.get_game_save(text, text, text),
  public.put_level_best(text, text, text, text, integer, integer), public.get_level_bests(text, bigint, text, text, text) from public;
grant execute on function public.save_game(text, text, text, jsonb, bigint), public.get_game_save(text, text, text),
  public.put_level_best(text, text, text, text, integer, integer), public.get_level_bests(text, bigint, text, text, text) to anon, authenticated;

-- TOUS les niveaux d'un jeu d'un coup, pour les membres de la salle (borne 1.46.3 : tableau des copains de Coffres à Secrets)
create or replace function public.get_level_bests_all(p_code text, p_room bigint, p_room_code text, p_game text)
returns table(r_level text, r_name text, r_moves integer, r_ms integer)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  if p_game is null or p_game !~ '^[a-z0-9_-]{2,20}$' then raise exception 'jeu invalide'; end if;
  return query select b.level, b.name, b.moves, b.ms from public.level_bests b
    join public.room_members m on m.room_id = p_room and m.name = b.name
    where b.game = p_game order by b.level, b.moves, b.ms, b.at limit 5000;
end $$;
revoke all on function public.get_level_bests_all(text, bigint, text, text) from public;
grant execute on function public.get_level_bests_all(text, bigint, text, text) to anon, authenticated;
