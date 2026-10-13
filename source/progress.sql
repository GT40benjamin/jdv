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
