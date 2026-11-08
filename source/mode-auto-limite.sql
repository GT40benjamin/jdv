-- 8 nov. 2026 (l'admin : « un menu déroulant : accepter les demandes automatiques égales ou en dessous de X crédits, qu'on règle comme on veut ») :
-- LA LIMITE DU MODE AUTO SE RÈGLE PAR PROJET. Avant : auto_max_credits = 20 💎 pour tout le monde (at_reglages).
--   * at_fiches.auto_max int : null = la valeur générale auto_max_credits (20) ; sinon 1 … auto_max_plafond (1000, modifiable par l'admin) ;
--   * public.at_auto_limite(p_name, p_fiche, p_max) : le joueur propriétaire règle sa limite comme il veut (dans 1 … plafond) ;
--     un admin sur le projet d'un joueur peut seulement la BAISSER (ce sont les crédits du joueur, comme « seul le joueur allume ») ;
--     si le mode auto est allumé, la mascotte le dit dans la discussion ;
--   * at_auto_choisir et at_auto_poser prennent la limite du projet (patchs ciblés, motif présent 1 fois, sinon refus) ;
--   * at_lire / at_admin_lire renvoient fiche.auto_max (la limite effective).
-- Essai : begin; <ce fichier>; … ; rollback; — puis pour de vrai. Rejouable. Test : node test-mode-auto-sql.mjs (PGlite).

alter table public.at_fiches add column if not exists auto_max int;
insert into public.at_reglages (k, v) values ('auto_max_plafond', 1000) on conflict (k) do nothing;

create or replace function public.at_auto_limite(p_name text, p_fiche uuid, p_max int)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; adm boolean; avant int; pl int := coalesce(pegase_int.at_reglage('auto_max_plafond'), 1000);
begin
  perform public.acct_check(n);
  select * into f from public.at_fiches x where x.id = p_fiche and x.supprime_at is null for update;
  if f.id is null then raise exception 'projet inconnu'; end if;
  adm := exists (select 1 from public.at_admins a where a.name = n);
  if f.name <> n and not adm then raise exception 'pas ton projet'; end if;
  if p_max is null or p_max < 1 or p_max > pl then raise exception 'limite invalide (1 à %)', pl; end if;
  avant := coalesce(f.auto_max, pegase_int.at_reglage('auto_max_credits'), 20);
  if f.name <> n and p_max > avant then raise exception 'seul le joueur augmente la limite du mode auto'; end if;
  if p_max = avant then return jsonb_build_object('ok', true, 'auto', coalesce(f.auto, false), 'max', avant, 'deja', true); end if;
  update public.at_fiches x set auto_max = p_max, maj_at = now() where x.id = f.id;
  if coalesce(f.auto, false) then
    insert into public.at_messages (fiche, texte, de_atelier, discussion) values (f.id,
      '⚡ Mode auto : maintenant, je lance tout seul les demandes jusqu’à ' || p_max || ' 💎 ; au-dessus, je te redemande.', true, true);
  end if;
  if adm and f.name <> n then insert into public.at_admin_journal (admin, fiche, action, detail) values (n, f.id, 'auto_max', jsonb_build_object('avant', avant, 'apres', p_max)); end if;
  return jsonb_build_object('ok', true, 'auto', coalesce(f.auto, false), 'max', p_max);
end $$;
revoke all on function public.at_auto_limite(text, uuid, int) from public, anon;
grant execute on function public.at_auto_limite(text, uuid, int) to authenticated, service_role;

-- at_auto_poser et at_auto_choisir : la limite du projet, juste après avoir lu la fiche
do $do$
declare d text; k int; r record;
begin
  for r in select * from (values
    ('public.at_auto_poser(text,uuid,boolean)', 'if f.id is null then raise exception ''projet inconnu''; end if;'),
    ('pegase_int.at_auto_choisir(uuid)', 'if f.id is null or not coalesce(f.auto, false) or f.supprime_at is not null then return null; end if;')) v(fn, motif) loop
    d := pg_get_functiondef(r.fn::regprocedure);
    if position('mx := coalesce(f.auto_max, mx);' in d) > 0 then raise notice '% : déjà fait', r.fn; continue; end if;
    k := (length(d) - length(replace(d, r.motif, ''))) / length(r.motif);
    if k <> 1 then raise exception '% : motif trouvé % fois (attendu 1)', r.fn, k; end if;
    execute replace(d, r.motif, r.motif || ' mx := coalesce(f.auto_max, mx);');
    raise notice '% : limite du projet', r.fn;
  end loop;
end $do$;

-- at_lire / at_admin_lire : fiche.auto_max (la limite effective), juste après fiche.auto
do $do$
declare fn text; d text; k int;
  motif constant text := '''auto'', coalesce(f.auto, false),';
begin
  foreach fn in array array['public.at_lire(text,uuid)', 'public.at_admin_lire(text,uuid)'] loop
    d := pg_get_functiondef(fn::regprocedure);
    if position('''auto_max''' in d) > 0 then raise notice '% : déjà fait', fn; continue; end if;
    k := (length(d) - length(replace(d, motif, ''))) / length(motif);
    if k <> 1 then raise exception '% : motif trouvé % fois (attendu 1)', fn, k; end if;
    execute replace(d, motif, motif || ' ''auto_max'', coalesce(f.auto_max, pegase_int.at_reglage(''auto_max_credits''), 20),');
    raise notice '% : auto_max ajouté', fn;
  end loop;
end $do$;
-- vérifications (en essai) :
--   select public.at_auto_limite('PATOU', '<fiche>', 50);  select (public.at_lire('PATOU', '<fiche>') -> 'fiche') -> 'auto_max';
