-- ============================================================================================================================
-- Tête de Cible (jeu « flechettes ») : les CIBLES des joueurs (31 oct. 2026, demande de Benjamin : « chaque utilisateur importe son
-- tableau ; dans la salle chacun peut importer une image ; en fin de partie elle reste : chaque cible se met en tuile dans le menu »).
--   * fl_cibles : l'étagère « Mes cibles » de chaque pseudo (40 au plus) : nom, ses cibles posées et leurs points (« Sur la photo, tu mets
--     les cibles et les points que tu veux », Benjamin), meilleur
--     score fait dessus, taille de l'image. L'image est dans le seau PRIVÉ « cibles » : c/<id>.webp (2 Mo au plus, WebP ou JPEG).
--   * fl_salle : la cible que chaque membre a mise en jeu dans sa salle (une par pseudo et par salle ; vue 12 h au plus).
-- QUI VOIT QUOI : une image se lit avec le jeton du compte (règle « fl cibles lire ») par son PROPRIÉTAIRE, ou par un membre d'une salle
--   où elle est en jeu depuis moins de 12 h. Jamais un invité, jamais le site public, jamais les records, la galerie ni les annonces. Elle
--   n'entre jamais dans l'étagère des autres.
-- EFFACER : « Retirer » efface la ligne (fl_retirer) ; l'appareil efface aussitôt le fichier (règle « fl cibles effacer » : celui qui l'a
--   déposé) ; si ça rate, fl_mes rend les fichiers orphelins du compte (« orphelins ») et l'appareil les efface à la visite suivante.
--   (Supabase interdit d'effacer storage.objects en SQL : c'est l'appareil qui efface, comme PegaGram.)
-- RÈGLES (comme la borne) : tables RLS sans aucun droit pour anon / authenticated ; fonctions security definer, search_path = public,
--   extensions ; p_code en 1er paramètre et IGNORÉ ; pseudo = upper(left(trim(p_name), 12)) ; acct_check (compte requis) ; erreurs en
--   français sans accent : « compte requis : NOM » (acct_check), « membre requis », « cible inconnue » (absente OU pas à toi : on ne dit pas
--   qu'elle existe), « etagere pleine », « trop d essais », « nom invalide », « zones invalides ».
-- SANS CE FICHIER : le jeu garde les cibles sur l'appareil seulement et cache le mode salle (« bientôt »).
-- Relançable sans perte (if not exists / or replace).
-- ============================================================================================================================

create table if not exists public.fl_cibles (
  id uuid primary key default gen_random_uuid(),
  owner text not null references public.players(name) on delete cascade on update cascade,
  nom text not null check (char_length(nom) between 1 and 24),
  zones jsonb not null check (char_length(zones::text) <= 20000),
  w int not null default 0 check (w between 0 and 4096),
  h int not null default 0 check (h between 0 and 4096),
  best int not null default 0 check (best between 0 and 100000),
  envoye boolean not null default false,          -- le fichier est bien arrivé dans le seau
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fl_cibles_owner on public.fl_cibles (owner, created_at);
alter table public.fl_cibles enable row level security;
revoke all on public.fl_cibles from anon, authenticated;

create table if not exists public.fl_salle (
  room_id bigint not null references public.rooms(id) on delete cascade,
  name text not null,
  cible uuid not null references public.fl_cibles(id) on delete cascade,
  at timestamptz not null default now(),
  primary key (room_id, name)
);
create index if not exists fl_salle_cible on public.fl_salle (cible);
alter table public.fl_salle enable row level security;
revoke all on public.fl_salle from anon, authenticated;

create table if not exists public.fl_tries (at timestamptz not null default now(), name text not null, k text not null);
create index if not exists fl_tries_name on public.fl_tries (name, k, at);
alter table public.fl_tries enable row level security;
revoke all on public.fl_tries from anon, authenticated;

create schema if not exists fl_int;
revoke all on schema fl_int from public, anon;
grant usage on schema fl_int to authenticated;

-- ---- aides internes ----
create or replace function fl_int.n(p text) returns text language sql immutable set search_path = public, extensions as $$
  select upper(left(trim(coalesce(p, '')), 12)) $$;
-- un nom de cible propre (24 caractères, sans caractères de contrôle ni < >)
create or replace function fl_int.nom(p text) returns text language sql immutable set search_path = public, extensions as $$
  select nullif(left(trim(regexp_replace(coalesce(p, ''), '[[:cntrl:]<>]', '', 'g')), 24), '') $$;
-- trop d'essais : k = sorte d'action, max par fenêtre
create or replace function fl_int.essai(p_n text, p_k text, p_max int, p_win interval) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if (select count(*) from public.fl_tries t where t.name = p_n and t.k = p_k and t.at > now() - p_win) >= p_max then raise exception 'trop d essais'; end if;
  insert into public.fl_tries (name, k) values (p_n, p_k);
  delete from public.fl_tries where at < now() - interval '2 days';
end $$;
-- zones : un objet JSON avec la liste des cibles posées par le joueur (« list » : 0 à 30 ronds, chacun ses points, 0 à 500) ;
-- le reste (visage trouvé, taille de l'image…) est libre (l'appareil s'en sert pour les réactions du dessin animé)
create or replace function fl_int.zones_ok(z jsonb) returns boolean language sql immutable set search_path = public, extensions as $$
  select coalesce(z is not null and jsonb_typeof(z) = 'object' and jsonb_typeof(z -> 'list') = 'array' and jsonb_array_length(z -> 'list') <= 30
    and char_length(z::text) <= 20000
    and not exists (select 1 from jsonb_array_elements(z -> 'list') e where jsonb_typeof(e) <> 'object' or jsonb_typeof(e -> 'pts') <> 'number'
      or (e ->> 'pts')::numeric not between 0 and 500), false) $$;
-- le fichier d'une cible : c/<id>.webp (ou .jpg)
create or replace function fl_int.path_id(p_path text) returns uuid language plpgsql immutable set search_path = public, extensions as $$
declare m text[];
begin
  m := regexp_match(coalesce(p_path, ''), '^c/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(webp|jpg)$');
  if m is null then return null; end if;
  return m[1]::uuid;
end $$;
-- le Storage : 'r' lire (propriétaire, ou membre d'une salle où elle est en jeu depuis < 12 h), 'w' déposer (propriétaire, ligne existante)
create or replace function fl_int.obj_ok(p_path text, p_mode text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare i uuid := fl_int.path_id(p_path); o text;
begin
  if auth.uid() is null or i is null then return false; end if;
  select c.owner into o from public.fl_cibles c where c.id = i;
  if o is null then return false; end if;
  if public.acct_own(o) then return true; end if;
  if p_mode = 'r' then
    return exists (select 1 from public.fl_salle s where s.cible = i and s.at > now() - interval '12 hours' and public.room_access(s.room_id));
  end if;
  return false;
end $$;

-- ---- l'étagère « Mes cibles » ----
create or replace function public.fl_mes(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := fl_int.n(p_name); l jsonb; orph jsonb := '[]'::jsonb;
begin
  perform public.acct_check(n);
  perform fl_int.essai(n, 'lire', 300, interval '10 minutes');
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'nom', c.nom, 'zones', c.zones, 'w', c.w, 'h', c.h, 'best', c.best, 'envoye', c.envoye,
    'path', 'c/' || c.id || '.webp', 'at', extract(epoch from c.updated_at)::bigint) order by c.created_at desc), '[]'::jsonb)
    into l from public.fl_cibles c where c.owner = n;
  -- fichiers déposés par ce compte qui n'ont plus de cible (retrait dont l'effacement a raté) : l'appareil les efface
  if to_regclass('storage.objects') is not null then
    execute $q$ select coalesce(jsonb_agg(o.name), '[]'::jsonb) from storage.objects o
      where o.bucket_id = 'cibles' and o.owner_id = auth.uid()::text and o.created_at < now() - interval '10 minutes'
        and not exists (select 1 from public.fl_cibles c where fl_int.path_id(o.name) = c.id) $q$ into orph;
  end if;
  return jsonb_build_object('cibles', l, 'orphelins', orph, 'max', 40);
end $$;

create or replace function public.fl_nouvelle(p_code text, p_name text, p_nom text, p_zones jsonb, p_w int, p_h int)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := fl_int.n(p_name); v text := fl_int.nom(p_nom); i uuid;
begin
  perform public.acct_check(n);
  if v is null then raise exception 'nom invalide'; end if;
  if not fl_int.zones_ok(p_zones) then raise exception 'zones invalides'; end if;
  if (select count(*) from public.fl_cibles c where c.owner = n) >= 40 then raise exception 'etagere pleine'; end if;
  perform fl_int.essai(n, 'nouvelle', 80, interval '1 day');
  insert into public.fl_cibles (owner, nom, zones, w, h) values (n, v, p_zones, greatest(0, least(4096, coalesce(p_w, 0))), greatest(0, least(4096, coalesce(p_h, 0))))
    returning id into i;
  return jsonb_build_object('id', i, 'path', 'c/' || i || '.webp');
end $$;

-- changer le nom, les zones (« Corriger »), dire que le fichier est arrivé, garder le meilleur score
create or replace function public.fl_maj(p_code text, p_name text, p_id uuid, p_nom text default null, p_zones jsonb default null, p_best int default null, p_envoye boolean default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := fl_int.n(p_name); c public.fl_cibles;
begin
  perform public.acct_check(n);
  perform fl_int.essai(n, 'maj', 120, interval '10 minutes');
  select * into c from public.fl_cibles x where x.id = p_id and x.owner = n;
  if c.id is null then raise exception 'cible inconnue'; end if;
  if p_nom is not null and fl_int.nom(p_nom) is null then raise exception 'nom invalide'; end if;
  if p_zones is not null and not fl_int.zones_ok(p_zones) then raise exception 'zones invalides'; end if;
  update public.fl_cibles set nom = coalesce(fl_int.nom(p_nom), nom), zones = coalesce(p_zones, zones),
    best = greatest(best, least(100000, greatest(0, coalesce(p_best, 0)))), envoye = envoye or coalesce(p_envoye, false), updated_at = now()
    where id = c.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.fl_retirer(p_code text, p_name text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := fl_int.n(p_name); i uuid;
begin
  perform public.acct_check(n);
  delete from public.fl_cibles x where x.id = p_id and x.owner = n returning x.id into i;   -- fl_salle suit (on delete cascade)
  if i is null then raise exception 'cible inconnue'; end if;
  return jsonb_build_object('path', 'c/' || i || '.webp');
end $$;

-- ---- la partie de salle ----
-- mettre une de MES cibles en jeu dans ma salle (p_id null = la retirer du jeu)
create or replace function public.fl_salle_mettre(p_code text, p_name text, p_room bigint, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := fl_int.n(p_name);
begin
  perform public.acct_check(n);
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then raise exception 'membre requis'; end if;
  perform fl_int.essai(n, 'salle', 120, interval '10 minutes');
  if p_id is null then delete from public.fl_salle where room_id = p_room and name = n; return jsonb_build_object('ok', true); end if;
  if not exists (select 1 from public.fl_cibles c where c.id = p_id and c.owner = n) then raise exception 'cible inconnue'; end if;
  insert into public.fl_salle (room_id, name, cible, at) values (p_room, n, p_id, now())
    on conflict (room_id, name) do update set cible = excluded.cible, at = now();
  return jsonb_build_object('ok', true);
end $$;

-- les cibles en jeu dans la salle (moins de 12 h) : celles des membres, avec ce qu'il faut pour tirer dessus
create or replace function public.fl_salle_liste(p_code text, p_name text, p_room bigint)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := fl_int.n(p_name); l jsonb;
begin
  perform public.acct_check(n);
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then raise exception 'membre requis'; end if;
  perform fl_int.essai(n, 'lire', 300, interval '10 minutes');
  select coalesce(jsonb_agg(jsonb_build_object('name', s.name, 'id', c.id, 'nom', c.nom, 'zones', c.zones, 'w', c.w, 'h', c.h,
    'path', 'c/' || c.id || '.webp', 'at', extract(epoch from s.at)::bigint) order by s.at), '[]'::jsonb)
    into l from public.fl_salle s join public.fl_cibles c on c.id = s.cible
    join public.room_members m on m.room_id = s.room_id and m.name = s.name
    where s.room_id = p_room and s.at > now() - interval '12 hours' and c.envoye;
  return l;
end $$;

-- ---- droits ----
revoke all on function fl_int.n(text), fl_int.nom(text), fl_int.essai(text, text, int, interval), fl_int.zones_ok(jsonb), fl_int.path_id(text),
  fl_int.obj_ok(text, text) from public, anon, authenticated;
grant execute on function fl_int.obj_ok(text, text), fl_int.path_id(text) to authenticated;   -- appelées par les règles du Storage
revoke all on function public.fl_mes(text, text), public.fl_nouvelle(text, text, text, jsonb, int, int),
  public.fl_maj(text, text, uuid, text, jsonb, int, boolean), public.fl_retirer(text, text, uuid),
  public.fl_salle_mettre(text, text, bigint, uuid), public.fl_salle_liste(text, text, bigint) from public, anon;
grant execute on function public.fl_mes(text, text), public.fl_nouvelle(text, text, text, jsonb, int, int),
  public.fl_maj(text, text, uuid, text, jsonb, int, boolean), public.fl_retirer(text, text, uuid),
  public.fl_salle_mettre(text, text, bigint, uuid), public.fl_salle_liste(text, text, bigint) to authenticated;

-- ---- le seau privé « cibles » (2 Mo, WebP / JPEG) et ses règles ----
do $do$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('cibles', 'cibles', false, 2097152, array['image/webp', 'image/jpeg'])
      on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/webp', 'image/jpeg'];
  end if;
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "fl cibles ecrire" on storage.objects';
    execute 'create policy "fl cibles ecrire" on storage.objects for insert to authenticated with check (bucket_id = ''cibles'' and fl_int.obj_ok(name, ''w''))';
    execute 'drop policy if exists "fl cibles lire" on storage.objects';
    execute 'create policy "fl cibles lire" on storage.objects for select to authenticated using (bucket_id = ''cibles'' and (fl_int.obj_ok(name, ''r'') or owner_id = auth.uid()::text))';
    execute 'drop policy if exists "fl cibles effacer" on storage.objects';
    execute 'create policy "fl cibles effacer" on storage.objects for delete to authenticated using (bucket_id = ''cibles'' and owner_id = auth.uid()::text)';
  end if;
end $do$;

-- ---- contrôles ----
-- 1. select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'cibles';
-- 2. select polname from pg_policy where polname like 'fl cibles%';   (3 règles)
-- 3. un visiteur sans jeton : GET /storage/v1/object/authenticated/cibles/c/<id>.webp → 400/404
-- ---- pour revenir en arrière ----
-- drop policy if exists "fl cibles ecrire" on storage.objects; drop policy if exists "fl cibles lire" on storage.objects;
-- drop policy if exists "fl cibles effacer" on storage.objects;
-- drop function if exists public.fl_mes(text, text), public.fl_nouvelle(text, text, text, jsonb, int, int), public.fl_maj(text, text, uuid, text, jsonb, int, boolean),
--   public.fl_retirer(text, text, uuid), public.fl_salle_mettre(text, text, bigint, uuid), public.fl_salle_liste(text, text, bigint);
-- drop table if exists public.fl_salle, public.fl_tries, public.fl_cibles; drop schema if exists fl_int cascade;
-- (le seau « cibles » se vide puis se supprime depuis le tableau de bord du Storage)
