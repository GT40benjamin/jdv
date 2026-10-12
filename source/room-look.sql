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
