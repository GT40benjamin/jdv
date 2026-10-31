-- ============================================================================================================================
-- Tête de Cible 2 (31 oct. 2026, après flechettes.sql) : les cibles REMONTENT POUR TOUTE LA SALLE + les CRIS enregistrés + les records
-- de chacun sur chaque cible. Demandes de Benjamin : « Oui dans la salle les cibles remontent pour tous !!! » ; « Il faut ajouter les cris
-- de douleur, plusieurs par photo, aussi que l'on enregistre : à chaque coup on l'entend ».
--   * fl_cibles.salle : la salle où la cible est PARTAGÉE (null = moi seul). Tous les membres de cette salle la voient dans leur étagère
--     (fl_etagere_salle), tirent dessus seuls ou à deux, et y gardent leur record (fl_scores). Si le propriétaire quitte la salle, elle n'y
--     remonte plus ; si la salle est effacée, elle redevient privée.
--   * les cris : jusqu'à 4 petits fichiers WAV (2,5 s, mono, ~110 Ko) à côté de l'image : c/<id>-c1.wav … c/<id>-c4.wav ; la liste des
--     numéros présents est dans zones.cris (l'appareil). Mêmes règles que l'image (propriétaire ; membres de la salle de partage ; salle de
--     la partie en cours).
--   * fl_scores : le meilleur score de chaque pseudo sur chaque cible (le record de la salle sur la cible = le plus haut).
-- QUI VOIT QUOI : jamais un invité, jamais le site public ; une cible partagée n'est lue que par les membres (avec compte) de SA salle.
-- Relançable sans perte (if not exists / or replace). À appliquer APRÈS flechettes.sql.
-- ============================================================================================================================

alter table public.fl_cibles add column if not exists salle bigint references public.rooms(id) on delete set null;
create index if not exists fl_cibles_salle on public.fl_cibles (salle, updated_at) where salle is not null;

create table if not exists public.fl_scores (
  cible uuid not null references public.fl_cibles(id) on delete cascade,
  name text not null references public.players(name) on delete cascade on update cascade,
  best int not null default 0 check (best between 0 and 100000),
  at timestamptz not null default now(),
  primary key (cible, name)
);
alter table public.fl_scores enable row level security;
revoke all on public.fl_scores from anon, authenticated;

-- le fichier d'une cible : c/<id>.webp (ou .jpg) pour l'image, c/<id>-c1.wav … -c4.wav pour ses cris
create or replace function fl_int.path_id(p_path text) returns uuid language plpgsql immutable set search_path = public, extensions as $$
declare m text[];
begin
  m := regexp_match(coalesce(p_path, ''), '^c/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\.(webp|jpg)|-c[1-4]\.wav)$');
  if m is null then return null; end if;
  return m[1]::uuid;
end $$;

-- une cible partagée dans une salle dont le propriétaire est toujours membre
create or replace function fl_int.partagee(p_id uuid) returns bigint language sql stable security definer set search_path = public, extensions as $$
  select c.salle from public.fl_cibles c join public.room_members m on m.room_id = c.salle and m.name = c.owner where c.id = p_id $$;

-- le Storage : 'r' lire (propriétaire ; membre de la salle de partage ; membre d'une salle où elle est en jeu depuis < 12 h), 'w' déposer
-- (propriétaire, ligne existante)
create or replace function fl_int.obj_ok(p_path text, p_mode text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare i uuid := fl_int.path_id(p_path); o text; s bigint;
begin
  if auth.uid() is null or i is null then return false; end if;
  select c.owner into o from public.fl_cibles c where c.id = i;
  if o is null then return false; end if;
  if public.acct_own(o) then return true; end if;
  if p_mode = 'r' then
    s := fl_int.partagee(i);
    if s is not null and public.room_access(s) then return true; end if;
    return exists (select 1 from public.fl_salle x where x.cible = i and x.at > now() - interval '12 hours' and public.room_access(x.room_id));
  end if;
  return false;
end $$;

-- le meilleur de la salle sur une cible : { name, best } (ou null)
create or replace function fl_int.top(p_id uuid) returns jsonb language sql stable security definer set search_path = public, extensions as $$
  select jsonb_build_object('name', s.name, 'best', s.best) from public.fl_scores s where s.cible = p_id and s.best > 0
    order by s.best desc, s.at limit 1 $$;

-- ---- mon étagère : comme avant + la salle de partage, le record de la salle sur chacune ----
create or replace function public.fl_mes(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := fl_int.n(p_name); l jsonb; orph jsonb := '[]'::jsonb;
begin
  perform public.acct_check(n);
  perform fl_int.essai(n, 'lire', 300, interval '10 minutes');
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'nom', c.nom, 'zones', c.zones, 'w', c.w, 'h', c.h, 'best', c.best, 'envoye', c.envoye,
    'path', 'c/' || c.id || '.webp', 'at', extract(epoch from c.updated_at)::bigint, 'salle', c.salle, 'top', fl_int.top(c.id)) order by c.created_at desc), '[]'::jsonb)
    into l from public.fl_cibles c where c.owner = n;
  if to_regclass('storage.objects') is not null then
    execute $q$ select coalesce(jsonb_agg(o.name), '[]'::jsonb) from storage.objects o
      where o.bucket_id = 'cibles' and o.owner_id = auth.uid()::text and o.created_at < now() - interval '10 minutes'
        and not exists (select 1 from public.fl_cibles c where fl_int.path_id(o.name) = c.id) $q$ into orph;
  end if;
  return jsonb_build_object('cibles', l, 'orphelins', orph, 'max', 40);
end $$;

-- partager une de MES cibles avec une de mes salles (p_room null = moi seul)
create or replace function public.fl_partager(p_code text, p_name text, p_id uuid, p_room bigint)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := fl_int.n(p_name);
begin
  perform public.acct_check(n);
  perform fl_int.essai(n, 'maj', 120, interval '10 minutes');
  if not exists (select 1 from public.fl_cibles c where c.id = p_id and c.owner = n) then raise exception 'cible inconnue'; end if;
  if p_room is not null and not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then raise exception 'membre requis'; end if;
  update public.fl_cibles set salle = p_room, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- les cibles que les AUTRES membres ont partagées avec ma salle (les 80 plus récentes), mon record et celui de la salle sur chacune
create or replace function public.fl_etagere_salle(p_code text, p_name text, p_room bigint)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := fl_int.n(p_name); l jsonb;
begin
  perform public.acct_check(n);
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then raise exception 'membre requis'; end if;
  perform fl_int.essai(n, 'lire', 300, interval '10 minutes');
  select coalesce(jsonb_agg(x.j order by x.u desc), '[]'::jsonb) into l from (
    select c.updated_at u, jsonb_build_object('id', c.id, 'owner', c.owner, 'nom', c.nom, 'zones', c.zones, 'w', c.w, 'h', c.h,
      'path', 'c/' || c.id || '.webp', 'at', extract(epoch from c.updated_at)::bigint,
      'mine', coalesce((select s.best from public.fl_scores s where s.cible = c.id and s.name = n), 0), 'top', fl_int.top(c.id)) j
    from public.fl_cibles c join public.room_members m on m.room_id = c.salle and m.name = c.owner
    where c.salle = p_room and c.owner <> n and c.envoye order by c.updated_at desc limit 80) x;
  return l;
end $$;

-- mon score sur une cible (la mienne, ou une partagée avec ma salle) : garde le meilleur, rend { best, top }
create or replace function public.fl_score(p_code text, p_name text, p_id uuid, p_score int)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := fl_int.n(p_name); o text; s bigint; b int;
begin
  perform public.acct_check(n);
  perform fl_int.essai(n, 'score', 120, interval '10 minutes');
  select c.owner into o from public.fl_cibles c where c.id = p_id;
  if o is null then raise exception 'cible inconnue'; end if;
  if o <> n then
    s := fl_int.partagee(p_id);
    if s is null or not exists (select 1 from public.room_members m where m.room_id = s and m.name = n) then raise exception 'cible inconnue'; end if;
  end if;
  insert into public.fl_scores (cible, name, best, at) values (p_id, n, least(100000, greatest(0, coalesce(p_score, 0))), now())
    on conflict (cible, name) do update set best = greatest(public.fl_scores.best, excluded.best),
      at = case when excluded.best > public.fl_scores.best then now() else public.fl_scores.at end
    returning best into b;
  if o = n then update public.fl_cibles set best = greatest(best, b) where id = p_id; end if;
  return jsonb_build_object('best', b, 'top', fl_int.top(p_id));
end $$;

-- ---- droits ----
revoke all on function fl_int.partagee(uuid), fl_int.top(uuid) from public, anon, authenticated;
grant execute on function fl_int.partagee(uuid) to authenticated;   -- appelée par obj_ok (règles du Storage)
grant execute on function fl_int.obj_ok(text, text), fl_int.path_id(text) to authenticated;
revoke all on function public.fl_mes(text, text), public.fl_partager(text, text, uuid, bigint), public.fl_etagere_salle(text, text, bigint),
  public.fl_score(text, text, uuid, int) from public, anon;
grant execute on function public.fl_mes(text, text), public.fl_partager(text, text, uuid, bigint), public.fl_etagere_salle(text, text, bigint),
  public.fl_score(text, text, uuid, int) to authenticated;

-- ---- le seau « cibles » : les cris (WAV) en plus des images ----
do $do$ begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets set allowed_mime_types = array['image/webp', 'image/jpeg', 'audio/wav'] where id = 'cibles';
  end if;
end $do$;

-- ---- contrôles ----
-- 1. select allowed_mime_types from storage.buckets where id = 'cibles';   → {image/webp,image/jpeg,audio/wav}
-- 2. sans jeton : POST /rest/v1/rpc/fl_etagere_salle → 401 ; GET /storage/v1/object/authenticated/cibles/c/<id>-c1.wav → 400/404
-- ---- pour revenir en arrière ----
-- drop function if exists public.fl_partager(text, text, uuid, bigint), public.fl_etagere_salle(text, text, bigint), public.fl_score(text, text, uuid, int);
-- drop table if exists public.fl_scores; alter table public.fl_cibles drop column if exists salle;
-- puis relancer flechettes.sql (path_id, obj_ok, fl_mes d'avant) et remettre allowed_mime_types = {image/webp,image/jpeg}
