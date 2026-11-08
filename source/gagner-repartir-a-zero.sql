-- ===== gagner-repartir-a-zero.sql : remettre les scores d'un jeu à zéro pour tout le monde, à chaque publication mondiale (décision de l'admin, 8 nov. 2026) =====
-- REJOUABLE. Crée seulement la fonction : ELLE N'EFFACE RIEN TANT QU'ON NE L'APPELLE PAS. Réservée au serveur (aucun droit pour la page).
-- Appel, pour un jeu : select pegase_int.gc_repartir_a_zero('noisette');
-- Efface, pour ce jeu (id exact, ou id suivi d'un tiret : pigeon, pigeon-xxx) :
--   public.scores (classements des salles) · public.world_bests (records gardés au mondial) · public.level_bests (temps et points par niveau).
-- Ne touche PAS : la progression sur la carte (progress), les parties gardées (game_saves), les notifications et les messages du chat,
-- les crédits déjà versés, ni pegase_int.gc_records (un joueur déjà payé sur un niveau reste payé).
-- Refuse un jeu qui n'est pas un jeu de l'Atelier (at_fiches), pour qu'une erreur de frappe ne puisse pas vider un jeu du studio.
create or replace function pegase_int.gc_repartir_a_zero(p_jeu text) returns jsonb language plpgsql security definer set search_path = public as $$
declare a int; b int; c int;
begin
  if p_jeu is null or p_jeu !~ '^[a-z0-9_]{2,20}$' then raise exception 'jeu invalide'; end if;
  if not exists (select 1 from public.at_fiches f where f.jeu = p_jeu and f.etat <> 'supprime') then raise exception 'pas un jeu de l Atelier : %', p_jeu; end if;
  delete from public.scores s where s.game = p_jeu or s.game like p_jeu || '-%'; get diagnostics a = row_count;
  delete from public.world_bests w where w.game = p_jeu or w.game like p_jeu || '-%'; get diagnostics b = row_count;
  delete from public.level_bests l where l.game = p_jeu or l.game like p_jeu || '-%'; get diagnostics c = row_count;
  return jsonb_build_object('jeu', p_jeu, 'scores', a, 'world_bests', b, 'level_bests', c);
end $$;
revoke all on function pegase_int.gc_repartir_a_zero(text) from public, anon, authenticated;
