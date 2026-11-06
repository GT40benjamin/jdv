-- v158 (borne 2.0.168) : les AVANTAGES d'un article de boutique, une ligne par avantage (page détail de la vitrine : « propre et carré »).
-- at_boutique_poser(…, p_avantages text[]) : null = garde, '{}' = efface ; 8 lignes au plus, 90 caractères chacune, passées au filtre.
-- Une ligne peut commencer par son emoji (« 🦄 Comble toute une série ») ; sinon la vitrine met ✔. at_boutique_liste rend 'avantages' (tableau).
alter table public.at_boutique_articles add column if not exists avantages text[];

create or replace function public.at_boutique_liste(p_name text, p_jeu text)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions' as $function$
declare n text := public.pg_n(p_name); taux numeric := coalesce(pegase_int.at_reglage('abo_prix'), 300)::numeric / greatest(coalesce(pegase_int.at_reglage('abo_credits'), 400), 1);
  plaf int := coalesce(pegase_int.at_reglage('boutique_plafond_mois'), 300); dep int;
begin
  if n <> '' and public.acct_own(n) then
    select coalesce(sum(a.prix), 0) into dep from public.at_boutique_achats a where a.acheteur = n and a.rembourse_at is null and a.at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  end if;
  return jsonb_build_object('plafond_mois', plaf, 'depense_mois', coalesce(dep, 0), 'articles', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'cle', a.cle, 'nom', a.nom, 'texte', a.texte, 'avantages', coalesce(to_jsonb(a.avantages), '[]'::jsonb), 'image', a.image, 'prix', a.prix, 'euros_cents', round(a.prix * taux), 'conso', a.conso, 'quantite', a.quantite, 'stock', case when pegase_int.at_boutique_mien(f.name, n) then 9999 else (select greatest(0, count(*)::int * a.quantite - coalesce((select u.utilise from public.at_boutique_usage u where u.article = a.id and u.acheteur = n), 0)) from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null) end,
      'possede', pegase_int.at_boutique_mien(f.name, n) or exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'nb', (select count(*) from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'mien', pegase_int.at_boutique_mien(f.name, n)) order by a.prix, a.nom)
    from public.at_boutique_articles a join public.at_fiches f on f.id = a.fiche
    where a.jeu = lower(p_jeu) and ((a.actif and a.filtre_ok and a.retire_at is null) or exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null))), '[]'::jsonb));
end $function$;

drop function if exists public.at_boutique_poser(uuid, text, text, integer, text, boolean, integer, text);
create or replace function public.at_boutique_poser(p_fiche uuid, p_cle text, p_nom text, p_prix integer, p_image text default null, p_conso boolean default null, p_quantite integer default null, p_texte text default null, p_avantages text[] default null)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare f public.at_fiches; k text := left(lower(btrim(coalesce(p_cle, ''))), 40); nm text := left(btrim(coalesce(p_nom, '')), 60); tx text := nullif(left(btrim(coalesce(p_texte, '')), 140), ''); ok boolean; aid uuid;
  av text[] := case when p_avantages is null then null else coalesce((select array_agg(left(btrim(x), 90) order by i) from unnest(p_avantages) with ordinality u(x, i) where btrim(coalesce(x, '')) <> '' and i <= 8), '{}'::text[]) end;
begin
  if pegase_int.at_joueur_appel() then raise exception 'reserve'; end if;
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null or f.jeu is null then raise exception 'projet sans jeu'; end if;
  if k !~ '^[a-z0-9_-]{1,40}$' or nm = '' then raise exception 'article invalide'; end if;
  if p_image is not null and p_image !~ '^i/[0-9a-f-]{36}[.](png|jpg|webp)$' then raise exception 'image invalide'; end if;
  if p_quantite is not null and (p_quantite < 1 or p_quantite > 1000) then raise exception 'quantite invalide'; end if;
  ok := pegase_int.at_filtre(nm) = '' and (tx is null or pegase_int.at_filtre(tx) = '') and (av is null or not exists (select 1 from unnest(av) y where pegase_int.at_filtre(y) <> ''));
  insert into public.at_boutique_articles (fiche, jeu, cle, nom, image, prix, filtre_ok, conso, quantite, texte, avantages) values (f.id, f.jeu, k, nm, p_image, p_prix, ok, coalesce(p_conso, false), coalesce(p_quantite, 1), tx, av)
    on conflict (jeu, cle) do update set nom = excluded.nom, image = excluded.image, prix = excluded.prix, filtre_ok = excluded.filtre_ok, actif = true, retire_at = null,
      conso = coalesce(p_conso, at_boutique_articles.conso), quantite = coalesce(p_quantite, at_boutique_articles.quantite), texte = case when p_texte is null then at_boutique_articles.texte else tx end,
      avantages = case when p_avantages is null then at_boutique_articles.avantages else av end
    returning at_boutique_articles.id into aid;
  return jsonb_build_object('id', aid, 'filtre_ok', ok);
end $function$;
revoke all on function public.at_boutique_poser(uuid, text, text, integer, text, boolean, integer, text, text[]) from public, anon, authenticated;
