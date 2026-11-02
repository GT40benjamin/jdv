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

-- ===================================================================================================================================
-- LES JEUX NÉS À L'ATELIER SUR LA BORNE (borne 1.63.32, 2 nov. 2026, Benjamin : « la tuile du jeu créé par l'Atelier dans la SALLE du
-- joueur, avec un macaron MON JEU, et il peut le faire modifier ») :
--  * états après l'envoi : acceptee → alpha (version d'essai jouable, at_etat … p_jeu = id du jeu de la borne) → publie_salle (la salle du
--    joueur, p_salle = id de la salle) ou publie_monde (tout le monde, classement mondial) : c'est Benjamin qui décide ;
--  * le joueur garde la discussion ouverte pour demander des modifications (at_dire permis en acceptee / alpha / publie_*) ;
--  * at_jeux(p_name) : les jeux de l'Atelier que ce joueur voit (le sien, ceux publiés dans une de ses salles, ceux publiés pour tous).
alter table public.at_fiches drop constraint if exists at_fiches_etat_check;
alter table public.at_fiches add constraint at_fiches_etat_check check (etat in ('brouillon', 'en_discussion', 'complete', 'envoyee', 'acceptee', 'refusee',
  'alpha', 'publie_salle', 'publie_monde'));
alter table public.at_fiches add column if not exists jeu text;
alter table public.at_fiches add column if not exists salle bigint references public.rooms (id) on delete set null;
-- un seul projet par joueur, du premier message à la publication (refusé : il peut en proposer un autre)
drop index if exists public.at_fiches_un_actif;
create unique index if not exists at_fiches_un_actif on public.at_fiches (name) where etat <> 'refusee';

create or replace function public.at_lire(p_name text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches;
begin
  perform public.acct_check(n);
  select * into f from public.at_fiches x where x.name = n order by (x.etat <> 'refusee') desc, x.created_at desc limit 1;
  if f.id is null then return jsonb_build_object('fiche', null, 'messages', '[]'::jsonb); end if;
  return jsonb_build_object(
    'fiche', jsonb_build_object('id', f.id, 'titre', f.titre, 'etat', f.etat, 'fiche', f.fiche, 'created_at', f.created_at, 'maj_at', f.maj_at,
                                'complete_at', f.complete_at, 'envoyee_at', f.envoyee_at, 'decision_at', f.decision_at, 'accord_at', f.accord_at, 'jeu', f.jeu),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'texte', m.texte, 'atelier', m.de_atelier, 'micro', m.micro,
                  'image', case when m.image then 'a/' || m.id || '.jpg' end, 'at', m.at) order by m.at) from public.at_messages m where m.fiche = f.id), '[]'::jsonb));
end $$;

create or replace function public.at_dire(p_name text, p_texte text, p_micro boolean default false, p_image boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); t text := btrim(coalesce(p_texte, '')); f public.at_fiches; i uuid;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  if t = '' and not coalesce(p_image, false) then raise exception 'texte vide'; end if;
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then insert into public.at_fiches (name, etat) values (n, 'en_discussion') returning * into f; end if;
  if f.etat = 'envoyee' then raise exception 'projet deja envoye'; end if;
  if coalesce(p_image, false) and (select count(*) from public.at_messages m where m.fiche = f.id and m.image and not m.de_atelier) >= 6 then raise exception 'trop d images'; end if;
  insert into public.at_messages (fiche, texte, micro, image) values (f.id, left(t, 2000), coalesce(p_micro, false), coalesce(p_image, false)) returning id into i;
  update public.at_fiches x set maj_at = now(), etat = case when x.etat = 'brouillon' then 'en_discussion' else x.etat end where x.id = f.id;
  return jsonb_build_object('id', i, 'fiche', f.id, 'image', case when coalesce(p_image, false) then 'a/' || i || '.jpg' end);
end $$;

