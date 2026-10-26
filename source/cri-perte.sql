-- ===== cri-perte.sql : le CRI DE PERTE (borne 1.37, 26 oct. 2026) =====
-- À côté du cri (players.sound, devenu le « cri de victoire »), chaque joueur peut enregistrer un cri de perte, joué quand il perd
-- (fin de partie : celui qu'on vient de battre ; duel : le perdant ; Coop : l'équipe battue). Aussi par salle (room_members.sound_lose),
-- comme la tête et le cri par salle (room-look.sql).
-- Fonctions À PART : save_player, save_room_look, get_players, get_presence, check_name et get_my_players ne changent pas
-- (les anciennes bornes marchent comme avant ; relancer public.sql seul ne touche à rien ici).
-- ORDRE : APRÈS public.sql (room_guard, acct_check). Peut être relancé : il garde les données.

alter table public.players add column if not exists sound_lose text;
alter table public.room_members add column if not exists sound_lose text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'players_sound_lose_check') then
    alter table public.players add constraint players_sound_lose_check check (sound_lose is null or char_length(sound_lose) < 300000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'room_members_sound_lose_check') then
    alter table public.room_members add constraint room_members_sound_lose_check check (sound_lose is null or char_length(sound_lose) < 300000);
  end if;
end $$;

-- cri de perte du profil principal : null = inchangé, '' = retirer ; le pseudo doit être au compte connecté (acct_check)
create or replace function public.save_lose_sound(p_code text, p_name text, p_sound text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if p_sound is null then return; end if;
  if p_sound <> '' and (p_sound !~ '^data:audio/' or char_length(p_sound) >= 300000) then raise exception 'son invalide'; end if;
  update public.players set sound_lose = nullif(p_sound, ''), updated_at = now() where name = n;
end $$;

-- cri de perte seulement dans une salle (membre existant) : null = inchangé, '' = reprendre celui du profil principal
create or replace function public.save_room_lose_sound(p_code text, p_room bigint, p_room_code text, p_name text, p_sound text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  perform public.room_guard(p_room);
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if p_sound is null then return; end if;
  if p_sound <> '' and (p_sound !~ '^data:audio/' or char_length(p_sound) >= 300000) then raise exception 'son invalide'; end if;
  update public.room_members m set sound_lose = nullif(p_sound, ''), look_at = now() where m.room_id = p_room and m.name = n;
end $$;

-- les cris de perte des membres de la salle (celui de la salle, sinon celui du profil principal) ; seulement ceux qui en ont un
create or replace function public.get_lose_sounds(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_sound_lose text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  return query
    select m.name, coalesce(m.sound_lose, pl.sound_lose)
    from public.room_members m left join public.players pl on pl.name = m.name
    where m.room_id = p_room and coalesce(m.sound_lose, pl.sound_lose) is not null;
end $$;

-- mes pseudos (compte connecté) et leur cri de perte : sert à le retrouver sur un autre appareil
create or replace function public.get_my_lose_sounds(p_code text)
returns table(r_name text, r_sound_lose text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  return query select p.name, p.sound_lose
    from public.players p where auth.uid() is not null and p.user_id = auth.uid() and p.sound_lose is not null order by p.name;
end $$;

revoke all on function public.save_lose_sound(text, text, text), public.save_room_lose_sound(text, bigint, text, text, text),
  public.get_lose_sounds(text, bigint, text), public.get_my_lose_sounds(text) from public;
grant execute on function public.save_lose_sound(text, text, text), public.save_room_lose_sound(text, bigint, text, text, text),
  public.get_lose_sounds(text, bigint, text), public.get_my_lose_sounds(text) to anon, authenticated;
