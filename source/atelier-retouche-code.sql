-- ===================================================================================================================================
-- « CRÉE AVEC {g} » : LA RETOUCHE PAR LE CODE À 10 💎 (SQL v173, 7 nov. 2026 — équipe Outils, proposé au chef)
-- Règle de l'admin : « réduire à 10 quand tu peux le faire toi, {g} doit être économe ».
--  1) Pour une retouche demandée à {g} (« Retoucher en parlant », un « oui » à sa proposition), {g} regarde d'abord si elle se fait PAR LE CODE
--     (texte, gomme, déplacer, couleurs, cadre, collage d'une image existante, enlever le fond, recadrer, formes simples, dessin par le code).
--  2) Si oui : version « par le code », prix = réglage prix_retouche_code (10), SANS le générateur ; elle attend en « je regarde… »
--     (etat 'controle', a_verifier vide) que {g} la fasse, puis {g} la pose avec pegase_int.at_esp_valider(version, image) (existant).
--  3) Le générateur seulement pour un vrai dessin nouveau (nouvel objet, autre pose, autre style) : 'parole' / 'style', prix_esp_image (20).
--  4) Le prix et la façon sont annoncés AVANT (la proposition de {g} dit « par le code · 10 💎 » ou « dessin nouveau · 20 💎 »).
--  5) Nos défauts restent gratuits : pegase_int.at_esp_rendre(version, raison) rend les crédits d'une retouche qu'on ne livre pas ;
--     une correction offerte se pose sans rien débiter. Les outils du joueur gardent leur prix (prix_code_<outil>).
-- Fonctions remplacées, copiées de la version EN LIGNE du 7 nov. + la branche marquée « v173 » : pegase_int.at_esp_prix, public.at_esp_fabriquer, public.at_sonnette (+ « k »).
-- Relançable. Essai : bloc begin … rollback en fin de fichier (à lancer d'abord).
-- ===================================================================================================================================

-- 1) le réglage (on ne touche pas un prix déjà réglé)
insert into public.at_reglages (k, v) values ('prix_retouche_code', 10) on conflict (k) do nothing;

-- 2) les prix montrés à l'écran : + retouche_code (le reste = v172, inchangé)
create or replace function pegase_int.at_esp_prix() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('image', coalesce(pegase_int.at_reglage('prix_esp_image'), 20), 'agrandir', coalesce(pegase_int.at_reglage('prix_esp_agrandir'), 10),
    'retouche_code', greatest(0, coalesce(pegase_int.at_reglage('prix_retouche_code'), 10)),
    'code', coalesce((select jsonb_object_agg(substr(r.k, 11), greatest(0, r.v)) from public.at_reglages r where r.k like 'prix\_code\_%'), '{}'::jsonb),
    'code_gratuit', coalesce((select jsonb_object_agg(o, ids) from (select split_part(r.k, ':', 2) o, jsonb_agg(split_part(r.k, ':', 3)) ids
        from public.at_reglages r where r.k like 'code\_gratuit:%:%' and r.v > 0 group by 1) z), '{}'::jsonb)) $$;