create or replace function public.at_envoyer(p_name text, p_accord text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; a text := btrim(coalesce(p_accord, ''));
begin
  perform public.acct_check(n);
  if length(a) < 40 then raise exception 'accord requis'; end if;
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  if f.etat = 'envoyee' then return jsonb_build_object('id', f.id, 'etat', 'envoyee', 'envoyee_at', f.envoyee_at, 'accord_at', f.accord_at); end if;
  if f.etat <> 'complete' then raise exception 'fiche pas complete'; end if;
  update public.at_fiches x set etat = 'envoyee', envoyee_at = now(), maj_at = now(), accord_at = now(), accord_texte = left(a, 1000)
    where x.id = f.id returning * into f;
  return jsonb_build_object('id', f.id, 'etat', f.etat, 'envoyee_at', f.envoyee_at, 'accord_at', f.accord_at);
end $$;

create or replace function public.at_jeux(p_name text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  return coalesce((select jsonb_agg(jsonb_build_object('jeu', f.jeu, 'titre', f.titre, 'auteur', f.name, 'etat', f.etat, 'mien', f.name = n))
    from public.at_fiches f where f.jeu ~ '^[a-z0-9_-]{2,20}$' and (
      (f.name = n and f.etat in ('alpha', 'publie_salle', 'publie_monde'))
      or (f.etat = 'publie_salle' and exists (select 1 from public.room_members r where r.room_id = f.salle and r.name = n))
      or f.etat = 'publie_monde')), '[]'::jsonb);
end $$;

drop function if exists public.at_etat(uuid, text, text);
create or replace function public.at_etat(p_fiche uuid, p_etat text, p_note text default null, p_jeu text default null, p_salle bigint default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r public.at_fiches;
begin
  if p_etat not in ('en_discussion', 'complete', 'acceptee', 'refusee', 'alpha', 'publie_salle', 'publie_monde') then raise exception 'etat refuse : %', p_etat; end if;
  if p_jeu is not null and p_jeu !~ '^[a-z0-9_-]{2,20}$' then raise exception 'id de jeu refuse'; end if;
  select * into r from public.at_fiches x where x.id = p_fiche; if r.id is null then raise exception 'fiche inconnue'; end if;
  if p_etat = 'alpha' and coalesce(p_jeu, r.jeu) is null then raise exception 'alpha : p_jeu obligatoire'; end if;
  if p_etat = 'publie_salle' and coalesce(p_salle, r.salle) is null then raise exception 'publie_salle : p_salle obligatoire'; end if;
  update public.at_fiches x set etat = p_etat, maj_at = now(),
    complete_at = case when p_etat = 'complete' then now() else x.complete_at end,
    decision_at = case when p_etat in ('acceptee', 'refusee', 'publie_salle', 'publie_monde') then now() else x.decision_at end,
    note_benjamin = coalesce(p_note, x.note_benjamin), jeu = coalesce(p_jeu, x.jeu), salle = coalesce(p_salle, x.salle)
  where x.id = p_fiche returning * into r;
  return jsonb_build_object('id', r.id, 'etat', r.etat, 'jeu', r.jeu, 'salle', r.salle);
end $$;

-- l'Atelier voit aussi les demandes de modification d'un jeu déjà accepté / en alpha / publié
create or replace view public.at_en_attente with (security_invoker = true) as
  select f.id as fiche, f.name as joueur, f.titre, f.etat, f.fiche as contenu,
    (select max(m.at) from public.at_messages m where m.fiche = f.id and not m.de_atelier) as dernier_message_at,
    (select jsonb_agg(jsonb_build_object('texte', m.texte, 'micro', m.micro,
        'image', case when m.image then 'https://wplictorvvtkfikpfdnl.supabase.co/storage/v1/object/public/atelier/a/' || m.id || '.jpg' end, 'at', m.at) order by m.at)
       from public.at_messages m where m.fiche = f.id and not m.de_atelier
         and m.at > coalesce((select max(a.at) from public.at_messages a where a.fiche = f.id and a.de_atelier), '-infinity'::timestamptz)) as messages_sans_reponse
  from public.at_fiches f
  where f.etat <> 'refusee'
    and exists (select 1 from public.at_messages m where m.fiche = f.id and not m.de_atelier
                and m.at > coalesce((select max(a.at) from public.at_messages a where a.fiche = f.id and a.de_atelier), '-infinity'::timestamptz))
  order by dernier_message_at;
revoke all on public.at_en_attente from anon, authenticated;

revoke all on function public.at_jeux(text) from public, anon;
grant execute on function public.at_jeux(text) to authenticated;
revoke all on function public.at_etat(uuid, text, text, text, bigint) from public, anon, authenticated;

-- ===================================================================================================================================
-- L'ATELIER, 2e version (borne 1.63.34, 2 nov. 2026, décisions de Benjamin 13 h 35 → 14 h 05) :
--  * la fiche est remplie tout de suite, en sections numérotées 1 à 9 (« dis-moi le numéro de la section à modifier ») ;
--  * « Envoyer mon projet » toujours visible : au clic, la discussion se BLOQUE et le joueur ne fait plus que des CHOIX À CLIQUER :
--    « C'est bien le jeu que tu veux ? » (at_valider : Oui → « design » / Je veux modifier → retour à la discussion), puis la PLANCHE de
--    3 designs DESSINÉS par Gemini (fonction Edge atelier-image), le joueur clique son design (at_choisir_design → « design_choisi »),
--    puis la lettre tamponnée avec la vignette du design et la liste des assets + case d'accord (at_envoyer) ;
--  * CRÉDITS ELIXIR (pas de vente) : 200 par joueur et par mois (remis à 200 le 1er, non cumulables), 2 crédits par image dessinée
--    (réglages at_reglages) ; solde à zéro → « Demander des crédits » (at_credits_demander) → l'admin accorde (at_credits_accorder) ;
--  * filtre de ce que le joueur demande (enfants) AVANT Gemini (qui a aussi le sien) : pegase_int.at_filtre.
-- Images dessinées : seau public « atelier-ia », i/<uuid>.png|jpg|webp, déposées par la fonction Edge (clé secrète) seulement.
create table if not exists public.at_reglages (k text primary key, v int not null);
insert into public.at_reglages (k, v) values ('credits_mois', 200), ('cout_image', 2), ('images_planche', 3) on conflict (k) do nothing;
create table if not exists public.at_credits (name text primary key, mois text not null, solde int not null check (solde >= 0), maj_at timestamptz not null default now());
create table if not exists public.at_credit_demandes (
  id uuid primary key default gen_random_uuid(), name text not null, message text not null default '', at timestamptz not null default now(),
  etat text not null default 'attente' check (etat in ('attente', 'accordee', 'refusee')), montant int, decision_at timestamptz, note text);
create index if not exists at_credit_demandes_name on public.at_credit_demandes (name, at desc);
create table if not exists public.at_ia (            -- chaque demande d'images à Gemini : débitée au début, rendue si ratée
  id uuid primary key default gen_random_uuid(), fiche uuid not null references public.at_fiches (id) on delete cascade, name text not null,
  sorte text not null check (sorte in ('planche', 'dessin')), consigne text not null default '', nb int not null, cout int not null,
  at timestamptz not null default now(), fin_at timestamptz, ok int, erreur text, modele text);
alter table public.at_reglages enable row level security;
alter table public.at_credits enable row level security;
alter table public.at_credit_demandes enable row level security;
alter table public.at_ia enable row level security;
revoke all on public.at_reglages, public.at_credits, public.at_credit_demandes, public.at_ia from anon, authenticated;

alter table public.at_fiches drop constraint if exists at_fiches_etat_check;
alter table public.at_fiches add constraint at_fiches_etat_check check (etat in ('brouillon', 'en_discussion', 'complete', 'design', 'design_choisi',
  'envoyee', 'acceptee', 'refusee', 'alpha', 'publie_salle', 'publie_monde'));
alter table public.at_fiches add column if not exists design jsonb;                               -- {msg, n, f, t} : l'image choisie sur la planche
alter table public.at_fiches add column if not exists design_at timestamptz;
alter table public.at_fiches add column if not exists assets jsonb not null default '[]'::jsonb;   -- [{nom, sorte, source, licence, image}]
alter table public.at_messages add column if not exists images jsonb;                             -- messages de l'Atelier : [{n, f, t}]
alter table public.at_messages add column if not exists planche boolean not null default false;   -- images à choisir (le design)

create or replace function pegase_int.at_reglage(k text) returns int language sql stable security definer set search_path = public as $$
  select v from public.at_reglages r where r.k = at_reglage.k $$;
-- le solde du mois (remis à credits_mois le 1er du mois, heure de Paris ; non cumulable)
create or replace function pegase_int.at_solde(n text) returns int language plpgsql security definer set search_path = public as $$
declare m text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM'); s int;
begin
  insert into public.at_credits (name, mois, solde) values (n, m, pegase_int.at_reglage('credits_mois'))
    on conflict (name) do update set mois = m, solde = pegase_int.at_reglage('credits_mois'), maj_at = now() where public.at_credits.mois <> m;
  select c.solde into s from public.at_credits c where c.name = n; return s;
end $$;
create or replace function pegase_int.at_parle(e text) returns boolean language sql immutable as $$
  select e in ('brouillon', 'en_discussion', 'complete', 'acceptee', 'alpha', 'publie_salle', 'publie_monde') $$;
create or replace function pegase_int.at_pleine(f jsonb) returns boolean language sql immutable as $$
  select (select count(*) from unnest(array['idee', 'but', 'score', 'heros', 'monde', 'dimension', 'style', 'commandes', 'mobile']) k
          where coalesce(btrim(f ->> k), '') <> '') = 9 $$;
-- FILTRE (les joueurs sont souvent des enfants) : refuse la violence crue, le sexe, la drogue, la haine, et les personnages / marques
-- protégés (on s'en inspire, on ne les recopie pas). Rend '' si c'est bon, sinon la raison.
create or replace function pegase_int.at_filtre(t text) returns text language plpgsql immutable as $$
declare s text := ' ' || regexp_replace(translate(lower(coalesce(t, '')), 'àâäáãéèêëíìîïóòôöõúùûüçñœ''’', 'aaaaaeeeeiiiiooooouuuucno  '), '[^a-z0-9]+', ' ', 'g') || ' ';
begin
  if s ~ ' (sang|sanglant|sanglante|gore|tuer|tue|tuent|meurtre|meurtrier|cadavre|decapit[a-z]*|torture[a-z]*|suicide|egorge[a-z]*|massacre[a-z]*|blood|bloody|kill|killing|murder|corpse|beheade?d?) ' then return 'violence'; end if;
  if s ~ ' (nu|nue|nus|nues|tout nu|toute nue|sexe|sexy|sexuel[a-z]*|porno[a-z]*|seins|fesses|culotte|string|bikini|lingerie|nude|naked|sex|porn|boobs) ' then return 'adulte'; end if;
  if s ~ ' (drogue[a-z]*|cannabis|cocaine|alcool|biere|vodka|whisky|cigarette[s]?|fumer|drug|drugs|weed|beer) ' then return 'adulte'; end if;
  if s ~ ' (nazi[a-z]*|hitler|raciste|racisme|terroris[a-z]*|bombe humaine|kkk) ' then return 'haine'; end if;
  if s ~ ' (mario|luigi|pokemon|pikachu|sonic|zelda|minecraft|fortnite|roblox|disney|mickey|pixar|marvel|spiderman|spider man|batman|superman|barbie|lego|pat patrouille|reine des neiges|harry potter|star wars|dragon ball|naruto|one piece|hello kitty|my little pony|peppa) ' then return 'protege'; end if;
  return '';
end $$;

create or replace function public.at_lire(p_name text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; dm public.at_credit_demandes; cr jsonb;
begin
  perform public.acct_check(n);
  select * into dm from public.at_credit_demandes d where d.name = n order by d.at desc limit 1;
  cr := jsonb_build_object('solde', pegase_int.at_solde(n), 'cout', pegase_int.at_reglage('cout_image'), 'mois', pegase_int.at_reglage('credits_mois'),
    'planche', pegase_int.at_reglage('images_planche'),
    'demande', case when dm.id is null then null else jsonb_build_object('etat', dm.etat, 'montant', dm.montant, 'at', dm.at, 'decision_at', dm.decision_at) end);
  select * into f from public.at_fiches x where x.name = n order by (x.etat <> 'refusee') desc, x.created_at desc limit 1;
  if f.id is null then return jsonb_build_object('fiche', null, 'messages', '[]'::jsonb, 'credits', cr); end if;
  return jsonb_build_object('credits', cr,
    'fiche', jsonb_build_object('id', f.id, 'titre', f.titre, 'etat', f.etat, 'fiche', f.fiche, 'created_at', f.created_at, 'maj_at', f.maj_at,
                                'complete_at', f.complete_at, 'envoyee_at', f.envoyee_at, 'decision_at', f.decision_at, 'accord_at', f.accord_at,
                                'jeu', f.jeu, 'design', f.design, 'design_at', f.design_at, 'assets', f.assets),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'texte', m.texte, 'atelier', m.de_atelier, 'micro', m.micro,
                  'image', case when m.image then 'a/' || m.id || '.jpg' end, 'images', m.images, 'planche', m.planche, 'at', m.at) order by m.at)
                  from public.at_messages m where m.fiche = f.id), '[]'::jsonb));
end $$;

create or replace function public.at_dire(p_name text, p_texte text, p_micro boolean default false, p_image boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); t text := btrim(coalesce(p_texte, '')); f public.at_fiches; i uuid;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  if t = '' and not coalesce(p_image, false) then raise exception 'texte vide'; end if;
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then insert into public.at_fiches (name, etat) values (n, 'en_discussion') returning * into f; end if;
  if f.etat = 'envoyee' then raise exception 'projet deja envoye'; end if;
  if not pegase_int.at_parle(f.etat) then raise exception 'choix en cours'; end if;
  if coalesce(p_image, false) and (select count(*) from public.at_messages m where m.fiche = f.id and m.image and not m.de_atelier) >= 6 then raise exception 'trop d images'; end if;
  insert into public.at_messages (fiche, texte, micro, image) values (f.id, left(t, 2000), coalesce(p_micro, false), coalesce(p_image, false)) returning id into i;
  update public.at_fiches x set maj_at = now(), etat = case when x.etat = 'brouillon' then 'en_discussion' else x.etat end where x.id = f.id;
  return jsonb_build_object('id', i, 'fiche', f.id, 'image', case when coalesce(p_image, false) then 'a/' || i || '.jpg' end);
end $$;

-- « C'est bien le jeu que tu veux ? » : Oui → « design » ; Je veux modifier → retour à la discussion (aussi depuis la planche)
create or replace function public.at_valider(p_name text, p_oui boolean)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  if coalesce(p_oui, false) then
    if f.etat in ('design', 'design_choisi') then return jsonb_build_object('id', f.id, 'etat', f.etat); end if;
    if f.etat not in ('en_discussion', 'complete') then raise exception 'etat %', f.etat; end if;
    if not pegase_int.at_pleine(f.fiche) then raise exception 'fiche pas complete'; end if;
    insert into public.at_messages (fiche, texte) values (f.id, '✅ Oui, c’est bien le jeu que je veux !');
    update public.at_fiches x set etat = 'design', design = null, design_at = null, maj_at = now(), complete_at = coalesce(x.complete_at, now())
      where x.id = f.id returning * into f;
  else
    if f.etat not in ('en_discussion', 'complete', 'design', 'design_choisi') then raise exception 'etat %', f.etat; end if;
    insert into public.at_messages (fiche, texte) values (f.id, '✏️ Je veux modifier ma fiche.');
    update public.at_fiches x set etat = case when pegase_int.at_pleine(x.fiche) then 'complete' else 'en_discussion' end, design = null, design_at = null, maj_at = now()
      where x.id = f.id returning * into f;
  end if;
  return jsonb_build_object('id', f.id, 'etat', f.etat);
end $$;

-- le joueur clique une image de la PLANCHE (dernière planche de l'Atelier) : p_n = son numéro
create or replace function public.at_choisir_design(p_name text, p_msg uuid, p_n int)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; im jsonb;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  if f.etat not in ('design', 'design_choisi') then raise exception 'etat %', f.etat; end if;
  select e into im from public.at_messages m, jsonb_array_elements(coalesce(m.images, '[]'::jsonb)) e
    where m.id = p_msg and m.fiche = f.id and m.de_atelier and m.planche and (e ->> 'n')::int = p_n limit 1;
  if im is null then raise exception 'image inconnue'; end if;
  insert into public.at_messages (fiche, texte) values (f.id, '🎨 Je choisis le design n° ' || p_n || ' !');
  update public.at_fiches x set etat = 'design_choisi', design = jsonb_build_object('msg', p_msg, 'n', p_n, 'f', im ->> 'f', 't', im ->> 't'),
    design_at = now(), maj_at = now() where x.id = f.id returning * into f;
  return jsonb_build_object('id', f.id, 'etat', f.etat, 'design', f.design);
end $$;

-- « Envoyer ma lettre » : après le choix du design seulement, avec la case cochée (p_accord = le texte exact accepté)
create or replace function public.at_envoyer(p_name text, p_accord text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; a text := btrim(coalesce(p_accord, ''));
begin
  perform public.acct_check(n);
  if length(a) < 40 then raise exception 'accord requis'; end if;
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  if f.etat = 'envoyee' then return jsonb_build_object('id', f.id, 'etat', 'envoyee', 'envoyee_at', f.envoyee_at, 'accord_at', f.accord_at); end if;
  if f.etat <> 'design_choisi' then raise exception 'design pas choisi'; end if;
  insert into public.at_messages (fiche, texte) values (f.id, '📮 J’ai envoyé ma lettre !');
  update public.at_fiches x set etat = 'envoyee', envoyee_at = now(), maj_at = now(), accord_at = now(), accord_texte = left(a, 1000)
    where x.id = f.id returning * into f;
  return jsonb_build_object('id', f.id, 'etat', f.etat, 'envoyee_at', f.envoyee_at, 'accord_at', f.accord_at);
end $$;

-- ===== crédits Elixir =====
-- « Demander des crédits » (solde trop bas) : une demande en attente à la fois, l'admin la voit dans at_credits_attente
create or replace function public.at_credits_demander(p_name text, p_message text default '')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); d public.at_credit_demandes;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-credits', 5, interval '1 day');
  select * into d from public.at_credit_demandes x where x.name = n and x.etat = 'attente' limit 1;
  if d.id is not null then return jsonb_build_object('id', d.id, 'etat', d.etat, 'at', d.at); end if;
  insert into public.at_credit_demandes (name, message) values (n, left(btrim(coalesce(p_message, '')), 300)) returning * into d;
  return jsonb_build_object('id', d.id, 'etat', d.etat, 'at', d.at);
end $$;
-- (admin) accorder p_montant crédits (ajoutés au solde du mois) ; le joueur est prévenu par un message de l'Atelier (cloche)
create or replace function public.at_credits_accorder(p_demande uuid, p_montant int, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare d public.at_credit_demandes; s int; fid uuid;
begin
  if p_montant is null or p_montant < 1 or p_montant > 2000 then raise exception 'montant entre 1 et 2000'; end if;
  select * into d from public.at_credit_demandes x where x.id = p_demande; if d.id is null then raise exception 'demande inconnue'; end if;
  if d.etat <> 'attente' then raise exception 'deja traitee'; end if;
  perform pegase_int.at_solde(d.name);
  update public.at_credits c set solde = c.solde + p_montant, maj_at = now() where c.name = d.name returning solde into s;
  update public.at_credit_demandes x set etat = 'accordee', montant = p_montant, decision_at = now(), note = p_note where x.id = d.id;
  select x.id into fid from public.at_fiches x where x.name = d.name and x.etat <> 'refusee' limit 1;
  if fid is not null then insert into public.at_messages (fiche, texte, de_atelier) values (fid, '🎁 L’équipe t’a donné ' || p_montant || ' crédits ! Il te reste maintenant ' || s || ' crédits.', true); end if;
  return jsonb_build_object('name', d.name, 'solde', s);
end $$;
create or replace function public.at_credits_refuser(p_demande uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare d public.at_credit_demandes; fid uuid;
begin
  update public.at_credit_demandes x set etat = 'refusee', decision_at = now(), note = p_note where x.id = p_demande and x.etat = 'attente' returning * into d;
  if d.id is null then raise exception 'demande inconnue ou deja traitee'; end if;
  select x.id into fid from public.at_fiches x where x.name = d.name and x.etat <> 'refusee' limit 1;
  if fid is not null then insert into public.at_messages (fiche, texte, de_atelier) values (fid, 'Pas de crédits en plus pour ce mois-ci. Le 1er du mois, tu retrouves tes ' || pegase_int.at_reglage('credits_mois') || ' crédits !', true); end if;
  return jsonb_build_object('name', d.name, 'etat', d.etat);
end $$;
create or replace view public.at_credits_attente with (security_invoker = true) as
  select d.id as demande, d.name as joueur, d.message, d.at, (select c.solde from public.at_credits c where c.name = d.name) as solde
  from public.at_credit_demandes d where d.etat = 'attente' order by d.at;
revoke all on public.at_credits_attente from anon, authenticated;

-- ===== images dessinées par Gemini (fonction Edge atelier-image) =====
-- 1. at_ia_debut (jeton DU JOUEUR) : vérifie le compte, l'état, le FILTRE, débite les crédits, rend les consignes à dessiner.
--    p_sorte 'planche' : 3 designs du jeu (état « design », une seule planche à la fois) ; 'dessin' : 1 image de p_consigne (en discussion).
create or replace function public.at_ia_debut(p_name text, p_sorte text, p_consigne text default '')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; c text := left(btrim(coalesce(p_consigne, '')), 400); nb int; cout int; s int; u uuid;
  fi jsonb; base text; why text; styles text[] := array[
    'dessin animé coloré et doux, contours nets, couleurs pastel lumineuses',
    'pixel art rétro très soigné, couleurs vives, style jeu d''arcade',
    'images 3D toon arrondies, matières douces, éclairage chaleureux'];
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-ia', 20, interval '1 hour');
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  fi := f.fiche;
  if p_sorte = 'planche' then
    if f.etat <> 'design' then raise exception 'etat %', f.etat; end if;
    if exists (select 1 from public.at_ia a where a.fiche = f.id and a.sorte = 'planche' and a.fin_at is null and a.at > now() - interval '5 minutes') then raise exception 'planche en cours'; end if;
    nb := pegase_int.at_reglage('images_planche');
    base := concat_ws(' ', fi ->> 'idee', fi ->> 'heros', fi ->> 'monde', fi ->> 'style', f.titre);
  elsif p_sorte = 'dessin' then
    if not pegase_int.at_parle(f.etat) then raise exception 'choix en cours'; end if;
    if length(c) < 3 then raise exception 'consigne vide'; end if;
    nb := 1; base := c;
  else raise exception 'sorte inconnue'; end if;
  why := pegase_int.at_filtre(base);
  if why <> '' then raise exception 'filtre %', why; end if;
  cout := nb * pegase_int.at_reglage('cout_image');
  s := pegase_int.at_solde(n);
  if s < cout then raise exception 'credits insuffisants'; end if;
  update public.at_credits x set solde = x.solde - cout, maj_at = now() where x.name = n;
  insert into public.at_ia (fiche, name, sorte, consigne, nb, cout) values (f.id, n, p_sorte, case when p_sorte = 'dessin' then c else '' end, nb, cout) returning id into u;
  return jsonb_build_object('usage', u, 'nb', nb, 'solde', s - cout,
    'consignes', case when p_sorte = 'planche' then (select jsonb_agg(
        'Image de présentation (key art) d''un jeu vidéo d''arcade pour enfants, gentil et joyeux, à jouer entre copains. ' ||
        'Titre du jeu (ne PAS l''écrire dans l''image) : ' || coalesce(nullif(f.titre, ''), 'mon jeu') || '. Idée : ' || coalesce(fi ->> 'idee', '') ||
        ' Héros : ' || coalesce(fi ->> 'heros', '') || '. Monde : ' || coalesce(fi ->> 'monde', '') || '. Vue : ' || coalesce(fi ->> 'dimension', '') ||
        '. Style graphique : ' || styles[1 + ((k - 1) % 3)] || '. Montre le héros en action dans son monde, comme une capture du jeu. ' ||
        'Aucun texte, aucun logo, aucune marque, aucun personnage existant protégé. Format paysage 4:3.' order by k) from generate_series(1, nb) k)
      else jsonb_build_array('Dessin pour un enfant qui imagine son jeu vidéo, gentil et coloré, sans texte ni logo ni personnage protégé : ' || c) end,
    'legendes', case when p_sorte = 'planche' then (select jsonb_agg((array['Dessin animé', 'Pixel art', '3D toon'])[1 + ((k - 1) % 3)] order by k) from generate_series(1, nb) k) else jsonb_build_array('') end);
end $$;
-- 2. at_ia_fin (clé secrète, fonction Edge) : range les images réussies dans un message de l'Atelier (planche = à choisir), rend les
--    crédits des images ratées. p_images = chemins i/<uuid>.<ext> du seau atelier-ia.
create or replace function public.at_ia_fin(p_usage uuid, p_images text[], p_legendes text[] default null, p_modele text default null, p_erreur text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare a public.at_ia; nok int := coalesce(array_length(p_images, 1), 0); ims jsonb := '[]'::jsonb; k int; rend int; mid uuid; s int;
begin
  select * into a from public.at_ia x where x.id = p_usage; if a.id is null then raise exception 'usage inconnu'; end if;
  if a.fin_at is not null then raise exception 'deja fini'; end if;
  if nok > a.nb then raise exception 'trop d images'; end if;
  for k in 1 .. nok loop
    if p_images[k] !~ '^i/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|webp)$' then raise exception 'chemin refuse'; end if;
    ims := ims || jsonb_build_array(jsonb_build_object('n', k, 'f', p_images[k], 't', left(coalesce(p_legendes[k], ''), 80)));
  end loop;
  rend := (a.nb - nok) * (a.cout / a.nb);
  if rend > 0 then perform pegase_int.at_solde(a.name); update public.at_credits c set solde = c.solde + rend, maj_at = now() where c.name = a.name; end if;
  update public.at_ia x set fin_at = now(), ok = nok, erreur = left(p_erreur, 200), modele = left(p_modele, 80) where x.id = a.id;
  select c.solde into s from public.at_credits c where c.name = a.name;
  if nok > 0 then
    insert into public.at_messages (fiche, texte, de_atelier, images, planche) values (a.fiche,
      case when a.sorte = 'planche' then 'Voici ' || nok || ' idées de design pour ton jeu 🎨 Touche celle que tu préfères !'
           else 'Voilà ton dessin ! 🎨 (' || a.cout / a.nb || ' crédits, il t’en reste ' || s || ')' end, true, ims, a.sorte = 'planche') returning id into mid;
  end if;
  return jsonb_build_object('message', mid, 'rendus', rend, 'solde', s);
end $$;

-- assets retenus (Atelier) : [{nom, sorte, source, licence, image}] (image : chemin i/… du seau atelier-ia, facultatif)
create or replace function public.at_assets(p_fiche uuid, p_assets jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r public.at_fiches;
begin
  if jsonb_typeof(coalesce(p_assets, 'null'::jsonb)) <> 'array' then raise exception 'p_assets doit etre un tableau'; end if;
  if length(p_assets::text) > 20000 then raise exception 'liste trop longue'; end if;
  if exists (select 1 from jsonb_array_elements(p_assets) e where coalesce(e ->> 'image', '') <> ''
             and (e ->> 'image') !~ '^i/[0-9a-f-]{36}[.](png|jpg|webp)$') then raise exception 'image refusee'; end if;
  update public.at_fiches x set assets = p_assets, maj_at = now() where x.id = p_fiche returning * into r;
  if r.id is null then raise exception 'fiche inconnue'; end if;
  return jsonb_build_object('id', r.id, 'assets', jsonb_array_length(r.assets));
end $$;

drop function if exists public.at_etat(uuid, text, text, text, bigint);
create or replace function public.at_etat(p_fiche uuid, p_etat text, p_note text default null, p_jeu text default null, p_salle bigint default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r public.at_fiches;
begin
  if p_etat not in ('en_discussion', 'complete', 'design', 'acceptee', 'refusee', 'alpha', 'publie_salle', 'publie_monde') then raise exception 'etat refuse : %', p_etat; end if;
  if p_jeu is not null and p_jeu !~ '^[a-z0-9_-]{2,20}$' then raise exception 'id de jeu refuse'; end if;
  select * into r from public.at_fiches x where x.id = p_fiche; if r.id is null then raise exception 'fiche inconnue'; end if;
  if p_etat = 'alpha' and coalesce(p_jeu, r.jeu) is null then raise exception 'alpha : p_jeu obligatoire'; end if;
  if p_etat = 'publie_salle' and coalesce(p_salle, r.salle) is null then raise exception 'publie_salle : p_salle obligatoire'; end if;
  update public.at_fiches x set etat = p_etat, maj_at = now(),
    complete_at = case when p_etat = 'complete' then now() else x.complete_at end,
    decision_at = case when p_etat in ('acceptee', 'refusee', 'publie_salle', 'publie_monde') then now() else x.decision_at end,
    note_benjamin = coalesce(p_note, x.note_benjamin), jeu = coalesce(p_jeu, x.jeu), salle = coalesce(p_salle, x.salle)
  where x.id = p_fiche returning * into r;
  return jsonb_build_object('id', r.id, 'etat', r.etat, 'jeu', r.jeu, 'salle', r.salle);
end $$;

-- seau des images dessinées : lecture publique, écriture par la clé secrète seulement (aucune politique d'écriture pour les joueurs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('atelier-ia', 'atelier-ia', true, 8388608, array['image/png', 'image/jpeg', 'image/webp']) on conflict (id) do nothing;

revoke all on function public.at_valider(text, boolean), public.at_choisir_design(text, uuid, int), public.at_credits_demander(text, text),
  public.at_ia_debut(text, text, text) from public, anon;
grant execute on function public.at_valider(text, boolean), public.at_choisir_design(text, uuid, int), public.at_credits_demander(text, text),
  public.at_ia_debut(text, text, text) to authenticated;
revoke all on function public.at_credits_accorder(uuid, int, text), public.at_credits_refuser(uuid, text), public.at_ia_fin(uuid, text[], text[], text, text),
  public.at_assets(uuid, jsonb), public.at_etat(uuid, text, text, text, bigint),
  pegase_int.at_reglage(text), pegase_int.at_solde(text), pegase_int.at_parle(text), pegase_int.at_pleine(jsonb), pegase_int.at_filtre(text) from public, anon, authenticated;
grant execute on function public.at_ia_fin(uuid, text[], text[], text, text) to service_role;

-- ===================================================================================================================================
-- CRÉDITS AUSSI POUR LES MESSAGES, QUESTIONS DE DESIGN AVANT LES DESSINS (borne 1.63.36, 2 nov. 2026 14 h 15, Benjamin) :
--  * 1 crédit par message à l'Atelier (cout_message), 1 crédit pour envoyer la lettre (cout_lettre), 2 par image (cout_image) ;
--  * avant la planche, le joueur répond à 3 questions de design (style, couleurs, ambiance : choix à cliquer, listes fermées ici) ;
--    les 3 dessins de la planche suivent SES réponses (3 scènes différentes) : moins d'images ratées, moins de crédits perdus.
insert into public.at_reglages (k, v) values ('cout_message', 1), ('cout_lettre', 1) on conflict (k) do nothing;
-- 2 nov. 14 h 20 (Benjamin) : 200 crédits ne coûtent jamais plus de 2 € réels ; une image Gemini ≈ 0,04 € → 50 images au plus → 4 crédits par image
update public.at_reglages set v = 4 where k = 'cout_image';
alter table public.at_ia add column if not exists choix jsonb;

create or replace function pegase_int.at_debiter(n text, c int) returns int language plpgsql security definer set search_path = public as $$
declare s int := pegase_int.at_solde(n);
begin
  if coalesce(c, 0) <= 0 then return s; end if;
  if s < c then raise exception 'credits insuffisants'; end if;
  update public.at_credits x set solde = x.solde - c, maj_at = now() where x.name = n returning solde into s;
  return s;
end $$;
-- les réponses permises aux questions de design (clé → libellé donné à Gemini)
create or replace function pegase_int.at_choix_ok(c jsonb) returns jsonb language plpgsql immutable as $$
declare st text := c ->> 'style'; co text := c ->> 'couleurs'; am text := c ->> 'ambiance'; r jsonb;
begin
  r := jsonb_build_object(
    'style', case st when 'anime' then 'dessin animé coloré, contours nets' when 'pixel' then 'pixel art rétro très soigné' when '3d' then 'images 3D toon arrondies, matières douces'
                     when 'aquarelle' then 'illustration à l''aquarelle, douce et lumineuse' when 'manga' then 'style manga coloré et dynamique' end,
    'couleurs', case co when 'pastel' then 'couleurs pastel douces' when 'vives' then 'couleurs vives et flashy' when 'nuit' then 'couleurs de nuit, bleus profonds et lumières qui brillent'
                     when 'nature' then 'couleurs naturelles, verts et bruns chaleureux' when 'arcenciel' then 'couleurs arc-en-ciel joyeuses' end,
    'ambiance', case am when 'joyeuse' then 'ambiance joyeuse et drôle' when 'aventure' then 'ambiance d''aventure, épique mais gentille' when 'calme' then 'ambiance calme et mignonne'
                     when 'mystere' then 'ambiance mystérieuse, un tout petit peu effrayante mais gentille' when 'rapide' then 'ambiance rapide et pleine d''énergie' end);
  if r ->> 'style' is null or r ->> 'couleurs' is null or r ->> 'ambiance' is null then return null; end if;
  return r;
end $$;

create or replace function public.at_lire(p_name text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; dm public.at_credit_demandes; cr jsonb;
begin
  perform public.acct_check(n);
  select * into dm from public.at_credit_demandes d where d.name = n order by d.at desc limit 1;
  cr := jsonb_build_object('solde', pegase_int.at_solde(n), 'cout', pegase_int.at_reglage('cout_image'), 'mois', pegase_int.at_reglage('credits_mois'),
    'planche', pegase_int.at_reglage('images_planche'), 'message', coalesce(pegase_int.at_reglage('cout_message'), 0), 'lettre', coalesce(pegase_int.at_reglage('cout_lettre'), 0),
    'demande', case when dm.id is null then null else jsonb_build_object('etat', dm.etat, 'montant', dm.montant, 'at', dm.at, 'decision_at', dm.decision_at) end);
  select * into f from public.at_fiches x where x.name = n order by (x.etat <> 'refusee') desc, x.created_at desc limit 1;
  if f.id is null then return jsonb_build_object('fiche', null, 'messages', '[]'::jsonb, 'credits', cr); end if;
  return jsonb_build_object('credits', cr,
    'fiche', jsonb_build_object('id', f.id, 'titre', f.titre, 'etat', f.etat, 'fiche', f.fiche, 'created_at', f.created_at, 'maj_at', f.maj_at,
                                'complete_at', f.complete_at, 'envoyee_at', f.envoyee_at, 'decision_at', f.decision_at, 'accord_at', f.accord_at,
                                'jeu', f.jeu, 'design', f.design, 'design_at', f.design_at, 'assets', f.assets),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'texte', m.texte, 'atelier', m.de_atelier, 'micro', m.micro,
                  'image', case when m.image then 'a/' || m.id || '.jpg' end, 'images', m.images, 'planche', m.planche, 'at', m.at) order by m.at)
                  from public.at_messages m where m.fiche = f.id), '[]'::jsonb));
end $$;

create or replace function public.at_dire(p_name text, p_texte text, p_micro boolean default false, p_image boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); t text := btrim(coalesce(p_texte, '')); f public.at_fiches; i uuid; s int;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  if t = '' and not coalesce(p_image, false) then raise exception 'texte vide'; end if;
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is not null and f.etat = 'envoyee' then raise exception 'projet deja envoye'; end if;
  if f.id is not null and not pegase_int.at_parle(f.etat) then raise exception 'choix en cours'; end if;
  if f.id is not null and coalesce(p_image, false) and (select count(*) from public.at_messages m where m.fiche = f.id and m.image and not m.de_atelier) >= 6 then raise exception 'trop d images'; end if;
  s := pegase_int.at_debiter(n, pegase_int.at_reglage('cout_message'));   -- 1 crédit par message (refusé sans crédits : rien n'est écrit)
  if f.id is null then insert into public.at_fiches (name, etat) values (n, 'en_discussion') returning * into f; end if;
  insert into public.at_messages (fiche, texte, micro, image) values (f.id, left(t, 2000), coalesce(p_micro, false), coalesce(p_image, false)) returning id into i;
  update public.at_fiches x set maj_at = now(), etat = case when x.etat = 'brouillon' then 'en_discussion' else x.etat end where x.id = f.id;
  return jsonb_build_object('id', i, 'fiche', f.id, 'image', case when coalesce(p_image, false) then 'a/' || i || '.jpg' end, 'solde', s);
end $$;

create or replace function public.at_envoyer(p_name text, p_accord text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; a text := btrim(coalesce(p_accord, '')); s int;
begin
  perform public.acct_check(n);
  if length(a) < 40 then raise exception 'accord requis'; end if;
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  if f.etat = 'envoyee' then return jsonb_build_object('id', f.id, 'etat', 'envoyee', 'envoyee_at', f.envoyee_at, 'accord_at', f.accord_at); end if;
  if f.etat <> 'design_choisi' then raise exception 'design pas choisi'; end if;
  s := pegase_int.at_debiter(n, pegase_int.at_reglage('cout_lettre'));
  insert into public.at_messages (fiche, texte) values (f.id, '📮 J’ai envoyé ma lettre !');
  update public.at_fiches x set etat = 'envoyee', envoyee_at = now(), maj_at = now(), accord_at = now(), accord_texte = left(a, 1000)
    where x.id = f.id returning * into f;
  return jsonb_build_object('id', f.id, 'etat', f.etat, 'envoyee_at', f.envoyee_at, 'accord_at', f.accord_at, 'solde', s);
end $$;

drop function if exists public.at_ia_debut(text, text, text);
create or replace function public.at_ia_debut(p_name text, p_sorte text, p_consigne text default '', p_choix jsonb default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; c text := left(btrim(coalesce(p_consigne, '')), 400); nb int; cout int; s int; u uuid;
  fi jsonb; base text; why text; ch jsonb; scenes text[] := array[
    'Le héros en pleine action, au cœur du jeu, comme une capture d''écran.',
    'Une vue large du monde du jeu avec le héros petit au milieu, comme l''écran titre.',
    'Le héros de près, souriant, avec un objet ou un ami du jeu à côté de lui.'];
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-ia', 20, interval '1 hour');
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  fi := f.fiche;
  if p_sorte = 'planche' then
    if f.etat <> 'design' then raise exception 'etat %', f.etat; end if;
    ch := pegase_int.at_choix_ok(coalesce(p_choix, '{}'::jsonb));
    if ch is null then raise exception 'choix de design requis'; end if;
    if exists (select 1 from public.at_ia a where a.fiche = f.id and a.sorte = 'planche' and a.fin_at is null and a.at > now() - interval '5 minutes') then raise exception 'planche en cours'; end if;
    nb := pegase_int.at_reglage('images_planche');
    base := concat_ws(' ', fi ->> 'idee', fi ->> 'heros', fi ->> 'monde', f.titre);
  elsif p_sorte = 'dessin' then
    if not pegase_int.at_parle(f.etat) then raise exception 'choix en cours'; end if;
    if length(c) < 3 then raise exception 'consigne vide'; end if;
    nb := 1; base := c;
  else raise exception 'sorte inconnue'; end if;
  why := pegase_int.at_filtre(base);
  if why <> '' then raise exception 'filtre %', why; end if;
  cout := nb * pegase_int.at_reglage('cout_image');
  s := pegase_int.at_debiter(n, cout);
  insert into public.at_ia (fiche, name, sorte, consigne, nb, cout, choix) values (f.id, n, p_sorte, case when p_sorte = 'dessin' then c else '' end, nb, cout, p_choix) returning id into u;
  return jsonb_build_object('usage', u, 'nb', nb, 'solde', s,
    'consignes', case when p_sorte = 'planche' then (select jsonb_agg(
        'Image d''un jeu vidéo d''arcade pour enfants, gentil, à jouer entre copains. ' ||
        'Idée du jeu : ' || coalesce(fi ->> 'idee', '') || ' Héros : ' || coalesce(fi ->> 'heros', '') || '. Monde : ' || coalesce(fi ->> 'monde', '') ||
        '. Vue : ' || coalesce(fi ->> 'dimension', '') || '. Style graphique : ' || (ch ->> 'style') || '. Couleurs : ' || (ch ->> 'couleurs') ||
        '. ' || initcap(left(ch ->> 'ambiance', 1)) || substr(ch ->> 'ambiance', 2) || '. ' || scenes[1 + ((k - 1) % 3)] ||
        ' Aucun texte, aucun logo, aucune marque, aucun personnage existant protégé. Format paysage 4:3.' order by k) from generate_series(1, nb) k)
      else jsonb_build_array('Dessin pour un enfant qui imagine son jeu vidéo, gentil et coloré, sans texte ni logo ni personnage protégé : ' || c) end,
    'legendes', case when p_sorte = 'planche' then (select jsonb_agg((array['En pleine action', 'Le monde du jeu', 'Le héros de près'])[1 + ((k - 1) % 3)] order by k) from generate_series(1, nb) k) else jsonb_build_array('') end);
end $$;
revoke all on function public.at_ia_debut(text, text, text, jsonb) from public, anon;
grant execute on function public.at_ia_debut(text, text, text, jsonb) to authenticated;
revoke all on function pegase_int.at_debiter(text, int), pegase_int.at_choix_ok(jsonb) from public, anon, authenticated;

-- ===================================================================================================================================
-- TOUT EN PLANCHES D'ASSETS (borne 1.63.38, 2 nov. 2026 14 h 25 → 14 h 35, Benjamin) : 10 crédits par génération Gemini (cout_image) ;
-- une génération « assets » = UNE image en grille régulière avec 2 à 9 éléments (6 à 9 conseillés : lisible au téléphone), fond blanc
-- uni, un élément centré par case ; les gros éléments (fond, titre) = une image à eux (sorte « dessin »). Découpage : la borne montre
-- chaque élément (case de la grille) ; les éléments sont rangés dans les assets du projet (fiche.assets : image = la planche, case,
-- grille) ; le découpage précis (contours, fond transparent) se fait à la construction (~/jdv-tools/atelier-decoupe.py).
update public.at_reglages set v = 10 where k = 'cout_image';
alter table public.at_ia drop constraint if exists at_ia_sorte_check;
alter table public.at_ia add constraint at_ia_sorte_check check (sorte in ('planche', 'dessin', 'assets'));

-- la liste des éléments écrite par le joueur (« un chat ninja, un poisson volant, une étoile… ») : virgules, retours à la ligne, « ; » ou « et »
create or replace function pegase_int.at_elements(t text) returns text[] language sql immutable as $$
  select coalesce(array_agg(left(e, 60) order by o), '{}') from (
    select btrim(regexp_replace(x, '^\s*(\d+[.)-]\s*|[-•*]\s*)', '')) e, o
    from unnest(regexp_split_to_array(coalesce(t, ''), '\s*(,|;|\n|\s+et\s+)\s*')) with ordinality as u(x, o)) z
  where length(e) >= 2 $$;

create or replace function public.at_ia_debut(p_name text, p_sorte text, p_consigne text default '', p_choix jsonb default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; c text := left(btrim(coalesce(p_consigne, '')), 600); nb int; cout int; s int; u uuid;
  fi jsonb; base text; why text; ch jsonb; el text[]; ne int; cols int; rws int; sty text; scenes text[] := array[
    'Le héros en pleine action, au cœur du jeu, comme une capture d''écran.',
    'Une vue large du monde du jeu avec le héros petit au milieu, comme l''écran titre.',
    'Le héros de près, souriant, avec un objet ou un ami du jeu à côté de lui.'];
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-ia', 20, interval '1 hour');
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  fi := f.fiche;
  if p_sorte = 'planche' then
    if f.etat <> 'design' then raise exception 'etat %', f.etat; end if;
    ch := pegase_int.at_choix_ok(coalesce(p_choix, '{}'::jsonb));
    if ch is null then raise exception 'choix de design requis'; end if;
    if exists (select 1 from public.at_ia a where a.fiche = f.id and a.sorte = 'planche' and a.fin_at is null and a.at > now() - interval '5 minutes') then raise exception 'planche en cours'; end if;
    nb := pegase_int.at_reglage('images_planche');
    base := concat_ws(' ', fi ->> 'idee', fi ->> 'heros', fi ->> 'monde', f.titre);
  elsif p_sorte in ('dessin', 'assets') then
    if not pegase_int.at_parle(f.etat) then raise exception 'choix en cours'; end if;
    if length(c) < 3 then raise exception 'consigne vide'; end if;
    nb := 1; base := c;
    if p_sorte = 'assets' then
      el := pegase_int.at_elements(c); ne := coalesce(array_length(el, 1), 0);
      if ne < 2 then raise exception 'elements : au moins 2'; end if;
      if ne > 9 then raise exception 'elements : 9 au plus'; end if;
      cols := case when ne <= 4 then 2 else 3 end; rws := ceil(ne::numeric / cols)::int;
    end if;
  else raise exception 'sorte inconnue'; end if;
  why := pegase_int.at_filtre(base);
  if why <> '' then raise exception 'filtre %', why; end if;
  cout := nb * pegase_int.at_reglage('cout_image');
  perform pegase_int.at_ia_plafond(nb);   -- plafond GLOBAL du mois (tous les joueurs, plus bas dans ce fichier)
  s := pegase_int.at_debiter(n, cout);
  -- le style de la planche d'assets : celui du design choisi s'il y en a un, sinon la rubrique « style » de la fiche
  sty := coalesce((select pegase_int.at_choix_ok(a.choix) ->> 'style' || ', ' || (pegase_int.at_choix_ok(a.choix) ->> 'couleurs')
                   from public.at_ia a where a.fiche = f.id and a.sorte = 'planche' and a.choix is not null order by a.at desc limit 1), nullif(fi ->> 'style', ''), 'dessin animé coloré');
  insert into public.at_ia (fiche, name, sorte, consigne, nb, cout, choix) values (f.id, n, p_sorte, case when p_sorte = 'planche' then '' else c end, nb, cout,
    case when p_sorte = 'assets' then jsonb_build_object('elements', to_jsonb(el), 'cols', cols, 'rows', rws) else p_choix end) returning id into u;
  return jsonb_build_object('usage', u, 'nb', nb, 'solde', s,
    'consignes', case
      when p_sorte = 'planche' then (select jsonb_agg(
        'Image d''un jeu vidéo d''arcade pour enfants, gentil, à jouer entre copains. ' ||
        'Idée du jeu : ' || coalesce(fi ->> 'idee', '') || ' Héros : ' || coalesce(fi ->> 'heros', '') || '. Monde : ' || coalesce(fi ->> 'monde', '') ||
        '. Vue : ' || coalesce(fi ->> 'dimension', '') || '. Style graphique : ' || (ch ->> 'style') || '. Couleurs : ' || (ch ->> 'couleurs') ||
        '. ' || initcap(left(ch ->> 'ambiance', 1)) || substr(ch ->> 'ambiance', 2) || '. ' || scenes[1 + ((k - 1) % 3)] ||
        ' Aucun texte, aucun logo, aucune marque, aucun personnage existant protégé. Format paysage 4:3.' order by k) from generate_series(1, nb) k)
      when p_sorte = 'assets' then jsonb_build_array(
        'Planche d''éléments (sprite sheet) pour un jeu vidéo 2D pour enfants, gentil et coloré. Style : ' || sty || '. ' ||
        'Une grille RÉGULIÈRE de ' || cols || ' colonnes et ' || rws || ' lignes, toutes les cases de la même taille. ' ||
        'Dans chaque case, UN SEUL élément, entier, centré, bien séparé, qui ne touche pas les bords de sa case. ' ||
        'Fond blanc pur uni (#FFFFFF) partout, sans ombre au sol, sans décor, sans quadrillage visible, sans cadre, sans texte, sans numéro. ' ||
        'Les éléments, dans l''ordre (de gauche à droite, puis de haut en bas) : ' ||
        (select string_agg(i || '. ' || el[i], ' ; ' order by i) from generate_series(1, ne) i) ||
        (case when ne < cols * rws then '. Les cases en trop restent blanches.' else '.' end) ||
        ' Même style et même taille apparente pour tous. Aucun logo, aucune marque, aucun personnage existant protégé. Image carrée.')
      else jsonb_build_array('Dessin pour un enfant qui imagine son jeu vidéo, gentil et coloré, sans texte ni logo ni personnage protégé : ' || c) end,
    'legendes', case when p_sorte = 'planche' then (select jsonb_agg((array['En pleine action', 'Le monde du jeu', 'Le héros de près'])[1 + ((k - 1) % 3)] order by k) from generate_series(1, nb) k)
      when p_sorte = 'assets' then jsonb_build_array('Planche de ' || ne || ' éléments') else jsonb_build_array('') end);
end $$;

-- at_ia_fin : une planche d'ASSETS → le message montre la planche (grille + noms) et chaque élément entre dans les assets du projet
create or replace function public.at_ia_fin(p_usage uuid, p_images text[], p_legendes text[] default null, p_modele text default null, p_erreur text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare a public.at_ia; nok int := coalesce(array_length(p_images, 1), 0); ims jsonb := '[]'::jsonb; k int; rend int; mid uuid; s int; ne int; el jsonb;
begin
  select * into a from public.at_ia x where x.id = p_usage; if a.id is null then raise exception 'usage inconnu'; end if;
  if a.fin_at is not null then raise exception 'deja fini'; end if;
  if nok > a.nb then raise exception 'trop d images'; end if;
  for k in 1 .. nok loop
    if p_images[k] !~ '^i/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|webp)$' then raise exception 'chemin refuse'; end if;
    ims := ims || jsonb_build_array(jsonb_build_object('n', k, 'f', p_images[k], 't', left(coalesce(p_legendes[k], ''), 80))
      || case when a.sorte = 'assets' then jsonb_build_object('g', jsonb_build_array(a.choix -> 'cols', a.choix -> 'rows'), 'e', a.choix -> 'elements') else '{}'::jsonb end);
  end loop;
  rend := (a.nb - nok) * (a.cout / a.nb);
  if rend > 0 then perform pegase_int.at_solde(a.name); update public.at_credits c set solde = c.solde + rend, maj_at = now() where c.name = a.name; end if;
  update public.at_ia x set fin_at = now(), ok = nok, erreur = left(p_erreur, 200), modele = left(p_modele, 80) where x.id = a.id;
  select c.solde into s from public.at_credits c where c.name = a.name;
  if nok > 0 then
    el := coalesce(a.choix -> 'elements', '[]'::jsonb); ne := jsonb_array_length(el);
    insert into public.at_messages (fiche, texte, de_atelier, images, planche) values (a.fiche,
      case when a.sorte = 'planche' then 'Voici ' || nok || ' idées de design pour ton jeu 🎨 Touche celle que tu préfères !'
           when a.sorte = 'assets' then 'Voilà ta planche de ' || ne || ' éléments ! 🧩 Je les ai rangés dans ta fiche, rubrique « Ce qu’il y aura dans ton jeu ». (' || a.cout || ' crédits, il t’en reste ' || s || ')'
           else 'Voilà ton dessin ! 🎨 (' || a.cout / a.nb || ' crédits, il t’en reste ' || s || ')' end, true, ims, a.sorte = 'planche') returning id into mid;
    if a.sorte = 'assets' then   -- les éléments découpés (une case de la grille chacun) entrent dans les assets du projet
      update public.at_fiches x set maj_at = now(), assets = (coalesce(x.assets, '[]'::jsonb) || (select coalesce(jsonb_agg(jsonb_build_object(
          'nom', e.v, 'sorte', 'élément', 'source', 'planche dessinée par l’Atelier', 'licence', 'à nous', 'image', p_images[1],
          'case', e.o::int, 'grille', jsonb_build_array(a.choix -> 'cols', a.choix -> 'rows')) order by e.o), '[]'::jsonb)
        from jsonb_array_elements_text(el) with ordinality as e(v, o)))
      where x.id = a.fiche and length(coalesce(x.assets, '[]'::jsonb)::text) < 15000;
    end if;
  end if;
  return jsonb_build_object('message', mid, 'rendus', rend, 'solde', s);
end $$;

-- at_assets (Atelier) : accepte aussi « case » / « grille » (un élément d'une planche)
create or replace function public.at_assets(p_fiche uuid, p_assets jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r public.at_fiches;
begin
  if jsonb_typeof(coalesce(p_assets, 'null'::jsonb)) <> 'array' then raise exception 'p_assets doit etre un tableau'; end if;
  if length(p_assets::text) > 20000 then raise exception 'liste trop longue'; end if;
  if exists (select 1 from jsonb_array_elements(p_assets) e where coalesce(e ->> 'image', '') <> ''
             and (e ->> 'image') !~ '^i/[0-9a-f-]{36}[.](png|jpg|webp)$') then raise exception 'image refusee'; end if;
  update public.at_fiches x set assets = p_assets, maj_at = now() where x.id = p_fiche returning * into r;
  if r.id is null then raise exception 'fiche inconnue'; end if;
  return jsonb_build_object('id', r.id, 'assets', jsonb_array_length(r.assets));
end $$;
revoke all on function pegase_int.at_elements(text) from public, anon, authenticated;

-- ===================================================================================================================================
-- PLAFOND GLOBAL DUR (borne 1.63.38, 2 nov. 2026) : chez Google, le « budget » n'envoie que des alertes, il ne bloque rien. NOTRE plafond
-- est la vraie sécurité : plafond_images_mois images Gemini par mois (heure de Paris), TOUS les joueurs ensemble ; au-delà, at_ia_debut
-- refuse (« plafond global ») et l'Atelier dit « l'atelier de dessin est en pause jusqu'au mois prochain ». Compteur admin : vue at_ia_mois.
insert into public.at_reglages (k, v) values ('plafond_images_mois', 500) on conflict (k) do nothing;
create or replace function pegase_int.at_ia_utilisees() returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when a.fin_at is null then a.nb else coalesce(a.ok, 0) end), 0)::int from public.at_ia a
  where a.at >= (date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris') $$;
create or replace view public.at_ia_mois with (security_invoker = true) as
  select to_char(now() at time zone 'Europe/Paris', 'YYYY-MM') as mois, pegase_int.at_ia_utilisees() as images_utilisees,
    pegase_int.at_reglage('plafond_images_mois') as plafond, greatest(0, pegase_int.at_reglage('plafond_images_mois') - pegase_int.at_ia_utilisees()) as restantes,
    (select count(distinct a.name) from public.at_ia a where a.at >= (date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')) as joueurs;
revoke all on public.at_ia_mois from anon, authenticated;
revoke all on function pegase_int.at_ia_utilisees() from public, anon, authenticated;
-- le contrôle, juste avant le débit des crédits dans at_ia_debut (verrou : deux demandes en même temps ne dépassent pas le plafond)
create or replace function pegase_int.at_ia_plafond(nb int) returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('atelier-ia-plafond'));
  if pegase_int.at_ia_utilisees() + nb > coalesce(pegase_int.at_reglage('plafond_images_mois'), 0) then raise exception 'plafond global'; end if;
end $$;
revoke all on function pegase_int.at_ia_plafond(int) from public, anon, authenticated;
update public.at_reglages set v = 2 where k = 'cout_message';   -- 2 nov. 14 h 45 (Benjamin) : 2 crédits par message

-- ===================================================================================================================================
-- L'ATELIER PROPOSE LES PLANCHES (borne 1.63.41, 2 nov. 2026 15 h 05, Benjamin) : plus de « Dessine » libre au fil de la discussion. On
-- collecte d'abord (fiche complète, modifications par numéro), puis l'Atelier PROPOSE les planches dans la fiche (clé « planches » :
-- [{nom, elements}], le moins de planches possible, idéalement UNE) ; le joueur voit la liste + le coût et CONFIRME (« Oui, dessine ma
-- planche ») : seulement alors at_ia_debut(…, 'assets', 'planche N') dessine LA planche N de la fiche (les éléments viennent de la fiche,
-- jamais d'un texte libre). Une planche d'un seul élément = une grande image (fond, titre). La sorte « dessin » libre est fermée.
create or replace function public.at_ia_debut(p_name text, p_sorte text, p_consigne text default '', p_choix jsonb default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; c text := left(btrim(coalesce(p_consigne, '')), 600); nb int; cout int; s int; u uuid;
  fi jsonb; base text; why text; ch jsonb; el text[]; ne int; cols int; rws int; sty text; pi int; pj jsonb; pnom text; scenes text[] := array[
    'Le héros en pleine action, au cœur du jeu, comme une capture d''écran.',
    'Une vue large du monde du jeu avec le héros petit au milieu, comme l''écran titre.',
    'Le héros de près, souriant, avec un objet ou un ami du jeu à côté de lui.'];
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-ia', 20, interval '1 hour');
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  fi := f.fiche;
  if p_sorte = 'planche' then
    if f.etat <> 'design' then raise exception 'etat %', f.etat; end if;
    ch := pegase_int.at_choix_ok(coalesce(p_choix, '{}'::jsonb));
    if ch is null then raise exception 'choix de design requis'; end if;
    if exists (select 1 from public.at_ia a where a.fiche = f.id and a.sorte = 'planche' and a.fin_at is null and a.at > now() - interval '5 minutes') then raise exception 'planche en cours'; end if;
    nb := pegase_int.at_reglage('images_planche');
    base := concat_ws(' ', fi ->> 'idee', fi ->> 'heros', fi ->> 'monde', f.titre);
  elsif p_sorte = 'assets' then
    if not pegase_int.at_parle(f.etat) then raise exception 'choix en cours'; end if;
    pi := (regexp_match(c, '^planche ([0-9]{1,2})$'))[1]::int;   -- « planche N » : la N-ième planche PROPOSÉE dans la fiche (1, 2, 3…)
    if pi is null or jsonb_typeof(fi -> 'planches') <> 'array' or pi < 1 or pi > jsonb_array_length(fi -> 'planches') then raise exception 'planche inconnue'; end if;
    pj := (fi -> 'planches') -> (pi - 1);
    if jsonb_typeof(pj) = 'object' and coalesce((pj ->> 'faite')::boolean, false) then raise exception 'planche deja dessinee'; end if;
    if exists (select 1 from public.at_ia a where a.fiche = f.id and a.sorte = 'assets' and a.fin_at is null and a.at > now() - interval '5 minutes' and (a.choix ->> 'planche')::int = pi) then raise exception 'planche en cours'; end if;
    pnom := case when jsonb_typeof(pj) = 'string' then pj #>> '{}' else coalesce(pj ->> 'nom', 'Planche ' || pi) end;
    el := case when jsonb_typeof(pj) = 'object' and jsonb_typeof(pj -> 'elements') = 'array' then (select array_agg(left(btrim(v), 60)) from jsonb_array_elements_text(pj -> 'elements') v where length(btrim(v)) >= 2)
               when jsonb_typeof(pj) = 'object' then pegase_int.at_elements(pj ->> 'elements')
               else array[left(pnom, 60)] end;
    ne := coalesce(array_length(el, 1), 0);
    if ne < 1 then el := array[left(pnom, 60)]; ne := 1; end if;
    if ne > 9 then raise exception 'elements : 9 au plus'; end if;
    cols := case when ne = 1 then 1 when ne <= 4 then 2 else 3 end; rws := ceil(ne::numeric / cols)::int;
    nb := 1; base := pnom || ' ' || array_to_string(el, ' ');
  else raise exception 'sorte inconnue'; end if;   -- (la sorte « dessin » libre est fermée depuis la 1.63.41)
  why := pegase_int.at_filtre(base);
  if why <> '' then raise exception 'filtre %', why; end if;
  cout := nb * pegase_int.at_reglage('cout_image');
  perform pegase_int.at_ia_plafond(nb);
  s := pegase_int.at_debiter(n, cout);
  sty := coalesce((select pegase_int.at_choix_ok(a.choix) ->> 'style' || ', ' || (pegase_int.at_choix_ok(a.choix) ->> 'couleurs')
                   from public.at_ia a where a.fiche = f.id and a.sorte = 'planche' and a.choix is not null order by a.at desc limit 1), nullif(fi ->> 'style', ''), 'dessin animé coloré');
  insert into public.at_ia (fiche, name, sorte, consigne, nb, cout, choix) values (f.id, n, p_sorte, case when p_sorte = 'planche' then '' else c end, nb, cout,
    case when p_sorte = 'assets' then jsonb_build_object('planche', pi, 'nom', pnom, 'elements', to_jsonb(el), 'cols', cols, 'rows', rws) else p_choix end) returning id into u;
  return jsonb_build_object('usage', u, 'nb', nb, 'solde', s,
    'consignes', case
      when p_sorte = 'planche' then (select jsonb_agg(
        'Image d''un jeu vidéo d''arcade pour enfants, gentil, à jouer entre copains. ' ||
        'Idée du jeu : ' || coalesce(fi ->> 'idee', '') || ' Héros : ' || coalesce(fi ->> 'heros', '') || '. Monde : ' || coalesce(fi ->> 'monde', '') ||
        '. Vue : ' || coalesce(fi ->> 'dimension', '') || '. Style graphique : ' || (ch ->> 'style') || '. Couleurs : ' || (ch ->> 'couleurs') ||
        '. ' || initcap(left(ch ->> 'ambiance', 1)) || substr(ch ->> 'ambiance', 2) || '. ' || scenes[1 + ((k - 1) % 3)] ||
        ' Aucun texte, aucun logo, aucune marque, aucun personnage existant protégé. Format paysage 4:3.' order by k) from generate_series(1, nb) k)
      when ne = 1 then jsonb_build_array(
        'Grande image pour un jeu vidéo 2D pour enfants, gentil et coloré (jeu : ' || coalesce(nullif(f.titre, ''), coalesce(fi ->> 'idee', '')) || '). Style : ' || sty || '. ' ||
        'Elle représente : ' || el[1] || '. Image entière, bien composée, format paysage 16:9. Aucun logo, aucune marque, aucun personnage existant protégé, ' ||
        'aucun texte sauf si c''est un titre (alors seulement le titre, bien lisible).')
      else jsonb_build_array(
        'Planche d''éléments (sprite sheet) pour un jeu vidéo 2D pour enfants, gentil et coloré. Style : ' || sty || '. ' ||
        'Une grille RÉGULIÈRE de ' || cols || ' colonnes et ' || rws || ' lignes, toutes les cases de la même taille. ' ||
        'Dans chaque case, UN SEUL élément, entier, centré, bien séparé, qui ne touche pas les bords de sa case. ' ||
        'Fond blanc pur uni (#FFFFFF) partout, sans ombre au sol, sans décor, sans quadrillage visible, sans cadre, sans texte, sans numéro. ' ||
        'Les éléments, dans l''ordre (de gauche à droite, puis de haut en bas) : ' ||
        (select string_agg(i || '. ' || el[i], ' ; ' order by i) from generate_series(1, ne) i) ||
        (case when ne < cols * rws then '. Les cases en trop restent blanches.' else '.' end) ||
        ' Même style et même taille apparente pour tous. Aucun logo, aucune marque, aucun personnage existant protégé. Image carrée.') end,
    'legendes', case when p_sorte = 'planche' then (select jsonb_agg((array['En pleine action', 'Le monde du jeu', 'Le héros de près'])[1 + ((k - 1) % 3)] order by k) from generate_series(1, nb) k)
      else jsonb_build_array(pnom) end);
end $$;

-- at_ia_fin : la planche N dessinée est marquée « faite » dans la fiche (avec son image) ; une planche d'un seul élément n'a pas de grille
create or replace function public.at_ia_fin(p_usage uuid, p_images text[], p_legendes text[] default null, p_modele text default null, p_erreur text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare a public.at_ia; nok int := coalesce(array_length(p_images, 1), 0); ims jsonb := '[]'::jsonb; k int; rend int; mid uuid; s int; ne int; el jsonb; pi int;
begin
  select * into a from public.at_ia x where x.id = p_usage; if a.id is null then raise exception 'usage inconnu'; end if;
  if a.fin_at is not null then raise exception 'deja fini'; end if;
  if nok > a.nb then raise exception 'trop d images'; end if;
  el := coalesce(a.choix -> 'elements', '[]'::jsonb); ne := jsonb_array_length(el); pi := (a.choix ->> 'planche')::int;
  for k in 1 .. nok loop
    if p_images[k] !~ '^i/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](png|jpg|webp)$' then raise exception 'chemin refuse'; end if;
    ims := ims || jsonb_build_array(jsonb_build_object('n', k, 'f', p_images[k], 't', left(coalesce(p_legendes[k], ''), 80))
      || case when a.sorte = 'assets' and ne > 1 then jsonb_build_object('g', jsonb_build_array(a.choix -> 'cols', a.choix -> 'rows'), 'e', el) else '{}'::jsonb end);
  end loop;
  rend := (a.nb - nok) * (a.cout / a.nb);
  if rend > 0 then perform pegase_int.at_solde(a.name); update public.at_credits c set solde = c.solde + rend, maj_at = now() where c.name = a.name; end if;
  update public.at_ia x set fin_at = now(), ok = nok, erreur = left(p_erreur, 200), modele = left(p_modele, 80) where x.id = a.id;
  select c.solde into s from public.at_credits c where c.name = a.name;
  if nok > 0 then
    insert into public.at_messages (fiche, texte, de_atelier, images, planche) values (a.fiche,
      case when a.sorte = 'planche' then 'Voici ' || nok || ' idées de design pour ton jeu 🎨 Touche celle que tu préfères !'
           when a.sorte = 'assets' and ne > 1 then 'Voilà ta planche « ' || coalesce(a.choix ->> 'nom', '') || ' » : ' || ne || ' éléments ! 🧩 Je les ai rangés dans ta fiche, rubrique « Ce qu’il y aura dans ton jeu ». (' || a.cout || ' crédits, il t’en reste ' || s || ')'
           when a.sorte = 'assets' then 'Voilà « ' || coalesce(a.choix ->> 'nom', '') || ' » ! 🎨 (' || a.cout || ' crédits, il t’en reste ' || s || ')'
           else 'Voilà ton dessin ! 🎨 (' || a.cout / a.nb || ' crédits, il t’en reste ' || s || ')' end, true, ims, a.sorte = 'planche') returning id into mid;
    if a.sorte = 'assets' then
      update public.at_fiches x set maj_at = now(),
        assets = (coalesce(x.assets, '[]'::jsonb) || (select coalesce(jsonb_agg(jsonb_build_object(
          'nom', e.v, 'sorte', case when ne > 1 then 'élément' else 'grande image' end, 'source', 'planche dessinée par l’Atelier', 'licence', 'à nous', 'image', p_images[1])
          || case when ne > 1 then jsonb_build_object('case', e.o::int, 'grille', jsonb_build_array(a.choix -> 'cols', a.choix -> 'rows')) else '{}'::jsonb end order by e.o), '[]'::jsonb)
          from jsonb_array_elements_text(el) with ordinality as e(v, o))),
        fiche = case when pi is not null and jsonb_typeof(x.fiche -> 'planches') = 'array' and pi <= jsonb_array_length(x.fiche -> 'planches')
          then jsonb_set(x.fiche, array['planches', (pi - 1)::text],
                 case when jsonb_typeof(x.fiche -> 'planches' -> (pi - 1)) = 'object' then (x.fiche -> 'planches' -> (pi - 1)) else jsonb_build_object('nom', x.fiche -> 'planches' ->> (pi - 1)) end
                 || jsonb_build_object('faite', true, 'image', p_images[1]))
          else x.fiche end
      where x.id = a.fiche and length(coalesce(x.assets, '[]'::jsonb)::text) < 15000;
    end if;
  end if;
  return jsonb_build_object('message', mid, 'rendus', rend, 'solde', s);
end $$;

-- ===================================================================================================================================
-- BUDGET EN EUROS ET SUIVI DE L'ADMIN (borne 1.63.44, 2 nov. 2026 15 h 10 : Benjamin a mis 20 € chez Google) :
--  * budget_euros_mois (20) : coût réel ESTIMÉ du mois = images réussies × cout_image_centimes (4 = 0,04 € pour gemini-2.5-flash-image,
--    à confirmer avec la facture Google) ; à 100 % → pause, exactement comme le plafond d'images (pegase_int.at_ia_plafond) ;
--  * journal de chaque génération (vue at_ia_journal) + total du mois en € (vue at_ia_mois) ; les ADMINS (table at_admins) le voient dans
--    l'Atelier (bouton « 📊 Suivi », RPC at_suivi).
insert into public.at_reglages (k, v) values ('budget_euros_mois', 20), ('cout_image_centimes', 4) on conflict (k) do nothing;
create table if not exists public.at_admins (name text primary key);
alter table public.at_admins enable row level security;
revoke all on public.at_admins from anon, authenticated;
insert into public.at_admins (name) values ('PATOU'), ('BENJAMIN'), ('SAMBA') on conflict do nothing;
create or replace function pegase_int.at_debut_mois() returns timestamptz language sql stable as $$
  select (date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris') $$;
-- centimes du mois : images réussies (et réservées en cours) × prix estimé d'une image
create or replace function pegase_int.at_ia_centimes() returns int language sql stable security definer set search_path = public as $$
  select (pegase_int.at_ia_utilisees() * coalesce(pegase_int.at_reglage('cout_image_centimes'), 4))::int $$;
create or replace function pegase_int.at_ia_plafond(nb int) returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('atelier-ia-plafond'));
  if pegase_int.at_ia_utilisees() + nb > coalesce(pegase_int.at_reglage('plafond_images_mois'), 0) then raise exception 'plafond global'; end if;
  if pegase_int.at_ia_centimes() + nb * coalesce(pegase_int.at_reglage('cout_image_centimes'), 4) > coalesce(pegase_int.at_reglage('budget_euros_mois'), 0) * 100 then raise exception 'plafond global (budget)'; end if;
end $$;
create or replace view public.at_ia_journal with (security_invoker = true) as
  select a.at, a.name as joueur, f.titre as projet, a.sorte, a.nb as images_demandees, coalesce(a.ok, 0) as images_reussies,
    coalesce(jsonb_array_length(a.choix -> 'elements'), 0) as elements, a.cout as credits,
    round(coalesce(case when a.fin_at is null then a.nb else a.ok end, 0) * coalesce(pegase_int.at_reglage('cout_image_centimes'), 4) / 100.0, 2) as euros_estimes,
    case when a.fin_at is null then 'en cours' when coalesce(a.ok, 0) > 0 then 'OK' else 'erreur (crédits rendus)' end as statut, a.erreur, a.modele
  from public.at_ia a left join public.at_fiches f on f.id = a.fiche order by a.at desc;
revoke all on public.at_ia_journal from anon, authenticated;
create or replace view public.at_ia_mois with (security_invoker = true) as
  select to_char(now() at time zone 'Europe/Paris', 'YYYY-MM') as mois, pegase_int.at_ia_utilisees() as images_utilisees,
    pegase_int.at_reglage('plafond_images_mois') as plafond, greatest(0, pegase_int.at_reglage('plafond_images_mois') - pegase_int.at_ia_utilisees()) as restantes,
    (select count(distinct a.name) from public.at_ia a where a.at >= pegase_int.at_debut_mois()) as joueurs,
    round(pegase_int.at_ia_centimes() / 100.0, 2) as euros_estimes, pegase_int.at_reglage('budget_euros_mois') as budget_euros,
    round(greatest(0, pegase_int.at_reglage('budget_euros_mois') * 100 - pegase_int.at_ia_centimes()) / 100.0, 2) as euros_restants;
revoke all on public.at_ia_mois from anon, authenticated;
-- le suivi pour un ADMIN connecté (bouton « 📊 Suivi » de l'Atelier) : le mois + les 60 dernières générations
create or replace function public.at_suivi(p_name text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  if not exists (select 1 from public.at_admins x where x.name = n) then raise exception 'admin requis'; end if;
  return jsonb_build_object('mois', (select to_jsonb(m) from public.at_ia_mois m),
    'cout_image_centimes', pegase_int.at_reglage('cout_image_centimes'), 'credits_mois', pegase_int.at_reglage('credits_mois'),
    'lignes', coalesce((select jsonb_agg(to_jsonb(j)) from (select * from public.at_ia_journal limit 60) j), '[]'::jsonb),
    'demandes', coalesce((select jsonb_agg(to_jsonb(d)) from public.at_credits_attente d), '[]'::jsonb));
end $$;
revoke all on function public.at_suivi(text) from public, anon;
grant execute on function public.at_suivi(text) to authenticated;
revoke all on function pegase_int.at_ia_centimes(), pegase_int.at_debut_mois() from public, anon, authenticated;
-- at_lire dit au joueur s'il est admin (pour montrer le bouton « 📊 Suivi » ; le contenu reste protégé par at_suivi)
do $$
declare d text := pg_get_functiondef('public.at_lire(text)'::regprocedure);
begin
  if position('''admin''' in d) = 0 then
    d := replace(d, '''planche'', pegase_int.at_reglage(''images_planche''),', '''planche'', pegase_int.at_reglage(''images_planche''), ''admin'', exists (select 1 from public.at_admins x where x.name = n),');
    if position('''admin''' in d) = 0 then raise exception 'remplacement impossible'; end if;
    execute d;
  end if;
end $$;
-- PREMIER TEST (Benjamin, 15 h 10) : seuls les ADMINS (PATOU, SAMBA) peuvent faire dessiner tant que ia_admins_seulement = 1 ; les autres
-- joueurs voient « l'atelier de dessin est en pause » (même refus que le plafond). Ouvrir à tous : update at_reglages set v = 0 where k = 'ia_admins_seulement'.
insert into public.at_reglages (k, v) values ('ia_admins_seulement', 1) on conflict (k) do nothing;
do $$
declare d text := pg_get_functiondef('public.at_ia_debut(text, text, text, jsonb)'::regprocedure);
begin
  if position('ia_admins_seulement' in d) = 0 then
    d := replace(d, '  perform public.pg_rate(n, ''atelier-ia'', 20, interval ''1 hour'');',
      '  perform public.pg_rate(n, ''atelier-ia'', 20, interval ''1 hour'');' || chr(10) ||
      '  if coalesce(pegase_int.at_reglage(''ia_admins_seulement''), 0) = 1 and not exists (select 1 from public.at_admins x where x.name = n) then raise exception ''plafond global (admins seulement)''; end if;');
    if position('ia_admins_seulement' in d) = 0 then raise exception 'remplacement impossible'; end if;
    execute d;
  end if;
end $$;

-- 1re VRAIE PLANCHE (2 nov. 2026 15 h 09, PATOU, 6 éléments) : Gemini a dessiné une grille 3 × 3 avec des CADRES et 3 cases vides au lieu
-- de 3 × 2 sans cadre (image carrée demandée). → la forme de l'image suit la grille (« ratio » rendu à la fonction Edge : imageConfig
-- aspectRatio, 3:2 pour 3 × 2…), « exactement N dessins, aucune case vide, aucun cadre ». Le découpage se fait de toute façon sur les
-- DESSINS trouvés (taches de couleur), pas sur la grille (borne : atlBlobs ; outil : atelier-decoupe.py).
do $$
declare d text := pg_get_functiondef('public.at_ia_debut(text, text, text, jsonb)'::regprocedure);
begin
  if position('''ratio''' in d) = 0 then
    d := replace(d, ''' Même style et même taille apparente pour tous. Aucun logo, aucune marque, aucun personnage existant protégé. Image carrée.''',
      ''' Exactement '' || ne || '' dessins en tout : aucune case vide en plus, aucun cadre ni bordure ni carré autour des dessins (ils flottent sur le fond blanc). '' ||
        ''Même style et même taille apparente pour tous. Aucun logo, aucune marque, aucun personnage existant protégé. Image au format '' ||
        (case when cols = 3 and rws = 2 then ''paysage 3:2'' when cols = 3 and rws = 1 then ''très large 21:9'' when cols = 2 and rws = 1 then ''paysage 16:9'' else ''carré 1:1'' end) || ''.''');
    d := replace(d, 'return jsonb_build_object(''usage'', u, ''nb'', nb, ''solde'', s,',
      'return jsonb_build_object(''usage'', u, ''nb'', nb, ''solde'', s, ''ratio'', case when p_sorte = ''planche'' then ''4:3'' when ne = 1 then ''16:9'' when cols = 3 and rws = 2 then ''3:2'' when cols = 3 and rws = 1 then ''21:9'' when cols = 2 and rws = 1 then ''16:9'' else ''1:1'' end,');
    if position('''ratio''' in d) = 0 or position('Exactement' in d) = 0 then raise exception 'remplacement impossible'; end if;
    execute d;
  end if;
end $$;

-- ===================================================================================================================================
-- PROMPT « VRAI JEU VIDÉO » ET IMAGEN 4 (borne 1.63.45, 2 nov. 2026 15 h 20 ; 1re planche jugée « moche, ça ne fait pas jeu vidéo » par
-- Benjamin : néon sur fond blanc, cadres, grille 3 × 3, style clip-art) :
--  * sprite sheet de jeu soigné (contours nets, cel shading, ombres douces), N objets isolés, AUCUN cadre / quadrillage / texte, fond UNI
--    pour un détourage propre : noir pour un jeu néon / de nuit, magenta #FF00FF sinon ; point de vue = rubrique « 2D ou 3D » de la fiche ;
--  * une planche proposée peut demander le modèle Imagen 4 (« modele »: "imagen" dans fiche.planches) pour comparer (même clé Google).
create or replace function public.at_ia_debut(p_name text, p_sorte text, p_consigne text default '', p_choix jsonb default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; c text := left(btrim(coalesce(p_consigne, '')), 600); nb int; cout int; s int; u uuid;
  fi jsonb; base text; why text; ch jsonb; el text[]; ne int; cols int; rws int; sty text; pi int; pj jsonb; pnom text; fond text; modele text; vue text;
  scenes text[] := array[
    'Le héros en pleine action, au cœur du jeu, comme une capture d''écran.',
    'Une vue large du monde du jeu avec le héros petit au milieu, comme l''écran titre.',
    'Le héros de près, souriant, avec un objet ou un ami du jeu à côté de lui.'];
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-ia', 20, interval '1 hour');
  if coalesce(pegase_int.at_reglage('ia_admins_seulement'), 0) = 1 and not exists (select 1 from public.at_admins x where x.name = n) then raise exception 'plafond global (admins seulement)'; end if;
  select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' limit 1;
  if f.id is null then raise exception 'aucun projet'; end if;
  fi := f.fiche;
  if p_sorte = 'planche' then
    if f.etat <> 'design' then raise exception 'etat %', f.etat; end if;
    ch := pegase_int.at_choix_ok(coalesce(p_choix, '{}'::jsonb));
    if ch is null then raise exception 'choix de design requis'; end if;
    if exists (select 1 from public.at_ia a where a.fiche = f.id and a.sorte = 'planche' and a.fin_at is null and a.at > now() - interval '5 minutes') then raise exception 'planche en cours'; end if;
    nb := pegase_int.at_reglage('images_planche');
    base := concat_ws(' ', fi ->> 'idee', fi ->> 'heros', fi ->> 'monde', f.titre);
  elsif p_sorte = 'assets' then
    if not pegase_int.at_parle(f.etat) then raise exception 'choix en cours'; end if;
    pi := (regexp_match(c, '^planche ([0-9]{1,2})$'))[1]::int;
    if pi is null or jsonb_typeof(fi -> 'planches') <> 'array' or pi < 1 or pi > jsonb_array_length(fi -> 'planches') then raise exception 'planche inconnue'; end if;
    pj := (fi -> 'planches') -> (pi - 1);
    if jsonb_typeof(pj) = 'object' and coalesce((pj ->> 'faite')::boolean, false) then raise exception 'planche deja dessinee'; end if;
    if exists (select 1 from public.at_ia a where a.fiche = f.id and a.sorte = 'assets' and a.fin_at is null and a.at > now() - interval '5 minutes' and (a.choix ->> 'planche')::int = pi) then raise exception 'planche en cours'; end if;
    pnom := case when jsonb_typeof(pj) = 'string' then pj #>> '{}' else coalesce(pj ->> 'nom', 'Planche ' || pi) end;
    el := case when jsonb_typeof(pj) = 'object' and jsonb_typeof(pj -> 'elements') = 'array' then (select array_agg(left(btrim(v), 60)) from jsonb_array_elements_text(pj -> 'elements') v where length(btrim(v)) >= 2)
               when jsonb_typeof(pj) = 'object' then pegase_int.at_elements(pj ->> 'elements')
               else array[left(pnom, 60)] end;
    ne := coalesce(array_length(el, 1), 0);
    if ne < 1 then el := array[left(pnom, 60)]; ne := 1; end if;
    if ne > 9 then raise exception 'elements : 9 au plus'; end if;
    cols := case when ne = 1 then 1 when ne <= 4 then 2 else 3 end; rws := ceil(ne::numeric / cols)::int;
    nb := 1; base := pnom || ' ' || array_to_string(el, ' ');
    modele := case when jsonb_typeof(pj) = 'object' and pj ->> 'modele' = 'imagen' then 'imagen-4.0-generate-001' end;
  else raise exception 'sorte inconnue'; end if;
  why := pegase_int.at_filtre(base);
  if why <> '' then raise exception 'filtre %', why; end if;
  cout := nb * pegase_int.at_reglage('cout_image');
  perform pegase_int.at_ia_plafond(nb);
  s := pegase_int.at_debiter(n, cout);
  ch := coalesce(ch, (select pegase_int.at_choix_ok(a.choix) from public.at_ia a where a.fiche = f.id and a.sorte = 'planche' and a.choix is not null order by a.at desc limit 1));
  sty := coalesce(ch ->> 'style' || ', ' || (ch ->> 'couleurs'), nullif(fi ->> 'style', ''), 'dessin animé coloré');
  -- fond uni pour le détourage : NOIR pour un jeu néon / de nuit (le néon est laid sur blanc), MAGENTA sinon
  fond := case when lower(coalesce(sty, '') || ' ' || coalesce(fi ->> 'style', '') || ' ' || coalesce(f.titre, '') || ' ' || coalesce(fi ->> 'monde', '')) ~ '(n[ée]on|nuit|espace|spatial|night|space)'
               then 'pure black #000000' else 'pure magenta #FF00FF (do not use magenta in the objects)' end;
  vue := case when lower(coalesce(fi ->> 'dimension', '')) ~ 'dessus|top' then 'top-down view' when lower(coalesce(fi ->> 'dimension', '')) ~ 'c[ôo]t[ée]|side' then 'side view'
              when lower(coalesce(fi ->> 'dimension', '')) ~ '3d' then '3D-rendered look, three-quarter view' else 'side view' end;
  insert into public.at_ia (fiche, name, sorte, consigne, nb, cout, choix, modele) values (f.id, n, p_sorte, case when p_sorte = 'planche' then '' else c end, nb, cout,
    case when p_sorte = 'assets' then jsonb_build_object('planche', pi, 'nom', pnom, 'elements', to_jsonb(el), 'cols', cols, 'rows', rws) else p_choix end, modele) returning id into u;
  return jsonb_build_object('usage', u, 'nb', nb, 'solde', s, 'modele', modele,
    'ratio', case when p_sorte = 'planche' then '4:3' when ne = 1 then '16:9' when cols = 3 and rws = 2 then '3:2' when cols = 3 and rws = 1 then '21:9' when cols = 2 and rws = 1 then '16:9' else '1:1' end,
    'consignes', case
      when p_sorte = 'planche' then (select jsonb_agg(
        'Image d''un jeu vidéo d''arcade pour enfants, gentil, à jouer entre copains. ' ||
        'Idée du jeu : ' || coalesce(fi ->> 'idee', '') || ' Héros : ' || coalesce(fi ->> 'heros', '') || '. Monde : ' || coalesce(fi ->> 'monde', '') ||
        '. Vue : ' || coalesce(fi ->> 'dimension', '') || '. Style graphique : ' || (ch ->> 'style') || '. Couleurs : ' || (ch ->> 'couleurs') ||
        '. ' || initcap(left(ch ->> 'ambiance', 1)) || substr(ch ->> 'ambiance', 2) || '. ' || scenes[1 + ((k - 1) % 3)] ||
        ' Aucun texte, aucun logo, aucune marque, aucun personnage existant protégé. Format paysage 4:3.' order by k) from generate_series(1, nb) k)
      when ne = 1 then jsonb_build_array(
        'Polished 2D video game art for a kids arcade game (' || coalesce(nullif(f.titre, ''), coalesce(fi ->> 'idee', '')) || '). Art style: ' || sty || ', ' || vue ||
        ', vibrant colors, clean outlines, game-ready. It shows: ' || el[1] || '. Full image, well composed, landscape 16:9. No logos, no brands, no existing copyrighted characters, ' ||
        'no text unless it is a title (then only the title, clearly readable).')
      else jsonb_build_array(
        '2D video game sprite sheet for a kids arcade game (' || coalesce(nullif(f.titre, ''), coalesce(fi ->> 'idee', 'mon jeu')) || '). ' ||
        'Polished, game-ready assets in one consistent art style: clean outlines, cel shading, soft shadows, vibrant colors. Art style: ' || sty || ', ' || vue || '. ' ||
        'Exactly ' || ne || ' separate objects, each one complete and isolated, evenly spaced in ' || rws || ' row' || case when rws > 1 then 's' else '' end || ' of ' || cols ||
        ', with plenty of empty space around each object. NO frames, NO boxes, NO borders, NO grid lines, NO text, NO numbers, NO labels. ' ||
        'Plain flat uniform background color: ' || fond || ', everywhere, no gradient, no ground, no cast shadow on the background. ' ||
        'The objects, in reading order (left to right, then top to bottom): ' || (select string_agg(i || '. ' || el[i], ' ; ' order by i) from generate_series(1, ne) i) || '. ' ||
        'Same scale and same style for all. No logos, no brands, no existing copyrighted characters.') end,
    'legendes', case when p_sorte = 'planche' then (select jsonb_agg((array['En pleine action', 'Le monde du jeu', 'Le héros de près'])[1 + ((k - 1) % 3)] order by k) from generate_series(1, nb) k)
      else jsonb_build_array(pnom) end);
end $$;

-- ===================================================================================================================================
-- PLUSIEURS PROJETS PAR JOUEUR (borne 1.63.47, 2 nov. 2026 15 h 40, Benjamin) : l'Atelier s'ouvre sur « Mes projets » (une tuile par
-- projet + « Nouveau projet ») ; plus de règle « un seul projet actif » : projets_max (5) projets non refusés par joueur. Chaque action
-- du joueur vise UN projet (p_fiche) ; sans p_fiche : le projet le plus récent (anciennes bornes). at_en_attente était déjà par projet.
insert into public.at_reglages (k, v) values ('projets_max', 5) on conflict (k) do nothing;
drop index if exists public.at_fiches_un_actif;
create index if not exists at_fiches_name on public.at_fiches (name, maj_at desc);

-- le projet visé : p_fiche (doit être à ce joueur et pas refusé), sinon le plus récent (ou null s'il n'y en a pas)
create or replace function pegase_int.at_fiche_de(n text, p_fiche uuid) returns public.at_fiches language plpgsql stable security definer set search_path = public as $$
declare f public.at_fiches;
begin
  if p_fiche is null then select * into f from public.at_fiches x where x.name = n and x.etat <> 'refusee' order by x.maj_at desc limit 1; return f; end if;
  select * into f from public.at_fiches x where x.id = p_fiche and x.name = n and x.etat <> 'refusee';
  if f.id is null then raise exception 'projet inconnu'; end if;
  return f;
end $$;
create or replace function pegase_int.at_projets_ok(n text) returns void language plpgsql stable security definer set search_path = public as $$
begin
  if (select count(*) from public.at_fiches x where x.name = n and x.etat <> 'refusee') >= coalesce(pegase_int.at_reglage('projets_max'), 5) then raise exception 'trop de projets'; end if;
end $$;
revoke all on function pegase_int.at_fiche_de(text, uuid), pegase_int.at_projets_ok(text) from public, anon, authenticated;

-- at_lire : la liste « Mes projets » (vignette = design choisi, sinon dernière planche dessinée) + le projet ouvert (p_fiche, sinon le plus récent)
drop function if exists public.at_lire(text);
create or replace function public.at_lire(p_name text, p_fiche uuid default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; dm public.at_credit_demandes; cr jsonb; pr jsonb;
begin
  perform public.acct_check(n);
  select * into dm from public.at_credit_demandes d where d.name = n order by d.at desc limit 1;
  cr := jsonb_build_object('solde', pegase_int.at_solde(n), 'cout', pegase_int.at_reglage('cout_image'), 'mois', pegase_int.at_reglage('credits_mois'),
    'planche', pegase_int.at_reglage('images_planche'), 'admin', exists (select 1 from public.at_admins x where x.name = n and x.suivi),
    'message', coalesce(pegase_int.at_reglage('cout_message'), 0), 'lettre', coalesce(pegase_int.at_reglage('cout_lettre'), 0),
    'projets_max', coalesce(pegase_int.at_reglage('projets_max'), 5),
    'demande', case when dm.id is null then null else jsonb_build_object('etat', dm.etat, 'montant', dm.montant, 'at', dm.at, 'decision_at', dm.decision_at) end);
  pr := coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'titre', x.titre, 'etat', x.etat, 'maj_at', x.maj_at, 'created_at', x.created_at, 'jeu', x.jeu,
      'vignette', coalesce(x.design ->> 'f', (select m.images -> 0 ->> 'f' from public.at_messages m where m.fiche = x.id and m.de_atelier and m.images is not null and not m.planche order by m.at desc limit 1)),
      'reponse_at', (select max(m.at) from public.at_messages m where m.fiche = x.id and m.de_atelier),
      'joueur_at', (select max(m.at) from public.at_messages m where m.fiche = x.id and not m.de_atelier),
      'complete', pegase_int.at_pleine(x.fiche)) order by x.maj_at desc) from public.at_fiches x where x.name = n and x.etat <> 'refusee'), '[]'::jsonb);
  f := pegase_int.at_fiche_de(n, p_fiche);
  if f.id is null then return jsonb_build_object('fiche', null, 'messages', '[]'::jsonb, 'credits', cr, 'projets', pr); end if;
  return jsonb_build_object('credits', cr, 'projets', pr,
    'fiche', jsonb_build_object('id', f.id, 'titre', f.titre, 'etat', f.etat, 'fiche', f.fiche, 'created_at', f.created_at, 'maj_at', f.maj_at,
                                'complete_at', f.complete_at, 'envoyee_at', f.envoyee_at, 'decision_at', f.decision_at, 'accord_at', f.accord_at,
                                'jeu', f.jeu, 'design', f.design, 'design_at', f.design_at, 'assets', f.assets),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'texte', m.texte, 'atelier', m.de_atelier, 'micro', m.micro,
                  'image', case when m.image then 'a/' || m.id || '.jpg' end, 'images', m.images, 'planche', m.planche, 'at', m.at) order by m.at)
                  from public.at_messages m where m.fiche = f.id), '[]'::jsonb));
end $$;
revoke all on function public.at_lire(text, uuid) from public, anon;
grant execute on function public.at_lire(text, uuid) to authenticated;

-- at_dire : p_fiche = le projet ; p_nouveau = un NOUVEAU projet (dans la limite projets_max)
drop function if exists public.at_dire(text, text, boolean, boolean);
create or replace function public.at_dire(p_name text, p_texte text, p_micro boolean default false, p_image boolean default false, p_fiche uuid default null, p_nouveau boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); t text := btrim(coalesce(p_texte, '')); f public.at_fiches; i uuid; s int;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  if t = '' and not coalesce(p_image, false) then raise exception 'texte vide'; end if;
  if not coalesce(p_nouveau, false) then f := pegase_int.at_fiche_de(n, p_fiche); end if;
  if f.id is not null and f.etat = 'envoyee' then raise exception 'projet deja envoye'; end if;
  if f.id is not null and not pegase_int.at_parle(f.etat) then raise exception 'choix en cours'; end if;
  if f.id is not null and coalesce(p_image, false) and (select count(*) from public.at_messages m where m.fiche = f.id and m.image and not m.de_atelier) >= 6 then raise exception 'trop d images'; end if;
  if f.id is null then perform pegase_int.at_projets_ok(n); end if;
  s := pegase_int.at_debiter(n, pegase_int.at_reglage('cout_message'));
  if f.id is null then insert into public.at_fiches (name, etat) values (n, 'en_discussion') returning * into f; end if;
  insert into public.at_messages (fiche, texte, micro, image) values (f.id, left(t, 2000), coalesce(p_micro, false), coalesce(p_image, false)) returning id into i;
  update public.at_fiches x set maj_at = now(), etat = case when x.etat = 'brouillon' then 'en_discussion' else x.etat end where x.id = f.id;
  return jsonb_build_object('id', i, 'fiche', f.id, 'image', case when coalesce(p_image, false) then 'a/' || i || '.jpg' end, 'solde', s);
end $$;
revoke all on function public.at_dire(text, text, boolean, boolean, uuid, boolean) from public, anon;
grant execute on function public.at_dire(text, text, boolean, boolean, uuid, boolean) to authenticated;

-- at_valider / at_envoyer / at_ia_debut : + p_fiche ; at_choisir_design : le projet est celui du message de la planche
do $$
declare d text; old text := 'select * into f from public.at_fiches x where x.name = n and x.etat <> ''refusee'' limit 1;';
begin
  -- at_valider
  d := pg_get_functiondef('public.at_valider(text, boolean)'::regprocedure);
  d := replace(d, 'public.at_valider(p_name text, p_oui boolean)', 'public.at_valider(p_name text, p_oui boolean, p_fiche uuid DEFAULT NULL::uuid)');
  d := replace(d, old, 'f := pegase_int.at_fiche_de(n, p_fiche);');
  if position('p_fiche' in d) = 0 or position(old in d) > 0 then raise exception 'at_valider'; end if;
  drop function public.at_valider(text, boolean); execute d;
  -- at_envoyer
  d := pg_get_functiondef('public.at_envoyer(text, text)'::regprocedure);
  d := replace(d, 'public.at_envoyer(p_name text, p_accord text)', 'public.at_envoyer(p_name text, p_accord text, p_fiche uuid DEFAULT NULL::uuid)');
  d := replace(d, old, 'f := pegase_int.at_fiche_de(n, p_fiche);');
  if position('p_fiche' in d) = 0 or position(old in d) > 0 then raise exception 'at_envoyer'; end if;
  drop function public.at_envoyer(text, text); execute d;
  -- at_ia_debut
  d := pg_get_functiondef('public.at_ia_debut(text, text, text, jsonb)'::regprocedure);
  d := replace(d, 'public.at_ia_debut(p_name text, p_sorte text, p_consigne text DEFAULT ''''::text, p_choix jsonb DEFAULT NULL::jsonb)',
                  'public.at_ia_debut(p_name text, p_sorte text, p_consigne text DEFAULT ''''::text, p_choix jsonb DEFAULT NULL::jsonb, p_fiche uuid DEFAULT NULL::uuid)');
  d := replace(d, old, 'f := pegase_int.at_fiche_de(n, p_fiche);');
  if position('p_fiche' in d) = 0 or position(old in d) > 0 then raise exception 'at_ia_debut'; end if;
  drop function public.at_ia_debut(text, text, text, jsonb); execute d;
  -- at_choisir_design
  d := pg_get_functiondef('public.at_choisir_design(text, uuid, integer)'::regprocedure);
  d := replace(d, old, 'select x.* into f from public.at_fiches x join public.at_messages m on m.fiche = x.id where m.id = p_msg and x.name = n and x.etat <> ''refusee'';');
  if position(old in d) > 0 then raise exception 'at_choisir_design'; end if;
  execute d;
end $$;
revoke all on function public.at_valider(text, boolean, uuid), public.at_envoyer(text, text, uuid), public.at_ia_debut(text, text, text, jsonb, uuid) from public, anon;
grant execute on function public.at_valider(text, boolean, uuid), public.at_envoyer(text, text, uuid), public.at_ia_debut(text, text, text, jsonb, uuid) to authenticated;

-- ===================================================================================================================================
-- LE JOUEUR TESTE ET PUBLIE SON JEU (borne 1.63.50, 2 nov. 2026 15 h 50, Benjamin) : dès que le jeu d'un projet existe (alpha) :
--  « ▶ Tester mon jeu » (la borne le lance), « Publier dans ma salle » (LE JOUEUR décide : publie_salle, sa salle), « Demander la mise en
--  ligne mondiale » (demande à l'admin : at_monde_decider l'accepte → publie_monde, ou la refuse, avec un message au joueur).
alter table public.at_fiches add column if not exists monde_demande_at timestamptz;
alter table public.at_fiches add column if not exists monde_reponse text;

create or replace function public.at_publier_salle(p_name text, p_fiche uuid, p_salle bigint)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; rn text;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  f := pegase_int.at_fiche_de(n, p_fiche);
  if f.id is null then raise exception 'projet inconnu'; end if;
  if f.jeu is null or f.etat not in ('alpha', 'publie_salle') then raise exception 'jeu pas pret'; end if;
  if not exists (select 1 from public.room_members r where r.room_id = p_salle and r.name = n) then raise exception 'pas membre de cette salle'; end if;
  select r.name into rn from public.rooms r where r.id = p_salle;
  update public.at_fiches x set etat = 'publie_salle', salle = p_salle, maj_at = now() where x.id = f.id;
  insert into public.at_messages (fiche, texte, de_atelier) values (f.id, '🌟 Ton jeu est publié dans ta salle « ' || coalesce(rn, '?') || ' » ! Tes copains le voient sur leur borne, avec son classement de la salle.', true);
  return jsonb_build_object('id', f.id, 'etat', 'publie_salle', 'salle', p_salle, 'salle_nom', rn);
end $$;

create or replace function public.at_demander_monde(p_name text, p_fiche uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier', 30, interval '1 hour');
  f := pegase_int.at_fiche_de(n, p_fiche);
  if f.id is null then raise exception 'projet inconnu'; end if;
  if f.jeu is null or f.etat not in ('alpha', 'publie_salle') then raise exception 'jeu pas pret'; end if;
  if f.monde_demande_at is not null then return jsonb_build_object('id', f.id, 'monde_demande_at', f.monde_demande_at); end if;
  update public.at_fiches x set monde_demande_at = now(), monde_reponse = null, maj_at = now() where x.id = f.id;
  insert into public.at_messages (fiche, texte) values (f.id, '🌍 Je demande la mise en ligne mondiale de mon jeu !');
  return jsonb_build_object('id', f.id, 'monde_demande_at', now());
end $$;

-- (admin) la décision de Benjamin : p_ok → publié pour tous (classement mondial) ; sinon refus ; p_message = le mot pour le joueur
create or replace function public.at_monde_decider(p_fiche uuid, p_ok boolean, p_message text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare f public.at_fiches;
begin
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null then raise exception 'fiche inconnue'; end if;
  if f.monde_demande_at is null then raise exception 'pas de demande'; end if;
  update public.at_fiches x set etat = case when p_ok then 'publie_monde' else x.etat end, monde_demande_at = null,
    monde_reponse = case when p_ok then 'ok' else 'non' end, decision_at = now(), maj_at = now() where x.id = f.id;
  insert into public.at_messages (fiche, texte, de_atelier) values (f.id, coalesce(nullif(btrim(p_message), ''),
    case when p_ok then '🌍 Bonne nouvelle : Benjamin a mis ton jeu en ligne pour TOUT LE MONDE, avec le classement mondial !'
         else 'Benjamin préfère garder ton jeu dans ta salle pour l’instant. Continue à l’améliorer, tu pourras redemander plus tard !' end), true);
  return jsonb_build_object('id', f.id, 'ok', p_ok);
end $$;
create or replace view public.at_monde_attente with (security_invoker = true) as
  select f.id as fiche, f.name as joueur, f.titre, f.jeu, f.etat, f.monde_demande_at from public.at_fiches f where f.monde_demande_at is not null order by f.monde_demande_at;
revoke all on public.at_monde_attente from anon, authenticated;

revoke all on function public.at_publier_salle(text, uuid, bigint), public.at_demander_monde(text, uuid) from public, anon;
grant execute on function public.at_publier_salle(text, uuid, bigint), public.at_demander_monde(text, uuid) to authenticated;
revoke all on function public.at_monde_decider(uuid, boolean, text) from public, anon, authenticated;

-- at_lire : la fiche dit si une demande mondiale est en cours ; at_suivi : les demandes mondiales en attente
do $$
declare d text;
begin
  d := pg_get_functiondef('public.at_lire(text, uuid)'::regprocedure);
  if position('monde_demande_at' in d) = 0 then
    d := replace(d, '''jeu'', f.jeu, ''design'', f.design,', '''jeu'', f.jeu, ''salle'', f.salle, ''monde_demande_at'', f.monde_demande_at, ''monde_reponse'', f.monde_reponse, ''design'', f.design,');
    if position('monde_demande_at' in d) = 0 then raise exception 'at_lire'; end if;
    execute d;
  end if;
  d := pg_get_functiondef('public.at_suivi(text)'::regprocedure);
  if position('at_monde_attente' in d) = 0 then
    d := replace(d, '''demandes'', coalesce((select jsonb_agg(to_jsonb(d)) from public.at_credits_attente d), ''[]''::jsonb));',
                    '''demandes'', coalesce((select jsonb_agg(to_jsonb(d)) from public.at_credits_attente d), ''[]''::jsonb), ''mondes'', coalesce((select jsonb_agg(to_jsonb(w)) from public.at_monde_attente w), ''[]''::jsonb));');
    if position('at_monde_attente' in d) = 0 then raise exception 'at_suivi'; end if;
    execute d;
  end if;
end $$;

-- ===================================================================================================================================
-- UN PRIX FERME, PAYÉ UNE FOIS (borne 1.63.54, 2 nov. 2026 16 h 20, Benjamin) : le joueur ne voit plus ni planches ni détail de coûts.
-- Quand la fiche est prête, l'Atelier fixe UN prix pour tout le jeu (at_prix : prix ferme en crédits, 1 crédit = 1 centime, calculé large ;
-- le détail interne n'est visible que de l'admin) ; à l'envoi (at_envoyer) le prix est DÉBITÉ une fois et le projet est SCELLÉ (sections
-- figées) ; l'équipe fait ensuite tout le travail. Le joueur peut encore écrire (demande de modification = nouveau devis de l'Atelier).
alter table public.at_fiches add column if not exists prix int;
alter table public.at_fiches add column if not exists prix_detail jsonb;
alter table public.at_fiches add column if not exists prix_at timestamptz;
alter table public.at_fiches add column if not exists paye int;

-- (admin) le prix ferme du projet ; p_detail = le calcul interne (images, sons, construction, marge) ; p_message = le mot au joueur
create or replace function public.at_prix(p_fiche uuid, p_prix int, p_detail jsonb default null, p_message text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare f public.at_fiches;
begin
  if p_prix is null or p_prix < 1 or p_prix > 100000 then raise exception 'prix entre 1 et 100000'; end if;
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null then raise exception 'fiche inconnue'; end if;
  if f.paye is not null then raise exception 'deja paye'; end if;
  update public.at_fiches x set prix = p_prix, prix_detail = p_detail, prix_at = now(), maj_at = now(),
    etat = case when x.etat in ('brouillon', 'en_discussion') and pegase_int.at_pleine(x.fiche) then 'complete' else x.etat end where x.id = f.id;
  insert into public.at_messages (fiche, texte, de_atelier) values (f.id, coalesce(nullif(btrim(p_message), ''),
    '🎁 Ton jeu est prêt à être créé ! Prix pour TOUT ton jeu (images, sons, construction) : ' || p_prix || ' crédits, une seule fois. Si tout te plaît, touche « Envoyer mon projet ».'), true);
  return jsonb_build_object('id', f.id, 'prix', p_prix);
end $$;
revoke all on function public.at_prix(uuid, int, jsonb, text) from public, anon, authenticated;

-- at_envoyer : le prix fixé doit exister ; il est débité UNE fois ; le projet est scellé (« envoyee »)
create or replace function public.at_envoyer(p_name text, p_accord text, p_fiche uuid default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; a text := btrim(coalesce(p_accord, '')); s int;
begin
  perform public.acct_check(n);
  if length(a) < 40 then raise exception 'accord requis'; end if;
  f := pegase_int.at_fiche_de(n, p_fiche);
  if f.id is null then raise exception 'aucun projet'; end if;
  if f.etat = 'envoyee' or f.paye is not null then return jsonb_build_object('id', f.id, 'etat', f.etat, 'envoyee_at', f.envoyee_at, 'accord_at', f.accord_at, 'paye', f.paye); end if;
  if f.etat not in ('en_discussion', 'complete', 'design', 'design_choisi') or not pegase_int.at_pleine(f.fiche) then raise exception 'fiche pas complete'; end if;
  if f.prix is null then raise exception 'prix pas fixe'; end if;
  s := pegase_int.at_debiter(n, f.prix);
  insert into public.at_messages (fiche, texte) values (f.id, '📮 J’ai envoyé mon projet ! (' || f.prix || ' crédits)');
  update public.at_fiches x set etat = 'envoyee', envoyee_at = now(), maj_at = now(), accord_at = now(), accord_texte = left(a, 1000), paye = f.prix
    where x.id = f.id returning * into f;
  return jsonb_build_object('id', f.id, 'etat', f.etat, 'envoyee_at', f.envoyee_at, 'accord_at', f.accord_at, 'paye', f.paye, 'solde', s);
end $$;
revoke all on function public.at_envoyer(text, text, uuid) from public, anon;
grant execute on function public.at_envoyer(text, text, uuid) to authenticated;

do $$
declare d text;
begin
  -- at_lire : le prix et ce qui a été payé (jamais le détail interne)
  d := pg_get_functiondef('public.at_lire(text, uuid)'::regprocedure);
  if position('''prix''' in d) = 0 then
    d := replace(d, '''jeu'', f.jeu, ''salle'', f.salle,', '''jeu'', f.jeu, ''prix'', f.prix, ''paye'', f.paye, ''salle'', f.salle,');
    if position('''prix''' in d) = 0 then raise exception 'at_lire'; end if;
    execute d;
  end if;
  -- at_dire : après l'envoi, le joueur peut encore écrire (une demande de modification = un nouveau devis)
  d := pg_get_functiondef('public.at_dire(text, text, boolean, boolean, uuid, boolean)'::regprocedure);
  if position('projet deja envoye' in d) > 0 then
    d := replace(d, '  if f.id is not null and f.etat = ''envoyee'' then raise exception ''projet deja envoye''; end if;' || chr(10), '');
    d := replace(d, '  if f.id is not null and not pegase_int.at_parle(f.etat) then raise exception ''choix en cours''; end if;',
                    '  if f.id is not null and not pegase_int.at_parle(f.etat) and f.etat <> ''envoyee'' then raise exception ''choix en cours''; end if;');
    if position('projet deja envoye' in d) > 0 then raise exception 'at_dire'; end if;
    execute d;
  end if;
  -- at_suivi : les projets avec leur prix, ce qui a été payé et le détail interne (admin seulement)
  d := pg_get_functiondef('public.at_suivi(text)'::regprocedure);
  if position('prix_detail' in d) = 0 then
    d := replace(d, '''mondes'', coalesce(', '''projets'', coalesce((select jsonb_agg(jsonb_build_object(''joueur'', x.name, ''titre'', x.titre, ''etat'', x.etat, ''prix'', x.prix, ''paye'', x.paye, ''detail'', x.prix_detail, ''maj_at'', x.maj_at) order by x.maj_at desc) from public.at_fiches x where x.prix is not null or x.etat not in (''brouillon'', ''en_discussion'', ''refusee'')), ''[]''::jsonb), ''mondes'', coalesce(');
    if position('prix_detail' in d) = 0 then raise exception 'at_suivi'; end if;
    execute d;
  end if;
end $$;

-- 2 nov. 2026 16 h 05 : les messages automatiques de at_monde_decider disent « notre équipe » (plus « Benjamin ») — appliqué par remplacement du texte de la fonction.

-- ===================================================================================================================================
-- LA FILE DE L'ÉQUIPE (borne 1.63.56, 2 nov. 2026, Benjamin 16 h 10 → 16 h 20) : après l'envoi, c'est l'ÉQUIPE qui fait les images (Gemini /
-- Imagen) et les sons / musiques (ElevenLabs). Rien n'est ouvert aux joueurs : seule l'équipe (rôle serveur, en SQL) remplit at_gen_file ;
-- une tâche planifiée (pg_cron, chaque minute s'il y a du travail) appelle la fonction Edge atelier-image avec un SECRET tiré au hasard et
-- gardé dans le coffre (vault « atelier_file », jamais affiché) ; la fonction vérifie ce secret auprès de la base (at_gen_cle_ok, clé de
-- service) avant de prendre le travail (at_gen_prendre) et de rendre le résultat (at_gen_fin). Tout est compté dans le journal des euros
-- (at_ia, colonne cents) et soumis au plafond et au budget du mois.
insert into public.at_reglages (k, v) values ('cout_son_centimes', 10), ('cout_musique_centimes', 50) on conflict (k) do nothing;
alter table public.at_ia add column if not exists cents int;
alter table public.at_ia drop constraint if exists at_ia_sorte_check;
alter table public.at_ia add constraint at_ia_sorte_check check (sorte in ('planche', 'dessin', 'assets', 'equipe-image', 'equipe-son', 'equipe-musique'));
-- le coût du mois : centimes réels de chaque ligne (images à cout_image_centimes par défaut)
create or replace function pegase_int.at_ia_centimes() returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(coalesce(a.cents, (case when a.fin_at is null then a.nb else coalesce(a.ok, 0) end) * coalesce(pegase_int.at_reglage('cout_image_centimes'), 4))), 0)::int
  from public.at_ia a where a.at >= pegase_int.at_debut_mois() $$;
create or replace view public.at_ia_journal with (security_invoker = true) as
  select a.at, a.name as joueur, coalesce(f.titre, a.projet) as projet, a.sorte, a.nb as images_demandees, coalesce(a.ok, 0) as images_reussies,
    coalesce(jsonb_array_length(a.choix -> 'elements'), 0) as elements, a.cout as credits,
    round(coalesce(a.cents, coalesce(case when a.fin_at is null then a.nb else a.ok end, 0) * coalesce(pegase_int.at_reglage('cout_image_centimes'), 4)) / 100.0, 2) as euros_estimes,
    case when a.fin_at is null then 'en cours' when coalesce(a.ok, 0) > 0 then 'OK' else 'erreur' || case when a.cout > 0 then ' (crédits rendus)' else '' end end as statut, a.erreur, a.modele
  from public.at_ia a left join public.at_fiches f on f.id = a.fiche order by a.at desc;
revoke all on public.at_ia_journal from anon, authenticated;

create table if not exists public.at_gen_file (
  id uuid primary key default gen_random_uuid(), fiche uuid references public.at_fiches (id) on delete set null,
  sorte text not null check (sorte in ('image', 'son', 'musique')), titre text not null default '',
  prompt text not null, elements jsonb, ratio text, modele text, duree numeric,
  etat text not null default 'attente' check (etat in ('attente', 'en_cours', 'fait', 'erreur')), essais int not null default 0,
  resultat jsonb, erreur text, cents int, at timestamptz not null default now(), debut_at timestamptz, fin_at timestamptz);
create index if not exists at_gen_file_attente on public.at_gen_file (etat, at);
alter table public.at_gen_file enable row level security;
revoke all on public.at_gen_file from anon, authenticated;

-- le secret de la file (tiré au hasard, gardé dans le coffre, jamais affiché)
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'atelier_file') then perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'atelier_file', 'clé de la file de l''Atelier (pg_cron → atelier-image)'); end if;
end $$;
create or replace function public.at_gen_cle_ok(p_cle text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_cle, '') <> '' and p_cle = (select decrypted_secret from vault.decrypted_secrets where name = 'atelier_file') $$;

-- la consigne d'une planche d'éléments pour l'équipe (même recette que at_ia_debut : sprite sheet de jeu, fond uni, N objets isolés)
create or replace function pegase_int.at_prompt_planche(f public.at_fiches, el text[]) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare fi jsonb := f.fiche; ne int := coalesce(array_length(el, 1), 0); cols int; rws int; sty text; fond text; vue text; ch jsonb;
begin
  cols := case when ne <= 1 then 1 when ne <= 4 then 2 else 3 end; rws := greatest(1, ceil(ne::numeric / cols)::int);
  ch := (select pegase_int.at_choix_ok(a.choix) from public.at_ia a where a.fiche = f.id and a.sorte = 'planche' and a.choix is not null order by a.at desc limit 1);
  sty := coalesce(ch ->> 'style' || ', ' || (ch ->> 'couleurs'), nullif(fi ->> 'style', ''), 'dessin animé coloré');
  fond := case when lower(coalesce(sty, '') || ' ' || coalesce(f.titre, '') || ' ' || coalesce(fi ->> 'monde', '')) ~ '(n[ée]on|nuit|espace|spatial|night|space)'
               then 'pure black #000000' else 'pure magenta #FF00FF (do not use magenta in the objects)' end;
  vue := case when lower(coalesce(fi ->> 'dimension', '')) ~ 'dessus|top' then 'top-down view' when lower(coalesce(fi ->> 'dimension', '')) ~ '3d' then '3D-rendered look, three-quarter view' else 'side view' end;
  if ne = 1 then
    return jsonb_build_object('ratio', '16:9', 'prompt', 'Polished 2D video game art for a kids arcade game (' || coalesce(nullif(f.titre, ''), coalesce(fi ->> 'idee', '')) || '). Art style: ' || sty || ', ' || vue ||
      ', vibrant colors, clean outlines, game-ready. It shows: ' || el[1] || '. Full image, well composed, landscape 16:9. No logos, no brands, no existing copyrighted characters, no text unless it is a title (then only the title, clearly readable).');
  end if;
  return jsonb_build_object('ratio', case when cols = 3 and rws = 2 then '3:2' when cols = 3 and rws = 1 then '21:9' when cols = 2 and rws = 1 then '16:9' else '1:1' end,
    'prompt', '2D video game sprite sheet for a kids arcade game (' || coalesce(nullif(f.titre, ''), coalesce(fi ->> 'idee', 'mon jeu')) || '). ' ||
      'Polished, game-ready assets in one consistent art style: clean outlines, cel shading, soft shadows, vibrant colors. Art style: ' || sty || ', ' || vue || '. ' ||
      'Exactly ' || ne || ' separate objects, each one complete and isolated, evenly spaced in ' || rws || ' row' || case when rws > 1 then 's' else '' end || ' of ' || cols ||
      ', with plenty of empty space around each object. NO frames, NO boxes, NO borders, NO grid lines, NO text, NO numbers, NO labels. ' ||
      'Plain flat uniform background color: ' || fond || ', everywhere, no gradient, no ground, no cast shadow on the background. ' ||
      'The objects, in reading order (left to right, then top to bottom): ' || (select string_agg(i || '. ' || el[i], ' ; ' order by i) from generate_series(1, ne) i) || '. ' ||
      'Same scale and same style for all. No logos, no brands, no existing copyrighted characters.');
end $$;

-- réveiller la fonction tout de suite (sinon la tâche planifiée passe dans la minute)
create or replace function pegase_int.at_gen_reveil() returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(url := 'https://wplictorvvtkfikpfdnl.supabase.co/functions/v1/atelier-image',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbGljdG9ydnZ0a2Zpa3BmZG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3Mjg0NzEsImV4cCI6MjEwNzMwNDQ3MX0.A3QCbA1Mti3tL7fMZwgYrqcgRTvOjlTpIKIL2ALm3kM',
      'x-atelier-file', (select decrypted_secret from vault.decrypted_secrets where name = 'atelier_file')),
    body := '{"file":true}'::jsonb, timeout_milliseconds := 1000);
end $$;

-- ===== ce que l'ÉQUIPE demande (SQL, rôle serveur seulement) =====
-- une planche d'éléments (2 à 9) ou une grande image (1 élément) pour un projet ; p_modele : null = Gemini, 'imagen' = Imagen 4
create or replace function public.at_gen_image(p_fiche uuid, p_titre text, p_elements text[], p_modele text default null)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare f public.at_fiches; pr jsonb; u uuid; why text;
begin
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null then raise exception 'fiche inconnue'; end if;
  if coalesce(array_length(p_elements, 1), 0) < 1 or array_length(p_elements, 1) > 9 then raise exception 'de 1 a 9 elements'; end if;
  why := pegase_int.at_filtre(array_to_string(p_elements, ' ') || ' ' || coalesce(p_titre, '')); if why <> '' then raise exception 'filtre %', why; end if;
  pr := pegase_int.at_prompt_planche(f, p_elements);
  insert into public.at_gen_file (fiche, sorte, titre, prompt, elements, ratio, modele)
    values (f.id, 'image', left(coalesce(p_titre, ''), 80), pr ->> 'prompt', to_jsonb(p_elements), pr ->> 'ratio', case when p_modele = 'imagen' then 'imagen-4.0-generate-001' end) returning id into u;
  perform pegase_int.at_gen_reveil();
  return u;
end $$;
-- un bruitage (ElevenLabs sound effects, 0,5 à 22 s) ou une musique (ElevenLabs music, 10 à 180 s) ; p_description en anglais de préférence
create or replace function public.at_gen_son(p_fiche uuid, p_titre text, p_description text, p_duree numeric default 2, p_musique boolean default false)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare f public.at_fiches; u uuid; why text; d numeric;
begin
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null then raise exception 'fiche inconnue'; end if;
  if length(btrim(coalesce(p_description, ''))) < 3 then raise exception 'description vide'; end if;
  why := pegase_int.at_filtre(p_description || ' ' || coalesce(p_titre, '')); if why <> '' then raise exception 'filtre %', why; end if;
  d := case when p_musique then least(180, greatest(10, coalesce(p_duree, 30))) else least(22, greatest(0.5, coalesce(p_duree, 2))) end;
  insert into public.at_gen_file (fiche, sorte, titre, prompt, duree)
    values (f.id, case when p_musique then 'musique' else 'son' end, left(coalesce(p_titre, ''), 80), left(btrim(p_description), 1000), d) returning id into u;
  perform pegase_int.at_gen_reveil();
  return u;
end $$;
-- refaire un travail (raté, ou image pas assez belle) : une nouvelle demande identique
create or replace function public.at_gen_refaire(p_id uuid, p_prompt text default null)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare g public.at_gen_file; u uuid;
begin
  select * into g from public.at_gen_file x where x.id = p_id; if g.id is null then raise exception 'travail inconnu'; end if;
  insert into public.at_gen_file (fiche, sorte, titre, prompt, elements, ratio, modele, duree)
    values (g.fiche, g.sorte, g.titre, coalesce(nullif(btrim(p_prompt), ''), g.prompt), g.elements, g.ratio, g.modele, g.duree) returning id into u;
  perform pegase_int.at_gen_reveil();
  return u;
end $$;

-- ===== côté fonction Edge (clé de service) =====
create or replace function public.at_gen_prendre() returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.at_gen_file; c int;
begin
  -- un travail resté « en cours » plus de 10 minutes repart (3 essais au plus)
  update public.at_gen_file x set etat = case when x.essais >= 3 then 'erreur' else 'attente' end, erreur = case when x.essais >= 3 then 'trop d essais' else x.erreur end
    where x.etat = 'en_cours' and x.debut_at < now() - interval '10 minutes';
  select * into g from public.at_gen_file x where x.etat = 'attente' order by x.at limit 1 for update skip locked;
  if g.id is null then return null; end if;
  c := case g.sorte when 'image' then coalesce(pegase_int.at_reglage('cout_image_centimes'), 4) when 'son' then coalesce(pegase_int.at_reglage('cout_son_centimes'), 10)
       else coalesce(pegase_int.at_reglage('cout_musique_centimes'), 50) end;
  perform pg_advisory_xact_lock(hashtext('atelier-ia-plafond'));
  if pegase_int.at_ia_centimes() + c > coalesce(pegase_int.at_reglage('budget_euros_mois'), 0) * 100
     or (g.sorte = 'image' and pegase_int.at_ia_utilisees() + 1 > coalesce(pegase_int.at_reglage('plafond_images_mois'), 0)) then
    update public.at_gen_file x set etat = 'erreur', erreur = 'budget ou plafond du mois atteint', fin_at = now() where x.id = g.id;
    return jsonb_build_object('pause', true);
  end if;
  update public.at_gen_file x set etat = 'en_cours', essais = x.essais + 1, debut_at = now(), cents = c where x.id = g.id returning * into g;
  return jsonb_build_object('id', g.id, 'sorte', g.sorte, 'prompt', g.prompt, 'ratio', g.ratio, 'modele', g.modele, 'duree', g.duree);
end $$;
-- le résultat : p_path (i/<uuid>.<ext> pour une image, s/<uuid>.mp3 pour un son) ; tout entre dans le journal des euros ;
-- une image réussie range ses éléments dans fiche.assets (découpage par détection à l'affichage et à la construction)
create or replace function public.at_gen_fin(p_id uuid, p_path text, p_modele text default null, p_erreur text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.at_gen_file; f public.at_fiches; ok boolean := p_path is not null; ne int;
begin
  select * into g from public.at_gen_file x where x.id = p_id; if g.id is null then raise exception 'travail inconnu'; end if;
  if g.etat <> 'en_cours' then raise exception 'pas en cours'; end if;
  if ok and p_path !~ '^(i/[0-9a-f-]{36}[.](png|jpg|webp)|s/[0-9a-f-]{36}[.]mp3)$' then raise exception 'chemin refuse'; end if;
  update public.at_gen_file x set etat = case when ok then 'fait' else 'erreur' end, fin_at = now(), erreur = left(p_erreur, 300),
    resultat = case when ok then jsonb_build_object('path', p_path) else null end where x.id = g.id;
  select * into f from public.at_fiches x where x.id = g.fiche;
  insert into public.at_ia (fiche, name, sorte, consigne, nb, cout, at, fin_at, ok, erreur, modele, projet, cents, choix)
    values (g.fiche, coalesce(f.name, 'EQUIPE'), 'equipe-' || g.sorte, left(g.titre, 200), 1, 0, g.debut_at, now(), case when ok then 1 else 0 end, left(p_erreur, 200), left(p_modele, 80), f.titre,
            case when ok then g.cents else 0 end, case when g.elements is not null then jsonb_build_object('elements', g.elements) end);
  if ok and f.id is not null then
    ne := coalesce(jsonb_array_length(g.elements), 0);
    update public.at_fiches x set maj_at = now(), assets = coalesce(x.assets, '[]'::jsonb) || case
      when g.sorte = 'image' and ne > 1 then (select coalesce(jsonb_agg(jsonb_build_object('nom', e.v, 'sorte', 'élément', 'source', 'dessiné par l’équipe', 'licence', 'à nous', 'image', p_path,
          'case', e.o::int, 'grille', jsonb_build_array(case when ne <= 4 then 2 else 3 end, ceil(ne::numeric / case when ne <= 4 then 2 else 3 end)::int)) order by e.o), '[]'::jsonb)
          from jsonb_array_elements_text(g.elements) with ordinality as e(v, o))
      when g.sorte = 'image' then jsonb_build_array(jsonb_build_object('nom', coalesce(nullif(g.titre, ''), g.elements ->> 0), 'sorte', 'grande image', 'source', 'dessiné par l’équipe', 'licence', 'à nous', 'image', p_path))
      else jsonb_build_array(jsonb_build_object('nom', coalesce(nullif(g.titre, ''), g.sorte), 'sorte', g.sorte, 'source', 'ElevenLabs (équipe)', 'licence', 'à nous', 'son', p_path)) end
    where x.id = f.id and length(coalesce(x.assets, '[]'::jsonb)::text) < 18000;
  end if;
  return jsonb_build_object('id', g.id, 'ok', ok);
end $$;

revoke all on function public.at_gen_cle_ok(text), public.at_gen_prendre(), public.at_gen_fin(uuid, text, text, text),
  public.at_gen_image(uuid, text, text[], text), public.at_gen_son(uuid, text, text, numeric, boolean), public.at_gen_refaire(uuid, text),
  pegase_int.at_prompt_planche(public.at_fiches, text[]), pegase_int.at_gen_reveil() from public, anon, authenticated;
grant execute on function public.at_gen_cle_ok(text), public.at_gen_prendre(), public.at_gen_fin(uuid, text, text, text) to service_role;

-- le seau accepte aussi les sons (mp3) déposés par la fonction Edge
update storage.buckets set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg'] where id = 'atelier-ia';

-- la tâche planifiée : chaque minute, s'il y a du travail en attente (ou bloqué), réveiller la fonction
select cron.unschedule(jobid) from cron.job where jobname = 'atelier-file';
select cron.schedule('atelier-file', '* * * * *', $cron$
  select pegase_int.at_gen_reveil() where exists (select 1 from public.at_gen_file where etat = 'attente' or (etat = 'en_cours' and debut_at < now() - interval '10 minutes'))
$cron$);
-- suivi : la file dans le compteur de l'admin
create or replace view public.at_gen_suivi with (security_invoker = true) as
  select g.at, g.sorte, g.titre, f.titre as projet, g.etat, g.essais, g.erreur, g.resultat ->> 'path' as fichier, round(coalesce(g.cents, 0) / 100.0, 2) as euros
  from public.at_gen_file g left join public.at_fiches f on f.id = g.fiche order by g.at desc;
revoke all on public.at_gen_suivi from anon, authenticated;
-- le plafond d'IMAGES ne compte pas les sons et musiques (ils comptent seulement dans le budget en euros)
create or replace function pegase_int.at_ia_utilisees() returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when a.fin_at is null then a.nb else coalesce(a.ok, 0) end), 0)::int from public.at_ia a
  where a.at >= (date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris') and a.sorte not in ('equipe-son', 'equipe-musique') $$;

-- (v15c) at_gen_suivi : + id (pour at_gen_refaire), fiche et url publique du fichier
create or replace view public.at_gen_suivi with (security_invoker = true) as
  select g.at, g.sorte, g.titre, f.titre as projet, g.etat, g.essais, g.erreur, g.resultat ->> 'path' as fichier, round(coalesce(g.cents, 0) / 100.0, 2) as euros,
    g.id, g.fiche, case when g.resultat ->> 'path' is not null then 'https://wplictorvvtkfikpfdnl.supabase.co/storage/v1/object/public/atelier-ia/' || (g.resultat ->> 'path') end as url
  from public.at_gen_file g left join public.at_fiches f on f.id = g.fiche order by g.at desc;
revoke all on public.at_gen_suivi from anon, authenticated;

-- ===================================================================================================================================
-- LE COÛT RÉEL D'UN PROJET (2 nov. 2026 16 h 45, Benjamin : « on mesure d'abord le coût réel total sur La Maison des Licornes — images
-- Gemini + sons/musique ElevenLabs + temps de construction — puis je déciderai du prix ») : chaque génération de la file de l'équipe est
-- déjà au journal at_ia, rattachée à la fiche ; le TEMPS de l'équipe se note à la main (at_temps_noter, minutes + ce qui a été fait) ;
-- at_cout_projets fait le total par projet. Rien n'est débité au joueur tant que l'admin n'a pas fixé de prix (at_prix).
create table if not exists public.at_temps (
  id bigint generated always as identity primary key,
  fiche uuid references public.at_fiches(id) on delete set null,
  projet text, minutes int not null check (minutes between 1 and 1440), note text, at timestamptz not null default now());
alter table public.at_temps enable row level security;
revoke all on public.at_temps from anon, authenticated;

create or replace function public.at_temps_noter(p_fiche uuid, p_minutes int, p_note text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare f public.at_fiches; u bigint;
begin
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null then raise exception 'fiche inconnue'; end if;
  insert into public.at_temps (fiche, projet, minutes, note) values (f.id, f.titre, p_minutes, left(p_note, 300)) returning id into u;
  return u;
end $$;
revoke all on function public.at_temps_noter(uuid, int, text) from public, anon, authenticated;

create or replace view public.at_cout_projets with (security_invoker = true) as
  select f.id as fiche, f.titre as projet, f.name as joueur, f.etat, f.prix, f.paye,
    coalesce(i.images, 0) as images, coalesce(i.sons, 0) as sons, coalesce(i.musiques, 0) as musiques, coalesce(i.ratees, 0) as ratees,
    round(coalesce(i.cents, 0) / 100.0, 2) as euros_generation, coalesce(t.minutes, 0) as minutes_equipe
  from public.at_fiches f
  left join (select a.fiche, sum(a.ok) filter (where a.sorte not in ('equipe-son', 'equipe-musique')) as images,
                    sum(a.ok) filter (where a.sorte = 'equipe-son') as sons, sum(a.ok) filter (where a.sorte = 'equipe-musique') as musiques,
                    count(*) filter (where coalesce(a.ok, 0) = 0) as ratees,
                    sum(coalesce(a.cents, coalesce(a.ok, 0) * coalesce(pegase_int.at_reglage('cout_image_centimes'), 4))) as cents
             from public.at_ia a group by a.fiche) i on i.fiche = f.id
  left join (select x.fiche, sum(x.minutes) as minutes from public.at_temps x group by x.fiche) t on t.fiche = f.id
  where i.fiche is not null or t.fiche is not null or f.etat = 'envoyee';
revoke all on public.at_cout_projets from anon, authenticated;

-- ===================================================================================================================================
-- PARCOURS « HYPER SIMPLE » (borne 1.63.58, 2 nov. 2026 16 h 25, Benjamin) — remplace la lettre, le prix ferme et les planches visibles :
-- 1. le joueur décrit son jeu UNE fois (at_dire) ; l'équipe remplit TOUTE la fiche d'un coup (at_fiche_maj : idee, personnages, objets,
--    decor, sons + titre) et le DESIGN se dessine tout seul la première fois (une image de style, file de l'équipe at_gen_file, role 'design') ;
-- 2. le joueur passe étape par étape (L'idée · Personnages · Objets · Décor · Sons · Le design), ajoute / enlève (at_fiche_etape, gratuit),
--    refait ou modifie le design (at_design_refaire, cout_design crédits, rendus si le dessin rate) ;
-- 3. « 🚀 Lancer la conception » (at_lancer, cout_conception crédits — 0 pendant l'essai) : projet scellé (« envoyee »), écran
--    « Conception en cours… » jusqu'à at_etat(fiche, 'alpha', null, '<jeu>') : la cloche prévient, « ▶ Tester mon jeu » apparaît.
insert into public.at_reglages (k, v) values ('cout_design', 10), ('cout_conception', 0) on conflict (k) do nothing;
alter table public.at_gen_file add column if not exists role text;
alter table public.at_gen_file add column if not exists paye_par text;
alter table public.at_gen_file add column if not exists credits int;

-- le texte d'une valeur de la fiche (texte, liste, objet { nom, … }) : « a, b, c »
create or replace function pegase_int.at_txt(v jsonb) returns text language plpgsql immutable as $$
begin
  return case jsonb_typeof(v) when 'string' then v #>> '{}' when 'array' then (select string_agg(pegase_int.at_txt(e), ', ') from jsonb_array_elements(v) e)
    when 'object' then coalesce(v ->> 'nom', (select string_agg(pegase_int.at_txt(e), ', ') from jsonb_each(v) x(k, e))) when 'null' then null else v #>> '{}' end;
end $$;
-- la consigne du DESIGN : une seule image de style du jeu (héros dans son monde), d'après la fiche, + ce que le joueur veut changer
create or replace function pegase_int.at_prompt_design(f public.at_fiches, chg text) returns text language sql stable security definer set search_path = public as $$
  select 'Key art for a kids video game called "' || coalesce(nullif(f.titre, ''), 'my game') || '". The game: ' || left(coalesce(pegase_int.at_txt(f.fiche -> 'idee'), ''), 500) || '. '
    || coalesce('Characters: ' || nullif(pegase_int.at_txt(f.fiche -> 'personnages'), '') || '. ', '')
    || coalesce('World and setting: ' || nullif(pegase_int.at_txt(f.fiche -> 'decor'), '') || '. ', '')
    || coalesce('Objects: ' || nullif(pegase_int.at_txt(f.fiche -> 'objets'), '') || '. ', '')
    || 'One single polished image that shows the art style of the game: the main character(s) in the game world, like a real modern 2D video game '
    || '(clean outlines, cel shading, soft lighting, vibrant colors, game-ready look), landscape 16:9, well composed. '
    || coalesce('Requested change: ' || nullif(btrim(chg), '') || '. ', '')
    || 'No logos, no brands, no existing copyrighted characters, no text except the game title if any.'
$$;
-- (interne) met un design dans la file ; paye_par/credits = le joueur qui a payé (rendus si le dessin rate)
create or replace function pegase_int.at_design_file(f public.at_fiches, chg text, qui text, c int) returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  insert into public.at_gen_file (fiche, sorte, titre, prompt, ratio, role, paye_par, credits)
    values (f.id, 'image', left('Design' || coalesce(' : ' || nullif(btrim(chg), ''), ''), 80), pegase_int.at_prompt_design(f, chg), '16:9', 'design', qui, nullif(c, 0)) returning id into u;
  perform pegase_int.at_gen_reveil();
  return u;
end $$;
revoke all on function pegase_int.at_design_file(public.at_fiches, text, text, int) from public, anon, authenticated;
create or replace function pegase_int.at_design_en_cours(p uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.at_gen_file g where g.fiche = p and g.role = 'design' and g.etat in ('attente', 'en_cours'))
$$;

-- (admin) at_fiche_maj : la fiche remplie d'un coup → le premier design part tout seul (une fois)
create or replace function public.at_fiche_maj(p_fiche uuid, p_maj jsonb, p_titre text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r public.at_fiches;
begin
  if p_maj is not null and jsonb_typeof(p_maj) <> 'object' then raise exception 'p_maj doit etre un objet'; end if;
  update public.at_fiches x set fiche = jsonb_strip_nulls(x.fiche || coalesce(p_maj, '{}'::jsonb)),
    titre = coalesce(left(btrim(p_titre), 60), x.titre), maj_at = now() where x.id = p_fiche returning * into r;
  if r.id is null then raise exception 'fiche inconnue'; end if;
  if r.design is null and coalesce(pegase_int.at_txt(r.fiche -> 'idee'), '') <> '' and coalesce(pegase_int.at_txt(r.fiche -> 'personnages'), pegase_int.at_txt(r.fiche -> 'decor'), '') <> ''
     and r.etat in ('brouillon', 'en_discussion', 'complete') and not exists (select 1 from public.at_gen_file g where g.fiche = r.id and g.role = 'design') then
    perform pegase_int.at_design_file(r, null, null, 0);
  end if;
  return jsonb_build_object('id', r.id, 'titre', r.titre, 'etat', r.etat, 'fiche', r.fiche, 'design_en_cours', pegase_int.at_design_en_cours(r.id));
end $$;
revoke all on function public.at_fiche_maj(uuid, jsonb, text) from public, anon, authenticated;

-- (admin) refaire le design gratuitement, avec ou sans changement
create or replace function public.at_gen_design(p_fiche uuid, p_changement text default null) returns uuid language plpgsql security definer set search_path = public as $$
declare f public.at_fiches;
begin
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null then raise exception 'fiche inconnue'; end if;
  return pegase_int.at_design_file(f, p_changement, null, 0);
end $$;
revoke all on function public.at_gen_design(uuid, text) from public, anon, authenticated;

-- (joueur) refaire / modifier son design : cout_design crédits, un seul à la fois, rendus si le dessin rate
create or replace function public.at_design_refaire(p_name text, p_fiche uuid, p_changement text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; c int := coalesce(pegase_int.at_reglage('cout_design'), 10); s int; why text; t text := left(btrim(coalesce(p_changement, '')), 300); u uuid;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-design', 12, interval '1 hour');
  f := pegase_int.at_fiche_de(n, p_fiche); if f.id is null then raise exception 'projet inconnu'; end if;
  if f.etat not in ('brouillon', 'en_discussion', 'complete') or f.paye is not null then raise exception 'projet lance'; end if;
  if coalesce(pegase_int.at_txt(f.fiche -> 'idee'), '') = '' then raise exception 'fiche vide'; end if;
  if coalesce(pegase_int.at_reglage('ia_admins_seulement'), 0) = 1 and not exists (select 1 from public.at_admins a where a.name = n) then raise exception 'plafond global'; end if;
  if pegase_int.at_design_en_cours(f.id) then raise exception 'design en cours'; end if;
  if t <> '' then why := pegase_int.at_filtre(t); if why <> '' then raise exception 'filtre %', why; end if; end if;
  s := pegase_int.at_debiter(n, c);
  u := pegase_int.at_design_file(f, t, n, c);
  return jsonb_build_object('id', u, 'solde', s, 'design_en_cours', true);
end $$;
revoke all on function public.at_design_refaire(text, uuid, text) from public, anon;
grant execute on function public.at_design_refaire(text, uuid, text) to authenticated;

-- (joueur) une étape de la fiche : l'idée (texte), le titre, ou une liste (personnages, objets, decor, sons) — gratuit
create or replace function public.at_fiche_etape(p_name text, p_fiche uuid, p_cle text, p_valeur jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; v jsonb; why text; e text;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-fiche', 300, interval '1 hour');
  if p_cle not in ('idee', 'titre', 'personnages', 'objets', 'decor', 'sons') then raise exception 'section inconnue'; end if;
  f := pegase_int.at_fiche_de(n, p_fiche); if f.id is null then raise exception 'projet inconnu'; end if;
  if f.etat not in ('brouillon', 'en_discussion', 'complete') or f.paye is not null then raise exception 'projet lance'; end if;
  if p_cle in ('idee', 'titre') then
    if jsonb_typeof(p_valeur) <> 'string' then raise exception 'texte attendu'; end if;
    e := left(btrim(p_valeur #>> '{}'), case when p_cle = 'titre' then 60 else 1500 end);
    if length(e) < 2 then raise exception 'texte vide'; end if;
    v := to_jsonb(e);
  else
    if jsonb_typeof(p_valeur) <> 'array' or jsonb_array_length(p_valeur) > 30 then raise exception 'liste attendue'; end if;
    select coalesce(jsonb_agg(to_jsonb(left(btrim(x), 80))), '[]'::jsonb) into v from jsonb_array_elements_text(p_valeur) x where length(btrim(x)) >= 1;
    e := (select string_agg(x, ' ') from jsonb_array_elements_text(v) x);
  end if;
  why := pegase_int.at_filtre(coalesce(e, '')); if why <> '' then raise exception 'filtre %', why; end if;
  if p_cle = 'titre' then update public.at_fiches x set titre = e, maj_at = now() where x.id = f.id;
  else update public.at_fiches x set fiche = x.fiche || jsonb_build_object(p_cle, v), maj_at = now() where x.id = f.id; end if;
  return jsonb_build_object('id', f.id, 'cle', p_cle, 'valeur', v);
end $$;
revoke all on function public.at_fiche_etape(text, uuid, text, jsonb) from public, anon;
grant execute on function public.at_fiche_etape(text, uuid, text, jsonb) to authenticated;

-- (joueur) 🚀 Lancer la conception : cout_conception crédits (0 pendant l'essai), une seule fois ; le projet est scellé
create or replace function public.at_lancer(p_name text, p_fiche uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; c int := greatest(0, coalesce(pegase_int.at_reglage('cout_conception'), 0)); s int;
begin
  perform public.acct_check(n);
  f := pegase_int.at_fiche_de(n, p_fiche); if f.id is null then raise exception 'projet inconnu'; end if;
  if f.paye is not null or f.etat not in ('brouillon', 'en_discussion', 'complete') then return jsonb_build_object('id', f.id, 'etat', f.etat, 'envoyee_at', f.envoyee_at, 'solde', pegase_int.at_solde(n)); end if;
  if coalesce(pegase_int.at_txt(f.fiche -> 'idee'), '') = '' then raise exception 'fiche vide'; end if;
  s := pegase_int.at_debiter(n, c);
  insert into public.at_messages (fiche, texte) values (f.id, '🚀 J’ai lancé la conception de mon jeu !' || case when c > 0 then ' (' || c || ' crédits)' else '' end);
  update public.at_fiches x set etat = 'envoyee', envoyee_at = now(), maj_at = now(), accord_at = now(), paye = c,
    accord_texte = 'Lancer la conception : jeu créé avec l’aide de l’IA ; l’administrateur décide s’il est proposé dans la salle du joueur ou à tous et peut y faire toutes les modifications.'
    where x.id = f.id returning * into f;
  return jsonb_build_object('id', f.id, 'etat', f.etat, 'envoyee_at', f.envoyee_at, 'paye', c, 'solde', s);
end $$;
revoke all on function public.at_lancer(text, uuid) from public, anon;
grant execute on function public.at_lancer(text, uuid) to authenticated;

-- at_gen_fin : un DESIGN réussi devient le design du projet ; raté → les crédits du joueur lui sont rendus
create or replace function pegase_int.at_gen_apres(p_id uuid, ok boolean, p_path text) returns void language plpgsql security definer set search_path = public as $$
declare g public.at_gen_file;
begin
  select * into g from public.at_gen_file x where x.id = p_id; if g.id is null or g.role is distinct from 'design' then return; end if;
  if ok then
    update public.at_fiches x set design = jsonb_build_object('f', p_path, 'at', now(), 'changement', nullif(regexp_replace(g.titre, '^Design( : )?', ''), '')), design_at = now(), maj_at = now() where x.id = g.fiche;
  elsif g.paye_par is not null and coalesce(g.credits, 0) > 0 then
    update public.at_credits x set solde = x.solde + g.credits, maj_at = now() where x.name = g.paye_par;
    update public.at_gen_file x set credits = 0 where x.id = g.id;
  end if;
end $$;
do $$
declare d text;
begin
  d := pg_get_functiondef('public.at_gen_fin(uuid, text, text, text)'::regprocedure);
  if position('at_gen_apres' in d) = 0 then
    d := replace(d, '  return jsonb_build_object(''id'', g.id, ''ok'', ok);', '  perform pegase_int.at_gen_apres(g.id, ok, p_path);' || chr(10) || '  return jsonb_build_object(''id'', g.id, ''ok'', ok);');
    if position('at_gen_apres' in d) = 0 then raise exception 'at_gen_fin'; end if;
    execute d;
  end if;
  -- budget / plafond atteint dans at_gen_prendre (le travail finit en erreur sans passer par at_gen_fin) : rendre aussi
  d := pg_get_functiondef('public.at_gen_prendre()'::regprocedure);
  if position('at_gen_apres' in d) = 0 then
    d := replace(d, '    return jsonb_build_object(''pause'', true);', '    perform pegase_int.at_gen_apres(g.id, false, null);' || chr(10) || '    return jsonb_build_object(''pause'', true);');
    d := replace(d, 'where x.etat = ''en_cours'' and x.debut_at < now() - interval ''10 minutes'';',
      'where x.etat = ''en_cours'' and x.debut_at < now() - interval ''10 minutes'';' || chr(10) || '  perform pegase_int.at_gen_apres(x.id, false, null) from public.at_gen_file x where x.etat = ''erreur'' and x.erreur = ''trop d essais'' and coalesce(x.credits, 0) > 0;');
    if position('at_gen_apres' in d) = 0 then raise exception 'at_gen_prendre'; end if;
    execute d;
  end if;
  -- at_lire : le design en cours, et les prix du design et de la conception
  d := pg_get_functiondef('public.at_lire(text, uuid)'::regprocedure);
  if position('design_en_cours' in d) = 0 then
    d := replace(d, '''projets_max'', coalesce(pegase_int.at_reglage(''projets_max''), 5),',
      '''projets_max'', coalesce(pegase_int.at_reglage(''projets_max''), 5), ''design'', coalesce(pegase_int.at_reglage(''cout_design''), 10), ''conception'', greatest(0, coalesce(pegase_int.at_reglage(''cout_conception''), 0)),');
    d := replace(d, '''design'', f.design, ''design_at'', f.design_at,', '''design'', f.design, ''design_at'', f.design_at, ''design_en_cours'', pegase_int.at_design_en_cours(f.id),');
    if position('design_en_cours' in d) = 0 or position('cout_conception' in d) = 0 then raise exception 'at_lire'; end if;
    execute d;
  end if;
end $$;
revoke all on function pegase_int.at_gen_apres(uuid, boolean, text) from public, anon, authenticated;
revoke all on function pegase_int.at_prompt_design(public.at_fiches, text) from public, anon, authenticated;
revoke all on function pegase_int.at_design_en_cours(uuid) from public, anon, authenticated;

-- ===================================================================================================================================
-- LES BASES, LES DESSINS DÉCOUPÉS, LES FORMES (borne 1.63.64, 2 nov. 2026 18 h 25, Benjamin) :
-- · « Les bases de ton jeu » (5 questions : type, vue, avec qui, score, style ; le jeu est toujours en 2D) → fiche.bases (at_fiche_etape, gratuit) ;
-- · DESIGN = GÉNÉRATION D'ASSETS : le joueur demande les dessins de ses éléments (at_dessins_demander) → planches de 8 éléments au plus
--   (cout_image crédits la planche), dessinées par la file de l'équipe (role 'assets') puis DÉCOUPÉES AUTOMATIQUEMENT par la fonction Edge
--   (détection des dessins, fond retiré, PNG transparents, nommés comme dans la fiche) → at_fiches.assets (un élément = une image) ;
-- · les FORMES simples (rond, carré, étoile, barre, plateforme…) ne sont pas générées : dessinées par le code de la borne (fiche.formes),
--   cout_forme crédits chacune (3) ;
-- · (équipe) at_gen_decouper : redécouper une planche déjà dessinée, sans rien générer (0 €).
insert into public.at_reglages (k, v) values ('cout_forme', 3) on conflict (k) do nothing;
alter table public.at_gen_file add column if not exists source text;

-- la file : une découpe seule (role 'decoupe') ne coûte rien et ne compte pas dans le plafond
create or replace function public.at_gen_prendre()
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.at_gen_file; c int;
begin
  update public.at_gen_file x set etat = case when x.essais >= 3 then 'erreur' else 'attente' end, erreur = case when x.essais >= 3 then 'trop d essais' else x.erreur end
    where x.etat = 'en_cours' and x.debut_at < now() - interval '10 minutes';
  perform pegase_int.at_gen_apres(x.id, false, null) from public.at_gen_file x where x.etat = 'erreur' and x.erreur = 'trop d essais' and coalesce(x.credits, 0) > 0;
  select * into g from public.at_gen_file x where x.etat = 'attente' order by x.at limit 1 for update skip locked;
  if g.id is null then return null; end if;
  c := case when g.role = 'decoupe' then 0 when g.sorte = 'image' then coalesce(pegase_int.at_reglage('cout_image_centimes'), 4) when g.sorte = 'son' then coalesce(pegase_int.at_reglage('cout_son_centimes'), 10)
       else coalesce(pegase_int.at_reglage('cout_musique_centimes'), 50) end;
  if c > 0 then
    perform pg_advisory_xact_lock(hashtext('atelier-ia-plafond'));
    if pegase_int.at_ia_centimes() + c > coalesce(pegase_int.at_reglage('budget_euros_mois'), 0) * 100
       or (g.sorte = 'image' and pegase_int.at_ia_utilisees() + 1 > coalesce(pegase_int.at_reglage('plafond_images_mois'), 0)) then
      update public.at_gen_file x set etat = 'erreur', erreur = 'budget ou plafond du mois atteint', fin_at = now() where x.id = g.id;
      perform pegase_int.at_gen_apres(g.id, false, null);
      return jsonb_build_object('pause', true);
    end if;
  end if;
  update public.at_gen_file x set etat = 'en_cours', essais = x.essais + 1, debut_at = now(), cents = c where x.id = g.id returning * into g;
  return jsonb_build_object('id', g.id, 'sorte', g.sorte, 'prompt', g.prompt, 'ratio', g.ratio, 'modele', g.modele, 'duree', g.duree,
    'role', g.role, 'elements', g.elements, 'source', g.source);
end $$;
revoke all on function public.at_gen_prendre() from public, anon, authenticated;
grant execute on function public.at_gen_prendre() to service_role;

-- la fin d'un travail : p_decoupes = les éléments découpés [{nom, path}] (un élément = une image transparente)
drop function if exists public.at_gen_fin(uuid, text, text, text);
create or replace function public.at_gen_fin(p_id uuid, p_path text, p_modele text default null, p_erreur text default null, p_decoupes jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.at_gen_file; f public.at_fiches; ok boolean := p_path is not null; ne int; dec jsonb := '[]'::jsonb;
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
              case when ok then g.cents else 0 end, case when g.elements is not null then jsonb_build_object('elements', g.elements) end);
  end if;
  if ok and f.id is not null and coalesce(g.role, '') <> 'design' then
    ne := coalesce(jsonb_array_length(g.elements), 0);
    update public.at_fiches x set maj_at = now(), assets = coalesce(x.assets, '[]'::jsonb) || case
      when jsonb_array_length(dec) > 0 then (select jsonb_agg(jsonb_build_object('nom', d ->> 'nom', 'sorte', 'élément', 'source', 'dessiné par notre IA', 'licence', 'à nous', 'image', d ->> 'path', 'planche', p_path)) from jsonb_array_elements(dec) d)
      when g.sorte = 'image' and ne > 1 then jsonb_build_array(jsonb_build_object('nom', coalesce(nullif(g.titre, ''), 'Planche'), 'sorte', 'planche', 'source', 'dessiné par notre IA', 'licence', 'à nous', 'image', p_path, 'elements', g.elements))
      when g.sorte = 'image' then jsonb_build_array(jsonb_build_object('nom', coalesce(nullif(g.titre, ''), g.elements ->> 0), 'sorte', 'grande image', 'source', 'dessiné par notre IA', 'licence', 'à nous', 'image', p_path))
      else jsonb_build_array(jsonb_build_object('nom', coalesce(nullif(g.titre, ''), g.sorte), 'sorte', g.sorte, 'source', 'ElevenLabs (équipe)', 'licence', 'à nous', 'son', p_path)) end
    where x.id = f.id and length(coalesce(x.assets, '[]'::jsonb)::text) < 60000;
  end if;
  perform pegase_int.at_gen_apres(g.id, ok, p_path);
  return jsonb_build_object('id', g.id, 'ok', ok, 'decoupes', jsonb_array_length(dec));
end $$;
revoke all on function public.at_gen_fin(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.at_gen_fin(uuid, text, text, text, jsonb) to service_role;

-- crédits rendus si un dessin payé par le joueur rate (design ou planche d'éléments)
create or replace function pegase_int.at_gen_apres(p_id uuid, ok boolean, p_path text) returns void language plpgsql security definer set search_path = public as $$
declare g public.at_gen_file;
begin
  select * into g from public.at_gen_file x where x.id = p_id; if g.id is null or coalesce(g.role, '') not in ('design', 'assets') then return; end if;
  if ok and g.role = 'design' then
    update public.at_fiches x set design = jsonb_build_object('f', p_path, 'at', now(), 'changement', nullif(regexp_replace(g.titre, '^Design( : )?', ''), '')), design_at = now(), maj_at = now() where x.id = g.fiche;
  elsif not ok and g.paye_par is not null and coalesce(g.credits, 0) > 0 then
    update public.at_credits x set solde = x.solde + g.credits, maj_at = now() where x.name = g.paye_par;
    update public.at_gen_file x set credits = 0 where x.id = g.id;
  end if;
end $$;
revoke all on function pegase_int.at_gen_apres(uuid, boolean, text) from public, anon, authenticated;

-- (joueur) les dessins de ses éléments : planches de 8 au plus (cout_image la planche) + formes simples dessinées par le code (cout_forme)
create or replace function public.at_dessins_demander(p_name text, p_fiche uuid, p_elements text[], p_formes jsonb default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; el text[]; fo jsonb := '[]'::jsonb; ci int := coalesce(pegase_int.at_reglage('cout_image'), 10);
  cf int := coalesce(pegase_int.at_reglage('cout_forme'), 3); np int; tot int; s int; why text; i int; ch text[]; pr jsonb; u uuid; nj int := 0;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-design', 12, interval '1 hour');
  f := pegase_int.at_fiche_de(n, p_fiche); if f.id is null then raise exception 'projet inconnu'; end if;
  if f.etat not in ('brouillon', 'en_discussion', 'complete') or f.paye is not null then raise exception 'projet lance'; end if;
  select coalesce(array_agg(distinct left(btrim(x), 80)), '{}') into el from unnest(coalesce(p_elements, '{}')) x where length(btrim(x)) >= 2;
  if jsonb_typeof(p_formes) = 'array' then
    select coalesce(jsonb_agg(jsonb_build_object('nom', left(btrim(d ->> 'nom'), 80), 'forme', d ->> 'forme', 'couleur', lower(d ->> 'couleur'))), '[]'::jsonb) into fo
      from jsonb_array_elements(p_formes) d
      where (d ->> 'forme') in ('rond', 'carre', 'rectangle', 'etoile', 'barre', 'triangle', 'coeur', 'losange', 'anneau')
        and (d ->> 'couleur') ~* '^#[0-9a-f]{6}$' and length(btrim(coalesce(d ->> 'nom', ''))) between 1 and 80;
  end if;
  if coalesce(array_length(el, 1), 0) + jsonb_array_length(fo) = 0 then raise exception 'rien a dessiner'; end if;
  if coalesce(array_length(el, 1), 0) > 24 or jsonb_array_length(fo) > 30 then raise exception 'trop d elements'; end if;
  if coalesce(array_length(el, 1), 0) > 0 then
    if coalesce(pegase_int.at_reglage('ia_admins_seulement'), 0) = 1 and not exists (select 1 from public.at_admins a where a.name = n) then raise exception 'plafond global'; end if;
    if exists (select 1 from public.at_gen_file g where g.fiche = f.id and g.role = 'assets' and g.etat in ('attente', 'en_cours')) then raise exception 'dessins en cours'; end if;
  end if;
  why := pegase_int.at_filtre(array_to_string(el, ' ') || ' ' || coalesce((select string_agg(d ->> 'nom', ' ') from jsonb_array_elements(fo) d), '')); if why <> '' then raise exception 'filtre %', why; end if;
  np := ceil(coalesce(array_length(el, 1), 0) / 8.0)::int;
  tot := np * ci + jsonb_array_length(fo) * cf;
  s := pegase_int.at_debiter(n, tot);
  if jsonb_array_length(fo) > 0 then
    update public.at_fiches x set fiche = x.fiche || jsonb_build_object('formes',
      coalesce((select jsonb_agg(o) from jsonb_array_elements(coalesce(x.fiche -> 'formes', '[]'::jsonb)) o where not exists (select 1 from jsonb_array_elements(fo) z where z ->> 'nom' = o ->> 'nom')), '[]'::jsonb) || fo),
      maj_at = now() where x.id = f.id returning * into f;
  end if;
  for i in 0 .. np - 1 loop
    ch := el[i * 8 + 1 : least(i * 8 + 8, array_length(el, 1))];
    pr := pegase_int.at_prompt_planche(f, ch);
    insert into public.at_gen_file (fiche, sorte, titre, prompt, elements, ratio, role, paye_par, credits)
      values (f.id, 'image', left('Dessins : ' || array_to_string(ch, ', '), 80), pr ->> 'prompt', to_jsonb(ch), pr ->> 'ratio', 'assets', n, ci) returning id into u;
    nj := nj + 1;
  end loop;
  if nj > 0 then perform pegase_int.at_gen_reveil(); end if;
  return jsonb_build_object('solde', s, 'planches', nj, 'formes', jsonb_array_length(fo), 'cout', tot);
end $$;
revoke all on function public.at_dessins_demander(text, uuid, text[], jsonb) from public, anon;
grant execute on function public.at_dessins_demander(text, uuid, text[], jsonb) to authenticated;

-- (équipe) redécouper une planche déjà dessinée (0 €) : p_fiche null = essai sans rien ajouter au projet
create or replace function public.at_gen_decouper(p_fiche uuid, p_path text, p_elements text[]) returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  if p_path !~ '^i/[0-9a-f-]{36}[.](png|jpg|webp)$' then raise exception 'chemin refuse'; end if;
  if coalesce(array_length(p_elements, 1), 0) not between 1 and 12 then raise exception 'de 1 a 12 elements'; end if;
  insert into public.at_gen_file (fiche, sorte, titre, prompt, elements, role, source)
    values (p_fiche, 'image', left('Découpe : ' || array_to_string(p_elements, ', '), 80), '(découpe)', to_jsonb(p_elements), 'decoupe', p_path) returning id into u;
  perform pegase_int.at_gen_reveil();
  return u;
end $$;
revoke all on function public.at_gen_decouper(uuid, text, text[]) from public, anon, authenticated;

-- at_fiche_etape : + les bases (objet type / vue / avec / score / style)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.at_fiche_etape(text, uuid, text, jsonb)'::regprocedure);
  if position('''bases''' in d) = 0 then
    d := replace(d, 'if p_cle not in (''idee'', ''titre'', ''personnages'', ''objets'', ''decor'', ''sons'') then', 'if p_cle not in (''idee'', ''titre'', ''personnages'', ''objets'', ''decor'', ''sons'', ''bases'') then');
    d := replace(d, '  if p_cle in (''idee'', ''titre'') then',
      '  if p_cle = ''bases'' then' || chr(10) ||
      '    if jsonb_typeof(p_valeur) <> ''object'' then raise exception ''objet attendu''; end if;' || chr(10) ||
      '    select coalesce(jsonb_object_agg(k, left(btrim(v), 120)), ''{}''::jsonb) into v from jsonb_each_text(p_valeur) t(k, v) where k in (''type'', ''vue'', ''avec'', ''score'', ''style'') and length(btrim(v)) >= 1;' || chr(10) ||
      '    e := (select string_agg(x, '' '') from jsonb_each_text(v) t(k, x));' || chr(10) ||
      '  elsif p_cle in (''idee'', ''titre'') then');
    if position('''bases''' in d) = 0 or position('jsonb_each_text(p_valeur)' in d) = 0 then raise exception 'at_fiche_etape'; end if;
    execute d;
  end if;
  -- at_lire : les éléments en cours de dessin, et le prix d'une forme
  d := pg_get_functiondef('public.at_lire(text, uuid)'::regprocedure);
  if position('dessins_en_cours' in d) = 0 then
    d := replace(d, '''design_en_cours'', pegase_int.at_design_en_cours(f.id),', '''design_en_cours'', pegase_int.at_design_en_cours(f.id), ''dessins_en_cours'', (select coalesce(jsonb_agg(e), ''[]''::jsonb) from public.at_gen_file g, jsonb_array_elements_text(g.elements) e where g.fiche = f.id and g.role = ''assets'' and g.etat in (''attente'', ''en_cours'')),');
    d := replace(d, '''conception'', greatest(0,', '''forme'', coalesce(pegase_int.at_reglage(''cout_forme''), 3), ''conception'', greatest(0,');
    if position('dessins_en_cours' in d) = 0 or position('cout_forme' in d) = 0 then raise exception 'at_lire'; end if;
    execute d;
  end if;
end $$;

-- (v19, borne 1.63.68) les bases : + « dim » (2D ou 3D ; la 3D arrive bientôt) — at_fiche_etape accepte dim, type, vue, avec, score, style
do $$
declare d text;
begin
  d := pg_get_functiondef('public.at_fiche_etape(text, uuid, text, jsonb)'::regprocedure);
  if position('''dim'', ''type''' in d) = 0 then
    d := replace(d, 'k in (''type'', ''vue'', ''avec'', ''score'', ''style'')', 'k in (''dim'', ''type'', ''vue'', ''avec'', ''score'', ''style'')');
    if position('''dim'', ''type''' in d) = 0 then raise exception 'at_fiche_etape'; end if;
    execute d;
  end if;
end $$;

-- (v20, borne 1.63.70, 2 nov. 19 h 10, Benjamin : « tout projet commencé doit rester en brouillon quand on quitte ») : le projet existe dès
-- la 1re action du joueur (une base choisie ou passée, quelques mots écrits), GRATUITEMENT (at_brouillon, état « brouillon ») ; le texte en
-- cours d'écriture est gardé dans fiche.brouillon (at_fiche_etape 'brouillon', gratuit) et revient quand on rouvre le projet.
create or replace function public.at_brouillon(p_name text, p_bases jsonb default null, p_texte text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; b jsonb := '{}'::jsonb; t text := left(btrim(coalesce(p_texte, '')), 1500); why text;
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'atelier-fiche', 300, interval '1 hour');
  perform pegase_int.at_projets_ok(n);
  if jsonb_typeof(p_bases) = 'object' then
    select coalesce(jsonb_object_agg(k, left(btrim(v), 120)), '{}'::jsonb) into b from jsonb_each_text(p_bases) x(k, v) where k in ('dim', 'type', 'vue', 'avec', 'score', 'style') and length(btrim(v)) >= 1;
  end if;
  why := pegase_int.at_filtre(t || ' ' || coalesce((select string_agg(v, ' ') from jsonb_each_text(b) x(k, v)), '')); if why <> '' then raise exception 'filtre %', why; end if;
  insert into public.at_fiches (name, etat, fiche) values (n, 'brouillon', jsonb_build_object('bases', b) || case when t <> '' then jsonb_build_object('brouillon', t) else '{}'::jsonb end) returning * into f;
  return jsonb_build_object('fiche', f.id, 'etat', f.etat);
end $$;
revoke all on function public.at_brouillon(text, jsonb, text) from public, anon;
grant execute on function public.at_brouillon(text, jsonb, text) to authenticated;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.at_fiche_etape(text, uuid, text, jsonb)'::regprocedure);
  if position('''brouillon''' in d) = 0 then
    d := replace(d, '''sons'', ''bases'') then', '''sons'', ''bases'', ''brouillon'') then');
    d := replace(d, 'elsif p_cle in (''idee'', ''titre'') then', 'elsif p_cle in (''idee'', ''titre'', ''brouillon'') then');
    d := replace(d, 'if length(e) < 2 then raise exception ''texte vide''; end if;', 'if length(e) < 2 and p_cle <> ''brouillon'' then raise exception ''texte vide''; end if;');
    if position('''bases'', ''brouillon'')' in d) = 0 or position('''titre'', ''brouillon'')' in d) = 0 or position('p_cle <> ''brouillon''' in d) = 0 then raise exception 'at_fiche_etape'; end if;
    execute d;
  end if;
end $$;
