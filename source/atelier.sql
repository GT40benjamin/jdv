-- L'Atelier des jeux (borne 1.64, 2 nov. 2026) : chaque joueur décrit LE jeu qu'il aimerait voir sur la borne (texte ou micro, images de
-- référence), l'Atelier lui répond (sous 10 minutes environ) et remplit sa FICHE au fil de la discussion ; fiche complète → le joueur
-- « envoie son projet » (la lettre tamponnée) → Benjamin l'accepte ou non. Un seul projet ACTIF par joueur (« un jeu par joueur »).
-- Joueur : at_lire, at_dire, at_envoyer (compte connecté exigé : acct_check). Atelier (réservé : postgres / service_role, appelé en SQL) :
-- at_repondre, at_fiche_maj, at_etat ; vue at_en_attente (messages de joueurs sans réponse). Images : seau public « atelier »,
-- a/<id du message>.jpg, envoi permis 1 h après le message qui l'annonce (pegase_int.atelier_ok).
-- Mode d'emploi pour l'Atelier : ATELIER.md (hors dépôt, dans jdv-tools, dossier de l’équipe)

create table if not exists public.at_fiches (
  id uuid primary key default gen_random_uuid(),
  name text not null,                                   -- le joueur (pg_n : majuscules, 12 caractères)
  titre text not null default '',                       -- titre provisoire du jeu
  etat text not null default 'brouillon' check (etat in ('brouillon', 'en_discussion', 'complete', 'envoyee', 'acceptee', 'refusee')),
  fiche jsonb not null default '{}'::jsonb,             -- idee, but, score, heros, monde, dimension, style, commandes, mobile, references…
  created_at timestamptz not null default now(),
  maj_at timestamptz not null default now(),
  complete_at timestamptz, envoyee_at timestamptz, decision_at timestamptz,
  note_benjamin text,
  accord_at timestamptz, accord_texte text              -- la case cochée avant l'envoi (date + texte exact accepté)
);
-- un seul projet en cours par joueur (acceptée ou refusée : il peut en commencer un autre)
create unique index if not exists at_fiches_un_actif on public.at_fiches (name) where etat in ('brouillon', 'en_discussion', 'complete', 'envoyee');
create table if not exists public.at_messages (
  id uuid primary key default gen_random_uuid(),
  fiche uuid not null references public.at_fiches (id) on delete cascade,
  texte text not null default '',
  de_atelier boolean not null default false,
  micro boolean not null default false,                 -- dicté au micro (transcription)
  image boolean not null default false,                 -- une image de référence jointe : seau atelier, a/<id>.jpg
  at timestamptz not null default now()
);
create index if not exists at_messages_fiche on public.at_messages (fiche, at);
alter table public.at_fiches enable row level security;
alter table public.at_messages enable row level security;
revoke all on public.at_fiches, public.at_messages from anon, authenticated;

-- le projet en cours du joueur (ou le dernier), avec toute la discussion
create or replace function public.at_lire(p_name text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches;
begin
  perform public.acct_check(n);
  select * into f from public.at_fiches x where x.name = n order by (x.etat in ('brouillon', 'en_discussion', 'complete', 'envoyee')) desc, x.created_at desc limit 1;
  if f.id is null then return jsonb_build_object('fiche', null, 'messages', '[]'::jsonb); end if;
  return jsonb_build_object(
    'fiche', jsonb_build_object('id', f.id, 'titre', f.titre, 'etat', f.etat, 'fiche', f.fiche, 'created_at', f.created_at, 'maj_at', f.maj_at,
                                'complete_at', f.complete_at, 'envoyee_at', f.envoyee_at, 'decision_at', f.decision_at, 'accord_at', f.accord_at),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'texte', m.texte, 'atelier', m.de_atelier, 'micro', m.micro,
                  'image', case when m.image then 'a/' || m.id || '.jpg' end, 'at', m.at) order by m.at) from public.at_messages m where m.fiche = f.id), '[]'::jsonb));
end $$;

