-- Turbo Chrono (jeu Classique « chrono ») : les FANTÔMES — le meilleur temps de chaque joueur sur chaque circuit, avec sa course
-- enregistrée (positions 10 fois par seconde, base64, ≈ 10 Ko par minute). Mêmes règles que les scores : lire les temps d'une salle =
-- en être membre (room_guard) ; enregistrer = un pseudo de mon compte (acct_check) ; le classement mondial est public (sans fantôme) ;
-- télécharger un fantôme = être connecté. Anti-triche simple : circuit connu, temps plus long que le minimum du circuit, fantôme bien
-- formé (en-tête, nombre de passages, passages dans l'ordre, dernier passage = temps annoncé, durée cohérente, pas de bond impossible
-- entre deux points, sauf les retours au dernier point de passage, 12 au plus). Relançable sans perte (if not exists / or replace).

create table if not exists public.chrono_tracks (
  id text primary key check (id ~ '^[a-z0-9_-]{2,20}$'),
  laps int not null check (laps between 1 and 9),
  splits int not null check (splits between 1 and 60),
  min_ms int not null check (min_ms >= 3000)
);
alter table public.chrono_tracks enable row level security;
revoke all on public.chrono_tracks from anon, authenticated;
-- un circuit = ses tours, ses temps de passage (points de passage + ligne, par tour) et le temps sous lequel personne ne peut descendre
insert into public.chrono_tracks (id, laps, splits, min_ms) values
  ('stade', 3, 9, 40000), ('huit', 3, 12, 50000), ('folie', 3, 12, 40000), ('orbite', 3, 12, 52000)
on conflict (id) do update set laps = excluded.laps, splits = excluded.splits, min_ms = excluded.min_ms;

create table if not exists public.chrono_runs (
  track text not null references public.chrono_tracks(id) on delete cascade,
  name text not null references public.players(name) on delete cascade on update cascade,
  ms int not null check (ms between 3000 and 1800000),
  ghost text not null check (char_length(ghost) <= 160000),
  created_at timestamptz not null default now(),
  primary key (track, name)
);
create index if not exists chrono_runs_best on public.chrono_runs (track, ms, created_at);
alter table public.chrono_runs enable row level security;
revoke all on public.chrono_runs from anon, authenticated;

create table if not exists public.chrono_tries (at timestamptz not null default now(), name text not null);
create index if not exists chrono_tries_name on public.chrono_tries (name, at);
alter table public.chrono_tries enable row level security;
revoke all on public.chrono_tries from anon, authenticated;

-- vérifie un fantôme ; rend la raison du refus, ou null s'il est bon
create or replace function public.chrono_check(p_track text, p_ms int, p_ghost text) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare t public.chrono_tracks; b bytea; n int; ns int; i int; o int; prev bigint := 0; v bigint; jumps int := 0;
  x0 int; y0 int; z0 int; x1 int; y1 int; z1 int;
begin
  select * into t from public.chrono_tracks where id = p_track;
  if not found then return 'circuit inconnu'; end if;
  if p_ms is null or p_ms < t.min_ms or p_ms > 1800000 then return 'temps impossible'; end if;
  begin b := decode(coalesce(p_ghost, ''), 'base64'); exception when others then return 'fantome illisible'; end;
  if length(b) < 13 or get_byte(b, 0) <> 84 or get_byte(b, 1) <> 67 or get_byte(b, 2) <> 1 then return 'fantome illisible'; end if;
  if get_byte(b, 3) <> t.laps or get_byte(b, 4) <> 100 then return 'fantome illisible'; end if;
  n := get_byte(b, 5) + get_byte(b, 6) * 256;
  v := get_byte(b, 7) + get_byte(b, 8) * 256 + get_byte(b, 9) * 65536 + get_byte(b, 10)::bigint * 16777216;
  if abs(v - p_ms) > 1 then return 'temps different'; end if;
  ns := get_byte(b, 11);
  if ns <> t.splits then return 'passages manquants'; end if;
  if length(b) <> 13 + ns * 4 + n * 12 then return 'fantome illisible'; end if;
  if n * 100 < p_ms - 100 or n * 100 > p_ms + 300 then return 'fantome trop court'; end if;
  for i in 0 .. ns - 1 loop
    o := 12 + i * 4;
    v := get_byte(b, o) + get_byte(b, o + 1) * 256 + get_byte(b, o + 2) * 65536 + get_byte(b, o + 3)::bigint * 16777216;
    if v <= prev then return 'passages dans le desordre'; end if;
    prev := v;
  end loop;
  if abs(prev - p_ms) > 1 then return 'temps different'; end if;
  -- la course : départ près de la ligne, pas plus de 12 m entre deux points (×50 : 2 cm), sauf les retours au dernier passage
  o := 13 + ns * 4;
  for i in 0 .. n - 1 loop
    x1 := get_byte(b, o) + get_byte(b, o + 1) * 256; if x1 >= 32768 then x1 := x1 - 65536; end if;
    y1 := get_byte(b, o + 2) + get_byte(b, o + 3) * 256; if y1 >= 32768 then y1 := y1 - 65536; end if;
    z1 := get_byte(b, o + 4) + get_byte(b, o + 5) * 256; if z1 >= 32768 then z1 := z1 - 65536; end if;
    if i = 0 then
      if abs(x1) > 500 or abs(y1) > 500 or abs(z1) > 500 then return 'depart loin de la ligne'; end if;
    elsif (x1 - x0)::bigint * (x1 - x0) + (y1 - y0)::bigint * (y1 - y0) + (z1 - z0)::bigint * (z1 - z0) > 360000 then
      jumps := jumps + 1;
      if jumps > 12 then return 'trajectoire impossible'; end if;
    end if;
    x0 := x1; y0 := y1; z0 := z1; o := o + 12;
  end loop;
  return null;
