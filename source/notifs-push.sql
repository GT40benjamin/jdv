-- 2.1.18 — Interface : NOTIFICATIONS hors de la borne (Web Push), demande de SAMBA via l'admin : « on ne peut pas savoir si c'est fait sans se connecter ».
-- Le joueur touche « 🔔 Me prévenir quand c'est prêt » → son appareil s'abonne (at_push_abonner) ; quand la mascotte répond, qu'une version
-- est prête, qu'une demande est faite ou qu'une retouche de l'atelier photo est prête, une ligne entre dans la file at_push_file ;
-- chaque minute pg_cron réveille la fonction Edge atelier-push, qui prend la file (at_push_prendre), envoie et rend compte (at_push_resultat).
-- Règles : rien sans abonnement (la file ne se remplit que pour un compte abonné) ; jamais le contenu d'un message, d'un prix ni de crédits,
-- seulement l'événement et le titre du jeu ; une notification ne part que si c'est TOUJOURS NON LU 90 s après (sinon le joueur l'a vu sur
-- la borne) ; une seule par projet à la fois (la plus importante : version > retouche > demande > message), au plus une toutes les 5 min par
-- projet ; silence de 21 h 30 à 8 h (heure de Paris) : ce qui arrive la nuit part à 8 h ; une ligne de plus de 24 h est abandonnée.
-- Les adresses d'abonnement ne sont acceptées que chez les vrais services de notification (Google, Mozilla, Apple, Microsoft).
-- Les clés VAPID ne sont PAS ici : secrets de la fonction Edge (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY), voir notifs-push-cles.sh.
-- Les déclencheurs ne peuvent JAMAIS faire échouer l'écriture d'origine (exception avalée).
-- Essai : begin; <ce fichier>; … ; rollback;   — puis pour de vrai.

