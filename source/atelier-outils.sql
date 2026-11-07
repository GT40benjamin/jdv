-- ===================================================================================================================================
-- « CRÉE AVEC {g} » : LES OUTILS FAITS PAR LE CODE (SQL v172, 7 nov. 2026 — équipe Outils, proposé au chef)
-- Client : source/atelier-outils.js (le REGISTRE des outils). Une version faite par le CODE (✏️ texte, 🧽 gomme, ✂️ fond, 🧩 éléments…)
-- ne passe pas par le générateur : le navigateur dessine l'image, la dépose dans le seau atelier (e/<version>.jpg ou .png : un fond
-- retiré est TRANSPARENT), puis at_esp_envoye la rend prête tout de suite (comme un recadrage).
-- GÉNÉRIQUE : un outil du code existe côté serveur s'il a sa ligne at_reglages 'prix_code_<outil>' (= son prix, 0 = gratuit) ;
-- exception gratuite PAR IMAGE : 'code_gratuit:<outil>:<creation id>' = 1. Ajouter un outil = UNE ligne de réglage, aucun SQL.
-- Prix au départ : texte 0, gomme 0 et dessin 0 (admin, 7 nov.), fond 0, éléments 10, ajouter une image 0 (proposé, à fixer par le chef) (la « Carte Ylix » de SAMBA gratuite). Débité SEULEMENT quand la
-- version est déposée et prête ; le prix vu par le joueur est renvoyé (p_prix) : s'il a changé, rien n'est créé ni débité (« prix change »).
-- 📍 Épingles : at_esp_parler(…, p_image) dépose la copie de la photo avec les épingles dessinées (a/<message>.jpg, gratuit).
-- Fonctions remplacées, copiées de la version EN LIGNE du 7 nov. (v171) + la branche marquée « v172 » : at_esp_envoye, atelier_ok,
-- at_esp_lire, at_esp_types, at_esp_parler (nouvel argument p_image : l'ancienne à 4 arguments est retirée, sinon PostgREST hésite).
-- Relançable. Essai : bloc begin … rollback en fin de fichier (à lancer d'abord).
-- ===================================================================================================================================

-- 1) les outils du code (nom court en minuscules : le registre décide lesquels existent), le PNG, les calques
alter table public.at_creation_versions drop constraint if exists at_creation_versions_outil_check;
alter table public.at_creation_versions add constraint at_creation_versions_outil_check
  check (outil in ('import', 'parole', 'style', 'recadrer') or outil ~ '^[a-z]{3,20}$');
alter table public.at_creation_versions drop constraint if exists at_creation_versions_path_check;
alter table public.at_creation_versions add constraint at_creation_versions_path_check
  check (path is null or path ~ '^(e/[0-9a-f-]{36}[.](jpg|png)|i/[0-9a-f-]{36}[.](png|jpg|webp))$');
alter table public.at_creation_versions add column if not exists calques jsonb;
-- le seau atelier accepte le PNG transparent (4 Mo au plus ; JPEG inchangé)
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png'], file_size_limit = 4194304 where id = 'atelier';

-- 2) le registre côté serveur : un prix par outil (on ne touche pas un prix déjà réglé par le chef : do nothing)
insert into public.at_reglages (k, v) values ('prix_code_texte', 0), ('prix_code_gomme', 0), ('prix_code_dessin', 0), ('prix_code_fond', 0), ('prix_code_elements', 10), ('prix_code_ajout', 0), ('esp_code_jour', 120)
  on conflict (k) do nothing;
insert into public.at_reglages (k, v) values ('code_gratuit:elements:f520cb19-1685-4d4e-83c8-5a5056e96842', 1) on conflict (k) do update set v = excluded.v;

-- 3) aides
-- le prix d'un outil pour une image (null = cet outil n'existe pas côté serveur)
create or replace function pegase_int.at_code_prix(p_outil text, p_creation uuid) returns int language sql stable security definer set search_path = public as $$
  select case when not exists (select 1 from public.at_reglages r where r.k = 'prix_code_' || p_outil) then null
    when exists (select 1 from public.at_reglages r where r.k = 'code_gratuit:' || p_outil || ':' || p_creation::text and r.v > 0) then 0
    else greatest(0, coalesce((select r.v from public.at_reglages r where r.k = 'prix_code_' || p_outil), 0)) end $$;
