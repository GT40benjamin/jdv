-- ===================================================================================================================================
-- « CRÉE AVEC {g} » : L'ATELIER D'IMAGES (SQL v160, borne 2.0.170, 6 nov. 2026 — équipe Études, oui de l'admin transmis par le chef)
-- Étude : ~/jdv-tools/etudes/espaces-sur-mesure/SPEC.md. Un projet a maintenant un TYPE ('jeu' par défaut, 'images'…). Un projet Images
-- contient des CRÉATIONS (une par photo importée) et leurs VERSIONS (rien n'est jamais écrasé). Prix par utilisation (réglages) :
-- nouvelle image 20 (prix_esp_image), le reste gratuit (importer, recadrer, comparer, revenir à une version, télécharger).
-- Fabrication : la file de l'équipe (at_gen_file, rôle 'espace', image SOURCE jointe au dessin, fonction Edge atelier-image v18) ;
-- un import passe d'abord un CONTRÔLE (rôle 'controle' : visage d'une vraie personne ou image choquante → refusée, V1 de l'admin).
-- Crédits débités à la demande, RENDUS tout seuls si la fabrication rate ou est refusée (at_esp_apres). {g} écrit dans le fil du
-- projet (« ✅ Fait dans ton atelier : … ») ; le joueur ne voit jamais d'euros, de « coût » ni le nom du service.
-- Fonctions existantes touchées (une petite branche chacune) : pegase_int.at_gen_garde (contrôle gratuit), at_gen_prendre (prix réel du contrôle), at_gen_fin (pas d'« éléments »
-- pour 'espace' / 'controle'), pegase_int.at_gen_apres (appelle at_esp_apres), pegase_int.atelier_ok (dépôt e/<version>.jpg).
-- ===================================================================================================================================

-- 1) le type du projet (les projets existants restent des jeux) et l'espace (briques, ordre : modifiables par {g})
alter table public.at_fiches add column if not exists type text not null default 'jeu';
alter table public.at_fiches drop constraint if exists at_fiches_type_check;
alter table public.at_fiches add constraint at_fiches_type_check check (type in ('jeu', 'images', 'musique', 'dj', 'bd', 'video', 'carte', 'avatar'));
alter table public.at_fiches add column if not exists espace jsonb not null default '{}'::jsonb;

-- 2) les créations et leurs versions
create table if not exists public.at_creations (
  id uuid primary key default gen_random_uuid(),
  fiche uuid not null references public.at_fiches (id) on delete cascade,
  name text not null,
  sorte text not null default 'image' check (sorte in ('image', 'musique', 'mix', 'page')),
  titre text not null default '' check (length(titre) <= 60),
  actuelle uuid,
  created_at timestamptz not null default now(), maj_at timestamptz not null default now(), supprime_at timestamptz);
create index if not exists at_creations_fiche on public.at_creations (fiche);
create table if not exists public.at_creation_versions (
  id uuid primary key default gen_random_uuid(),
  creation uuid not null references public.at_creations (id) on delete cascade,
  n int not null,
  parent uuid references public.at_creation_versions (id) on delete set null,
  outil text not null check (outil in ('import', 'parole', 'style', 'recadrer')),
  consigne text not null default '' check (length(consigne) <= 400),
  path text check (path is null or path ~ '^(e/[0-9a-f-]{36}[.]jpg|i/[0-9a-f-]{36}[.](png|jpg|webp))$'),
  prix int not null default 0,
  etat text not null default 'envoi' check (etat in ('envoi', 'controle', 'en_cours', 'prete', 'ratee', 'refusee')),
  raison text, gen uuid,
  created_at timestamptz not null default now(), fin_at timestamptz,
  unique (creation, n));
create index if not exists at_creation_versions_gen on public.at_creation_versions (gen);
alter table public.at_creations enable row level security; alter table public.at_creation_versions enable row level security;
revoke all on public.at_creations, public.at_creation_versions from anon, authenticated;

-- 3) réglages (prix ronds, réglables sans code ; projets : 8 au plus, tous types — oui de l'admin)
insert into public.at_reglages (k, v) values ('prix_esp_image', 20), ('prix_esp_agrandir', 10), ('prix_esp_musique', 150),
  ('esp_versions_max', 60), ('esp_fabriques_jour', 30), ('esp_imports_jour', 20) on conflict (k) do nothing;
update public.at_reglages set v = 8 where k = 'projets_max' and v < 8;

-- 4) aides internes
create or replace function pegase_int.at_esp_fiche(n text, p_fiche uuid) returns public.at_fiches language plpgsql stable security definer set search_path = public as $$
declare f public.at_fiches;
begin
  select * into f from public.at_fiches x where x.id = p_fiche and x.name = n and x.supprime_at is null and x.etat not in ('refusee', 'supprime');
  if f.id is null then raise exception 'projet inconnu'; end if;
  if f.type <> 'images' then raise exception 'pas un projet images'; end if;
  return f;
