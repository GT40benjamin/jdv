-- ===== score-corrige.sql : « Joué par » sur l'écran de fin (borne 1.37, 26 oct. 2026) =====
-- On s'est trompé de joueur (« ce n'était pas PATOU ») : la borne REPREND le score qu'elle vient d'enregistrer pour le mauvais pseudo,
-- remet son record d'avant (p_prev, connu de l'appareil), retire la notification « X a battu ton record » et la carte « record » du chat
-- qu'il avait créées, puis enregistre le score pour le bon joueur (add_score, inchangé).
-- Garde-fous : le pseudo doit être au compte connecté (acct_check) et membre de la salle (room_guard) ; seulement un score de moins de
-- 30 minutes, du même jeu, exactement ce score ; p_prev < p_score. Rien d'autre n'est touché. ORDRE : APRÈS public.sql. Peut être relancé.

create or replace function public.take_back_score(p_code text, p_room bigint, p_room_code text, p_game text, p_name text, p_score int, p_prev int default 0)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); v_id bigint;
begin
  perform public.room_guard(p_room);
  perform public.acct_check(n);
  select s.id into v_id from public.scores s
    where s.room_id = p_room and s.game = p_game and s.name = n and s.score = p_score and s.created_at > now() - interval '30 minutes'
    order by s.created_at desc limit 1;
  if v_id is null then return false; end if;
  delete from public.scores s where s.id = v_id;
  if coalesce(p_prev, 0) > 0 and p_prev < p_score then
    insert into public.scores (room_id, game, name, score) values (p_room, p_game, n, p_prev);
  end if;
  delete from public.notifications x where x.room_id = p_room and x.actor = n and x.game = p_game and x.score = p_score
    and x.created_at > now() - interval '30 minutes';
  delete from public.messages x where x.room_id = p_room and x.name = n and x.kind = 'record' and x.game = p_game and x.score = p_score
    and x.created_at > now() - interval '30 minutes';
  return true;
end $$;

revoke all on function public.take_back_score(text, bigint, text, text, text, int, int) from public;
grant execute on function public.take_back_score(text, bigint, text, text, text, int, int) to anon, authenticated;