-- les prix montrés à l'écran (les mêmes pour le joueur et pour l'admin qui regarde son atelier)
create or replace function pegase_int.at_esp_prix() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('image', coalesce(pegase_int.at_reglage('prix_esp_image'), 20), 'agrandir', coalesce(pegase_int.at_reglage('prix_esp_agrandir'), 10),
    'code', coalesce((select jsonb_object_agg(substr(r.k, 11), greatest(0, r.v)) from public.at_reglages r where r.k like 'prix\_code\_%'), '{}'::jsonb),
    'code_gratuit', coalesce((select jsonb_object_agg(o, ids) from (select split_part(r.k, ':', 2) o, jsonb_agg(split_part(r.k, ':', 3)) ids
        from public.at_reglages r where r.k like 'code\_gratuit:%:%' and r.v > 0 group by 1) z), '{}'::jsonb)) $$;

-- 4) une version faite par le code : à déposer en e/<version>.<jpg|png>, puis at_esp_envoye
create or replace function public.at_esp_code(p_name text, p_creation uuid, p_version uuid, p_outil text, p_format text, p_consigne text, p_calques jsonb default null, p_prix int default 0)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
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
  -- la version de départ = celle que le joueur regarde (prête), sinon l'actuelle
  select * into a from public.at_creation_versions x where x.id = coalesce(p_version, c.actuelle) and x.creation = c.id and x.etat = 'prete' and x.path is not null;
  if a.id is null then raise exception 'image pas prete'; end if;
  select coalesce(max(x.n), 0) + 1 into k from public.at_creation_versions x where x.creation = c.id;
  if k > coalesce(pegase_int.at_reglage('esp_versions_max'), 60) then raise exception 'trop de versions'; end if;
  if t = '' then t := 'Retouche'; end if;
  why := pegase_int.at_filtre(t); if why <> '' then raise exception 'filtre %', why; end if;   -- le texte écrit sur la photo passe le filtre enfants
  if p_calques is not null and length(p_calques::text) > 20000 then raise exception 'calques trop longs'; end if;
  if coalesce(p_prix, 0) <> prix then raise exception 'prix change %', prix; end if;   -- jamais un autre prix que celui annoncé
  if prix > 0 and pegase_int.at_solde(n) < prix then raise exception 'credits insuffisants'; end if;
  v := gen_random_uuid();
  insert into public.at_creation_versions (id, creation, n, parent, outil, consigne, path, prix, etat, calques)
    values (v, c.id, k, a.id, p_outil, t, 'e/' || v || '.' || p_format, prix, 'envoi', p_calques);
  return jsonb_build_object('version', v, 'n', k, 'path', 'e/' || v || '.' || p_format, 'prix', prix);
end $$;