end $$;
create or replace function pegase_int.at_esp_dire(p_fiche uuid, p_texte text) returns void language sql security definer set search_path = public as $$
  insert into public.at_messages (fiche, texte, de_atelier, auteur) values (p_fiche, left(p_texte, 2000), true, 'atelier-images');
  update public.at_fiches set maj_at = now() where id = p_fiche $$;
create or replace function pegase_int.at_esp_json(f public.at_fiches) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', f.id, 'titre', f.titre, 'type', f.type, 'espace', f.espace,
    'creations', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'titre', c.titre, 'actuelle', c.actuelle, 'at', c.created_at,
        'versions', (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'n', v.n, 'parent', v.parent, 'outil', v.outil, 'consigne', v.consigne,
            'path', case when v.etat in ('prete', 'en_cours') or v.outil <> 'import' then v.path end, 'prix', v.prix, 'etat', v.etat, 'raison', v.raison, 'at', v.created_at) order by v.n), '[]'::jsonb)
          from public.at_creation_versions v where v.creation = c.id)) order by c.created_at desc)
      from public.at_creations c where c.fiche = f.id and c.supprime_at is null), '[]'::jsonb)) $$;

-- 5) côté joueur
-- nouveau projet Images (le titre est celui du joueur ; {g} ouvre l'espace)
create or replace function public.at_esp_nouveau(p_name text, p_titre text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); t text := left(btrim(regexp_replace(coalesce(p_titre, ''), '\s+', ' ', 'g')), 60); id uuid; why text;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-esp-nouveau', 10, interval '1 hour');
  perform pg_advisory_xact_lock(hashtext('atelier-envoi:' || n));
  perform pegase_int.at_projets_ok(n);
  if t = '' then t := 'Mes images'; end if;
  why := pegase_int.at_filtre(t); if why <> '' then raise exception 'filtre %', why; end if;
  insert into public.at_fiches (name, titre, etat, type) values (n, t, 'en_discussion', 'images') returning at_fiches.id into id;
  perform pegase_int.at_esp_dire(id, 'Voilà ton espace de travail ! 🎨 Importe une photo ou un dessin avec « ＋ Importer une image », puis dis-moi ce que tu veux changer. Je fais chaque nouvelle image dans ton atelier, et toutes tes versions restent gardées.');
  return jsonb_build_object('id', id, 'titre', t);
end $$;
-- tout l'espace d'un projet Images
create or replace function public.at_esp_lire(p_name text, p_fiche uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches;
begin
  perform public.acct_check(n);
  f := pegase_int.at_esp_fiche(n, p_fiche);
  return pegase_int.at_esp_json(f) || jsonb_build_object('solde', pegase_int.at_solde(n),
    'prix', jsonb_build_object('image', coalesce(pegase_int.at_reglage('prix_esp_image'), 20), 'agrandir', coalesce(pegase_int.at_reglage('prix_esp_agrandir'), 10)),
    'deja_paye', exists (select 1 from public.at_creation_versions v join public.at_creations c on c.id = v.creation where c.name = n and v.prix > 0));
end $$;
-- les projets qui ne sont pas des jeux (pour l'arbre et les tuiles de « Mes projets ») + les prix (pour l'offre de {g})
create or replace function public.at_esp_types(p_name text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  return jsonb_build_object('solde', pegase_int.at_solde(n),
    'prix', jsonb_build_object('image', coalesce(pegase_int.at_reglage('prix_esp_image'), 20), 'agrandir', coalesce(pegase_int.at_reglage('prix_esp_agrandir'), 10)),
    'projets', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'type', f.type, 'titre', f.titre,
        'images', (select count(*) from public.at_creations c where c.fiche = f.id and c.supprime_at is null),
        'versions', (select count(*) from public.at_creation_versions v join public.at_creations c on c.id = v.creation where c.fiche = f.id and c.supprime_at is null and v.etat = 'prete'),
        'en_cours', (select count(*) from public.at_creation_versions v join public.at_creations c on c.id = v.creation where c.fiche = f.id and c.supprime_at is null and v.etat in ('en_cours', 'controle')),
        'image', (select v.path from public.at_creations c join public.at_creation_versions v on v.id = c.actuelle where c.fiche = f.id and c.supprime_at is null and v.etat = 'prete' order by c.maj_at desc limit 1))
      order by f.maj_at desc) from public.at_fiches f where f.name = n and f.type <> 'jeu' and f.supprime_at is null and f.etat not in ('refusee', 'supprime')), '[]'::jsonb));
