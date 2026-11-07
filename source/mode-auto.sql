-- 7 nov. 2026 — Interface : « ⚡ MODE AUTO » de Pooky (demande de Benjamin, comme dans Meshy). Par PROJET : quand Pooky fait une proposition
-- chiffrée et que le mode auto est activé, elle est ACCEPTÉE TOUTE SEULE (même chemin que le « oui » : at_debiter, choix, en_cours, message)
-- et Pooky se met tout de suite au travail. Garde-fous (chef) : jusqu'à auto_max_credits = 20 💎 par demande ; au-dessus, ou si le solde ne
-- suffit pas, Pooky redemande comme d'habitude (la proposition reste à choisir) ; JAMAIS d'achat de crédits automatique.
--   * at_fiches.auto boolean (false par défaut) ; renvoyé dans at_lire / at_admin_lire (fiche.auto) ;
--   * public.at_auto_poser(p_name, p_fiche, p_on) : le joueur propriétaire ou un admin ; en passant à « on », Pooky le dit dans la conversation ;
--   * pegase_int.at_auto_choisir(p_demande) : appelé à la fin de at_demande_proposer (donc aussi at_discussion_proposer et at_admin_proposer) ;
--     choisit l'option conseillée (sinon la première), si ≤ auto_max_credits et solde suffisant ; ne casse jamais la proposition ;
--   * at_reglages : auto_max_credits = 20 (modifiable par l'admin).
-- Le prix reste écrit dans le message : « ⚡ Mode auto : je lance « … » (20 💎). Je m'y mets ! »
-- Essai : begin; <ce fichier>; … ; rollback;  — puis pour de vrai. Rejouable. Test : node test-mode-auto-sql.mjs (PGlite).

alter table public.at_fiches add column if not exists auto boolean not null default false;
insert into public.at_reglages (k, v) values ('auto_max_credits', 20) on conflict (k) do nothing;

create or replace function public.at_auto_poser(p_name text, p_fiche uuid, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; adm boolean; mx int := coalesce(pegase_int.at_reglage('auto_max_credits'), 20); g jsonb; nom text;
begin
  perform public.acct_check(n);
  select * into f from public.at_fiches x where x.id = p_fiche and x.supprime_at is null for update;
  if f.id is null then raise exception 'projet inconnu'; end if;
  adm := exists (select 1 from public.at_admins a where a.name = n);
  if f.name <> n and not adm then raise exception 'pas ton projet'; end if;
  if coalesce(f.auto, false) = coalesce(p_on, false) then return jsonb_build_object('ok', true, 'auto', f.auto, 'max', mx, 'deja', true); end if;
  update public.at_fiches x set auto = coalesce(p_on, false), maj_at = now() where x.id = f.id;
  insert into public.at_messages (fiche, texte, de_atelier, discussion) values (f.id, case when coalesce(p_on, false)
    then '⚡ Mode auto activé : je lance tes demandes tout de suite (jusqu’à ' || mx || ' 💎), sans te redemander.'
    else '🤚 Mode auto arrêté : je te redemande avant de lancer chaque demande.' end, true, true);   -- dans la discussion avec la mascotte
  if adm and f.name <> n then insert into public.at_admin_journal (admin, fiche, action, detail) values (n, f.id, 'auto', jsonb_build_object('auto', coalesce(p_on, false))); end if;
  return jsonb_build_object('ok', true, 'auto', coalesce(p_on, false), 'max', mx);
end $$;
revoke all on function public.at_auto_poser(text, uuid, boolean) from public, anon;
grant execute on function public.at_auto_poser(text, uuid, boolean) to authenticated, service_role;

-- le choix automatique (jamais d'exception : au pire, rien n'est fait et la proposition reste à choisir)
create or replace function pegase_int.at_auto_choisir(p_demande uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare d public.at_demandes; f public.at_fiches; o jsonb; c int; s int; mx int := coalesce(pegase_int.at_reglage('auto_max_credits'), 20); r jsonb; disc boolean;
begin
  select * into d from public.at_demandes x where x.id = p_demande;
  if d.id is null or d.choix is not null or d.remplacee_at is not null or d.etat in ('faite', 'impossible', 'regroupee') then return null; end if;
  select * into f from public.at_fiches x where x.id = d.fiche;
  if f.id is null or not coalesce(f.auto, false) or f.supprime_at is not null then return null; end if;
  select x into o from jsonb_array_elements(case when jsonb_typeof(d.propositions) = 'array' then d.propositions else '[]'::jsonb end) with ordinality t(x, i)
    order by coalesce((x ->> 'conseille')::boolean, false) desc, i limit 1;   -- l'option conseillée, sinon la première
  if o is null then return null; end if;
  c := greatest(0, coalesce((o ->> 'credits')::int, 0));
  disc := exists (select 1 from public.at_messages m where m.demande = d.id and m.discussion);   -- une idée de la discussion : la réponse y reste
  if c > mx then
    insert into public.at_messages (fiche, texte, de_atelier, demande, discussion) values (d.fiche, '⚡ Mode auto : celle-ci coûte ' || c || ' 💎, plus que ' || mx || ' 💎 : je te laisse choisir 👆', true, d.id, disc);
    return jsonb_build_object('auto', 'trop_cher', 'credits', c, 'max', mx); end if;
  if pegase_int.at_solde(d.name) < c then
    insert into public.at_messages (fiche, texte, de_atelier, demande, discussion) values (d.fiche, '⚡ Mode auto : il te manque des crédits pour celle-ci (' || c || ' 💎) : je te laisse choisir 👆', true, d.id, disc);
    return jsonb_build_object('auto', 'solde', 'credits', c); end if;
  begin
    perform pg_advisory_xact_lock(hashtext('at_choix:' || d.fiche::text));   -- comme at_demande_accepter : un choix à la fois par projet
    if exists (select 1 from public.at_demandes y where y.fiche = d.fiche and y.id <> d.id and y.choix is not null and y.etat not in ('faite', 'impossible')
      and (y.choix ->> 'libelle') = (o ->> 'libelle')) then return jsonb_build_object('auto', 'deja_choisie'); end if;
    s := pegase_int.at_debiter(d.name, c);
    update public.at_demandes x set choix = o || jsonb_build_object('at', now(), 'par', 'auto'), etat = 'en_cours', etat_at = now(), cout = coalesce(x.cout, 0) + c,
      historique = coalesce(x.historique, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('sorte', 'choix_auto', 'libelle', o ->> 'libelle', 'credits', c, 'at', now()))
    where x.id = d.id and x.choix is null;
    insert into public.at_messages (fiche, texte, de_atelier, demande, discussion) values (d.fiche,
      '⚡ Mode auto : je lance « ' || (o ->> 'libelle') || ' »' || case when c > 0 then ' (' || c || ' 💎)' else ' (offert)' end || '. Je m’y mets !', true, d.id, disc);
    r := jsonb_build_object('auto', 'lance', 'option', o ->> 'id', 'credits', c, 'solde', s);
  exception when others then
    r := jsonb_build_object('auto', 'erreur', 'raison', left(sqlerrm, 80));
  end;
  return r;
end $$;
revoke all on function pegase_int.at_auto_choisir(uuid) from public, anon, authenticated;

-- at_demande_proposer : à la fin, le choix automatique (motif remplacé une seule fois ; rejouable)
do $$
declare d text; k int;
  motif constant text := 'return jsonb_build_object(''id'', d.id, ''propositions'', pr);';
begin
  d := pg_get_functiondef('public.at_demande_proposer(uuid,jsonb,text)'::regprocedure);
  if position('at_auto_choisir' in d) > 0 then raise notice 'at_demande_proposer : déjà fait';
  else
    k := (length(d) - length(replace(d, motif, ''))) / length(motif);
    if k <> 1 then raise exception 'at_demande_proposer : motif trouvé % fois (attendu 1)', k; end if;
    execute replace(d, motif, 'return jsonb_build_object(''id'', d.id, ''propositions'', pr) || coalesce(jsonb_build_object(''auto'', pegase_int.at_auto_choisir(d.id)), ''{}''::jsonb);');
    raise notice 'at_demande_proposer : choix automatique ajouté';
  end if;
end $$;

-- at_lire / at_admin_lire : fiche.auto (après 'reglages', f.reglages, de reglages-jeux.sql)
do $$
declare fn text; d text; k int;
  motif constant text := '''reglages'', f.reglages,';
begin
  foreach fn in array array['public.at_lire(text,uuid)', 'public.at_admin_lire(text,uuid)'] loop
    d := pg_get_functiondef(fn::regprocedure);
    if position('''auto'', coalesce(f.auto' in d) > 0 then raise notice '% : déjà fait', fn; continue; end if;
    k := (length(d) - length(replace(d, motif, ''))) / length(motif);
    if k <> 1 then raise exception '% : motif trouvé % fois (attendu 1)', fn, k; end if;
    execute replace(d, motif, motif || ' ''auto'', coalesce(f.auto, false),');
    raise notice '% : auto ajouté', fn;
  end loop;
end $$;
-- vérifications (en essai) :
--   select (public.at_lire('PATOU', '<fiche>') -> 'fiche') -> 'auto';
--   select public.at_auto_poser('PATOU', '<fiche>', true);
