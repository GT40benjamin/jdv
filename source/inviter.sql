-- borne 2.0.126 (SQL v136) — « 📣 Inviter mes copains » dans un jeu à plusieurs (api.live : Trôn-e, Abracadabra, Tête de Cible…).
-- Une invitation = « viens jouer à <jeu> dans la salle <salle> », envoyée à des MEMBRES de cette salle. Elle arrive :
--   a) tout de suite si le copain est en ligne (signal { t: 'invjeu' } de son canal privé jdw-sms-<pseudo en hexa> : la borne relit live_invitations) ;
--   b) dans la conversation avec lui (onglet Amis du hub : un message pg_sms_msg avec data.type = 'invite') ;
--   c) quand il rentre dans la borne plus tard (live_invitations), tant que le salon est ouvert.
-- Salon ouvert = un joueur de la salle est dans ce jeu depuis moins de 3 min (live_salon_vivant, appelé par la borne toutes les 60 s).
-- Pas de spam : une invitation par copain et par jeu toutes les 5 min ; après un « non », plus rien pendant 1 h pour ce jeu.
create table if not exists public.live_invites (
  id uuid primary key default gen_random_uuid(),
  de text not null, a text not null, jeu text not null, titre text not null default '',
  salle bigint not null references public.rooms(id) on delete cascade,
  etat text not null default 'envoyee' check (etat in ('envoyee', 'vue', 'acceptee', 'refusee')),
  created_at timestamptz not null default now(), repondu_at timestamptz
);
create index if not exists live_invites_a on public.live_invites (a, created_at desc);
create index if not exists live_invites_de on public.live_invites (de, a, jeu, created_at desc);
alter table public.live_invites enable row level security;
create table if not exists public.live_salons (
  jeu text not null, salle bigint not null references public.rooms(id) on delete cascade, vivant_at timestamptz not null default now(),
  primary key (jeu, salle)
);
alter table public.live_salons enable row level security;

create or replace function pegase_int.live_ouvert(p_jeu text, p_salle bigint) returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.live_salons s where s.jeu = p_jeu and s.salle = p_salle and s.vivant_at > now() - interval '3 minutes') $$;

create or replace function pegase_int.live_poke(n text) returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if n is null or n = '' or to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then return; end if;
  begin perform realtime.send(jsonb_build_object('t', 'invjeu'), 'poke', 'jdw-sms-' || encode(convert_to(n, 'UTF8'), 'hex'), true); exception when others then null; end;
end $$;

-- le salon est ouvert : je joue à ce jeu dans cette salle (la borne l'appelle à l'ouverture du jeu puis toutes les 60 s)
create or replace function public.live_salon_vivant(p_name text, p_jeu text, p_salle bigint) returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); j text := left(lower(btrim(coalesce(p_jeu, ''))), 24);
begin
  perform public.acct_check(n);
  if j !~ '^[a-z0-9_-]{2,24}$' or not exists (select 1 from public.room_members m where m.room_id = p_salle and m.name = n) then return false; end if;
  insert into public.live_salons (jeu, salle, vivant_at) values (j, p_salle, now()) on conflict (jeu, salle) do update set vivant_at = now();
  return true;
end $$;

-- inviter : p_a = les pseudos choisis (null = toute la salle) ; rend une ligne par copain : envoyée, ou pourquoi pas
create or replace function public.live_inviter(p_name text, p_jeu text, p_salle bigint, p_titre text, p_a text[] default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); j text := left(lower(btrim(coalesce(p_jeu, ''))), 24); t text := left(btrim(coalesce(p_titre, '')), 40);
  x record; res jsonb := '[]'::jsonb; i uuid; cv record; mid text; sn text; b text; sm public.pg_sms_msg;
begin
  perform public.acct_check(n);
  if j !~ '^[a-z0-9_-]{2,24}$' then raise exception 'jeu inconnu'; end if;
  if not exists (select 1 from public.room_members m where m.room_id = p_salle and m.name = n) then raise exception 'pas dans la salle'; end if;
  perform public.pg_rate(n, 'live-inviter', 30, interval '1 hour');
  if t = '' then t := j; end if;
  select r.name into sn from public.rooms r where r.id = p_salle;
  insert into public.live_salons (jeu, salle, vivant_at) values (j, p_salle, now()) on conflict (jeu, salle) do update set vivant_at = now();
  for x in select m.name from public.room_members m where m.room_id = p_salle and m.name <> n and m.name !~ '^PNJ:'
             and (p_a is null or m.name = any (select public.pg_n(z) from unnest(p_a) z)) order by m.name loop
    if exists (select 1 from public.live_invites v where v.de = n and v.a = x.name and v.jeu = j and v.etat = 'refusee' and v.repondu_at > now() - interval '1 hour') then
      res := res || jsonb_build_object('a', x.name, 'ok', false, 'raison', 'refuse'); continue; end if;
    if exists (select 1 from public.live_invites v where v.de = n and v.a = x.name and v.jeu = j and v.created_at > now() - interval '5 minutes') then
      res := res || jsonb_build_object('a', x.name, 'ok', false, 'raison', 'deja'); continue; end if;
    insert into public.live_invites (de, a, jeu, titre, salle) values (n, x.name, j, t, p_salle) returning id into i;
    -- b) dans la conversation : un message de moi, qui porte l'invitation (le hub dessine « ▶️ Rejoindre »)
    begin
      select * into cv from pegase_int.sms_conv(n, 'p:' || x.name, true);
      mid := 'inv' || replace(i::text, '-', '');
      b := '📣 Je t’invite à jouer à ' || t || ' avec moi, dans la salle ' || coalesce(sn, '') || ' ! Touche « Rejoindre ».';
      insert into public.pg_sms_msg (mid, conv, sender, body, data) values (mid, cv.r_conv, n, b,
        jsonb_build_object('type', 'invite', 'id', i, 'jeu', j, 'titre', t, 'salle', p_salle, 'salle_nom', sn)) returning * into sm;
      update public.pg_sms_conv c set last_id = sm.id, last_at = sm.created_at,
          a_got = case when c.a = n then sm.id else c.a_got end, a_read = case when c.a = n then sm.id else c.a_read end,
          b_got = case when c.b = n then sm.id else c.b_got end, b_read = case when c.b = n then sm.id else c.b_read end
        where c.id = cv.r_conv;
      perform pegase_int.sms_poke(x.name);
    exception when others then null;   -- la conversation n'est qu'un 2e chemin : l'invitation reste
    end;
    -- a) tout de suite, s'il est en ligne
    perform pegase_int.live_poke(x.name);
    res := res || jsonb_build_object('a', x.name, 'ok', true, 'id', i);
  end loop;
  perform pegase_int.sms_poke(n);
  return res;