create table if not exists public.at_push_abos (
  id bigserial primary key,
  name text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  appareil text,
  created_at timestamptz not null default now(),
  vu_at timestamptz not null default now(),
  envoye_at timestamptz,
  constraint at_push_abos_endpoint check (length(endpoint) between 30 and 1024 and endpoint ~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'),
  constraint at_push_abos_cles check (p256dh ~ '^[A-Za-z0-9_-]{80,100}$' and auth ~ '^[A-Za-z0-9_-]{16,32}$')
);
create unique index if not exists at_push_abos_cle on public.at_push_abos (name, endpoint);   -- un appareil partagé (« Qui joue ? ») : un abonnement par joueur qui l'a demandé
create index if not exists at_push_abos_name on public.at_push_abos (name);
alter table public.at_push_abos enable row level security;
revoke all on public.at_push_abos from anon, authenticated;

create table if not exists public.at_push_file (
  id bigserial primary key,
  name text not null,
  fiche uuid,
  sorte text not null check (sorte in ('message', 'demande', 'version', 'creation')),
  ref uuid,
  version int,
  titre text,
  at timestamptz not null default now(),
  envoye_at timestamptz,
  etat text
);
create index if not exists at_push_file_attente on public.at_push_file (at) where envoye_at is null;
alter table public.at_push_file enable row level security;
revoke all on public.at_push_file from anon, authenticated;

-- ---- côté joueur (jeton de session, acct_check) ----
create or replace function public.at_push_abonner(p_name text, p_endpoint text, p_p256dh text, p_auth text, p_appareil text default null)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare n text := public.pg_n(p_name); k int;
begin
  perform public.acct_check(n);
  if p_endpoint is null or p_endpoint !~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/' or length(p_endpoint) > 1024
    then raise exception 'adresse de notification refusee'; end if;
  insert into public.at_push_abos (name, endpoint, p256dh, auth, appareil) values (n, p_endpoint, p_p256dh, p_auth, left(nullif(btrim(p_appareil), ''), 40))
  on conflict (name, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, appareil = excluded.appareil, vu_at = now();
  if (select count(*) from public.at_push_abos a where a.endpoint = p_endpoint) > 6 then raise exception 'trop de joueurs sur cet appareil'; end if;
  delete from public.at_push_abos a where a.name = n and a.id in (select b.id from public.at_push_abos b where b.name = n order by b.vu_at desc offset 8);   -- 8 appareils au plus par compte
  select count(*) into k from public.at_push_abos a where a.name = n;
  return jsonb_build_object('ok', true, 'appareils', k);
end $$;

create or replace function public.at_push_arreter(p_name text, p_endpoint text default null, p_tous boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare n text := public.pg_n(p_name); k int;
begin
  perform public.acct_check(n);
  delete from public.at_push_abos a where a.name = n and (coalesce(p_tous, false) or a.endpoint = p_endpoint);
  get diagnostics k = row_count;
  if not exists (select 1 from public.at_push_abos a where a.name = n) then delete from public.at_push_file x where x.name = n and x.envoye_at is null; end if;
  return jsonb_build_object('ok', true, 'retires', k, 'appareils', (select count(*) from public.at_push_abos a where a.name = n));
end $$;

create or replace function public.at_push_etat(p_name text, p_endpoint text default null)
returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions' as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  return jsonb_build_object('abonne', exists (select 1 from public.at_push_abos a where a.name = n and a.endpoint = p_endpoint),
    'appareils', (select count(*) from public.at_push_abos a where a.name = n));
end $$;

revoke all on function public.at_push_abonner(text, text, text, text, text) from public, anon;
revoke all on function public.at_push_arreter(text, text, boolean) from public, anon;
revoke all on function public.at_push_etat(text, text) from public, anon;
grant execute on function public.at_push_abonner(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.at_push_arreter(text, text, boolean) to authenticated, service_role;
grant execute on function public.at_push_etat(text, text) to authenticated, service_role;

-- ---- la file (déclencheurs) ----
create or replace function pegase_int.at_push_mettre(p_name text, p_fiche uuid, p_sorte text, p_ref uuid, p_version int, p_titre text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if p_name is null or not exists (select 1 from public.at_push_abos a where a.name = p_name) then return; end if;   -- pas abonné : rien n'est gardé
  insert into public.at_push_file (name, fiche, sorte, ref, version, titre) values (p_name, p_fiche, p_sorte, p_ref, p_version, left(p_titre, 60));
exception when others then null;   -- une notification ne casse jamais l'écriture d'origine
end $$;

create or replace function pegase_int.at_push_t_message() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare f public.at_fiches;
begin
  if new.de_atelier is true and new.fiche is not null then
    select * into f from public.at_fiches x where x.id = new.fiche;
    if f.id is not null and f.supprime_at is null then perform pegase_int.at_push_mettre(f.name, f.id, 'message', new.id, null, f.titre); end if;
  end if;
  return null;
exception when others then return null;
end $$;

create or replace function pegase_int.at_push_t_version() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare f public.at_fiches;
begin
  select * into f from public.at_fiches x where x.id = new.fiche;
  if f.id is not null and f.supprime_at is null then perform pegase_int.at_push_mettre(f.name, f.id, 'version', null, new.version, f.titre); end if;
  return null;
exception when others then return null;
end $$;

create or replace function pegase_int.at_push_t_demande() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare f public.at_fiches;
begin
  if new.etat = 'faite' and old.etat is distinct from 'faite' then
    select * into f from public.at_fiches x where x.id = new.fiche;
    perform pegase_int.at_push_mettre(new.name, new.fiche, 'demande', new.id, new.version_livree, coalesce(f.titre, ''));
  end if;
  return null;
exception when others then return null;
end $$;

create or replace function pegase_int.at_push_t_creation() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare c public.at_creations;
begin
  if new.etat = 'prete' and coalesce(new.outil, '') <> 'import' and (tg_op = 'INSERT' or old.etat is distinct from 'prete') then
    select * into c from public.at_creations x where x.id = new.creation;
    if c.id is not null and c.supprime_at is null then perform pegase_int.at_push_mettre(c.name, c.fiche, 'creation', c.id, new.n, c.titre); end if;
  end if;
  return null;
exception when others then return null;
end $$;

drop trigger if exists at_push_message on public.at_messages;
create trigger at_push_message after insert on public.at_messages for each row execute function pegase_int.at_push_t_message();
drop trigger if exists at_push_version on public.at_versions;
create trigger at_push_version after insert on public.at_versions for each row execute function pegase_int.at_push_t_version();
drop trigger if exists at_push_demande on public.at_demandes;
create trigger at_push_demande after update of etat on public.at_demandes for each row execute function pegase_int.at_push_t_demande();
drop trigger if exists at_push_creation on public.at_creation_versions;
create trigger at_push_creation after insert or update of etat on public.at_creation_versions for each row execute function pegase_int.at_push_t_creation();

-- ---- côté fonction Edge (clé de service seulement) ----
-- Prend ce qui doit partir : groupé par (compte, projet), le plus important gagne, avec les abonnements et le texte déjà écrit.
create or replace function public.at_push_prendre(p_max int default 50)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  heure time := coalesce(nullif(current_setting('jdw.push_heure', true), '')::time, (now() at time zone 'Europe/Paris')::time);   -- jdw.push_heure : seulement pour les essais
  g jsonb; nom text; res jsonb := '[]'::jsonb; r record; ids bigint[]; corps text; tab text; t text;
begin
  -- trop vieux (24 h), ou déjà lu sur la borne : abandonné
  update public.at_push_file x set envoye_at = now(), etat = 'vieux' where x.envoye_at is null and x.at < now() - interval '24 hours';
  update public.at_push_file x set envoye_at = now(), etat = 'lu' from public.at_fiches f
    where x.envoye_at is null and f.id = x.fiche and x.sorte in ('message', 'version') and f.lu_joueur_at is not null and f.lu_joueur_at >= x.at;
  update public.at_push_file x set envoye_at = now(), etat = 'lu' from public.at_demandes d
    where x.envoye_at is null and x.sorte = 'demande' and d.id = x.ref and d.vu_joueur_at is not null and d.vu_joueur_at >= x.at;
  update public.at_push_file x set envoye_at = now(), etat = 'sans_abo' where x.envoye_at is null and not exists (select 1 from public.at_push_abos a where a.name = x.name);
  if heure >= time '21:30' or heure < time '08:00' then return res; end if;   -- la nuit : ça attend 8 h
  select g0.v into g from public.at_textes g0 where g0.k = 'guide';
  nom := coalesce(nullif(btrim(g ->> 'nom'), ''), 'L’Atelier des jeux'); nom := upper(left(nom, 1)) || substr(nom, 2);
  for r in
    select x.name, x.fiche, array_agg(x.id) ids,
      (array_agg(x.sorte order by case x.sorte when 'version' then 0 when 'creation' then 1 when 'demande' then 2 else 3 end, x.at desc))[1] sorte,
      (array_agg(x.version order by case x.sorte when 'version' then 0 when 'creation' then 1 when 'demande' then 2 else 3 end, x.at desc))[1] version,
      (array_agg(x.titre order by case x.sorte when 'version' then 0 when 'creation' then 1 when 'demande' then 2 else 3 end, x.at desc))[1] titre,
      (array_agg(x.ref order by case x.sorte when 'version' then 0 when 'creation' then 1 when 'demande' then 2 else 3 end, x.at desc))[1] ref,
      (select ft.titre from public.at_fiches ft where ft.id = x.fiche) titre_jeu
    from public.at_push_file x
    where x.envoye_at is null and x.at < now() - interval '90 seconds'
      and not exists (select 1 from public.at_push_file y where y.name = x.name and y.fiche is not distinct from x.fiche and y.etat = 'ok' and y.envoye_at > now() - interval '5 minutes')
    group by x.name, x.fiche
    order by min(x.at)
    limit greatest(1, least(coalesce(p_max, 50), 200))
  loop
    t := nullif(btrim(coalesce(r.titre_jeu, '')), '');
    if r.sorte = 'version' then corps := '🎮 Ta V' || coalesce(r.version, 1) || ' de « ' || coalesce(t, 'ton jeu') || ' » est prête à essayer !'; tab := 'jeu';
    elsif r.sorte = 'creation' then corps := '✨ Ta retouche est prête : « ' || coalesce(nullif(btrim(coalesce(r.titre, '')), ''), 'ton image') || ' »' || coalesce(' V' || r.version, '') || ' !'; tab := '';
    elsif r.sorte = 'demande' then corps := '✅ C’est fait ! Ta demande pour « ' || coalesce(t, 'ton jeu') || ' » est prête.'; tab := 'demandes';
    else corps := '💬 Je t’ai répondu pour « ' || coalesce(t, 'ton projet') || ' »'; tab := 'demandes';
    end if;
    res := res || jsonb_build_object('ids', to_jsonb(r.ids), 'name', r.name,
      'notif', jsonb_build_object('t', nom, 'b', corps, 'tag', 'atl-' || coalesce(r.fiche::text, 'atelier'),
        'u', '?atelier=projet' || coalesce('&f=' || r.fiche::text, '') || case when tab <> '' then '&o=' || tab else '' end),
      'abos', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth)), '[]'::jsonb) from public.at_push_abos a where a.name = r.name));
    update public.at_push_file x set envoye_at = now(), etat = 'envoi' where x.id = any (r.ids);
  end loop;
  return res;
