-- Formulaire « Nous contacter » du site (page contact/, source/contact.html) : AUCUNE adresse e-mail affichée sur le site (robots).
-- Les messages sont lus par Benjamin dans Supabase › Table Editor › contact_messages (colonne done = traité). Personne ne peut les lire
-- depuis le site (RLS sans politique). Anti-robots : champ piège (p_hp) + 5 messages / heure par connexion (empreinte de l'adresse IP,
-- jamais l'adresse elle-même) + 60 / heure en tout. Relançable. Appliqué le 26 oct. 2026 (connecteur Supabase).
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  subject text not null,
  pseudo text,
  email text,
  message text not null,
  page text,
  ua text,
  account uuid,
  done boolean not null default false
);
alter table public.contact_messages enable row level security;
create table if not exists public.contact_tries (at timestamptz not null default now(), k text not null);
alter table public.contact_tries enable row level security;
create index if not exists contact_tries_at on public.contact_tries (at);

create or replace function public.send_contact(p_subject text, p_pseudo text, p_email text, p_message text, p_page text, p_ua text, p_hp text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_ip text := btrim(split_part(coalesce((nullif(current_setting('request.headers', true), '')::json) ->> 'x-forwarded-for', ''), ',', 1));
  v_k text := md5('jdw-contact|' || v_ip);
  v_m text := btrim(coalesce(p_message, ''));
  v_e text := lower(btrim(coalesce(p_email, '')));
begin
  if coalesce(p_hp, '') <> '' then return 'ok'; end if;                  -- champ piège rempli : un robot (on ne lui dit rien)
  if length(v_m) < 10 then raise exception 'message trop court'; end if;
  if v_e <> '' and v_e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then raise exception 'e-mail invalide'; end if;
  delete from public.contact_tries where at < now() - interval '1 day';
  if (select count(*) from public.contact_tries t where t.k = v_k and t.at > now() - interval '1 hour') >= 5 then raise exception 'trop de messages'; end if;
  if (select count(*) from public.contact_tries t where t.at > now() - interval '1 hour') >= 60 then raise exception 'trop de messages'; end if;
  insert into public.contact_tries (k) values (v_k);
  insert into public.contact_messages (subject, pseudo, email, message, page, ua, account)
    values (left(coalesce(nullif(btrim(p_subject), ''), 'Autre'), 60), nullif(left(upper(btrim(coalesce(p_pseudo, ''))), 20), ''),
            nullif(left(v_e, 200), ''), left(v_m, 4000), left(p_page, 200), left(p_ua, 300), auth.uid());
  return 'ok';
end $$;
revoke all on function public.send_contact(text, text, text, text, text, text, text) from public;
grant execute on function public.send_contact(text, text, text, text, text, text, text) to anon, authenticated;
