-- La 1re création d'une image s'appelle V1 (9 nov. 2026, remarque d'une joueuse : « ya pas de v1 c'est en v2 directement »).
-- Pourquoi V2 : le numéro d'une version = le plus grand numéro + 1, et la base (une image importée, ou le modèle d'une nouvelle carte) occupait déjà le n° 1,
-- alors qu'à l'écran une image importée s'appelle « Originale » et pas V1.
-- Correctif : tant que cette base est seule, juste avant de fabriquer la 1re version, elle passe au n° 0 ; la 1re création prend donc le n° 1.
-- Les images déjà faites ne changent pas : dès qu'il y a une 2e version, plus rien n'est renuméroté. Le nom affiché de la base reste « Originale ».
-- Fonctions recopiées telles qu'elles sont EN LIGNE le 9 nov. 2026, une seule ligne ajoutée dans chacune (perform pegase_int.at_esp_num_base). Relançable.
create or replace function pegase_int.at_esp_num_base(p_creation uuid) returns void language sql set search_path = public as $f$
  update public.at_creation_versions x set n = 0
   where x.creation = p_creation and x.n = 1 and x.outil = 'import'
     and not exists (select 1 from public.at_creation_versions y where y.creation = p_creation and y.id <> x.id);
$f$;
revoke all on function pegase_int.at_esp_num_base(uuid) from public;

CREATE OR REPLACE FUNCTION public.at_esp_fabriquer(p_name text, p_creation uuid, p_outil text, p_consigne text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
#variable_conflict use_variable
declare n text := public.pg_n(p_name); c public.at_creations; a public.at_creation_versions; f public.at_fiches; t text := left(btrim(regexp_replace(coalesce(p_consigne, ''), '\s+', ' ', 'g')), 10000);
  why text; prix int := greatest(0, coalesce(pegase_int.at_reglage('prix_esp_image'), 20)); s int; k int; v uuid; g uuid; pr text; sty text; lib text;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-esp', 60, interval '1 hour');
  if p_outil not in ('parole', 'style', 'code') then raise exception 'outil inconnu'; end if;
  select * into c from public.at_creations x where x.id = p_creation and x.name = n and x.supprime_at is null; if c.id is null then raise exception 'image inconnue'; end if;
  f := pegase_int.at_esp_fiche(n, c.fiche);
  perform pg_advisory_xact_lock(hashtext('atelier-esp:' || n));
  select * into a from public.at_creation_versions x where x.id = c.actuelle and x.etat = 'prete' and x.path is not null; if a.id is null then raise exception 'image pas prete'; end if;
  if exists (select 1 from public.at_creation_versions x where x.creation = c.id and x.etat in ('en_cours', 'controle')) then raise exception 'deja en cours'; end if;
  if (select count(*) from public.at_creation_versions x join public.at_creations y on y.id = x.creation where y.name = n and x.prix > 0 and x.created_at > now() - interval '1 day')
     >= coalesce(pegase_int.at_reglage('esp_fabriques_jour'), 30) then raise exception 'trop pour aujourd hui'; end if;
  perform pegase_int.at_esp_num_base(c.id);   -- la base seule passe au n° 0 : la 1re création est V1
  select coalesce(max(x.n), 0) + 1 into k from public.at_creation_versions x where x.creation = c.id;
  if k > coalesce(pegase_int.at_reglage('esp_versions_max'), 60) then raise exception 'trop de versions'; end if;
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

CREATE OR REPLACE FUNCTION public.at_esp_recadrer(p_name text, p_creation uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
#variable_conflict use_variable
declare n text := public.pg_n(p_name); c public.at_creations; a public.at_creation_versions; v uuid; k int;
begin
  perform public.acct_check(n);
  select * into c from public.at_creations x where x.id = p_creation and x.name = n and x.supprime_at is null; if c.id is null then raise exception 'image inconnue'; end if;
  perform pegase_int.at_esp_fiche(n, c.fiche);
  perform pg_advisory_xact_lock(hashtext('atelier-esp:' || n));
  select * into a from public.at_creation_versions x where x.id = c.actuelle and x.etat = 'prete'; if a.id is null then raise exception 'image pas prete'; end if;
  perform pegase_int.at_esp_num_base(c.id);   -- la base seule passe au n° 0 : la 1re création est V1
  select coalesce(max(x.n), 0) + 1 into k from public.at_creation_versions x where x.creation = c.id;
  if k > coalesce(pegase_int.at_reglage('esp_versions_max'), 60) then raise exception 'trop de versions'; end if;
  v := gen_random_uuid();
  insert into public.at_creation_versions (id, creation, n, parent, outil, path, etat) values (v, c.id, k, a.id, 'recadrer', 'e/' || v || '.jpg', 'envoi');
  return jsonb_build_object('version', v, 'n', k, 'path', 'e/' || v || '.jpg');
end $function$;

CREATE OR REPLACE FUNCTION public.at_esp_code(p_name text, p_creation uuid, p_version uuid, p_outil text, p_format text, p_consigne text, p_calques jsonb DEFAULT NULL::jsonb, p_prix integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
#variable_conflict use_variable
declare n text := public.pg_n(p_name); c public.at_creations; a public.at_creation_versions; v uuid; k int; prix int; why text;
  t text := left(btrim(regexp_replace(coalesce(p_consigne, ''), '\s+', ' ', 'g')), 400);
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-esp-code', coalesce(pegase_int.at_reglage('esp_code_jour'), 120), interval '1 day');
  if coalesce(p_outil, '') !~ '^[a-z]{3,20}$' or p_outil in ('import', 'parole', 'style', 'recadrer') then raise exception 'outil inconnu'; end if;
  if p_format not in ('jpg', 'png') then raise exception 'format inconnu'; end if;
  select * into c from public.at_creations x where x.id = p_creation and x.name = n and x.supprime_at is null; if c.id is null then raise exception 'image inconnue'; end if;
  perform pegase_int.at_esp_fiche(n, c.fiche);
  prix := pegase_int.at_code_prix(p_outil, c.id); if prix is null then raise exception 'outil inconnu'; end if;
  perform pg_advisory_xact_lock(hashtext('atelier-esp:' || n));
  select * into a from public.at_creation_versions x where x.id = coalesce(p_version, c.actuelle) and x.creation = c.id and x.etat = 'prete' and x.path is not null;
  if a.id is null then raise exception 'image pas prete'; end if;
  perform pegase_int.at_esp_num_base(c.id);   -- la base seule passe au n° 0 : la 1re création est V1
  select coalesce(max(x.n), 0) + 1 into k from public.at_creation_versions x where x.creation = c.id;
  if k > coalesce(pegase_int.at_reglage('esp_versions_max'), 60) then raise exception 'trop de versions'; end if;
  if t = '' then t := 'Retouche'; end if;
  why := pegase_int.at_filtre_atelier(t); if why <> '' then raise exception 'filtre %', why; end if;
  if p_calques is not null and length(p_calques::text) > 20000 then raise exception 'calques trop longs'; end if;
  if coalesce(p_prix, 0) <> prix then raise exception 'prix change %', prix; end if;
  if prix > 0 and pegase_int.at_solde(n) < prix then raise exception 'credits insuffisants'; end if;
  v := gen_random_uuid();
  insert into public.at_creation_versions (id, creation, n, parent, outil, consigne, path, prix, etat, calques)
    values (v, c.id, k, a.id, p_outil, t, 'e/' || v || '.' || p_format, prix, 'envoi', p_calques);
  return jsonb_build_object('version', v, 'n', k, 'path', 'e/' || v || '.' || p_format, 'prix', prix);
end $function$;