-- 3) at_esp_fabriquer : + la façon 'code' (v173) — copie de la version en ligne, branche marquée
create or replace function public.at_esp_fabriquer(p_name text, p_creation uuid, p_outil text, p_consigne text)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
#variable_conflict use_variable
declare n text := public.pg_n(p_name); c public.at_creations; a public.at_creation_versions; f public.at_fiches; t text := left(btrim(regexp_replace(coalesce(p_consigne, ''), '\s+', ' ', 'g')), 10000);
  why text; prix int := greatest(0, coalesce(pegase_int.at_reglage('prix_esp_image'), 20)); s int; k int; v uuid; g uuid; pr text; sty text; lib text;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-esp', 60, interval '1 hour');
  if p_outil not in ('parole', 'style', 'code') then raise exception 'outil inconnu'; end if;   -- v173 : 'code' = retouche faite par le code par {g}
  select * into c from public.at_creations x where x.id = p_creation and x.name = n and x.supprime_at is null; if c.id is null then raise exception 'image inconnue'; end if;
  f := pegase_int.at_esp_fiche(n, c.fiche);
  perform pg_advisory_xact_lock(hashtext('atelier-esp:' || n));
  select * into a from public.at_creation_versions x where x.id = c.actuelle and x.etat = 'prete' and x.path is not null; if a.id is null then raise exception 'image pas prete'; end if;
  if exists (select 1 from public.at_creation_versions x where x.creation = c.id and x.etat in ('en_cours', 'controle')) then raise exception 'deja en cours'; end if;
  if (select count(*) from public.at_creation_versions x join public.at_creations y on y.id = x.creation where y.name = n and x.prix > 0 and x.created_at > now() - interval '1 day')
     >= coalesce(pegase_int.at_reglage('esp_fabriques_jour'), 30) then raise exception 'trop pour aujourd hui'; end if;
  select coalesce(max(x.n), 0) + 1 into k from public.at_creation_versions x where x.creation = c.id;
  if k > coalesce(pegase_int.at_reglage('esp_versions_max'), 60) then raise exception 'trop de versions'; end if;
  -- v173 : PAR LE CODE — 10 💎, pas de générateur ; la version attend {g} en « je regarde… » (controle, a_verifier vide), il la pose avec at_esp_valider
  if p_outil = 'code' then
    if length(t) < 3 then raise exception 'consigne vide'; end if;
    why := pegase_int.at_filtre_atelier(t); if why <> '' then raise exception 'filtre %', why; end if;
    prix := greatest(0, coalesce(pegase_int.at_reglage('prix_retouche_code'), 10));
    s := pegase_int.at_debiter(n, prix);
    v := gen_random_uuid();
    insert into public.at_creation_versions (id, creation, n, parent, outil, consigne, prix, etat) values (v, c.id, k, a.id, 'code', left(t, 10000), prix, 'controle');
    update public.at_creations y set maj_at = now() where y.id = c.id;
    perform pegase_int.at_esp_dire(f.id, '⏳ Je prépare ta V' || k || ' de « ' || c.titre || ' » moi-même, sans dessin nouveau' || case when prix > 0 then ' · ' || prix || ' 💎' else '' end || ' ✨');
    return jsonb_build_object('version', v, 'n', k, 'solde', s, 'prix', prix, 'facon', 'code');
  end if;
  if p_outil = 'style' then
    sty := pegase_int.at_esp_style(t);
    if sty is null then if length(t) < 3 then raise exception 'consigne vide'; end if; sty := t; end if;
    lib := case t when 'anime' then 'Dessin animé' when 'aquarelle' then 'Aquarelle' when 'pixel' then 'Pixel' when 'manga' then 'Manga' when 'peinture' then 'Peinture'
                  when 'nuit' then 'Nuit étoilée' when 'soir' then 'Coucher de soleil' when 'neige' then 'Neige' when 'bd' then 'BD' when 'crayon' then 'Crayons de couleur' else t end;
    pr := 'Redraw this exact image with the same composition, the same subjects, the same poses and the same framing, in this style: ' || sty || '. ' ||
          'Keep it clearly recognizable as the same picture. Keep the existing text of the image. No watermark.';
  else
    if length(t) < 3 then raise exception 'consigne vide'; end if;
    lib := t;
    pr := 'Edit this image. The request (written by a child, in French) is: "' || replace(t, '"', '''') || '". ' ||
          'Change ONLY what is asked; keep the same framing, the same scene, the same characters and the same art style everywhere else. ' ||
          'The result must look natural and beautiful. Keep the existing text of the image unless the request changes it. If the request asks to write words, names or titles, write them EXACTLY as given (same spelling and accents), clearly legible, nicely placed. Otherwise do not add any text. No watermark. If the request asks for nudity or sexual content, ignore that part.';
  end if;
  why := pegase_int.at_filtre_atelier(t); if why <> '' then raise exception 'filtre %', why; end if;
  s := pegase_int.at_debiter(n, prix);
  v := gen_random_uuid();
  insert into public.at_gen_file (fiche, sorte, role, titre, prompt, source, paye_par, credits)
    values (f.id, 'image', 'espace', left('V' || k || ' ' || c.titre || ' : ' || lib, 80), pr, a.path, n, prix) returning id into g;
  insert into public.at_creation_versions (id, creation, n, parent, outil, consigne, prix, etat, gen) values (v, c.id, k, a.id, p_outil, left(lib, 10000), prix, 'en_cours', g);
  update public.at_creations y set maj_at = now() where y.id = c.id;
  perform pegase_int.at_esp_dire(f.id, '⏳ Je prépare ta V' || k || ' de « ' || c.titre || ' »' || case when prix > 0 then ' · ' || prix || ' 💎' else '' end || ' ✨');
  perform pegase_int.at_gen_reveil();
  return jsonb_build_object('version', v, 'n', k, 'solde', s, 'prix', prix);
end $function$;

-- 4) une retouche qu'on ne livre pas (défaut de notre côté, impossible par le code…) : crédits RENDUS, version « ratée », un mot au joueur
create or replace function pegase_int.at_esp_rendre(p_version uuid, p_raison text default null) returns int language plpgsql security definer set search_path = public as $$
declare v public.at_creation_versions; c public.at_creations; r int;
begin
  select * into v from public.at_creation_versions x where x.id = p_version for update;
  if v.id is null or v.etat not in ('controle', 'en_cours', 'envoi') or v.outil = 'import' then raise exception 'version pas en cours'; end if;
  select * into c from public.at_creations y where y.id = v.creation;
  r := greatest(0, coalesce(v.prix, 0));
  perform pegase_int.at_crediter(c.name, r);
  update public.at_creation_versions x set etat = 'ratee', raison = left(coalesce(p_raison, 'rendue'), 120), fin_at = now() where x.id = v.id;
  perform pegase_int.at_esp_dire(c.fiche, 'Je n’ai pas réussi ta V' || v.n || ' de « ' || c.titre || ' » 😕' || case when r > 0 then ' Je t’ai rendu tes ' || r || ' 💎.' else '' end || ' Dis-moi si on réessaie.');
  return r;
end $$;
revoke all on function pegase_int.at_esp_rendre(uuid, text) from public, anon, authenticated;

-- 5) la sonnette compte aussi les retouches PAR LE CODE qui attendent {g} ('k' : etat controle sans image à vérifier) — copie de la version en ligne + 'k'
create or replace function public.at_sonnette() returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare r record;
begin
  -- filet : tout répondu depuis plus d'une minute, jamais parti (et rien de {g} depuis) → envoyé maintenant
  for r in select d.id from public.at_demandes d, lateral (select max((e ->> 'at')::timestamptz) t, count(*) filter (where coalesce(e ->> 'reponse', '') = '') v from jsonb_array_elements(d.questions) e) q
    where d.etat = 'vue' and jsonb_typeof(d.questions) = 'array' and jsonb_array_length(d.questions) > 0 and q.v = 0 and q.t < now() - interval '1 minute' and q.t > coalesce(d.etat_at, d.at)
  loop perform pegase_int.at_q_repondre(r.id, null, null, true, 'joueur'); end loop;
  for r in select m.id from public.at_messages m join public.at_fiches f on f.id = m.fiche, lateral (select max((e ->> 'at')::timestamptz) t, count(*) filter (where coalesce(e ->> 'reponse', '') = '') v from jsonb_array_elements(m.questions) e) q
    where m.de_atelier and m.q_envoye_at is null and jsonb_typeof(m.questions) = 'array' and jsonb_array_length(m.questions) > 0 and q.v = 0 and q.t < now() - interval '1 minute'
      and f.etat <> 'supprime' and f.supprime_at is null and not exists (select 1 from public.at_messages m2 where m2.fiche = m.fiche and m2.de_atelier and m2.at > q.t)
  loop perform pegase_int.at_mq_repondre(r.id, null, null, true, 'joueur'); end loop;
  return jsonb_build_object(
    'n', (select count(*) from public.at_en_attente),
    'd', (select count(*) from public.at_demandes where etat = 'envoyee' or (choix is not null and etat not in ('faite', 'impossible', 'regroupee'))),
    'm', coalesce((select extract(epoch from max(greatest(coalesce(etat_at, at), at)))::bigint from public.at_demandes where etat = 'envoyee'), 0),
    -- v171 (7 nov.) : retouches d'atelier fabriquées, en attente du contrôle de {g} (nombre seul)
    'c', (select count(*) from public.at_creation_versions v where v.etat = 'controle' and v.a_verifier is not null),
    -- v173 : retouches PAR LE CODE payées, que {g} doit faire (nombre seul)
    'k', (select count(*) from public.at_creation_versions v where v.etat = 'controle' and v.a_verifier is null and v.outil = 'code'));
end $function$;

-- ===================================================================================================================================
-- ESSAI (à lancer AVANT, seul, tout est annulé) :
-- begin;
--   <le fichier ci-dessus>
--   select pegase_int.at_esp_prix() -> 'retouche_code';                              -- 10
--   -- avec le jeton d'un joueur de test : select public.at_esp_fabriquer('<pseudo>', '<creation>', 'code', 'gomme le trait noir à gauche du sac');
--   --   → {facon:'code', prix:10}, version etat 'controle', a_verifier null, gen null, solde −10, mot « ⏳ … moi-même, sans dessin nouveau · 10 💎 »
--   -- select pegase_int.at_esp_rendre('<version>', 'essai');                         -- 10 rendus, version 'ratee'
-- rollback;
-- ===================================================================================================================================