-- 5) le dépôt est fait : import → CONTRÔLE ; recadrage et outils du code → prêts tout de suite (v172 : prix débité ici)
create or replace function public.at_esp_envoye(p_name text, p_version uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_variable
declare n text := public.pg_n(p_name); v public.at_creation_versions; c public.at_creations; g uuid; s int;
begin
  perform public.acct_check(n);
  perform pg_advisory_xact_lock(hashtext('atelier-esp:' || n));   -- v172 : deux envois en même temps ne débitent jamais deux fois
  select x.* into v from public.at_creation_versions x join public.at_creations y on y.id = x.creation where x.id = p_version and y.name = n and y.supprime_at is null;
  if v.id is null then raise exception 'version inconnue'; end if;
  if v.etat <> 'envoi' then return jsonb_build_object('etat', v.etat, 'solde', pegase_int.at_solde(n)); end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'atelier' and o.name = v.path) then raise exception 'image pas deposee'; end if;
  select * into c from public.at_creations y where y.id = v.creation;
  if v.outil <> 'import' then   -- recadrer et tous les outils du code (une version 'parole' / 'style' n'est jamais « envoi »)
    s := pegase_int.at_debiter(n, coalesce(v.prix, 0));   -- 0 = rien ; « credits insuffisants » = rien n'est fait (la version reste « envoi »)
    update public.at_creation_versions x set etat = 'prete', fin_at = now() where x.id = v.id;
    update public.at_creations y set actuelle = v.id, maj_at = now() where y.id = c.id;
    if v.outil <> 'recadrer' then
      perform pegase_int.at_esp_dire(c.fiche, '✅ Fait dans ton atelier : V' || v.n || ' « ' || left(v.consigne, 60) || ' » est prête'
        || case when coalesce(v.prix, 0) > 0 then ' · ' || v.prix || ' 💎' else ' (gratuit)' end || ' !');
    end if;
    return jsonb_build_object('etat', 'prete', 'solde', s);
  end if;
  perform set_config('atelier.gen_motif', 'atelier-images:controle', true);
  insert into public.at_gen_file (fiche, sorte, role, titre, prompt, source, credits)
    values (c.fiche, 'image', 'controle', left('Contrôle : ' || c.titre, 80), 'controle', v.path, 0) returning id into g;
  update public.at_creation_versions x set etat = 'controle', gen = g where x.id = v.id;
  perform pegase_int.at_gen_reveil();
  return jsonb_build_object('etat', 'controle');
end $$;

-- 6) qui peut déposer : v172 = e/<version>.png aussi (le nom doit être EXACTEMENT celui de la version)
create or replace function pegase_int.atelier_ok(p_path text) returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare m text[]; n text; a timestamptz;
begin
  if auth.uid() is null then return false; end if;
  m := regexp_match(coalesce(p_path, ''), '^e/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.](jpg|png)$');
  if m is not null then
    select c.name, v.created_at into n, a from public.at_creation_versions v join public.at_creations c on c.id = v.creation
      where v.id = m[1]::uuid and v.path = p_path and v.etat = 'envoi' and c.supprime_at is null;
    if n is null or a < now() - interval '1 hour' then return false; end if;
    return public.acct_own(n);
  end if;
  m := regexp_match(coalesce(p_path, ''), '^a/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]jpg$');
  if m is null then return false; end if;
  select f.name, x.at into n, a from public.at_messages x join public.at_fiches f on f.id = x.fiche where x.id = m[1]::uuid and x.image and not x.de_atelier;
  if n is null or a < now() - interval '1 hour' then return false; end if;
  return public.acct_own(n) or exists (select 1 from public.at_admins ad where public.acct_own(ad.name));
end $$;

