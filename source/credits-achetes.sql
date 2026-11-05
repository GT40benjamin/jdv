-- borne 2.0.131 (SQL v141) — décision du chef (5 nov. 16 h 30) : dans les boutiques des créateurs on ne paie QU'AVEC des crédits ACHETÉS.
-- at_credits.achete = la part ACHETÉE du solde (le reste est offert : bienvenue, mensuels, dons, bonus, offerts). Tenue par un déclencheur :
--   * une dépense ordinaire prend d'ABORD les offerts (la part achetée ne baisse que si le solde passe dessous) ;
--   * un ajout est offert, SAUF quand la fonction l'annonce achetée (set_config('atelier.achete', 'oui')) : achat Stripe, abonnement,
--     gains du créateur, remboursement d'un achat de boutique ;
--   * une dépense de boutique (set_config('atelier.depense_achete', 'oui')) prend SEULEMENT des achetés.
-- Départ : la part achetée restante de chacun, rejouée avec la règle de source/atelier-paye.sql (offerts d'abord, achats au fil du temps).
alter table public.at_credits add column if not exists achete integer not null default 0;

create or replace function pegase_int.at_credits_achete() returns trigger language plpgsql as $$
declare d int := coalesce(new.solde, 0) - coalesce(old.solde, 0);
begin
  if d < 0 then
    if current_setting('atelier.depense_achete', true) = 'oui' then new.achete := greatest(0, coalesce(old.achete, 0) + d);
    else new.achete := greatest(0, least(coalesce(old.achete, 0), coalesce(new.solde, 0))); end if;
  elsif d > 0 and current_setting('atelier.achete', true) = 'oui' then new.achete := coalesce(old.achete, 0) + d;
  else new.achete := greatest(0, least(coalesce(old.achete, 0), coalesce(new.solde, 0))); end if;
  return new;
end $$;
drop trigger if exists at_credits_achete on public.at_credits;
create trigger at_credits_achete before update of solde on public.at_credits for each row execute function pegase_int.at_credits_achete();

-- les achats d'argent annoncent leurs crédits « achetés »
do $t$
declare fn text; d text;
begin
  foreach fn in array array['public.at_achat_payer(text,uuid,integer,text)', 'public.at_abo_paye(text,text,text,integer,text,bigint)'] loop
    d := pg_get_functiondef(fn::regprocedure);
    if position('atelier.achete' in d) = 0 then
      d := regexp_replace(d, E'\\nbegin\\n', E'\nbegin\n  perform set_config(''atelier.achete'', ''oui'', true);   -- v141 : ces crédits sont ACHETÉS\n');
      if position('atelier.achete' in d) = 0 then raise exception 'v141 : début introuvable dans %', fn; end if;
      execute d;
    end if;
  end loop;
end $t$;

-- départ : la part achetée restante de chacun (rejeu, même règle que pegase_int.at_paye_par_fiche)
do $t$
declare p record; e record; libre numeric; achats numeric[]; i int; besoin numeric; pris numeric; att numeric; reste numeric;
begin
  for p in select distinct name from (select name from public.at_achats where etat = 'paye' union select name from public.at_abo_factures) z loop
    libre := 0; achats := '{}';
    for e in select * from (
        select coalesce(a.paye_at, a.at) t, 0 o, 0::bigint id, 'achat' k, a.credits::numeric cr, null::numeric solde, 0::numeric delta from public.at_achats a where a.name = p.name and a.etat = 'paye'
        union all select b.at, 0, 0, 'achat', b.credits, null, 0 from public.at_abo_factures b where b.name = p.name
        union all select c.at, 1, c.id, 'j', 0, c.solde, c.delta from public.at_credit_journal c where c.name = p.name) x order by t, o, id loop
      if e.k = 'achat' then achats := achats || e.cr; continue; end if;
      if e.solde is not null then
        att := e.solde - e.delta - libre - coalesce((select sum(v) from unnest(achats) v), 0);
        if att > 0 then libre := libre + att; end if;
      end if;
      if e.delta > 0 then libre := libre + e.delta; continue; end if;
      besoin := -e.delta; pris := least(libre, besoin); libre := libre - pris; besoin := besoin - pris;
      i := 1; while besoin > 0 and i <= coalesce(array_length(achats, 1), 0) loop pris := least(achats[i], besoin); achats[i] := achats[i] - pris; besoin := besoin - pris; i := i + 1; end loop;
    end loop;
    reste := coalesce((select sum(v) from unnest(achats) v), 0);
    update public.at_credits c set achete = greatest(0, least(c.solde, reste::int)) where c.name = p.name;
  end loop;
end $t$;

-- la boutique : liste avec les deux soldes, achat avec les seuls achetés, gains du créateur et remboursements en achetés
create or replace function public.at_boutique_liste(p_name text, p_jeu text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); taux numeric := coalesce(pegase_int.at_reglage('abo_prix'), 300)::numeric / greatest(coalesce(pegase_int.at_reglage('abo_credits'), 400), 1);
  plaf int := coalesce(pegase_int.at_reglage('boutique_plafond_mois'), 300); dep int; c public.at_credits;
begin
  if n <> '' and public.acct_own(n) then
    select coalesce(sum(a.prix), 0) into dep from public.at_boutique_achats a where a.acheteur = n and a.rembourse_at is null and a.at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
    select * into c from public.at_credits x where x.name = n;
  end if;
  return jsonb_build_object('plafond_mois', plaf, 'depense_mois', coalesce(dep, 0), 'achetes', coalesce(c.achete, 0), 'offerts', greatest(0, coalesce(c.solde, 0) - coalesce(c.achete, 0)),
    'articles', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'cle', a.cle, 'nom', a.nom, 'image', a.image, 'prix', a.prix, 'euros_cents', round(a.prix * taux),
      'possede', exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'mien', f.name = n) order by a.prix, a.nom)
    from public.at_boutique_articles a join public.at_fiches f on f.id = a.fiche
    where a.jeu = lower(p_jeu) and ((a.actif and a.filtre_ok and a.retire_at is null) or exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null))), '[]'::jsonb));