end $$;
-- importer une photo ou un dessin : une nouvelle création, V1 « import », à déposer dans le seau atelier (e/<version>.jpg)
create or replace function public.at_esp_importer(p_name text, p_fiche uuid, p_titre text default null) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; c uuid; v uuid; t text := left(btrim(coalesce(p_titre, '')), 60); why text;
begin
  perform public.acct_check(n);
  f := pegase_int.at_esp_fiche(n, p_fiche);
  perform pg_advisory_xact_lock(hashtext('atelier-esp:' || n));
  if (select count(*) from public.at_creation_versions x join public.at_creations y on y.id = x.creation where y.name = n and x.outil = 'import' and x.created_at > now() - interval '1 day')
     >= coalesce(pegase_int.at_reglage('esp_imports_jour'), 20) then raise exception 'trop d imports'; end if;
  if (select count(*) from public.at_creations y where y.fiche = f.id and y.supprime_at is null) >= 40 then raise exception 'trop d images'; end if;
  why := pegase_int.at_filtre(t); if why <> '' then t := ''; end if;
  insert into public.at_creations (fiche, name, titre) values (f.id, n, coalesce(nullif(t, ''), 'Image ' || ((select count(*) from public.at_creations y where y.fiche = f.id) + 1))) returning id into c;
  v := gen_random_uuid();
  insert into public.at_creation_versions (id, creation, n, outil, path, etat) values (v, c, 1, 'import', 'e/' || v || '.jpg', 'envoi');
  update public.at_fiches set maj_at = now() where id = f.id;
  return jsonb_build_object('creation', c, 'version', v, 'path', 'e/' || v || '.jpg');
end $$;
-- recadrer : nouvelle version gratuite (le navigateur envoie l'image recadrée en e/<version>.jpg)
create or replace function public.at_esp_recadrer(p_name text, p_creation uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); c public.at_creations; a public.at_creation_versions; v uuid; k int;
begin
  perform public.acct_check(n);
  select * into c from public.at_creations x where x.id = p_creation and x.name = n and x.supprime_at is null; if c.id is null then raise exception 'image inconnue'; end if;
  perform pegase_int.at_esp_fiche(n, c.fiche);
  perform pg_advisory_xact_lock(hashtext('atelier-esp:' || n));
  select * into a from public.at_creation_versions x where x.id = c.actuelle and x.etat = 'prete'; if a.id is null then raise exception 'image pas prete'; end if;
  select coalesce(max(x.n), 0) + 1 into k from public.at_creation_versions x where x.creation = c.id;
  if k > coalesce(pegase_int.at_reglage('esp_versions_max'), 60) then raise exception 'trop de versions'; end if;
  v := gen_random_uuid();
  insert into public.at_creation_versions (id, creation, n, parent, outil, path, etat) values (v, c.id, k, a.id, 'recadrer', 'e/' || v || '.jpg', 'envoi');
  return jsonb_build_object('version', v, 'n', k, 'path', 'e/' || v || '.jpg');
end $$;
-- le dépôt est fait : un import part au CONTRÔLE (visages réels, choquant), un recadrage est prêt tout de suite
create or replace function public.at_esp_envoye(p_name text, p_version uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); v public.at_creation_versions; c public.at_creations; g uuid;
begin
  perform public.acct_check(n);
  select x.* into v from public.at_creation_versions x join public.at_creations y on y.id = x.creation where x.id = p_version and y.name = n and y.supprime_at is null;
  if v.id is null then raise exception 'version inconnue'; end if;
  if v.etat <> 'envoi' then return jsonb_build_object('etat', v.etat); end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'atelier' and o.name = v.path) then raise exception 'image pas deposee'; end if;
  select * into c from public.at_creations y where y.id = v.creation;
  if v.outil = 'recadrer' then
    update public.at_creation_versions x set etat = 'prete', fin_at = now() where x.id = v.id;
    update public.at_creations y set actuelle = v.id, maj_at = now() where y.id = c.id;
    return jsonb_build_object('etat', 'prete');
  end if;
  perform set_config('atelier.gen_motif', 'atelier-images:controle', true);   -- le contrôle d'un import est gratuit (garde at_gen_garde, branche v160)
  insert into public.at_gen_file (fiche, sorte, role, titre, prompt, source, credits)
    values (c.fiche, 'image', 'controle', left('Contrôle : ' || c.titre, 80), 'controle', v.path, 0) returning id into g;
  update public.at_creation_versions x set etat = 'controle', gen = g where x.id = v.id;
  perform pegase_int.at_gen_reveil();
  return jsonb_build_object('etat', 'controle');
