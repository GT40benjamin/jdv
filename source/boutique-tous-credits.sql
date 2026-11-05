-- borne 2.0.132 (SQL v143) — décision de l'admin (5 nov. soir) : la règle « boutique = crédits ACHETÉS seulement » (v141) est ANNULÉE :
-- les crédits offerts s'utilisent aussi dans les boutiques. On remet at_boutique_liste / at_boutique_acheter / at_boutique_admin de la v139
-- (source/boutique.sql, plafond 300 / mois), on retire le déclencheur et la colonne at_credits.achete, et la ligne ajoutée aux paiements.
create or replace function public.at_boutique_liste(p_name text, p_jeu text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); taux numeric := coalesce(pegase_int.at_reglage('abo_prix'), 300)::numeric / greatest(coalesce(pegase_int.at_reglage('abo_credits'), 400), 1);
  plaf int := coalesce(pegase_int.at_reglage('boutique_plafond_mois'), 300); dep int;
begin
  if n <> '' and public.acct_own(n) then
    select coalesce(sum(a.prix), 0) into dep from public.at_boutique_achats a where a.acheteur = n and a.rembourse_at is null and a.at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  end if;
  return jsonb_build_object('plafond_mois', plaf, 'depense_mois', coalesce(dep, 0), 'articles', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'cle', a.cle, 'nom', a.nom, 'image', a.image, 'prix', a.prix, 'euros_cents', round(a.prix * taux),
      'possede', exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'mien', f.name = n) order by a.prix, a.nom)
    from public.at_boutique_articles a join public.at_fiches f on f.id = a.fiche
    where a.jeu = lower(p_jeu) and ((a.actif and a.filtre_ok and a.retire_at is null) or exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null))), '[]'::jsonb));
end $$;
create or replace function public.at_boutique_acheter(p_name text, p_article uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); a public.at_boutique_articles; cr text; part int; com int; s int; plaf int := coalesce(pegase_int.at_reglage('boutique_plafond_mois'), 300); dep int; i uuid;
begin
  perform public.acct_check(n);
  perform pg_advisory_xact_lock(hashtext('boutique:' || n));
  select * into a from public.at_boutique_articles x where x.id = p_article; if a.id is null then raise exception 'article inconnu'; end if;
  if exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null) then
    return jsonb_build_object('ok', true, 'deja', true, 'solde', pegase_int.at_solde(n)); end if;
  if not (a.actif and a.filtre_ok and a.retire_at is null) then raise exception 'pas en vente'; end if;
  select f.name into cr from public.at_fiches f where f.id = a.fiche;
  -- le créateur lui-même, un autre pseudo du même compte, ou sa famille (comptes de famille : player_parents) = son propre jeu
  if cr = n or exists (select 1 from public.players x join public.players y on y.user_id = x.user_id where x.name = n and y.name = cr and x.user_id is not null)
     or exists (select 1 from public.player_parents pp join public.players q on q.user_id = pp.parent where (pp.name = cr and q.name = n) or (pp.name = n and q.name = cr)) then raise exception 'ton propre jeu'; end if;
  select coalesce(sum(b.prix), 0) into dep from public.at_boutique_achats b where b.acheteur = n and b.rembourse_at is null and b.at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  if dep + a.prix > plaf then raise exception 'plafond du mois'; end if;
  part := floor(a.prix * coalesce(pegase_int.at_reglage('boutique_part_createur'), 70) / 100.0)::int; com := a.prix - part;
  s := pegase_int.at_debiter(n, a.prix);
  perform pegase_int.at_crediter(cr, part);
  insert into public.at_boutique_achats (article, acheteur, createur, prix, part_createur, commission) values (a.id, n, cr, a.prix, part, com) returning id into i;
  return jsonb_build_object('ok', true, 'id', i, 'cle', a.cle, 'solde', s, 'prix', a.prix);
end $$;
create or replace function public.at_boutique_admin(p_name text, p_article uuid, p_action text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); b record; k int := 0;
begin
  perform pegase_int.at_admin_ok(n);
  if p_action = 'retirer' then update public.at_boutique_articles set actif = false, retire_at = now() where id = p_article;
  elsif p_action = 'remettre' then update public.at_boutique_articles set actif = true, retire_at = null where id = p_article;
  elsif p_action = 'rembourser' then
    update public.at_boutique_articles set actif = false, retire_at = coalesce(retire_at, now()) where id = p_article;
    for b in select * from public.at_boutique_achats x where x.article = p_article and x.rembourse_at is null loop
      perform pegase_int.at_crediter(b.acheteur, b.prix);
      update public.at_credits c set solde = greatest(0, c.solde - b.part_createur), maj_at = now() where c.name = b.createur;
      update public.at_boutique_achats set rembourse_at = now() where id = b.id; k := k + 1;
    end loop;
  else raise exception 'action inconnue'; end if;
  return jsonb_build_object('ok', true, 'rembourses', k);
end $$;
drop trigger if exists at_credits_achete on public.at_credits;
drop function if exists pegase_int.at_credits_achete();
alter table public.at_credits drop column if exists achete;
do $t$
declare fn text; d text;
begin
  foreach fn in array array['public.at_achat_payer(text,uuid,integer,text)', 'public.at_abo_paye(text,text,text,integer,text,bigint)'] loop
    d := pg_get_functiondef(fn::regprocedure);
    if position('atelier.achete' in d) > 0 then
      d := regexp_replace(d, '\n  perform set_config\(''atelier\.achete'', ''oui'', true\);[^\n]*', '');
      if position('atelier.achete' in d) > 0 then raise exception 'v143 : ligne v141 introuvable dans %', fn; end if;
      execute d;
    end if;
  end loop;
end $t$;
