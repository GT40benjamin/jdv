-- SQL v155 (6 nov. 2026, équipe Jeux, onglet Boutique de l'espace du jeu) :
-- 1) at_boutique_mes_ventes rend aussi la petite phrase (texte), consommable (conso), quantite et « retire » (l'article n'est plus en vente
--    parce que le créateur l'a retiré) ; la liste ne montre plus les articles retirés.
-- 2) at_boutique_retirer(p_name, p_article) : retire un article de la vente. Réservé au créateur du jeu ou à un admin. Ne supprime AUCUN achat :
--    les joueurs qui l'ont acheté le gardent (at_boutique_achats n'est pas touché), l'article reste en base (retire_at = maintenant, actif = false).
create or replace function public.at_boutique_mes_ventes(p_name text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  return coalesce((select jsonb_agg(jsonb_build_object('fiche', f.id, 'titre', f.titre, 'id', a.id, 'cle', a.cle, 'nom', a.nom, 'image', a.image, 'prix', a.prix,
      'texte', a.texte, 'conso', coalesce(a.conso, false), 'quantite', coalesce(a.quantite, 1),
      'en_vente', a.actif and a.filtre_ok and a.retire_at is null, 'filtre_ok', a.filtre_ok,
      'ventes', (select count(*) from public.at_boutique_achats b where b.article = a.id and b.rembourse_at is null),
      'gagne', (select coalesce(sum(b.part_createur), 0) from public.at_boutique_achats b where b.article = a.id and b.rembourse_at is null)) order by f.titre, a.prix)
    from public.at_boutique_articles a join public.at_fiches f on f.id = a.fiche where f.name = n and f.supprime_at is null and a.retire_at is null), '[]'::jsonb);
end $$;

create or replace function public.at_boutique_retirer(p_name text, p_article uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); a public.at_boutique_articles; proprio text;
begin
  perform public.acct_check(n);
  select * into a from public.at_boutique_articles x where x.id = p_article;
  if a.id is null then raise exception 'article inconnu'; end if;
  select f.name into proprio from public.at_fiches f where f.id = a.fiche;
  if proprio is distinct from n and not exists (select 1 from public.at_admins d where d.name = n) and not coalesce(pegase_int.at_patron(n), false) then
    raise exception 'réservé au créateur du jeu';
  end if;
  update public.at_boutique_articles set retire_at = coalesce(retire_at, now()), actif = false where id = a.id;
  return jsonb_build_object('ok', true, 'id', a.id, 'achats_gardes', (select count(*) from public.at_boutique_achats b where b.article = a.id and b.rembourse_at is null));
end $$;
revoke all on function public.at_boutique_retirer(text, uuid) from public, anon;
grant execute on function public.at_boutique_retirer(text, uuid) to authenticated, service_role;