end $$;

-- les temps d'un circuit : ceux des membres de ma salle (p_room, membres seulement), le top 10 du monde (public, sans fantôme),
-- et mon meilleur temps (p_name, si c'est un pseudo de mon compte)
create or replace function public.chrono_board(p_code text, p_room bigint, p_track text, p_name text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare r jsonb := '[]'::jsonb; w jsonb; me jsonb := null; n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  if p_room is not null then
    perform public.room_guard(p_room);
    select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'ms', c.ms, 'at', c.created_at) order by c.ms, c.created_at), '[]'::jsonb) into r
      from public.chrono_runs c where c.track = p_track and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = c.name);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'ms', x.ms) order by x.ms, x.created_at), '[]'::jsonb) into w
    from (select c.name, c.ms, c.created_at from public.chrono_runs c where c.track = p_track order by c.ms, c.created_at limit 10) x;
  if n <> '' and public.acct_own(n) then
    select jsonb_build_object('name', c.name, 'ms', c.ms, 'at', c.created_at) into me from public.chrono_runs c where c.track = p_track and c.name = n;
  end if;
  return jsonb_build_object('room', r, 'world', w, 'me', me);
end $$;

-- le fantôme d'un joueur sur un circuit (compte connecté)
create or replace function public.chrono_ghost(p_code text, p_track text, p_name text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare c public.chrono_runs;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  select * into c from public.chrono_runs where track = p_track and name = upper(left(trim(coalesce(p_name, '')), 12));
  if not found then return null; end if;
  return jsonb_build_object('name', c.name, 'ms', c.ms, 'ghost', c.ghost);
end $$;

-- enregistre mon temps s'il bat le mien : { ok, best (mon meilleur temps), kept (vrai = l'ancien était meilleur), why (refus) }
create or replace function public.chrono_save(p_code text, p_name text, p_track text, p_ms int, p_ghost text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); why text; old int;
begin
  perform public.acct_check(n);
  if (select count(*) from public.chrono_tries x where x.name = n and x.at > now() - interval '10 minutes') >= 40 then
    return jsonb_build_object('ok', false, 'why', 'trop d essais');
  end if;
  insert into public.chrono_tries (name) values (n);
  delete from public.chrono_tries where at < now() - interval '1 day';
  if char_length(coalesce(p_ghost, '')) > 160000 then return jsonb_build_object('ok', false, 'why', 'fantome trop lourd'); end if;
  why := public.chrono_check(p_track, p_ms, p_ghost);
  if why is not null then return jsonb_build_object('ok', false, 'why', why); end if;
  select ms into old from public.chrono_runs where track = p_track and name = n;
  if old is not null and old <= p_ms then return jsonb_build_object('ok', true, 'best', old, 'kept', true); end if;
  insert into public.chrono_runs (track, name, ms, ghost) values (p_track, n, p_ms, p_ghost)
    on conflict (track, name) do update set ms = excluded.ms, ghost = excluded.ghost, created_at = now();
  return jsonb_build_object('ok', true, 'best', p_ms, 'kept', false);
end $$;

revoke all on function public.chrono_check(text, int, text) from public, anon, authenticated;
revoke all on function public.chrono_board(text, bigint, text, text), public.chrono_ghost(text, text, text),
  public.chrono_save(text, text, text, int, text) from public;
grant execute on function public.chrono_board(text, bigint, text, text), public.chrono_ghost(text, text, text),
  public.chrono_save(text, text, text, int, text) to anon, authenticated;