end $$;

-- mes invitations encore valables (salon ouvert, moins de 2 h, pas encore répondues) : la borne les montre à l'arrivée et sur le signal
create or replace function public.live_invitations(p_name text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  return coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'de', v.de, 'jeu', v.jeu, 'titre', v.titre, 'salle', v.salle, 'salle_nom', r.name, 'at', v.created_at) order by v.created_at desc)
    from (select distinct on (v.de, v.jeu, v.salle) v.* from public.live_invites v where v.a = n and v.etat in ('envoyee', 'vue') and v.created_at > now() - interval '2 hours'
            and pegase_int.live_ouvert(v.jeu, v.salle) order by v.de, v.jeu, v.salle, v.created_at desc) v
    join public.rooms r on r.id = v.salle), '[]'::jsonb);
end $$;

-- répondre : oui → { ok, jeu, salle, salle_nom } (la borne ouvre le jeu dans cette salle) ; salon fermé → { fini: true } ; non → { ok }
create or replace function public.live_invitation_repondre(p_name text, p_id uuid, p_oui boolean) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); v public.live_invites; sn text;
begin
  perform public.acct_check(n);
  select * into v from public.live_invites x where x.id = p_id and x.a = n;
  if v.id is null then raise exception 'invitation inconnue'; end if;
  select r.name into sn from public.rooms r where r.id = v.salle;
  if coalesce(p_oui, false) then
    if not pegase_int.live_ouvert(v.jeu, v.salle) or v.created_at < now() - interval '2 hours' then
      return jsonb_build_object('fini', true, 'de', v.de, 'titre', v.titre); end if;
    if not exists (select 1 from public.room_members m where m.room_id = v.salle and m.name = n) then return jsonb_build_object('fini', true, 'de', v.de, 'titre', v.titre); end if;
    update public.live_invites x set etat = 'acceptee', repondu_at = now() where x.a = n and x.jeu = v.jeu and x.salle = v.salle and x.etat in ('envoyee', 'vue');
    return jsonb_build_object('ok', true, 'jeu', v.jeu, 'titre', v.titre, 'salle', v.salle, 'salle_nom', sn, 'de', v.de);
  end if;
  update public.live_invites x set etat = 'refusee', repondu_at = now() where x.a = n and x.de = v.de and x.jeu = v.jeu and x.etat in ('envoyee', 'vue');
  return jsonb_build_object('ok', true);
end $$;

-- pour la fenêtre d'invitation : mes dernières invitations de ce jeu (par copain : quand, et sa réponse)
create or replace function public.live_invites_envoyees(p_name text, p_jeu text, p_salle bigint) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  return coalesce((select jsonb_object_agg(v.a, jsonb_build_object('at', v.created_at, 'etat', v.etat, 'repondu_at', v.repondu_at))
    from (select distinct on (v.a) v.* from public.live_invites v where v.de = n and v.jeu = lower(p_jeu) and v.salle = p_salle and v.created_at > now() - interval '2 hours'
          order by v.a, v.created_at desc) v), '{}'::jsonb);
end $$;

revoke all on function public.live_salon_vivant(text, text, bigint), public.live_inviter(text, text, bigint, text, text[]), public.live_invitations(text),
  public.live_invitation_repondre(text, uuid, boolean), public.live_invites_envoyees(text, text, bigint) from public, anon;
grant execute on function public.live_salon_vivant(text, text, bigint), public.live_inviter(text, text, bigint, text, text[]), public.live_invitations(text),
  public.live_invitation_repondre(text, uuid, boolean), public.live_invites_envoyees(text, text, bigint) to authenticated;
revoke all on function pegase_int.live_ouvert(text, bigint), pegase_int.live_poke(text) from public, anon, authenticated;