end $$;

create or replace function public.at_boutique_acheter(p_name text, p_article uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); a public.at_boutique_articles; cr text; part int; com int; s int; plaf int := coalesce(pegase_int.at_reglage('boutique_plafond_mois'), 300); dep int; i uuid; ach int;
begin
  perform public.acct_check(n);
  perform pg_advisory_xact_lock(hashtext('boutique:' || n));
  select * into a from public.at_boutique_articles x where x.id = p_article; if a.id is null then raise exception 'article inconnu'; end if;
  if exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null) then
    return jsonb_build_object('ok', true, 'deja', true, 'solde', pegase_int.at_solde(n)); end if;
  if not (a.actif and a.filtre_ok and a.retire_at is null) then raise exception 'pas en vente'; end if;
  select f.name into cr from public.at_fiches f where f.id = a.fiche;
  if cr = n or exists (select 1 from public.players x join public.players y on y.user_id = x.user_id where x.name = n and y.name = cr and x.user_id is not null)
     or exists (select 1 from public.player_parents pp join public.players q on q.user_id = pp.parent where (pp.name = cr and q.name = n) or (pp.name = n and q.name = cr)) then raise exception 'ton propre jeu'; end if;
  select coalesce(sum(b.prix), 0) into dep from public.at_boutique_achats b where b.acheteur = n and b.rembourse_at is null and b.at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  if dep + a.prix > plaf then raise exception 'plafond du mois'; end if;
  perform pegase_int.at_solde(n);
  select x.achete into ach from public.at_credits x where x.name = n;
  if coalesce(ach, 0) < a.prix then raise exception 'credits achetes insuffisants'; end if;   -- v141 : jamais avec des crédits offerts
  part := floor(a.prix * coalesce(pegase_int.at_reglage('boutique_part_createur'), 70) / 100.0)::int; com := a.prix - part;
  perform set_config('atelier.depense_achete', 'oui', true); s := pegase_int.at_debiter(n, a.prix); perform set_config('atelier.depense_achete', 'non', true);
  perform set_config('atelier.achete', 'oui', true); perform pegase_int.at_crediter(cr, part); perform set_config('atelier.achete', 'non', true);   -- ses gains viennent de vrais achats
  insert into public.at_boutique_achats (article, acheteur, createur, prix, part_createur, commission) values (a.id, n, cr, a.prix, part, com) returning id into i;
  return jsonb_build_object('ok', true, 'id', i, 'cle', a.cle, 'solde', s, 'prix', a.prix, 'achetes', (select x.achete from public.at_credits x where x.name = n));
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
      perform set_config('atelier.achete', 'oui', true); perform pegase_int.at_crediter(b.acheteur, b.prix); perform set_config('atelier.achete', 'non', true);
      perform set_config('atelier.depense_achete', 'oui', true);
      update public.at_credits c set solde = greatest(0, c.solde - b.part_createur), maj_at = now() where c.name = b.createur;
      perform set_config('atelier.depense_achete', 'non', true);
      update public.at_boutique_achats set rembourse_at = now() where id = b.id; k := k + 1;
    end loop;
  else raise exception 'action inconnue'; end if;
  return jsonb_build_object('ok', true, 'rembourses', k);
end $$;
