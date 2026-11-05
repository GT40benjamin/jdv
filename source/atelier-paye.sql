-- borne 2.0.127 (SQL v137) — rentabilité (admin) : « payé » = seulement les crédits ACHETÉS avec de l'argent, au prix réellement payé.
-- RÈGLE D'ATTRIBUTION (écrite ici, la même pour tous) : on rejoue l'histoire des crédits de chaque joueur dans l'ordre du temps ;
--   * un achat (at_achats payé, at_abo_factures) ajoute des crédits ACHETÉS, chacun à son prix (centimes / crédits de cet achat) ;
--   * une entrée positive du journal (bienvenue, dons de l'admin, remboursement…) ajoute des crédits OFFERTS ;
--   * des crédits apparus sans ligne de journal (mensuels gratuits, +5 💎 cachés dans les offres) sont repérés grâce au solde que le journal
--     écrit après chaque opération : l'écart avant une opération est ajouté aux OFFERTS ;
--   * chaque dépense prend D'ABORD les crédits offerts, PUIS les achetés (le plus ancien achat d'abord) : « payé » est donc le plus prudent ;
--   * une génération « offert » (ticket offert par l'admin) ne débite rien : elle compte seulement dans le coût.
create or replace function pegase_int.at_paye_par_fiche() returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare p record; e record; libre numeric; achats numeric[]; prix numeric[]; i int; besoin numeric; pris numeric; att numeric; res jsonb := '{}'::jsonb;
  k text; acq numeric; off numeric; cents numeric; old jsonb;
begin
  for p in select distinct name from (select name from public.at_credit_journal union select name from public.at_achats where etat = 'paye' union select name from public.at_abo_factures) z loop
    libre := 0; achats := '{}'; prix := '{}';
    for e in
      select * from (
        select coalesce(a.paye_at, a.at) t, 0 o, 0::bigint id, 'achat' k, a.credits::numeric cr, a.centimes::numeric ce, null::uuid fiche, null::numeric solde, 0::numeric delta from public.at_achats a where a.name = p.name and a.etat = 'paye'
        union all select b.at, 0, 0, 'achat', b.credits, b.centimes, null, null, 0 from public.at_abo_factures b where b.name = p.name
        union all select c.at, 1, c.id, 'j', 0, 0, c.fiche, c.solde, c.delta from public.at_credit_journal c where c.name = p.name
      ) x order by t, o, id
    loop
      if e.k = 'achat' then
        if e.cr > 0 then achats := achats || e.cr; prix := prix || (e.ce / e.cr); end if;
        continue;
      end if;
      -- crédits apparus sans journal (mensuels, +5 cachés) : l'écart entre le solde d'avant et ce qu'on suit = des offerts
      if e.solde is not null then
        att := e.solde - e.delta - libre - coalesce((select sum(v) from unnest(achats) v), 0);
        if att > 0 then libre := libre + att;
        elsif att < 0 then   -- on suit plus que le serveur n'en avait : on retire d'abord des offerts, puis des achetés
          besoin := -att; pris := least(libre, besoin); libre := libre - pris; besoin := besoin - pris;
          i := 1; while besoin > 0 and i <= coalesce(array_length(achats, 1), 0) loop pris := least(achats[i], besoin); achats[i] := achats[i] - pris; besoin := besoin - pris; i := i + 1; end loop;
        end if;
      end if;
      if e.delta > 0 then libre := libre + e.delta; continue; end if;
      if e.delta = 0 then continue; end if;
      besoin := -e.delta; off := least(libre, besoin); libre := libre - off; besoin := besoin - off; acq := 0; cents := 0;
      i := 1; while besoin > 0 and i <= coalesce(array_length(achats, 1), 0) loop
        pris := least(achats[i], besoin); achats[i] := achats[i] - pris; besoin := besoin - pris; acq := acq + pris; cents := cents + pris * prix[i]; i := i + 1;
      end loop;
      off := off + besoin;   -- plus rien de suivi : des crédits jamais journalisés, donc offerts
      if e.fiche is not null then
        k := e.fiche::text; old := coalesce(res -> k, '{"achetes":0,"offerts":0,"cents":0}'::jsonb);
        res := res || jsonb_build_object(k, jsonb_build_object('achetes', (old ->> 'achetes')::numeric + acq, 'offerts', (old ->> 'offerts')::numeric + off, 'cents', (old ->> 'cents')::numeric + cents));
      end if;
    end loop;
  end loop;
  return res;
end $$;
revoke all on function pegase_int.at_paye_par_fiche() from public, anon, authenticated;

create or replace function public.at_admin_rentabilite(p_name text, p_fiche uuid default null) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); prix numeric := coalesce(pegase_int.at_reglage('abo_prix'), 300); cr numeric := greatest(coalesce(pegase_int.at_reglage('abo_credits'), 400), 1);
  taux numeric; projets jsonb; joueurs jsonb; pay jsonb;