-- 7) les prix (v172 : + code, code_gratuit) dans at_esp_lire (les deux branches) et at_esp_types
create or replace function public.at_esp_lire(p_name text, p_fiche uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_variable
declare n text := public.pg_n(p_name); f public.at_fiches; j text;
begin
  perform public.acct_check(n);
  select x.name into j from public.at_fiches x where x.id = p_fiche and x.supprime_at is null;
  if j is not null and j <> n and exists (select 1 from public.at_admins a where a.name = n) then
    f := pegase_int.at_esp_fiche(j, p_fiche);
    return pegase_int.at_esp_json(f) || jsonb_build_object('solde', pegase_int.at_solde(j),
      'prix', pegase_int.at_esp_prix(),
      'deja_paye', exists (select 1 from public.at_creation_versions v join public.at_creations c on c.id = v.creation where c.name = j and v.prix > 0),
      'admin_voir', jsonb_build_object('joueur', j, 'solde', pegase_int.at_solde(j)));
  end if;
  f := pegase_int.at_esp_fiche(n, p_fiche);
  return pegase_int.at_esp_json(f) || jsonb_build_object('solde', pegase_int.at_solde(n),
    'prix', pegase_int.at_esp_prix(),
    'deja_paye', exists (select 1 from public.at_creation_versions v join public.at_creations c on c.id = v.creation where c.name = n and v.prix > 0));
end $$;
create or replace function public.at_esp_types(p_name text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_variable
declare n text := public.pg_n(p_name); adm boolean;
begin
  perform public.acct_check(n);
  adm := exists (select 1 from public.at_admins a where a.name = n);
  return jsonb_build_object('solde', pegase_int.at_solde(n),
    'prix', pegase_int.at_esp_prix(),
    'projets', coalesce((select jsonb_agg(pegase_int.at_esp_type_ligne(f) order by f.maj_at desc)
      from public.at_fiches f where f.name = n and f.type <> 'jeu' and f.supprime_at is null and f.etat not in ('refusee', 'supprime')), '[]'::jsonb),
    'autres', case when adm then coalesce((select jsonb_agg(pegase_int.at_esp_type_ligne(f) || jsonb_build_object('joueur', f.name) order by f.maj_at desc)
      from public.at_fiches f where f.name <> n and f.type <> 'jeu' and f.supprime_at is null and f.etat not in ('refusee', 'supprime')), '[]'::jsonb) else '[]'::jsonb end);
end $$;

-- 8) parler à {g} avec une image jointe (📍 la copie épinglée) : p_image = vrai → la réponse donne 'image' = a/<message>.jpg à déposer
drop function if exists public.at_esp_parler(text, uuid, text, boolean);
create or replace function public.at_esp_parler(p_name text, p_fiche uuid, p_texte text, p_micro boolean default false, p_image boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; t text := left(btrim(coalesce(p_texte, '')), 10000); i uuid; im boolean;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  f := pegase_int.at_esp_fiche(n, p_fiche);
  if t = '' then raise exception 'texte vide'; end if;
  select m.id, m.image into i, im from public.at_messages m where m.fiche = f.id and not m.de_atelier and m.texte = t and m.at > now() - interval '60 seconds' limit 1;
  if i is not null then return jsonb_build_object('id', i, 'doublon', true, 'image', case when im then 'a/' || i || '.jpg' end); end if;
  insert into public.at_messages (fiche, texte, micro, image) values (f.id, t, coalesce(p_micro, false), coalesce(p_image, false)) returning id into i;
  update public.at_fiches x set maj_at = now() where x.id = f.id;
  return jsonb_build_object('id', i, 'image', case when coalesce(p_image, false) then 'a/' || i || '.jpg' end);
end $$;

-- 9) droits
revoke all on function pegase_int.at_code_prix(text, uuid), pegase_int.at_esp_prix() from public, anon, authenticated;
revoke all on function public.at_esp_code(text, uuid, uuid, text, text, text, jsonb, int), public.at_esp_parler(text, uuid, text, boolean, boolean) from public, anon;
grant execute on function public.at_esp_code(text, uuid, uuid, text, text, text, jsonb, int), public.at_esp_parler(text, uuid, text, boolean, boolean) to authenticated;

-- ===================================================================================================================================
-- ESSAI (à lancer AVANT, seul : tout est annulé à la fin). Vérifie les contraintes, les prix et l'exception de la Carte Ylix sans écrire.
-- begin;
--   <le fichier ci-dessus>
--   select pegase_int.at_esp_prix();   -- code {ajout:0, dessin:0, elements:10, fond:0, gomme:0, texte:0}, code_gratuit {elements:["f520cb19-…"]}
--   select pegase_int.at_code_prix('elements', 'f520cb19-1685-4d4e-83c8-5a5056e96842');   -- 0
--   select pegase_int.at_code_prix('elements', gen_random_uuid());   -- 10
--   select pegase_int.at_code_prix('gomme', gen_random_uuid());      -- 0
--   select pegase_int.at_code_prix('inconnu', gen_random_uuid());    -- null (refusé par at_esp_code)
--   select 'e/' || gen_random_uuid() || '.png' ~ '^(e/[0-9a-f-]{36}[.](jpg|png)|i/[0-9a-f-]{36}[.](png|jpg|webp))$';   -- true
-- rollback;
-- ===================================================================================================================================
