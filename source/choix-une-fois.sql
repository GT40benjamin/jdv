-- v147 (borne 2.0.136) : une offre ne se choisit plus deux fois.
-- 5 nov. : chez J2B, « Ta tour dans la forêt maléfique · 25 » a été choisie sur l'ancien ticket 2716e9de (remplacé, passé « regroupee »
-- par v146) ET sur la carte regroupée 7459a97a : 2 débits de 25. at_admin_choisir ne vérifiait ni remplacee_at ni l'état « regroupee ».
-- 1. « regroupee » = fermé partout où « faite / impossible » l'étaient (choisir, modifier, plus tard, questionner, refuser, répondre, sonnette…).
-- 2. at_admin_choisir refuse aussi une offre remplacée (comme at_demande_accepter depuis v110).
-- 3. une même option (même libellé) déjà choisie sur un ticket ouvert du même projet : refus « option deja choisie », jamais un 2e débit
--    (verrou par projet : deux clics simultanés sur deux tickets passent l'un après l'autre).
-- 4. at_demande_etat accepte « regroupee ».
-- 5. données J2B : 2716e9de -> regroupee (son choix et son coût restent écrits : le remboursement, c'est l'admin) ;
--    1d61f212 (grimoires OFFERTS par l'admin à 16:40 UTC) -> en_cours : v146 l'avait passé à tort en « regroupee ».
do $m$
declare f text; d text;
begin
  foreach f in array array['public.at_demande_accepter(text,uuid,text)', 'public.at_admin_choisir(text,uuid,text)', 'public.at_demande_modifier',
    'public.at_demande_plus_tard', 'public.at_demande_questionner', 'public.at_demande_refuser', 'pegase_int.at_q_repondre', 'public.at_sonnette', 'public.at_assets_ajouter'] loop
    d := pg_get_functiondef(case when f like '%(%' then f::regprocedure else (select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = f) end);
    if position('(''faite'', ''impossible'')' in d) = 0 then raise exception 'motif absent dans %', f; end if;
    d := replace(d, '(''faite'', ''impossible'')', '(''faite'', ''impossible'', ''regroupee'')');
    if f like '%at_demande_accepter%' or f like '%at_admin_choisir%' then
      if position('  c := greatest(0, coalesce((o ->> ''credits'')::int, 0));' in d) = 0 then raise exception 'motif c absent dans %', f; end if;
      d := replace(d, '  c := greatest(0, coalesce((o ->> ''credits'')::int, 0));',
        '  perform pg_advisory_xact_lock(hashtext(''at_choix:'' || d.fiche::text));   -- v147 : un choix à la fois par projet' || chr(10) ||
        '  if exists (select 1 from public.at_demandes y where y.fiche = d.fiche and y.id <> d.id and y.choix is not null and y.etat not in (''faite'', ''impossible'')' || chr(10) ||
        '    and (y.choix ->> ''libelle'') = (o ->> ''libelle'')) then raise exception ''option deja choisie''; end if;   -- v147 : jamais débitée deux fois' || chr(10) ||
        '  c := greatest(0, coalesce((o ->> ''credits'')::int, 0));');
    end if;
    if f like '%at_admin_choisir%' then
      d := replace(d, '  select x into o from jsonb_array_elements', '  if d.remplacee_at is not null then raise exception ''offre remplacee''; end if;   -- v147' || chr(10) || '  select x into o from jsonb_array_elements');
    end if;
    execute d;
  end loop;
  d := pg_get_functiondef((select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'at_demande_etat'));
  if position('''faite'', ''impossible'', ''plus_tard'')' in d) = 0 then raise exception 'motif etat absent'; end if;
  execute replace(d, '''faite'', ''impossible'', ''plus_tard'')', '''faite'', ''impossible'', ''plus_tard'', ''regroupee'')');
  update public.at_demandes set etat = 'regroupee', etat_at = now() where id::text like '2716e9de%' and etat = 'en_cours';
  update public.at_demandes set etat = 'en_cours', etat_at = (choix ->> 'at')::timestamptz where id::text like '1d61f212%' and etat = 'regroupee' and choix ->> 'par' = 'admin';
end $m$;