begin
  perform pegase_int.at_admin_ok(n);
  taux := prix / cr;   -- centimes par crédit (repère seulement : le payé vient de at_paye_par_fiche)
  pay := pegase_int.at_paye_par_fiche();
  select coalesce(jsonb_agg(p order by (p ->> 'maj_at') desc), '[]'::jsonb) into projets from (
    select jsonb_build_object('fiche', f.id, 'titre', f.titre, 'joueur', f.name, 'maj_at', f.maj_at,
      'credits', coalesce(j.credits, 0), 'credits_achetes', round(coalesce((pay -> f.id::text ->> 'achetes')::numeric, 0)), 'credits_offerts', round(coalesce((pay -> f.id::text ->> 'offerts')::numeric, 0)),
      'euros_cents', round(coalesce((pay -> f.id::text ->> 'cents')::numeric, 0)),
      'cout_cents', coalesce(g.total, 0), 'offert_cents', coalesce(g.offert, 0), 'offertes', coalesce(g.nb_offert, 0), 'cout', jsonb_build_object('image', coalesce(g.image, 0), 'son', coalesce(g.son, 0), 'musique', coalesce(g.musique, 0), 'autre', coalesce(g.autre, 0)),
      'generations', coalesce(g.nb, 0), 'ratees', coalesce(g.ratees, 0), 'sans_prix', coalesce(g.sans_prix, 0),
      'marge_cents', round(coalesce((pay -> f.id::text ->> 'cents')::numeric, 0)) - coalesce(g.total, 0)) p
    from public.at_fiches f
    left join lateral (select -sum(c.delta) credits from public.at_credit_journal c where c.fiche = f.id and c.delta < 0) j on true
    left join lateral (select sum(coalesce(x.cents, 0)) total, sum(coalesce(x.cents, 0)) filter (where x.paye_par = 'offert') offert, count(*) filter (where x.paye_par = 'offert') nb_offert, count(*) nb, count(*) filter (where x.cents is null) sans_prix, count(*) filter (where x.etat = 'erreur') ratees,
        sum(coalesce(x.cents, 0)) filter (where x.sorte = 'image') image, sum(coalesce(x.cents, 0)) filter (where x.sorte = 'son') son,
        sum(coalesce(x.cents, 0)) filter (where x.sorte = 'musique') musique, sum(coalesce(x.cents, 0)) filter (where x.sorte not in ('image', 'son', 'musique')) autre
      from public.at_gen_file x where x.fiche = f.id and x.etat in ('fait', 'erreur')) g on true
    where f.supprime_at is null and (p_fiche is null or f.id = p_fiche)
  ) z;
  select coalesce(jsonb_object_agg(q.name, q.o), '{}'::jsonb) into joueurs from (
    select u.name, jsonb_build_object(
      'achats_credits', coalesce((select sum(a.credits) from public.at_achats a where a.name = u.name and a.etat = 'paye'), 0),
      'achats_cents', coalesce((select sum(a.centimes) from public.at_achats a where a.name = u.name and a.etat = 'paye'), 0),
      'abo_credits', coalesce((select sum(b.credits) from public.at_abo_factures b where b.name = u.name), 0),
      'abo_cents', coalesce((select sum(b.centimes) from public.at_abo_factures b where b.name = u.name), 0),
      'bienvenue', coalesce((select sum(c.delta) from public.at_credit_journal c where c.name = u.name and c.delta > 0 and c.motif like 'at_bienvenue%'), 0),
      'admin', coalesce((select sum(c.delta) from public.at_credit_journal c where c.name = u.name and c.delta > 0 and (c.motif like 'at_admin%' or c.motif like 'at_credits_donner%')), 0),
      'solde', (select s.solde from public.at_credits s where s.name = u.name)) o
    from (select distinct f.name from public.at_fiches f where f.supprime_at is null and (p_fiche is null or f.id = p_fiche)) u
  ) q;
  return jsonb_build_object('taux_cents_credit', round(taux, 4), 'regle', 'offerts d''abord, puis achetés (le plus ancien achat d''abord), au prix payé', 'projets', projets, 'joueurs', joueurs);
end $$;