end $$;

-- Le compte rendu : lignes parties (ok) ou ratées, abonnements morts (404 / 410 du service) retirés.
create or replace function public.at_push_resultat(p_ok bigint[], p_rate bigint[], p_morts bigint[], p_abos_ok bigint[] default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare k int;
begin
  update public.at_push_file x set etat = 'ok' where x.id = any (coalesce(p_ok, '{}'));
  update public.at_push_file x set etat = 'echec' where x.id = any (coalesce(p_rate, '{}'));
  update public.at_push_abos a set envoye_at = now() where a.id = any (coalesce(p_abos_ok, '{}'));
  delete from public.at_push_abos a where a.id = any (coalesce(p_morts, '{}'));
  get diagnostics k = row_count;
  delete from public.at_push_file x where x.envoye_at < now() - interval '30 days';
  return jsonb_build_object('ok', true, 'morts', k);
end $$;

revoke all on function public.at_push_prendre(int) from public, anon, authenticated;
revoke all on function public.at_push_resultat(bigint[], bigint[], bigint[], bigint[]) from public, anon, authenticated;
grant execute on function public.at_push_prendre(int) to service_role;
grant execute on function public.at_push_resultat(bigint[], bigint[], bigint[], bigint[]) to service_role;
revoke all on function pegase_int.at_push_mettre(text, uuid, text, uuid, int, text) from public, anon, authenticated;

-- ---- le réveil (chaque minute, seulement s'il y a quelque chose à faire) ----
create or replace function pegase_int.at_push_reveil() returns void language plpgsql security definer set search_path to 'public', 'extensions' as $$
begin
  perform net.http_post(url := 'https://wplictorvvtkfikpfdnl.supabase.co/functions/v1/atelier-push',
    headers := jsonb_build_object('Content-Type', 'application/json'), body := '{"reveil":true}'::jsonb, timeout_milliseconds := 1000);
end $$;
revoke all on function pegase_int.at_push_reveil() from public, anon, authenticated;
select cron.unschedule('atelier-push') where exists (select 1 from cron.job where jobname = 'atelier-push');
select cron.schedule('atelier-push', '* * * * *',
  $c$ select pegase_int.at_push_reveil() where exists (select 1 from public.at_push_file where envoye_at is null and at < now() - interval '80 seconds') $c$);