-- un message du joueur (texte tapé ou dicté, image annoncée) ; crée le projet s'il n'y en a pas
create or replace function public.at_dire(p_name text, p_texte text, p_micro boolean default false, p_image boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); t text := btrim(coalesce(p_texte, '')); f public.at_fiches; i uuid;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');   -- 30 messages par heure au plus
  if t = '' and not coalesce(p_image, false) then raise exception 'texte vide'; end if;
  select * into f from public.at_fiches x where x.name = n and x.etat in ('brouillon', 'en_discussion', 'complete', 'envoyee') limit 1;
  if f.id is null then insert into public.at_fiches (name, etat) values (n, 'en_discussion') returning * into f; end if;
  if f.etat = 'envoyee' then raise exception 'projet deja envoye'; end if;
  if coalesce(p_image, false) and (select count(*) from public.at_messages m where m.fiche = f.id and m.image and not m.de_atelier) >= 6 then raise exception 'trop d images'; end if;   -- 6 images par projet
  insert into public.at_messages (fiche, texte, micro, image) values (f.id, left(t, 2000), coalesce(p_micro, false), coalesce(p_image, false)) returning id into i;
  update public.at_fiches x set maj_at = now(), etat = case when x.etat = 'brouillon' then 'en_discussion' else x.etat end where x.id = f.id;
  return jsonb_build_object('id', i, 'fiche', f.id, 'image', case when coalesce(p_image, false) then 'a/' || i || '.jpg' end);
end $$;

