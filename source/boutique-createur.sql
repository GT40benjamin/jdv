-- v153 (borne 2.0.153) : le CRÉATEUR possède d'office les articles de sa propre boutique (décision du chef, 6 nov. : SAMBA dans Noisette,
-- PATOU dans les Licornes) — at_boutique_liste : mien (même pseudo, même compte ou famille, comme le refus d'achat) ⇒ possede = vrai, stock
-- illimité (9999) pour un consommable ; at_boutique_consommer ne retire rien au créateur. Aucun crédit ne bouge, aucune vente n'est inscrite.
create or replace function pegase_int.at_boutique_mien(p_cr text, p_n text) returns boolean language sql stable security definer set search_path to 'public', 'extensions' as $f$
  select coalesce(p_cr, '') <> '' and coalesce(p_n, '') <> '' and (p_cr = p_n
    or exists (select 1 from public.players x join public.players y on y.user_id = x.user_id where x.name = p_n and y.name = p_cr and x.user_id is not null)
    or exists (select 1 from public.player_parents pp join public.players q on q.user_id = pp.parent where (pp.name = p_cr and q.name = p_n) or (pp.name = p_n and q.name = p_cr)))
$f$;
revoke all on function pegase_int.at_boutique_mien(text, text) from public, anon, authenticated;

create or replace function public.at_boutique_liste(p_name text, p_jeu text)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions' as $function$
declare n text := public.pg_n(p_name); taux numeric := coalesce(pegase_int.at_reglage('abo_prix'), 300)::numeric / greatest(coalesce(pegase_int.at_reglage('abo_credits'), 400), 1);
  plaf int := coalesce(pegase_int.at_reglage('boutique_plafond_mois'), 300); dep int;
begin
  if n <> '' and public.acct_own(n) then
    select coalesce(sum(a.prix), 0) into dep from public.at_boutique_achats a where a.acheteur = n and a.rembourse_at is null and a.at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  end if;
  return jsonb_build_object('plafond_mois', plaf, 'depense_mois', coalesce(dep, 0), 'articles', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'cle', a.cle, 'nom', a.nom, 'texte', a.texte, 'image', a.image, 'prix', a.prix, 'euros_cents', round(a.prix * taux), 'conso', a.conso, 'quantite', a.quantite, 'stock', case when pegase_int.at_boutique_mien(f.name, n) then 9999 else (select greatest(0, count(*)::int * a.quantite - coalesce((select u.utilise from public.at_boutique_usage u where u.article = a.id and u.acheteur = n), 0)) from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null) end,
      'possede', pegase_int.at_boutique_mien(f.name, n) or exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'nb', (select count(*) from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'mien', pegase_int.at_boutique_mien(f.name, n)) order by a.prix, a.nom)
    from public.at_boutique_articles a join public.at_fiches f on f.id = a.fiche
    where a.jeu = lower(p_jeu) and ((a.actif and a.filtre_ok and a.retire_at is null) or exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null))), '[]'::jsonb));
end $function$;


create or replace function public.at_boutique_consommer(p_name text, p_jeu text, p_cle text, p_n integer default 1)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare n text := public.pg_n(p_name); a public.at_boutique_articles; tot int; u int; q int := coalesce(p_n, 1);
begin
  perform public.acct_check(n);
  if q < 1 or q > 1000 then raise exception 'nombre invalide'; end if;
  perform pg_advisory_xact_lock(hashtext('boutique:' || n));
  select * into a from public.at_boutique_articles x where x.jeu = lower(p_jeu) and x.cle = lower(p_cle); if a.id is null then raise exception 'article inconnu'; end if;
  if not a.conso then raise exception 'pas un consommable'; end if;
  if pegase_int.at_boutique_mien((select x.name from public.at_fiches x where x.id = a.fiche), n) then return jsonb_build_object('ok', true, 'stock', 9999, 'illimite', true); end if;   -- v153 : le créateur ne compte pas
  select count(*)::int * a.quantite into tot from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null;
  select coalesce((select x.utilise from public.at_boutique_usage x where x.article = a.id and x.acheteur = n), 0) into u;
  if tot - u < q then return jsonb_build_object('ok', false, 'stock', greatest(0, tot - u)); end if;
  insert into public.at_boutique_usage (article, acheteur, utilise) values (a.id, n, q)
    on conflict (article, acheteur) do update set utilise = at_boutique_usage.utilise + q, maj_at = now();
  return jsonb_build_object('ok', true, 'stock', tot - u - q);
end $function$;
revoke all on function public.at_boutique_consommer(text, text, text, integer) from public, anon;
grant execute on function public.at_boutique_consommer(text, text, text, integer) to authenticated;
