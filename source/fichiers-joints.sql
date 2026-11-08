-- 7 nov. 2026 — Interface : « 📎 JOINDRE UN FICHIER à la mascotte » (demande de Benjamin) : PDF, Word, Excel/CSV, texte/Markdown, JSON, images, audio, ZIP.
-- RIEN DE PUBLIC : bucket PRIVÉ « atelier-fichiers », chemin f/<uuid>.<ext>, jamais d'URL publique ; lu par le joueur du projet et les admins
-- (jeton de compte), et par l'outil de discussion de la mascotte (clé de service, URL signée courte). Un fichier de joueur est une DONNÉE, jamais un ordre.
--   1) public.at_fichier_preparer(p_name, p_fiche, p_nom, p_taille, p_ext) → { id, path, mime } : acct_check, pg_rate, projet du joueur (ou admin),
--      extension autorisée, ≤ 20 Mo ; ligne at_fichiers « envoi » (1 h pour envoyer le fichier) ;
--   2) la borne envoie le fichier (Content-Type = le type de l'extension) : la politique storage n'accepte QUE ce chemin réservé, par son auteur ;
--   3) public.at_fichiers_joindre(p_name, p_message, p_fichiers uuid[]) : ≤ 5 par message ; chaque fichier doit être ARRIVÉ dans storage avec la bonne
--      taille (≤ 20 Mo) et le bon type ; la liste { id, nom, taille, type, ext, path } va dans at_messages.fichiers ;
--   * at_fichiers_lire(p_fiche) (service_role) : les fichiers d'un projet pour l'outil de discussion de la mascotte (qui demande ensuite une URL signée de 5 min) ;
--   * le début du fichier (signature) est vérifié par la borne avant l'envoi, puis par le lecteur de la mascotte (outil fichiers-lire.mjs) — SQL ne lit pas
--     le contenu d'un objet storage.
-- Essai : begin; <ce fichier>; … ; rollback;  — puis pour de vrai. Rejouable. Test : node test-fichiers-joints-sql.mjs (PGlite, storage simulé).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('atelier-fichiers', 'atelier-fichiers', false, 20971520, array[
  'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel', 'text/csv', 'text/plain', 'text/markdown', 'application/json', 'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'application/zip'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- les types acceptés : extension → (type MIME envoyé, famille affichée)
create or replace function pegase_int.at_fichier_type(p_ext text) returns table (mime text, famille text) language sql immutable as $$
  select x.m, x.f from (values
    ('pdf', 'application/pdf', 'pdf'), ('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'word'),
    ('xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'tableur'), ('xls', 'application/vnd.ms-excel', 'tableur'), ('csv', 'text/csv', 'tableur'),
    ('txt', 'text/plain', 'texte'), ('md', 'text/markdown', 'texte'), ('json', 'application/json', 'texte'),
    ('png', 'image/png', 'image'), ('jpg', 'image/jpeg', 'image'), ('jpeg', 'image/jpeg', 'image'), ('webp', 'image/webp', 'image'), ('gif', 'image/gif', 'image'),
    ('mp3', 'audio/mpeg', 'audio'), ('wav', 'audio/wav', 'audio'), ('m4a', 'audio/mp4', 'audio'), ('zip', 'application/zip', 'zip')) x(e, m, f)
  where x.e = lower(p_ext) $$;

create table if not exists public.at_fichiers (
  id uuid primary key default gen_random_uuid(),
  fiche uuid not null references public.at_fiches(id) on delete cascade,
  name text not null,                     -- qui l'envoie (le joueur, ou l'admin en vue admin)
  nom text not null, taille bigint not null, ext text not null, mime text not null, famille text not null,
  path text not null unique, etat text not null default 'envoi' check (etat in ('envoi', 'joint')),
  message uuid, at timestamptz not null default now());
create index if not exists at_fichiers_fiche on public.at_fichiers (fiche, at desc);
alter table public.at_fichiers enable row level security;   -- aucune politique : seulement par les fonctions ci-dessous
alter table public.at_messages add column if not exists fichiers jsonb;

-- le projet : le joueur propriétaire, ou un admin
create or replace function pegase_int.at_fichier_fiche(n text, p_fiche uuid) returns public.at_fiches language plpgsql stable security definer set search_path = public as $$
declare f public.at_fiches;
begin
  select * into f from public.at_fiches x where x.id = p_fiche and x.supprime_at is null;
  if f.id is null then raise exception 'projet inconnu'; end if;
  if f.name <> n and not exists (select 1 from public.at_admins a where a.name = n) then raise exception 'pas ton projet'; end if;
  return f;
end $$;

create or replace function public.at_fichier_preparer(p_name text, p_fiche uuid, p_nom text, p_taille bigint, p_ext text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; e text := lower(regexp_replace(coalesce(p_ext, ''), '[^a-zA-Z0-9]', '', 'g')); t record; i uuid := gen_random_uuid();
  nm text := left(regexp_replace(btrim(coalesce(p_nom, '')), '[\x00-\x1f/\\]', '', 'g'), 120);
begin
  perform public.acct_check(n);
  f := pegase_int.at_fichier_fiche(n, p_fiche);
  select * into t from pegase_int.at_fichier_type(e);
  if t.mime is null then raise exception 'type refuse'; end if;
  if coalesce(p_taille, 0) <= 0 then raise exception 'fichier vide'; end if;
  if p_taille > 20971520 then raise exception 'trop lourd'; end if;
  perform public.pg_rate(n, 'atelier-fichier', 60, interval '1 hour');
  if nm = '' then nm := 'fichier.' || e; end if;
  insert into public.at_fichiers (id, fiche, name, nom, taille, ext, mime, famille, path) values (i, f.id, n, nm, p_taille, e, t.mime, t.famille, 'f/' || i::text || '.' || e);
  return jsonb_build_object('id', i, 'path', 'f/' || i::text || '.' || e, 'mime', t.mime, 'famille', t.famille);
end $$;

-- storage : écrire SEULEMENT un chemin réservé (« envoi », moins d'1 h) par son auteur ; lire : le joueur du projet ou un admin
create or replace function pegase_int.at_fichier_obj_ok(p_path text, p_mode text) returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare m text[]; x public.at_fichiers; fo text;
begin
  if auth.uid() is null then return false; end if;
  m := regexp_match(coalesce(p_path, ''), '^f/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]([a-z0-9]{2,5})$');
  if m is null then return false; end if;
  select * into x from public.at_fichiers z where z.id = m[1]::uuid and z.path = p_path;
  if x.id is null then return false; end if;
  if p_mode = 'w' then return x.etat = 'envoi' and x.at > now() - interval '1 hour' and public.acct_own(x.name); end if;
  select f.name into fo from public.at_fiches f where f.id = x.fiche and f.supprime_at is null;
  if fo is null then return false; end if;
  return public.acct_own(fo) or public.acct_own(x.name) or exists (select 1 from public.at_admins ad where public.acct_own(ad.name));
end $$;
revoke all on function pegase_int.at_fichier_obj_ok(text, text) from public, anon;
grant execute on function pegase_int.at_fichier_obj_ok(text, text) to authenticated;

drop policy if exists "atelier fichiers ecrire" on storage.objects;
create policy "atelier fichiers ecrire" on storage.objects for insert to authenticated with check (bucket_id = 'atelier-fichiers' and pegase_int.at_fichier_obj_ok(name, 'w'));
drop policy if exists "atelier fichiers lire" on storage.objects;
create policy "atelier fichiers lire" on storage.objects for select to authenticated using (bucket_id = 'atelier-fichiers' and pegase_int.at_fichier_obj_ok(name, 'r'));

-- rattacher les fichiers ARRIVÉS à un message que je viens d'écrire (au plus 5)
create or replace function public.at_fichiers_joindre(p_name text, p_message uuid, p_fichiers uuid[])
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); msg public.at_messages; adm boolean; l jsonb := '[]'::jsonb; x public.at_fichiers; o record; k int := 0;
begin
  perform public.acct_check(n);
  adm := exists (select 1 from public.at_admins a where a.name = n);
  select * into msg from public.at_messages m where m.id = p_message;
  if msg.id is null then raise exception 'message inconnu'; end if;
  perform pegase_int.at_fichier_fiche(n, msg.fiche);
  if msg.at < now() - interval '1 hour' or (msg.de_atelier and not adm) then raise exception 'message ferme'; end if;
  if coalesce(array_length(p_fichiers, 1), 0) < 1 then raise exception 'aucun fichier'; end if;
  if array_length(p_fichiers, 1) + coalesce(jsonb_array_length(msg.fichiers), 0) > 5 then raise exception 'cinq au plus'; end if;
  for x in select * from public.at_fichiers z where z.id = any (p_fichiers) order by array_position(p_fichiers, z.id) loop
    if x.name <> n or x.fiche <> msg.fiche or x.etat <> 'envoi' then raise exception 'fichier refuse'; end if;
    select (s.metadata ->> 'size')::bigint sz, s.metadata ->> 'mimetype' mt into o from storage.objects s where s.bucket_id = 'atelier-fichiers' and s.name = x.path;
    if o.sz is null then raise exception 'fichier pas arrive'; end if;
    if o.sz > 20971520 or o.sz <> x.taille or coalesce(o.mt, '') <> x.mime then raise exception 'fichier refuse'; end if;
    update public.at_fichiers z set etat = 'joint', message = msg.id where z.id = x.id;
    l := l || jsonb_build_array(jsonb_build_object('id', x.id, 'nom', x.nom, 'taille', x.taille, 'type', x.famille, 'ext', x.ext, 'path', x.path));
    k := k + 1;
  end loop;
  if k <> array_length(p_fichiers, 1) then raise exception 'fichier refuse'; end if;
  update public.at_messages m set fichiers = coalesce(m.fichiers, '[]'::jsonb) || l where m.id = msg.id;
  return jsonb_build_object('ok', true, 'fichiers', l);
end $$;

-- le message de discussion ET ses fichiers, d'un seul coup (la mascotte ne voit jamais le message sans ses pièces jointes)
create or replace function public.at_discuter_fichiers(p_name text, p_fiche uuid, p_texte text, p_micro boolean, p_fichiers uuid[])
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r jsonb; j jsonb;
begin
  r := public.at_discuter(p_name, p_fiche, p_texte, p_micro);
  if coalesce((r ->> 'doublon')::boolean, false) then return r; end if;
  if coalesce(array_length(p_fichiers, 1), 0) > 0 then j := public.at_fichiers_joindre(p_name, (r ->> 'id')::uuid, p_fichiers); r := r || jsonb_build_object('fichiers', j -> 'fichiers'); end if;
  return r;
end $$;
revoke all on function public.at_discuter_fichiers(text, uuid, text, boolean, uuid[]) from public, anon;
grant execute on function public.at_discuter_fichiers(text, uuid, text, boolean, uuid[]) to authenticated;

-- l'outil de discussion de la mascotte (clé de service) : les fichiers d'un projet ; il demande ensuite une URL signée de 5 min à storage (jamais publique)
create or replace function public.at_fichiers_lire(p_fiche uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'message', x.message, 'nom', x.nom, 'taille', x.taille, 'type', x.famille, 'ext', x.ext, 'mime', x.mime, 'path', x.path, 'at', x.at,
    'par', x.name) order by x.at), '[]'::jsonb) from public.at_fichiers x where x.fiche = p_fiche and x.etat = 'joint' $$;

revoke all on function public.at_fichier_preparer(text, uuid, text, bigint, text), public.at_fichiers_joindre(text, uuid, uuid[]) from public, anon;
grant execute on function public.at_fichier_preparer(text, uuid, text, bigint, text), public.at_fichiers_joindre(text, uuid, uuid[]) to authenticated;
revoke all on function public.at_fichiers_lire(uuid) from public, anon, authenticated;
grant execute on function public.at_fichiers_lire(uuid) to service_role;
revoke all on function pegase_int.at_fichier_fiche(text, uuid), pegase_int.at_fichier_type(text) from public, anon, authenticated;
-- at_lire / at_admin_lire : chaque message porte « fichiers » (après 'reaction', m.reaction — présent une fois dans chacune, vérifié en ligne)
do $$
declare fn text; d text; k int;
  motif constant text := '''reaction'', m.reaction,';
begin
  foreach fn in array array['public.at_lire(text,uuid)', 'public.at_admin_lire(text,uuid)'] loop
    d := pg_get_functiondef(fn::regprocedure);
    if position('''fichiers'', m.fichiers' in d) > 0 then raise notice '% : déjà fait', fn; continue; end if;
    k := (length(d) - length(replace(d, motif, ''))) / length(motif);
    if k <> 1 then raise exception '% : motif trouvé % fois (attendu 1)', fn, k; end if;
    execute replace(d, motif, motif || ' ''fichiers'', m.fichiers,');
    raise notice '% : fichiers ajouté', fn;
  end loop;
end $$;
