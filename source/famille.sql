-- ============================================================================================================================
-- Comptes de FAMILLE (borne 1.41, 27 oct. 2026) : « LOUIS et LÉONIE sur le téléphone de leur maman, sans voir mon compte ».
-- Un joueur de mon compte peut recevoir SON PROPRE petit compte (un utilisateur Supabase Auth créé ici, e-mail fictif
-- f<id>@famille.elixirgamestudio.com, jamais d'e-mail envoyé) dont le mot de passe est un CODE (10 caractères Crockford : K7Q2-9MXA-3F).
-- Sur l'autre téléphone : « J'ai déjà un compte », pseudo LOUIS + ce code (ou le lien …/jouer/#acces=LOUIS:K7Q29MXA3F,…) → ce
-- téléphone ne voit QUE ce joueur. Le parent garde tout : public.my_player() compte aussi les joueurs dont il est le parent
-- (acct_own, room_access, get_my_players, list_rooms, check_name, rt_topic_ok… : ses appareils continuent comme avant, avec SON jeton).
-- Tout le reste (scores, salles, Pégase…) est rangé par PSEUDO : rien ne bouge. Un compte de famille ne peut pas créer d'autre joueur.
--   famille_donner(noms)  : crée le petit compte si besoin (le joueur y passe), NOUVEAU code pour chacun (les téléphones déjà connectés
--                           restent connectés) → (nom, code) ; le code n'est gardé nulle part en clair.
--   famille_retirer(nom)  : code inconnu de tous + toutes ses sessions coupées (les autres téléphones sont déconnectés).
--   famille_liberer(nom)  : « il est grand » : le parent le lâche, le petit compte devient un compte normal (son Google rattaché, ou
--                           pseudo + le code rendu ici, à changer ensuite).
--   famille_liste()       : les joueurs que je gère (depuis, dernier code, Google rattaché ?).
-- Relançable. À RELANCER après public.sql, accounts.sql ou cri-perte.sql (ils redéfinissent les fonctions ci-dessous sans le parent).
-- ============================================================================================================================
create table if not exists public.player_parents (
  name text primary key,
  parent uuid not null references auth.users (id) on delete cascade,
  child uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  code_at timestamptz
);
alter table public.player_parents enable row level security;
create index if not exists player_parents_parent on public.player_parents (parent);
create table if not exists public.famille_tries (at timestamptz not null default now(), uid uuid not null);
alter table public.famille_tries enable row level security;

-- ce joueur est-il à moi ? (à mon compte, ou un joueur de famille dont je suis le parent)
create or replace function public.my_player(p_user uuid, p_name text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select auth.uid() is not null and (p_user = auth.uid()
    or exists (select 1 from public.player_parents k where k.name = p_name and k.parent = auth.uid()));
$$;
-- mon compte est-il un compte de famille (encore géré par un parent) ?
create or replace function public.famille_enfant() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select auth.uid() is not null and exists (select 1 from public.player_parents k where k.child = auth.uid());
$$;
revoke all on function public.my_player(uuid, text), public.famille_enfant() from public, anon, authenticated;

-- ---- les fonctions existantes, avec le parent ----
create or replace function public.acct_own(p_name text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select auth.uid() is not null and exists (select 1 from public.players p
    where p.name = upper(left(trim(coalesce(p_name, '')), 12)) and public.my_player(p.user_id, p.name));
$$;
create or replace function public.room_access(p_room bigint) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select auth.uid() is not null and exists (select 1 from public.room_members m join public.players p on p.name = m.name
    where m.room_id = p_room and public.my_player(p.user_id, p.name));
$$;
create or replace function public.get_my_players(p_code text)
returns table(r_name text, r_photo text, r_consent boolean, r_sound text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  return query select p.name, case when p.consent then p.photo end, p.consent, p.sound
    from public.players p where auth.uid() is not null and public.my_player(p.user_id, p.name) order by p.name;
end $$;
create or replace function public.get_my_lose_sounds(p_code text)
returns table(r_name text, r_sound_lose text)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  return query select p.name, p.sound_lose
    from public.players p where auth.uid() is not null and public.my_player(p.user_id, p.name) and p.sound_lose is not null order by p.name;
end $$;
create or replace function public.list_rooms(p_code text, p_name text default null)
returns table(r_id bigint, r_name text, r_private boolean, r_owner text, r_members integer, r_online integer, r_member boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then return; end if;
  return query
    select r.id, r.name, r.code_hash is not null, r.owner,
      (select count(*)::int from public.room_members m where m.room_id = r.id),
      (select count(*)::int from public.presence pr where pr.room_id = r.id and pr.seen_at > now() - interval '45 seconds'),
      exists (select 1 from public.room_members m where m.room_id = r.id and m.name = upper(left(trim(coalesce(p_name, '')), 12)))
    from public.rooms r
    where exists (select 1 from public.room_members m join public.players p on p.name = m.name where m.room_id = r.id and public.my_player(p.user_id, p.name))
    order by r.created_at;
end $$;
create or replace function public.check_name(p_code text, p_name text)
returns table(r_exists boolean, r_photo text, r_sound text, r_protected boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); see boolean;
begin
  see := auth.uid() is not null and (public.acct_own(n) or exists (
    select 1 from public.room_members a join public.players p on p.name = a.name
      join public.room_members b on b.room_id = a.room_id
    where public.my_player(p.user_id, p.name) and b.name = n));
  return query select
    exists (select 1 from public.players p where p.name = n) or exists (select 1 from public.room_members m where m.name = n)
      or exists (select 1 from public.scores s where s.name = n),
    case when see then (select case when p.consent then p.photo end from public.players p where p.name = n) end,
    case when see then (select p.sound from public.players p where p.name = n) end,
    exists (select 1 from public.players p where p.name = n and p.user_id is not null);
end $$;
create or replace function public.rt_topic_ok(p_topic text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare t text := regexp_replace(coalesce(p_topic, ''), '^realtime:', ''); m text[]; n text;
begin
  if auth.uid() is null then return false; end if;
  if t = 'jdw-all' then return true; end if;
  if t ~ '^jdw-duel-[a-z0-9]{4,12}$' then return true; end if;
  m := regexp_match(t, '^jdw-room-([0-9]{1,18})$');
  if m is not null then return public.room_access(m[1]::bigint); end if;
  m := regexp_match(t, '^jdw-pegase-([0-9]{1,18})$');
  if m is not null then return public.room_access(m[1]::bigint) or exists (select 1 from public.pg_iles i join public.pg_ile_membres im on im.ile_id = i.id
    join public.players p on p.name = im.name where i.ancienne_salle = m[1]::bigint and public.my_player(p.user_id, p.name)); end if;
  m := regexp_match(t, '^jdw-ile-([0-9]{1,18})$');
  if m is not null then return exists (select 1 from public.pg_ile_membres im join public.players p on p.name = im.name
    where im.ile_id = m[1]::bigint and public.my_player(p.user_id, p.name)); end if;
  m := regexp_match(t, '^jdw-sms-((?:[0-9a-f]{2}){1,48})$');
  if m is not null then
    begin n := convert_from(decode(m[1], 'hex'), 'UTF8'); exception when others then return false; end;
    return n <> '' and n = public.pg_n(n) and public.acct_own(n);
  end if;
  return false;
end $$;
-- un compte de famille ne prend pas d'autre joueur ; le parent qui « réclame » son enfant : déjà à lui
create or replace function public.claim_name(p_code text, p_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>]', '', 'g')), 12)); u uuid := auth.uid();
  owner uuid; existed boolean;
begin
  if u is null then raise exception 'connexion requise'; end if;
  if char_length(n) < 2 then raise exception 'nom trop court'; end if;
  select p.user_id into owner from public.players p where p.name = n;
  if owner = u or (owner is not null and public.my_player(owner, n)) then return 'deja'; end if;
  if public.famille_enfant() then raise exception 'compte famille'; end if;
  if owner is null and (select count(*) from public.players p where p.user_id = u) >= 20 then raise exception 'trop de joueurs sur ce compte'; end if;
  existed := exists (select 1 from public.players p where p.name = n) or exists (select 1 from public.room_members m where m.name = n)
    or exists (select 1 from public.scores s where s.name = n);
  insert into public.players as pl (name, consent, user_id, updated_at) values (n, false, u, now())
    on conflict (name) do update set user_id = u where pl.user_id is null;
  if not found then raise exception 'pseudo deja protege'; end if;
  return case when existed then 'protege' else 'nouveau' end;
end $$;
-- mot de passe oublié depuis le pseudo d'un joueur de famille : pas d'e-mail (fictif) → « compte famille »
create or replace function public.recover_hint(p_code text, p_name text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); e text;
begin
  if n = '' then return null; end if;
  if (select count(*) from public.login_tries t where t.name = n and t.at > now() - interval '10 minutes') >= 10
    or (select count(*) from public.login_tries t where t.at > now() - interval '10 minutes') >= 60 then raise exception 'trop d essais'; end if;
  insert into public.login_tries (name) values (n);
  delete from public.login_tries where at < now() - interval '1 day';
  if exists (select 1 from public.player_parents k where k.name = n) then raise exception 'compte famille'; end if;
  select u.email into e from public.players p join auth.users u on u.id = p.user_id where p.name = n;
  if e is null or e !~ '^(.{1,2})[^@]*(@.+)$' then return null; end if;
  return regexp_replace(e, '^(.{1,2})[^@]*(@.+)$', '\1•••\2');
end $$;

-- ---- les fonctions de la famille ----
-- 10 caractères Crockford base 32 (sans I, L, O, U), tirés au hasard (50 bits)
create or replace function public.famille_code() returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare a text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; b bytea := extensions.gen_random_bytes(10); s text := ''; i int;
begin
  for i in 0..9 loop s := s || substr(a, (get_byte(b, i) % 32) + 1, 1); end loop;
  return s;
end $$;
create or replace function public.famille_garde() returns uuid
language plpgsql volatile security definer set search_path = public, extensions as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'connexion requise'; end if;
  if public.famille_enfant() then raise exception 'compte famille'; end if;
  if (select count(*) from public.famille_tries t where t.uid = u and t.at > now() - interval '1 hour') >= 30 then raise exception 'trop d essais'; end if;
  insert into public.famille_tries (uid) values (u);
  delete from public.famille_tries where at < now() - interval '1 day';
  return u;
end $$;
-- coupe toutes les sessions d'un compte (les jetons déjà donnés expirent dans l'heure)
create or replace function public.famille_couper(p_user uuid) returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.sessions where user_id = p_user;
end $$;
revoke all on function public.famille_code(), public.famille_garde(), public.famille_couper(uuid) from public, anon, authenticated;

create or replace function public.famille_donner(p_code text, p_names text[])
returns table(r_name text, r_code text)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare u uuid := public.famille_garde(); x text; n text; owner uuid; k public.player_parents; c text; v uuid; mail text; lbl text;
begin
  if p_names is null or array_length(p_names, 1) is null or array_length(p_names, 1) > 12 then raise exception 'aucun joueur'; end if;
  select string_agg(q.name, ', ' order by q.name) into lbl from (select p.name from public.players p where p.user_id = u
    and p.name <> all (select upper(left(trim(coalesce(y, '')), 12)) from unnest(p_names) y) order by p.name limit 2) q;
  foreach x in array p_names loop
    n := upper(left(trim(coalesce(x, '')), 12));
    select p.user_id into owner from public.players p where p.name = n;
    select * into k from public.player_parents pp where pp.name = n;
    c := public.famille_code();
    if k.name is not null and k.parent = u then                       -- déjà un joueur de famille : nouveau code
      update auth.users set encrypted_password = extensions.crypt(c, extensions.gen_salt('bf')), updated_at = now() where id = k.child;
      update public.player_parents set code_at = now() where name = n;
    elsif owner = u and k.name is null then                           -- joueur de mon compte : son petit compte
      v := gen_random_uuid(); mail := 'f' || replace(v::text, '-', '') || '@famille.elixirgamestudio.com';
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
        values ('00000000-0000-0000-0000-000000000000', v, 'authenticated', 'authenticated', mail, extensions.crypt(c, extensions.gen_salt('bf')), now(),
          jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'borne_famille', true, 'parent', coalesce(lbl, '')),
          jsonb_build_object('pseudo', n), now(), now(), '', '', '', '');
      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        values (v::text, v, jsonb_build_object('sub', v::text, 'email', mail, 'email_verified', true, 'phone_verified', false), 'email', null, now(), now());
      insert into public.player_parents (name, parent, child, code_at) values (n, u, v, now());
      update public.players set user_id = v, updated_at = now() where name = n;
    else
      raise exception 'pas ton joueur : %', n;
    end if;
    r_name := n; r_code := c; return next;
  end loop;
end $$;

create or replace function public.famille_retirer(p_code text, p_name text) returns boolean
language plpgsql volatile security definer set search_path = public, extensions as $$
declare u uuid := public.famille_garde(); n text := upper(left(trim(coalesce(p_name, '')), 12)); k public.player_parents;
begin
  select * into k from public.player_parents pp where pp.name = n and pp.parent = u;
  if k.name is null then raise exception 'pas ton joueur : %', n; end if;
  update auth.users set encrypted_password = extensions.crypt(public.famille_code() || public.famille_code(), extensions.gen_salt('bf')), updated_at = now() where id = k.child;
  update public.player_parents set code_at = null where name = n;
  perform public.famille_couper(k.child);
  return true;
end $$;

create or replace function public.famille_liberer(p_code text, p_name text) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare u uuid := public.famille_garde(); n text := upper(left(trim(coalesce(p_name, '')), 12)); k public.player_parents; c text := public.famille_code();
begin
  select * into k from public.player_parents pp where pp.name = n and pp.parent = u;
  if k.name is null then raise exception 'pas ton joueur : %', n; end if;
  update auth.users set encrypted_password = extensions.crypt(c, extensions.gen_salt('bf')),
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'borne_famille' - 'parent', updated_at = now() where id = k.child;
  delete from public.player_parents where name = n;
  return c;
end $$;

create or replace function public.famille_liste(p_code text)
returns table(r_name text, r_since timestamptz, r_code_at timestamptz, r_google boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  return query select k.name, k.created_at, k.code_at,
      exists (select 1 from auth.identities i where i.user_id = k.child and i.provider = 'google')
    from public.player_parents k where auth.uid() is not null and k.parent = auth.uid() order by k.name;
end $$;
-- pour un compte de famille : qui le gère (ses joueurs, 2 au plus)
create or replace function public.famille_parent(p_code text) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare r text;
begin
  select string_agg(q.name, ', ' order by q.name) into r from (select p.name from public.player_parents k join public.players p on p.user_id = k.parent
    where k.child = auth.uid() order by p.name limit 2) q;
  return r;
end $$;
revoke all on function public.famille_donner(text, text[]), public.famille_retirer(text, text), public.famille_liberer(text, text),
  public.famille_liste(text), public.famille_parent(text) from public, anon;
grant execute on function public.famille_donner(text, text[]), public.famille_retirer(text, text), public.famille_liberer(text, text),
  public.famille_liste(text), public.famille_parent(text) to authenticated;