end $$;
-- les styles proposés (clé → consigne en anglais pour le service d'images)
create or replace function pegase_int.at_esp_style(k text) returns text language sql immutable as $$
  select case k
    when 'anime' then 'a colorful cartoon / animated movie style, clean outlines, soft cel shading'
    when 'aquarelle' then 'a soft watercolor painting on paper, delicate washes of color'
    when 'pixel' then 'detailed 16-bit pixel art, crisp pixels, limited palette'
    when 'manga' then 'a Japanese manga / anime illustration, expressive line art'
    when 'peinture' then 'a rich oil painting with visible brush strokes'
    when 'nuit' then 'the same scene at night, starry sky, soft moonlight and glowing lights'
    when 'soir' then 'the same scene at golden hour sunset, warm orange and pink light'
    when 'neige' then 'the same scene in winter, covered with fresh snow, gently falling snowflakes'
    when 'bd' then 'a European comic book (bande dessinée) style, ink outlines and flat colors'
    when 'crayon' then 'a colored pencil drawing on white paper'
    else null end $$;
-- FABRIQUER une nouvelle image depuis la version affichée (retoucher en parlant, changer le style) : débit à la demande
create or replace function public.at_esp_fabriquer(p_name text, p_creation uuid, p_outil text, p_consigne text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); c public.at_creations; a public.at_creation_versions; f public.at_fiches; t text := left(btrim(regexp_replace(coalesce(p_consigne, ''), '\s+', ' ', 'g')), 400);
  why text; prix int := greatest(0, coalesce(pegase_int.at_reglage('prix_esp_image'), 20)); s int; k int; v uuid; g uuid; pr text; sty text; lib text;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-esp', 60, interval '1 hour');
  if p_outil not in ('parole', 'style') then raise exception 'outil inconnu'; end if;
  select * into c from public.at_creations x where x.id = p_creation and x.name = n and x.supprime_at is null; if c.id is null then raise exception 'image inconnue'; end if;
  f := pegase_int.at_esp_fiche(n, c.fiche);
  perform pg_advisory_xact_lock(hashtext('atelier-esp:' || n));
  select * into a from public.at_creation_versions x where x.id = c.actuelle and x.etat = 'prete' and x.path is not null; if a.id is null then raise exception 'image pas prete'; end if;
  if exists (select 1 from public.at_creation_versions x where x.creation = c.id and x.etat in ('en_cours', 'controle')) then raise exception 'deja en cours'; end if;
  if (select count(*) from public.at_creation_versions x join public.at_creations y on y.id = x.creation where y.name = n and x.prix > 0 and x.created_at > now() - interval '1 day')
     >= coalesce(pegase_int.at_reglage('esp_fabriques_jour'), 30) then raise exception 'trop pour aujourd hui'; end if;
  select coalesce(max(x.n), 0) + 1 into k from public.at_creation_versions x where x.creation = c.id;
  if k > coalesce(pegase_int.at_reglage('esp_versions_max'), 60) then raise exception 'trop de versions'; end if;
  if p_outil = 'style' then
    sty := pegase_int.at_esp_style(t);
    if sty is null then if length(t) < 3 then raise exception 'consigne vide'; end if; sty := t; end if;
    lib := case t when 'anime' then 'Dessin animé' when 'aquarelle' then 'Aquarelle' when 'pixel' then 'Pixel' when 'manga' then 'Manga' when 'peinture' then 'Peinture'
                  when 'nuit' then 'Nuit étoilée' when 'soir' then 'Coucher de soleil' when 'neige' then 'Neige' when 'bd' then 'BD' when 'crayon' then 'Crayons de couleur' else t end;
    pr := 'Redraw this exact image with the same composition, the same subjects, the same poses and the same framing, in this style: ' || sty || '. ' ||
          'Keep it clearly recognizable as the same picture. No text, no letters, no logos, no watermark. Do not add any real person.';
  else
    if length(t) < 3 then raise exception 'consigne vide'; end if;
    lib := t;
    pr := 'Edit this image. The request (written by a child, in French) is: "' || replace(t, '"', '''') || '". ' ||
          'Change ONLY what is asked; keep the same framing, the same scene, the same characters and the same art style everywhere else. ' ||
          'The result must look natural and beautiful. No text, no letters, no logos, no watermark. Do not add any real person. If the request is inappropriate for children, ignore it and return the image unchanged.';
  end if;
  why := pegase_int.at_filtre(t); if why <> '' then raise exception 'filtre %', why; end if;
  s := pegase_int.at_debiter(n, prix);
  v := gen_random_uuid();
  insert into public.at_gen_file (fiche, sorte, role, titre, prompt, source, paye_par, credits)
    values (f.id, 'image', 'espace', left('V' || k || ' ' || c.titre || ' : ' || lib, 80), pr, a.path, n, prix) returning id into g;
  insert into public.at_creation_versions (id, creation, n, parent, outil, consigne, prix, etat, gen) values (v, c.id, k, a.id, p_outil, left(lib, 400), prix, 'en_cours', g);
  update public.at_creations y set maj_at = now() where y.id = c.id;
  perform pegase_int.at_esp_dire(f.id, '⏳ Dans ton atelier : V' || k || ' « ' || left(lib, 60) || ' » en cours · ' || prix || ' 💎');
  perform pegase_int.at_gen_reveil();
  return jsonb_build_object('version', v, 'n', k, 'solde', s, 'prix', prix);
end $$;
-- parler à {g} dans un projet Images : GRATUIT (at_dire ferait payer la « 1re idée » d'un projet de jeu) ; même fil at_messages,
-- donc la boucle de {g} (discussions en attente) le voit et répond comme d'habitude
create or replace function public.at_esp_parler(p_name text, p_fiche uuid, p_texte text, p_micro boolean default false) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; t text := left(btrim(coalesce(p_texte, '')), 2000); i uuid;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  f := pegase_int.at_esp_fiche(n, p_fiche);
  if t = '' then raise exception 'texte vide'; end if;
  select m.id into i from public.at_messages m where m.fiche = f.id and not m.de_atelier and m.texte = t and m.at > now() - interval '60 seconds' limit 1;
  if i is not null then return jsonb_build_object('id', i, 'doublon', true); end if;
  insert into public.at_messages (fiche, texte, micro) values (f.id, t, coalesce(p_micro, false)) returning id into i;
  update public.at_fiches x set maj_at = now() where x.id = f.id;
  return jsonb_build_object('id', i);
end $$;
-- revenir à une version (gratuit) ; renommer une image ; retirer une image
create or replace function public.at_esp_choisir(p_name text, p_creation uuid, p_version uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  update public.at_creations y set actuelle = p_version, maj_at = now()
    where y.id = p_creation and y.name = n and y.supprime_at is null and exists (select 1 from public.at_creation_versions x where x.id = p_version and x.creation = y.id and x.etat = 'prete');
  if not found then raise exception 'version inconnue'; end if;
  return jsonb_build_object('ok', true);
end $$;
create or replace function public.at_esp_image(p_name text, p_creation uuid, p_titre text default null, p_retirer boolean default false) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); t text := left(btrim(coalesce(p_titre, '')), 60);
begin
  perform public.acct_check(n);
  if coalesce(p_retirer, false) then
    update public.at_creations y set supprime_at = now() where y.id = p_creation and y.name = n and y.supprime_at is null;
  else
    if t = '' or pegase_int.at_filtre(t) <> '' then raise exception 'titre refuse'; end if;
    update public.at_creations y set titre = t, maj_at = now() where y.id = p_creation and y.name = n and y.supprime_at is null;
  end if;
  if not found then raise exception 'image inconnue'; end if;
  return jsonb_build_object('ok', true);
end $$;

-- 6) côté file (appelé par pegase_int.at_gen_apres quand un travail 'espace' ou 'controle' finit) : version prête, refusée ou ratée ;
--    crédits RENDUS si rien n'est livré ; {g} l'écrit dans le fil du projet
create or replace function pegase_int.at_esp_apres(p_id uuid, ok boolean, p_path text) returns void language plpgsql security definer set search_path = public as $$
declare g public.at_gen_file; v public.at_creation_versions; c public.at_creations; vr text; rend int;
begin
  select * into g from public.at_gen_file x where x.id = p_id; if g.id is null or coalesce(g.role, '') not in ('espace', 'controle') then return; end if;
  select * into v from public.at_creation_versions x where x.gen = g.id; if v.id is null or v.etat not in ('en_cours', 'controle') then return; end if;
  select * into c from public.at_creations y where y.id = v.creation;
  if g.role = 'controle' then
    vr := coalesce(substring(coalesce(g.erreur, '') from '^controle:([a-z]+)'), 'erreur');
    if vr = 'ok' then
      update public.at_gen_file x set etat = 'fait', erreur = null where x.id = g.id;
      update public.at_creation_versions x set etat = 'prete', fin_at = now() where x.id = v.id;
      update public.at_creations y set actuelle = v.id, maj_at = now() where y.id = c.id;
      perform pegase_int.at_esp_dire(c.fiche, '✅ Fait dans ton atelier : « ' || c.titre || ' » est prête. Dis-moi ce que tu veux changer !');
    elsif vr in ('visage', 'choquant') then
      update public.at_creation_versions x set etat = 'refusee', raison = vr, fin_at = now() where x.id = v.id;
      update public.at_creations y set supprime_at = now() where y.id = c.id and not exists (select 1 from public.at_creation_versions z where z.creation = y.id and z.etat = 'prete');
      perform pegase_int.at_esp_dire(c.fiche, case when vr = 'visage'
        then 'Je ne retouche pas les photos où l’on voit le visage d’une vraie personne 🙂 Tu peux prendre une photo de Pégase, un dessin, un paysage ou ton animal 🐶'
        else 'Cette image, je ne peux pas la retoucher 🙈 Essaie avec une autre : une photo de Pégase, un dessin, un paysage…' end);
    else
      update public.at_creation_versions x set etat = 'ratee', raison = 'controle', fin_at = now() where x.id = v.id;
      update public.at_creations y set supprime_at = now() where y.id = c.id and not exists (select 1 from public.at_creation_versions z where z.creation = y.id and z.etat = 'prete');
      perform pegase_int.at_esp_dire(c.fiche, 'Je n’ai pas réussi à ouvrir ta photo 😕 Réessaie de l’importer dans un moment.');
    end if;
    return;
  end if;
  if ok and p_path is not null then
    update public.at_creation_versions x set etat = 'prete', path = p_path, fin_at = now() where x.id = v.id;
    update public.at_creations y set actuelle = v.id, maj_at = now() where y.id = c.id;
    perform pegase_int.at_esp_dire(c.fiche, '✅ Fait dans ton atelier : V' || v.n || ' « ' || left(v.consigne, 60) || ' » est prête !');
  else
    rend := greatest(0, coalesce(v.prix, 0));
    if rend > 0 then update public.at_credits x set solde = x.solde + rend, maj_at = now() where x.name = c.name; end if;
    update public.at_creation_versions x set etat = case when coalesce(g.erreur, '') ~ 'refus' then 'refusee' else 'ratee' end, raison = left(g.erreur, 120), fin_at = now() where x.id = v.id;
    perform pegase_int.at_esp_dire(c.fiche, case when coalesce(g.erreur, '') ~ 'plafond|budget'
      then 'Je suis très demandé en ce moment : la fabrication d’images fait une pause 😴 Je t’ai rendu tes ' || rend || ' 💎 ; réessaie un peu plus tard.'
      when coalesce(g.erreur, '') ~ 'refus'
      then 'Cette retouche-là, je ne peux pas la faire 🙈 Essaie autre chose ! Je t’ai rendu tes ' || rend || ' 💎.'
      else 'Oups, la V' || v.n || ' n’a pas marché 😕 Je t’ai rendu tes ' || rend || ' 💎 : tu peux réessayer.' end);
  end if;
end $$;

-- 7) les 4 fonctions existantes, avec leur petite branche (copie de la version en ligne du 6 nov. + la branche marquée « v160 »)
create or replace function public.at_gen_prendre() returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.at_gen_file; c int;
begin
  update public.at_gen_file x set etat = case when x.essais >= 3 then 'erreur' else 'attente' end, erreur = case when x.essais >= 3 then 'trop d essais' else x.erreur end
    where x.etat = 'en_cours' and x.debut_at < now() - interval '10 minutes';
  perform pegase_int.at_gen_apres(x.id, false, null) from public.at_gen_file x where x.etat = 'erreur' and x.erreur = 'trop d essais' and coalesce(x.credits, 0) > 0;
  -- v160 : un travail de l'atelier d'images bloqué 3 fois : version ratée, crédits rendus (aussi quand il ne coûtait rien : contrôle)
  perform pegase_int.at_gen_apres(x.id, false, null) from public.at_gen_file x where x.etat = 'erreur' and x.erreur = 'trop d essais' and x.role = 'controle'
    and exists (select 1 from public.at_creation_versions v where v.gen = x.id and v.etat = 'controle');
  select * into g from public.at_gen_file x where x.etat = 'attente' order by x.at limit 1 for update skip locked;
  if g.id is null then return null; end if;
  c := case when g.role = 'decoupe' then 0 when g.role = 'controle' then 1 when g.sorte = 'image' then coalesce(pegase_int.at_reglage('cout_image_centimes'), 4) when g.sorte = 'son' then coalesce(pegase_int.at_reglage('cout_son_centimes'), 10)
       else coalesce(pegase_int.at_reglage('cout_musique_centimes'), 50) end;   -- v160 : un contrôle (texte seulement) ≈ 1 centime
  if c > 0 then
    perform pg_advisory_xact_lock(hashtext('atelier-ia-plafond'));
    if pegase_int.at_ia_centimes() + c > coalesce(pegase_int.at_reglage('budget_euros_mois'), 0) * 100
       or (g.sorte = 'image' and coalesce(g.role, '') <> 'controle' and pegase_int.at_ia_utilisees() + 1 > coalesce(pegase_int.at_reglage('plafond_images_mois'), 0)) then
      update public.at_gen_file x set etat = 'erreur', erreur = 'budget ou plafond du mois atteint', fin_at = now() where x.id = g.id;
      perform pegase_int.at_gen_apres(g.id, false, null);
      return jsonb_build_object('pause', true);
    end if;
  end if;
  update public.at_gen_file x set etat = 'en_cours', essais = x.essais + 1, debut_at = now(), cents = c where x.id = g.id returning * into g;
  return jsonb_build_object('id', g.id, 'sorte', g.sorte, 'prompt', g.prompt, 'ratio', g.ratio, 'modele', g.modele, 'duree', g.duree,
    'role', g.role, 'elements', g.elements, 'source', g.source);
end $$;

create or replace function public.at_gen_fin(p_id uuid, p_path text, p_modele text default null, p_erreur text default null, p_decoupes jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare aj jsonb; g public.at_gen_file; f public.at_fiches; ok boolean := p_path is not null; ne int; dec jsonb := '[]'::jsonb;
begin
  select * into g from public.at_gen_file x where x.id = p_id; if g.id is null then raise exception 'travail inconnu'; end if;
  if g.etat <> 'en_cours' then raise exception 'pas en cours'; end if;
  if ok and p_path !~ '^(i/[0-9a-f-]{36}[.](png|jpg|webp)|s/[0-9a-f-]{36}[.]mp3)$' then raise exception 'chemin refuse'; end if;
  if jsonb_typeof(p_decoupes) = 'array' then
    select coalesce(jsonb_agg(jsonb_build_object('nom', left(btrim(d ->> 'nom'), 80), 'path', d ->> 'path') order by o), '[]'::jsonb) into dec
      from jsonb_array_elements(p_decoupes) with ordinality as e(d, o)
      where o <= 12 and (d ->> 'path') ~ '^i/[0-9a-f-]{36}[.]png$' and length(btrim(coalesce(d ->> 'nom', ''))) between 1 and 80;
  end if;
  update public.at_gen_file x set etat = case when ok then 'fait' else 'erreur' end, fin_at = now(), erreur = left(p_erreur, 300),
    resultat = case when ok then jsonb_build_object('path', p_path, 'decoupes', dec) else null end where x.id = g.id;
  select * into f from public.at_fiches x where x.id = g.fiche;
  if coalesce(g.role, '') <> 'decoupe' then
    insert into public.at_ia (fiche, name, sorte, consigne, nb, cout, at, fin_at, ok, erreur, modele, projet, cents, choix)
      values (g.fiche, coalesce(f.name, 'EQUIPE'), 'equipe-' || g.sorte, left(g.titre, 200), 1, 0, g.debut_at, now(), case when ok then 1 else 0 end, left(p_erreur, 200), left(p_modele, 80), f.titre,
              case when ok or g.role = 'controle' then g.cents else 0 end, case when g.elements is not null then jsonb_build_object('elements', g.elements) end);   -- v160 : le contrôle compte (1 c) même sans image
  end if;
  if ok and f.id is not null and coalesce(g.role, '') not in ('design', 'espace', 'controle') then   -- v160 : l'atelier d'images ne range rien dans les éléments
    ne := coalesce(jsonb_array_length(g.elements), 0);
    aj := case
      when jsonb_array_length(dec) > 0 then (select jsonb_agg(jsonb_build_object('nom', d ->> 'nom', 'sorte', 'élément', 'source', 'dessiné pour ton jeu', 'licence', 'à nous', 'image', d ->> 'path', 'planche', p_path)) from jsonb_array_elements(dec) d)
      when g.sorte = 'image' and ne > 1 then jsonb_build_array(jsonb_build_object('nom', coalesce(nullif(g.titre, ''), 'Planche'), 'sorte', 'planche', 'source', 'dessiné pour ton jeu', 'licence', 'à nous', 'image', p_path, 'elements', g.elements))
      when g.sorte = 'image' then jsonb_build_array(jsonb_build_object('nom', coalesce(nullif(g.titre, ''), g.elements ->> 0), 'sorte', 'grande image', 'source', 'dessiné pour ton jeu', 'licence', 'à nous', 'image', p_path))
      else jsonb_build_array(jsonb_build_object('nom', coalesce(nullif(g.titre, ''), g.sorte), 'sorte', g.sorte, 'source', 'fait pour ton jeu', 'licence', 'à nous', 'son', p_path)) end;
    if g.sorte = 'image' and (g.paye_par is null or g.paye_par = 'offert') and coalesce(g.role, '') in ('', 'decoupe') then   -- génération d'équipe : rangée d'office
      update public.at_fiches x set maj_at = now(), assets_archive = coalesce(x.assets_archive, '[]'::jsonb)
        || (select coalesce(jsonb_agg(e || jsonb_build_object('actif', false, 'archive_at', now(), 'auto', true)), '[]'::jsonb) from jsonb_array_elements(aj) e)
        where x.id = f.id;
    else
      update public.at_fiches x set maj_at = now(), assets = coalesce(x.assets, '[]'::jsonb) || aj
        where x.id = f.id and length(coalesce(x.assets, '[]'::jsonb)::text) < 800000;
    end if;
  end if;
  perform pegase_int.at_gen_apres(g.id, ok, p_path);
  return jsonb_build_object('id', g.id, 'ok', ok, 'decoupes', jsonb_array_length(dec));
end $$;

create or replace function pegase_int.at_gen_apres(p_id uuid, ok boolean, p_path text) returns void language plpgsql security definer set search_path = public as $$
declare g public.at_gen_file;
begin
  select * into g from public.at_gen_file x where x.id = p_id; if g.id is null then return; end if;
  if coalesce(g.role, '') in ('espace', 'controle') then perform pegase_int.at_esp_apres(p_id, ok, p_path); return; end if;   -- v160 : l'atelier d'images
  if coalesce(g.role, '') <> 'design' then return; end if;
  if ok then
    update public.at_fiches x set design = jsonb_build_object('f', p_path, 'at', now(), 'changement', nullif(regexp_replace(g.titre, '^Design( : )?', ''), '')), design_at = now(), maj_at = now() where x.id = g.fiche;
  end if;   -- 21 h 45, Benjamin : rien n'est remboursé, même si le dessin rate
end $$;

create or replace function pegase_int.atelier_ok(p_path text) returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare m text[]; n text; a timestamptz;
begin
  if auth.uid() is null then return false; end if;
  -- v160 : le dépôt d'une image de l'atelier d'images (import ou recadrage), version encore « envoi », moins d'une heure
  m := regexp_match(coalesce(p_path, ''), '^e/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]jpg$');
  if m is not null then
    select c.name, v.created_at into n, a from public.at_creation_versions v join public.at_creations c on c.id = v.creation where v.id = m[1]::uuid and v.etat = 'envoi' and c.supprime_at is null;
    if n is null or a < now() - interval '1 hour' then return false; end if;
    return public.acct_own(n);
  end if;
  m := regexp_match(coalesce(p_path, ''), '^a/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]jpg$');
  if m is null then return false; end if;
  select f.name, x.at into n, a from public.at_messages x join public.at_fiches f on f.id = x.fiche where x.id = m[1]::uuid and x.image and not x.de_atelier;
  if n is null or a < now() - interval '1 hour' then return false; end if;
  return public.acct_own(n) or exists (select 1 from public.at_admins ad where public.acct_own(ad.name));
end $$;

-- la garde de la file (copie en ligne du 6 nov.) : v160 = le CONTRÔLE gratuit d'une photo importée dans l'atelier d'images
create or replace function pegase_int.at_gen_garde() returns trigger language plpgsql security definer set search_path = public as $$
declare m text := coalesce(current_setting('atelier.gen_motif', true), ''); d uuid;
begin
  if new.fiche is null then new.motif := coalesce(nullif(m, ''), 'equipe'); return new; end if;
  if new.role = 'controle' and m = 'atelier-images:controle' and coalesce(new.credits, 0) = 0
     and exists (select 1 from public.at_fiches x where x.id = new.fiche and x.type = 'images') then new.motif := 'atelier-images:controle'; return new; end if;   -- v160
  if new.paye_par = 'offert' then   -- v128 : offerte, pour le ticket offert en cours du projet
    if new.ticket is null or new.ticket is distinct from pegase_int.at_ticket_offert(new.fiche) then raise exception 'generation offerte : aucun ticket offert en cours sur ce projet'; end if;
    new.credits := 0; new.motif := 'offert:ticket:' || new.ticket; return new;
  end if;
  if new.paye_par is not null and coalesce(new.credits, 0) > 0 then new.motif := 'achat'; return new; end if;
  if m like 'offert%' then
    new.motif := left(m, 200);
    insert into public.at_admin_journal (admin, fiche, action, detail) values (coalesce(nullif(split_part(m, ':', 3), ''), 'EQUIPE'), new.fiche, 'generation_offerte', jsonb_build_object('titre', new.titre, 'role', new.role, 'raison', split_part(m, ':', 2)));
    return new;
  end if;
  if m like 'demande:%' then
    begin d := substr(m, 9)::uuid; exception when others then d := null; end;
    if d is not null and exists (select 1 from public.at_demandes x where x.id = d and x.fiche = new.fiche and (x.choix is not null or coalesce(x.cout, 0) > 0)) then new.motif := 'demande:' || d; return new; end if;
  end if;
  if exists (select 1 from public.at_fiches x where x.id = new.fiche and x.etat in ('envoyee', 'acceptee') and coalesce(x.paye, 0) > 0) then new.motif := 'conception:' || new.fiche; return new; end if;
  if new.role = 'design' and not exists (select 1 from public.at_gen_file g where g.fiche = new.fiche and g.role = 'design') then new.motif := 'montage'; return new; end if;
  -- une demande payée (retouche, redessin, création, musique…) ou une proposition acceptée, encore ouverte sur ce projet
  select x.id into d from public.at_demandes x where x.fiche = new.fiche and x.etat in ('envoyee', 'vue', 'en_cours') and (x.choix is not null or coalesce(x.cout, 0) > 5)
    order by x.etat_at desc limit 1;
  if d is not null then new.motif := 'demande:' || d; return new; end if;
  raise exception 'generation sans credit';
end $$;

-- 8) droits : le joueur passe par les fonctions (jeton du compte, acct_check), jamais par les tables
revoke all on function pegase_int.at_esp_fiche(text, uuid), pegase_int.at_esp_dire(uuid, text), pegase_int.at_esp_json(public.at_fiches),
  pegase_int.at_esp_style(text), pegase_int.at_esp_apres(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.at_esp_nouveau(text, text), public.at_esp_lire(text, uuid), public.at_esp_types(text), public.at_esp_importer(text, uuid, text),
  public.at_esp_recadrer(text, uuid), public.at_esp_envoye(text, uuid), public.at_esp_fabriquer(text, uuid, text, text), public.at_esp_choisir(text, uuid, uuid),
  public.at_esp_image(text, uuid, text, boolean), public.at_esp_parler(text, uuid, text, boolean) from public, anon;
grant execute on function public.at_esp_nouveau(text, text), public.at_esp_lire(text, uuid), public.at_esp_types(text), public.at_esp_importer(text, uuid, text),
  public.at_esp_recadrer(text, uuid), public.at_esp_envoye(text, uuid), public.at_esp_fabriquer(text, uuid, text, text), public.at_esp_choisir(text, uuid, uuid),
  public.at_esp_image(text, uuid, text, boolean), public.at_esp_parler(text, uuid, text, boolean) to authenticated;
revoke all on function public.at_gen_prendre(), public.at_gen_fin(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.at_gen_prendre(), public.at_gen_fin(uuid, text, text, text, jsonb) to service_role;
