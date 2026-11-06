-- v159 (borne 2.0.171) : une offre mise de côté (« ⏸️ Plus tard », etat = 'plus_tard') ne compte plus dans « à choisir » (bug du Sorcier :
-- « 💬 1 à choisir » sur la carte, rien à choisir dans le projet). at_tous_projets : n_choisir = offres en 'vue' seulement (et pas
-- remplacées) ; nouveau n_plus_tard = les offres mises de côté. v159b : at_demande_revoir(p_name, p_id) rouvre une offre mise de côté
-- (plus_tard → vue), pour le bouton « Revoir l'offre » de la section « 💤 Mises de côté ».
-- (le corps complet d'at_tous_projets est celui appliqué le 6 nov. 2026 ; voir la migration v159_offres_plus_tard_a_part)

CREATE OR REPLACE FUNCTION public.at_demande_revoir(p_name text, p_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
declare n text := public.pg_n(p_name); k int;
begin
  perform public.acct_check(n);
  update public.at_demandes x set etat = 'vue', etat_at = now(), vu_joueur_at = now() where x.id = p_id and x.name = n and x.etat = 'plus_tard' and x.choix is null and x.remplacee_at is null;
  get diagnostics k = row_count; if k = 0 then raise exception 'demande inconnue'; end if;
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function public.at_demande_revoir(text, uuid) from public, anon;
grant execute on function public.at_demande_revoir(text, uuid) to authenticated, service_role;
