-- v151 (borne 2.0.147) : QUANTITÉ des consommables (chef, Explorateur V17 : packs d'Astrobal). Un article conso a une taille de pack
-- (at_boutique_articles.quantite, 1 par défaut) ; chaque achat ajoute « quantite » unités ; le jeu les UTILISE par at_boutique_consommer
-- (table at_boutique_usage) ; at_boutique_liste / at_boutique_acheter rendent 'quantite' et 'stock' (unités qui restent).
alter table public.at_boutique_articles add column if not exists quantite integer not null default 1;
create table if not exists public.at_boutique_usage (article uuid not null references public.at_boutique_articles(id) on delete cascade, acheteur text not null,
  utilise integer not null default 0 check (utilise >= 0), maj_at timestamptz not null default now(), primary key (article, acheteur));
alter table public.at_boutique_usage enable row level security;

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
  return jsonb_build_object('ok', true, 'id', i, 'cle', a.cle, 'solde', s, 'prix', a.prix, 'conso', a.conso, 'quantite', a.quantite,
    'nb', (select count(*) from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
    'stock', (select greatest(0, count(*)::int * a.quantite - coalesce((select u.utilise from public.at_boutique_usage u where u.article = a.id and u.acheteur = n), 0)) from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null));
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
      'id', a.id, 'cle', a.cle, 'nom', a.nom, 'image', a.image, 'prix', a.prix, 'euros_cents', round(a.prix * taux), 'conso', a.conso, 'quantite', a.quantite, 'stock', (select greatest(0, count(*)::int * a.quantite - coalesce((select u.utilise from public.at_boutique_usage u where u.article = a.id and u.acheteur = n), 0)) from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'possede', exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'nb', (select count(*) from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'mien', f.name = n) order by a.prix, a.nom)
    from public.at_boutique_articles a join public.at_fiches f on f.id = a.fiche
    where a.jeu = lower(p_jeu) and ((a.actif and a.filtre_ok and a.retire_at is null) or exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null))), '[]'::jsonb));
end $function$;

drop function if exists public.at_boutique_poser(uuid, text, text, integer, text, boolean);
create or replace function public.at_boutique_poser(p_fiche uuid, p_cle text, p_nom text, p_prix integer, p_image text default null, p_conso boolean default null, p_quantite integer default null)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare f public.at_fiches; k text := left(lower(btrim(coalesce(p_cle, ''))), 40); nm text := left(btrim(coalesce(p_nom, '')), 60); ok boolean; aid uuid;
begin
  if pegase_int.at_joueur_appel() then raise exception 'reserve'; end if;
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null or f.jeu is null then raise exception 'projet sans jeu'; end if;
  if k !~ '^[a-z0-9_-]{1,40}$' or nm = '' then raise exception 'article invalide'; end if;
  if p_image is not null and p_image !~ '^i/[0-9a-f-]{36}[.](png|jpg|webp)$' then raise exception 'image invalide'; end if;
  if p_quantite is not null and (p_quantite < 1 or p_quantite > 1000) then raise exception 'quantite invalide'; end if;
  ok := pegase_int.at_filtre(nm) = '';
  insert into public.at_boutique_articles (fiche, jeu, cle, nom, image, prix, filtre_ok, conso, quantite) values (f.id, f.jeu, k, nm, p_image, p_prix, ok, coalesce(p_conso, false), coalesce(p_quantite, 1))
    on conflict (jeu, cle) do update set nom = excluded.nom, image = excluded.image, prix = excluded.prix, filtre_ok = excluded.filtre_ok, actif = true, retire_at = null,
      conso = coalesce(p_conso, at_boutique_articles.conso), quantite = coalesce(p_quantite, at_boutique_articles.quantite)
    returning at_boutique_articles.id into aid;
  return jsonb_build_object('id', aid, 'filtre_ok', ok);
end $function$;
revoke all on function public.at_boutique_poser(uuid, text, text, integer, text, boolean, integer) from public, anon, authenticated;

-- le jeu UTILISE n unités d'un consommable acheté (un pack de 5 boules = 5 unités par achat) ; jamais en dessous de 0 ; un achat remboursé retire ses unités.
create or replace function public.at_boutique_consommer(p_name text, p_jeu text, p_cle text, p_n integer default 1)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare n text := public.pg_n(p_name); a public.at_boutique_articles; tot int; u int; q int := coalesce(p_n, 1);
begin
  perform public.acct_check(n);
  if q < 1 or q > 1000 then raise exception 'nombre invalide'; end if;
  perform pg_advisory_xact_lock(hashtext('boutique:' || n));
  select * into a from public.at_boutique_articles x where x.jeu = lower(p_jeu) and x.cle = lower(p_cle); if a.id is null then raise exception 'article inconnu'; end if;
  if not a.conso then raise exception 'pas un consommable'; end if;
  select count(*)::int * a.quantite into tot from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null;
  select coalesce((select x.utilise from public.at_boutique_usage x where x.article = a.id and x.acheteur = n), 0) into u;
  if tot - u < q then return jsonb_build_object('ok', false, 'stock', greatest(0, tot - u)); end if;
  insert into public.at_boutique_usage (article, acheteur, utilise) values (a.id, n, q)
    on conflict (article, acheteur) do update set utilise = at_boutique_usage.utilise + q, maj_at = now();
  return jsonb_build_object('ok', true, 'stock', tot - u - q);
end $function$;
revoke all on function public.at_boutique_consommer(text, text, text, integer) from public, anon;
grant execute on function public.at_boutique_consommer(text, text, text, integer) to authenticated;