-- « Envoyer mon projet » : seulement quand l'Atelier a marqué la fiche complète, et avec la case cochée (p_accord = le texte exact
-- accepté par le joueur : jeu gratuit, ouvert à tous les comptes, classement mondial, modifications réservées à l'administrateur)
create or replace function public.at_envoyer(p_name text, p_accord text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; a text := btrim(coalesce(p_accord, ''));
begin
  perform public.acct_check(n);
  if length(a) < 40 then raise exception 'accord requis'; end if;
  select * into f from public.at_fiches x where x.name = n and x.etat in ('brouillon', 'en_discussion', 'complete', 'envoyee') limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  if f.etat = 'envoyee' then return jsonb_build_object('id', f.id, 'etat', 'envoyee', 'envoyee_at', f.envoyee_at, 'accord_at', f.accord_at); end if;
  if f.etat <> 'complete' then raise exception 'fiche pas complete'; end if;
  update public.at_fiches x set etat = 'envoyee', envoyee_at = now(), maj_at = now(), accord_at = now(), accord_texte = left(a, 1000)
    where x.id = f.id returning * into f;
  return jsonb_build_object('id', f.id, 'etat', f.etat, 'envoyee_at', f.envoyee_at, 'accord_at', f.accord_at);
end $$;

-- ===== côté Atelier (réservé) =====
create or replace function public.at_repondre(p_fiche uuid, p_texte text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare t text := btrim(coalesce(p_texte, '')); i uuid;
begin
  if t = '' then raise exception 'texte vide'; end if;
  if not exists (select 1 from public.at_fiches x where x.id = p_fiche) then raise exception 'fiche inconnue'; end if;
  insert into public.at_messages (fiche, texte, de_atelier) values (p_fiche, left(t, 4000), true) returning id into i;
  update public.at_fiches x set maj_at = now() where x.id = p_fiche;
  return jsonb_build_object('id', i);
end $$;

-- fusionne p_fiche dans la fiche (une clé à null l'efface) ; p_titre : titre provisoire (null = inchangé)
create or replace function public.at_fiche_maj(p_fiche uuid, p_maj jsonb, p_titre text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r public.at_fiches;
begin
  if p_maj is not null and jsonb_typeof(p_maj) <> 'object' then raise exception 'p_maj doit etre un objet'; end if;
  update public.at_fiches x set fiche = jsonb_strip_nulls(x.fiche || coalesce(p_maj, '{}'::jsonb)),
    titre = coalesce(left(btrim(p_titre), 60), x.titre), maj_at = now() where x.id = p_fiche returning * into r;
  if r.id is null then raise exception 'fiche inconnue'; end if;
  return jsonb_build_object('id', r.id, 'titre', r.titre, 'etat', r.etat, 'fiche', r.fiche);
end $$;

-- état : en_discussion (rouvrir), complete (le joueur peut envoyer), acceptee / refusee (décision de Benjamin, p_note facultative)
create or replace function public.at_etat(p_fiche uuid, p_etat text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r public.at_fiches;
begin
  if p_etat not in ('en_discussion', 'complete', 'acceptee', 'refusee') then raise exception 'etat refuse : %', p_etat; end if;
  update public.at_fiches x set etat = p_etat, maj_at = now(),
    complete_at = case when p_etat = 'complete' then now() else x.complete_at end,
    decision_at = case when p_etat in ('acceptee', 'refusee') then now() else x.decision_at end,
    note_benjamin = coalesce(p_note, x.note_benjamin)
  where x.id = p_fiche returning * into r;
  if r.id is null then raise exception 'fiche inconnue'; end if;
  return jsonb_build_object('id', r.id, 'etat', r.etat);
end $$;

-- ce que l'Atelier lit à chaque tour : les projets dont le dernier message vient du joueur (sans réponse), avec ces messages
create or replace view public.at_en_attente with (security_invoker = true) as
  select f.id as fiche, f.name as joueur, f.titre, f.etat, f.fiche as contenu,
    (select max(m.at) from public.at_messages m where m.fiche = f.id and not m.de_atelier) as dernier_message_at,
    (select jsonb_agg(jsonb_build_object('texte', m.texte, 'micro', m.micro,
        'image', case when m.image then 'https://wplictorvvtkfikpfdnl.supabase.co/storage/v1/object/public/atelier/a/' || m.id || '.jpg' end, 'at', m.at) order by m.at)
       from public.at_messages m where m.fiche = f.id and not m.de_atelier
         and m.at > coalesce((select max(a.at) from public.at_messages a where a.fiche = f.id and a.de_atelier), '-infinity'::timestamptz)) as messages_sans_reponse
  from public.at_fiches f
  where f.etat in ('en_discussion', 'complete', 'brouillon')
    and exists (select 1 from public.at_messages m where m.fiche = f.id and not m.de_atelier
                and m.at > coalesce((select max(a.at) from public.at_messages a where a.fiche = f.id and a.de_atelier), '-infinity'::timestamptz))
  order by dernier_message_at;
revoke all on public.at_en_attente from anon, authenticated;

revoke all on function public.at_lire(text), public.at_dire(text, text, boolean, boolean), public.at_envoyer(text, text) from public, anon;
grant execute on function public.at_lire(text), public.at_dire(text, text, boolean, boolean), public.at_envoyer(text, text) to authenticated;
revoke all on function public.at_repondre(uuid, text), public.at_fiche_maj(uuid, jsonb, text), public.at_etat(uuid, text, text) from public, anon, authenticated;

-- images de référence : seau public en lecture, écriture par le joueur seulement pour SON message annoncé il y a moins d'une heure
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('atelier', 'atelier', true, 1572864, array['image/jpeg']) on conflict (id) do nothing;
create or replace function pegase_int.atelier_ok(p_path text)
returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare m text[]; n text; a timestamptz;
begin
  if auth.uid() is null then return false; end if;
  m := regexp_match(coalesce(p_path, ''), '^a/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]jpg$');
  if m is null then return false; end if;
  select f.name, x.at into n, a from public.at_messages x join public.at_fiches f on f.id = x.fiche where x.id = m[1]::uuid and x.image and not x.de_atelier;
  if n is null or a < now() - interval '1 hour' then return false; end if;
  return public.acct_own(n);
end $$;
drop policy if exists "atelier ecrire" on storage.objects;
create policy "atelier ecrire" on storage.objects for insert to authenticated with check (bucket_id = 'atelier' and pegase_int.atelier_ok(name));

alter table public.at_messages alter column at set default clock_timestamp();
-- sécurité (2 nov., Benjamin : « verrouiller toute possibilité de fichiers virus ») : tailles bornées ; seau : JPEG seulement, 1,5 Mo, écriture
-- seulement (pas de mise à jour ni d effacement : jamais d écrasement), chemin a/<id de SON message> ; les images sont ré-encodées par la borne.
alter table public.at_fiches add constraint at_fiches_taille check (length(fiche::text) <= 20000 and length(titre) <= 60);
alter table public.at_messages add constraint at_messages_taille check (length(texte) <= 4000);
