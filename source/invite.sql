-- Inviter par un lien (à coller dans Supabase > SQL Editor, puis Run). Peut être relancé sans risque : garde toutes les données (et les liens).
-- Lien : https://elixirgamestudio.com/jouer/?salle=<jeton>. Le jeton est un SECRET propre à chaque salle, fabriqué ici par le serveur
-- (122 bits de hasard) ; il remplace le nom + le code de la salle pour celui qui reçoit le lien.
--   * make_invite(p_code, p_room, p_room_code, p_name, p_renew) : le lien de la salle, pour un MEMBRE (compte connecté, pseudo du compte,
--     membre de la salle). Toujours le même lien tant qu'on ne le renouvelle pas ; p_renew = true : nouveau jeton, les anciens liens ne
--     marchent plus (lien envoyé à la mauvaise personne…).
--   * invite_info(p_code, p_token, p_name) : PUBLIC (le lien suffit) : nom de la salle et nombre de membres, pour « Rejoindre Les kiki du gard ? »
--     (r_member : ce pseudo du compte connecté en fait déjà partie). Rien si le lien est faux ou annulé. Ne révèle rien sans le jeton.
--   * join_by_invite(p_code, p_token, p_name) : compte connecté obligatoire, pseudo du compte (acct_check) : il entre dans la salle, sans code.
--     Renvoie la salle (r_id, r_name, r_private, r_owner) ; rien si le lien est faux ou annulé.
--   * Essais limités (anti-devinette, comme find_room) : 30 par compte et par 10 minutes (invite_info, join_by_invite, créer / renouveler un
--     lien) ; sans connexion, invite_info : 60 en tout par 10 minutes.
-- ORDRE : APRÈS public.sql (il se sert de room_guard, acct_check et room_access). Relancer public.sql ne touche à rien ici.

-- un jeton par salle (renouveler = remplacer) ; illisible depuis le site
create table if not exists public.room_invites (
  room_id bigint primary key references public.rooms(id) on delete cascade,
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{16,64}$'),
  made_by text,
  made_at timestamptz not null default now()
);
alter table public.room_invites enable row level security;
revoke all on public.room_invites from anon, authenticated;

-- essais (uid null : sans connexion) ; illisible depuis le site
create table if not exists public.invite_tries (
  uid uuid,
  at timestamptz not null default now()
);
create index if not exists invite_tries_idx on public.invite_tries (uid, at);
alter table public.invite_tries enable row level security;
revoke all on public.invite_tries from anon, authenticated;

-- aide interne : compte l'essai, ou refuse « trop d essais » (30 par compte, 60 en tout sans connexion, par 10 minutes)
create or replace function public.invite_try() returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare u uuid := auth.uid();
begin
  if u is null then
    if (select count(*) from public.invite_tries t where t.uid is null and t.at > now() - interval '10 minutes') >= 60 then raise exception 'trop d essais'; end if;
  elsif (select count(*) from public.invite_tries t where t.uid = u and t.at > now() - interval '10 minutes') >= 30 then raise exception 'trop d essais'; end if;
  insert into public.invite_tries (uid) values (u);
  delete from public.invite_tries where at < now() - interval '1 day';
end $$;
revoke all on function public.invite_try() from public, anon, authenticated;

drop function if exists public.make_invite(text, bigint, text, text, boolean);
drop function if exists public.invite_info(text, text, text);
drop function if exists public.join_by_invite(text, text, text);

-- le lien de la salle (jeton) pour un membre ; p_renew : nouveau jeton, l'ancien lien ne marche plus
create function public.make_invite(p_code text, p_room bigint, p_room_code text, p_name text, p_renew boolean default false) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); t text;
begin
  perform public.room_guard(p_room);
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then raise exception 'membre requis'; end if;
  if not coalesce(p_renew, false) then
    select i.token into t from public.room_invites i where i.room_id = p_room;
    if t is not null then return t; end if;
  end if;
  perform public.invite_try();
  -- 16 octets de gen_random_uuid() (hasard cryptographique de PostgreSQL) en base64 « URL » : 22 caractères
  t := translate(encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '+/=', '-_');
  insert into public.room_invites as i (room_id, token, made_by, made_at) values (p_room, t, n, now())
    on conflict (room_id) do update set token = excluded.token, made_by = excluded.made_by, made_at = excluded.made_at;
  return t;
end $$;

-- public : la salle d'un lien (sans le jeton : rien) ; r_member : le pseudo p_name (du compte connecté) en fait déjà partie
create function public.invite_info(p_code text, p_token text, p_name text default null)
returns table(r_name text, r_members int, r_member boolean)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare t text := trim(coalesce(p_token, '')); n text := upper(left(trim(coalesce(p_name, '')), 12)); rid bigint;
begin
  if t !~ '^[A-Za-z0-9_-]{16,64}$' then return; end if;
  perform public.invite_try();
  select i.room_id into rid from public.room_invites i where i.token = t;
  if rid is null then return; end if;
  return query
    select r.name, (select count(*)::int from public.room_members m where m.room_id = r.id),
      n <> '' and public.acct_own(n) and exists (select 1 from public.room_members m where m.room_id = r.id and m.name = n)
    from public.rooms r where r.id = rid;
end $$;

-- entrer dans la salle d'un lien : compte connecté, pseudo du compte ; rien si le lien est faux ou annulé
create function public.join_by_invite(p_code text, p_token text, p_name text)
returns table(r_id bigint, r_name text, r_private boolean, r_owner text)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare t text := trim(coalesce(p_token, '')); n text := upper(left(trim(coalesce(p_name, '')), 12)); rid bigint;
begin
  if auth.uid() is null then raise exception 'connexion requise'; end if;
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  perform public.invite_try();
  if t !~ '^[A-Za-z0-9_-]{16,64}$' then return; end if;
  select i.room_id into rid from public.room_invites i where i.token = t;
  if rid is null then return; end if;
  insert into public.room_members (room_id, name) values (rid, n) on conflict do nothing;
  return query select r.id, r.name, r.code_hash is not null, r.owner from public.rooms r where r.id = rid;
end $$;

revoke all on function public.make_invite(text, bigint, text, text, boolean), public.invite_info(text, text, text),
  public.join_by_invite(text, text, text) from public;
grant execute on function public.make_invite(text, bigint, text, text, boolean), public.invite_info(text, text, text),
  public.join_by_invite(text, text, text) to anon, authenticated;
