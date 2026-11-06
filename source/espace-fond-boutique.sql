-- SQL v156 + v157 (6 nov. 2026, équipe Jeux, demandes de l'admin sur l'espace du jeu) — DÉJÀ APPLIQUÉS (migrations v156_fond_espace_une_scene,
-- v157_boutique_ventes_fiche). Trace dans le dépôt.
-- v156 : at_espace_fond peint UNE seule scène (le 1er décor de la fiche ; consigne « pas une planche, pas de légende, pas de fond blanc ») ; un fond déjà bon
--        n'est pas repeint ; le fond-planche de Noisette (3 décors légendés) a été remis à zéro puis repeint (i/9924251d-…).
-- v157 : at_boutique_ventes_fiche(p_name, p_fiche) — les articles d'UN jeu (non retirés) pour son créateur, un admin ou le patron, en essai ou publié.
create or replace function public.at_boutique_ventes_fiche(p_name text, p_fiche uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches;
begin
  perform public.acct_check(n);
  select * into f from public.at_fiches x where x.id = p_fiche and x.supprime_at is null;
  if f.id is null then raise exception 'fiche inconnue'; end if;
  if f.name is distinct from n and not exists (select 1 from public.at_admins d where d.name = n) and not coalesce(pegase_int.at_patron(n), false) then
    raise exception 'réservé au créateur du jeu';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('fiche', f.id, 'titre', f.titre, 'id', a.id, 'cle', a.cle, 'nom', a.nom, 'image', a.image, 'prix', a.prix,
      'texte', a.texte, 'conso', coalesce(a.conso, false), 'quantite', coalesce(a.quantite, 1),
      'en_vente', a.actif and a.filtre_ok and a.retire_at is null, 'filtre_ok', a.filtre_ok,
      'ventes', (select count(*) from public.at_boutique_achats b where b.article = a.id and b.rembourse_at is null),
      'gagne', (select coalesce(sum(b.part_createur), 0) from public.at_boutique_achats b where b.article = a.id and b.rembourse_at is null)) order by a.prix, a.nom)
    from public.at_boutique_articles a where a.fiche = f.id and a.retire_at is null), '[]'::jsonb);
end $$;
revoke all on function public.at_boutique_ventes_fiche(text, uuid) from public, anon;
grant execute on function public.at_boutique_ventes_fiche(text, uuid) to authenticated, service_role;
