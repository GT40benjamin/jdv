-- v162 (borne 2.1.2) : le créateur RETIRE lui-même son jeu de la borne (demande de l'admin : « il manque les options de publication »).
-- Publié dans ses salles ou pour tout le monde → de nouveau en essai (alpha), à lui seul ; une demande mondiale en attente est annulée.
-- Le jeu, ses versions, ses scores et sa boutique sont gardés : il peut le republier quand il veut (at_publier_salle, at_demander_monde).
-- (l'admin a déjà la même chose : at_admin_publier(…, 'non'))
create or replace function public.at_publication_retirer(p_name text, p_fiche uuid)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare n text := public.pg_n(p_name); f public.at_fiches;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  f := pegase_int.at_fiche_de(n, p_fiche);
  if f.id is null then raise exception 'projet inconnu'; end if;
  if f.etat not in ('publie_salle', 'publie_monde') and f.monde_demande_at is null then raise exception 'pas publie'; end if;
  update public.at_fiches x set etat = case when x.etat in ('publie_salle', 'publie_monde') then 'alpha' else x.etat end, monde_demande_at = null, maj_at = now() where x.id = f.id;
  update public.at_demandes d set etat = 'impossible', reponse = '↩️ Demande retirée par toi.', etat_at = now()
    where d.fiche = f.id and d.etat not in ('faite', 'impossible') and d.texte like '🌍 Je demande la mise en ligne mondiale%';
  insert into public.at_messages (fiche, texte, de_atelier) values (f.id, '↩️ Ton jeu n’est plus sur la borne : il reste à toi, en essai, dans l’Atelier. Tu peux le republier quand tu veux.', true);
  return jsonb_build_object('id', f.id, 'etat', 'alpha');
end $function$;
revoke all on function public.at_publication_retirer(text, uuid) from public, anon;
grant execute on function public.at_publication_retirer(text, uuid) to authenticated, service_role;
