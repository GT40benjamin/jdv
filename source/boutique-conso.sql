-- v150 (borne 2.0.146) : articles CONSOMMABLES dans la boutique d'un jeu de l'Atelier (Explorateur V17 : packs d'Astrobal rachetables).
-- at_boutique_articles.conso = vrai : l'article se rachète autant de fois qu'on veut (chaque achat débite et crédite le créateur) ;
-- at_boutique_liste donne aussi 'conso' et 'nb' (achats non remboursés de ce joueur) ; at_boutique_poser(…, p_conso) le règle.
alter table public.at_boutique_articles add column if not exists conso boolean not null default false;
-- un consommable s'achète plusieurs fois : l'unicité (article, acheteur) passe dans at_boutique_acheter (verrou par acheteur)
alter table public.at_boutique_achats drop constraint if exists at_boutique_achats_article_acheteur_key;
create index if not exists at_boutique_achats_article on public.at_boutique_achats (article, acheteur);

create or replace function public.at_boutique_acheter(p_name text, p_article uuid)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare n text := public.pg_n(p_name); a public.at_boutique_articles; cr text; part int; com int; s int; plaf int := coalesce(pegase_int.at_reglage('boutique_plafond_mois'), 300); dep int; i uuid;
begin
  perform public.acct_check(n);
  perform pg_advisory_xact_lock(hashtext('boutique:' || n));
  select * into a from public.at_boutique_articles x where x.id = p_article; if a.id is null then raise exception 'article inconnu'; end if;
  if not a.conso and exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null) then
    return jsonb_build_object('ok', true, 'deja', true, 'solde', pegase_int.at_solde(n)); end if;   -- v150 : un consommable se rachète
  if not (a.actif and a.filtre_ok and a.retire_at is null) then raise exception 'pas en vente'; end if;
  select f.name into cr from public.at_fiches f where f.id = a.fiche;
  if cr = n or exists (select 1 from public.players x join public.players y on y.user_id = x.user_id where x.name = n and y.name = cr and x.user_id is not null)
     or exists (select 1 from public.player_parents pp join public.players q on q.user_id = pp.parent where (pp.name = cr and q.name = n) or (pp.name = n and q.name = cr)) then raise exception 'ton propre jeu'; end if;
  select coalesce(sum(b.prix), 0) into dep from public.at_boutique_achats b where b.acheteur = n and b.rembourse_at is null and b.at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  if dep + a.prix > plaf then raise exception 'plafond du mois'; end if;
  part := floor(a.prix * coalesce(pegase_int.at_reglage('boutique_part_createur'), 100) / 100.0)::int; com := a.prix - part;
  s := pegase_int.at_debiter(n, a.prix);
  perform pegase_int.at_crediter(cr, part);
  insert into public.at_boutique_achats (article, acheteur, createur, prix, part_createur, commission) values (a.id, n, cr, a.prix, part, com) returning id into i;
  return jsonb_build_object('ok', true, 'id', i, 'cle', a.cle, 'solde', s, 'prix', a.prix, 'conso', a.conso,
    'nb', (select count(*) from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null));
end $function$;

create or replace function public.at_boutique_liste(p_name text, p_jeu text)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions' as $function$
declare n text := public.pg_n(p_name); taux numeric := coalesce(pegase_int.at_reglage('abo_prix'), 300)::numeric / greatest(coalesce(pegase_int.at_reglage('abo_credits'), 400), 1);
  plaf int := coalesce(pegase_int.at_reglage('boutique_plafond_mois'), 300); dep int;
begin
  if n <> '' and public.acct_own(n) then
    select coalesce(sum(a.prix), 0) into dep from public.at_boutique_achats a where a.acheteur = n and a.rembourse_at is null and a.at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  end if;
  return jsonb_build_object('plafond_mois', plaf, 'depense_mois', coalesce(dep, 0), 'articles', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'cle', a.cle, 'nom', a.nom, 'image', a.image, 'prix', a.prix, 'euros_cents', round(a.prix * taux), 'conso', a.conso,
      'possede', exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'nb', (select count(*) from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'mien', f.name = n) order by a.prix, a.nom)
    from public.at_boutique_articles a join public.at_fiches f on f.id = a.fiche
    where a.jeu = lower(p_jeu) and ((a.actif and a.filtre_ok and a.retire_at is null) or exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null))), '[]'::jsonb));
end $function$;

drop function if exists public.at_boutique_poser(uuid, text, text, integer, text);
create or replace function public.at_boutique_poser(p_fiche uuid, p_cle text, p_nom text, p_prix integer, p_image text default null, p_conso boolean default null)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare f public.at_fiches; k text := left(lower(btrim(coalesce(p_cle, ''))), 40); nm text := left(btrim(coalesce(p_nom, '')), 60); ok boolean; aid uuid;
begin
  if pegase_int.at_joueur_appel() then raise exception 'reserve'; end if;
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null or f.jeu is null then raise exception 'projet sans jeu'; end if;
  if k !~ '^[a-z0-9_-]{1,40}$' or nm = '' then raise exception 'article invalide'; end if;
  if p_image is not null and p_image !~ '^i/[0-9a-f-]{36}[.](png|jpg|webp)$' then raise exception 'image invalide'; end if;
  ok := pegase_int.at_filtre(nm) = '';
  insert into public.at_boutique_articles (fiche, jeu, cle, nom, image, prix, filtre_ok, conso) values (f.id, f.jeu, k, nm, p_image, p_prix, ok, coalesce(p_conso, false))
    on conflict (jeu, cle) do update set nom = excluded.nom, image = excluded.image, prix = excluded.prix, filtre_ok = excluded.filtre_ok, actif = true, retire_at = null,
      conso = coalesce(p_conso, at_boutique_articles.conso)
    returning at_boutique_articles.id into aid;
  return jsonb_build_object('id', aid, 'filtre_ok', ok);
end $function$;
revoke all on function public.at_boutique_poser(uuid, text, text, integer, text, boolean) from public, anon, authenticated;
