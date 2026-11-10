-- Borne 2.1.61 : la salle du compte, connue du serveur (la borne ne dépend plus du seul stockage de l'appareil).
-- La salle de ce pseudo d'abord, puis celle vue le plus récemment. Aucune ligne : le compte n'a vraiment aucune salle.
-- « connexion requise » sans jeton : la borne ne confond jamais ça avec « aucune salle » (list_rooms, lui, répond une liste vide).
create or replace function public.room_recente(p_code text, p_name text default null)
returns table(r_id bigint, r_name text, r_private boolean, r_owner text, r_member boolean, r_seen timestamptz)
language plpgsql stable security definer
set search_path to 'public', 'extensions'
as $$
declare
  n text := upper(left(trim(coalesce(p_name, '')), 12));
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  return query
    select r.id, r.name, r.code_hash is not null, r.owner, bool_or(m.name = n), max(m.last_seen)
    from public.room_members m
    join public.players p on p.name = m.name
    join public.rooms r on r.id = m.room_id
    where public.my_player(p.user_id, p.name)
    group by r.id
    order by bool_or(m.name = n) desc, max(m.last_seen) desc nulls last, r.id desc
    limit 1;
end $$;
revoke all on function public.room_recente(text, text) from public;
grant execute on function public.room_recente(text, text) to authenticated;
notify pgrst, 'reload schema';
