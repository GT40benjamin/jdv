-- 7 nov. 2026 — Interface : « 🎮 Inviter un ami à jouer avec moi » sur la VERSION EN ESSAI d'un jeu de l'Atelier (demande de Benjamin).
-- S'appuie sur l'invitation déjà en place (source/inviter.sql, SQL v136 : live_invites, signal { t: 'invjeu' }, conversation, live_invitations,
-- live_invitation_repondre, ?rejoindre=<id>) : une invitation « en essai » porte en plus la FICHE et la VERSION. Rien de neuf côté jeu : les deux
-- joueurs sont dans la même salle, avec la même version, et api.live / api.monde les relient comme d'habitude.
--   * live_invites : + fiche uuid, + version int (null = invitation ordinaire, inchangée) ;
--   * pegase_int.at_essai_ok(fiche, version) : la version est toujours celle en essai (pas remplacée par une suivante, pas encore publiée) ;
--   * public.at_inviter_essai(p_name, p_fiche, p_salle, p_a[]) : l'auteur du jeu (ou un admin) ; le jeu doit être jouable (alpha / publié) ;
--     chaque ami doit être membre de la salle choisie (comme l'hôte) ; 5 invitations « en essai » en attente au plus par hôte ; le texte ne dit
--     JAMAIS rien de prix, de crédits ni de coûts ; message dans la conversation + signal + notification 🔔 (file at_push_file, sorte 'invitation') ;
--   * public.at_inviter_essai_amis(p_name) : mes salles et leurs membres (sans photo), pour la fenêtre ;
--   * live_invitations / live_invitation_repondre : renvoient aussi fiche et version ; une invitation en essai disparaît dès que sa version est
--     publiée ou remplacée (at_essai_ok), et n'ouvre l'accès qu'à l'invité ;
--   * notifications 🔔 : at_push_file accepte 'invitation' ; at_push_prendre l'écrit « 🎮 PATOU t’invite à jouer à « Astrofaune » ! » → ?rejoindre=<id>.
-- Essai : begin; <ce fichier>; … ; rollback;   — puis pour de vrai. Rejouable. Test : node test-invite-essai-sql.mjs (PGlite).

alter table public.live_invites add column if not exists fiche uuid;
alter table public.live_invites add column if not exists version int;
create index if not exists live_invites_essai on public.live_invites (de, created_at desc) where fiche is not null;

create or replace function pegase_int.at_essai_ok(p_fiche uuid, p_version int) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.at_fiches f where f.id = p_fiche and f.supprime_at is null and f.etat in ('alpha', 'publie_salle', 'publie_monde')
    and coalesce(f.version_jeu, 1) = p_version and coalesce(f.version_publiee, 0) < p_version) $$;

create or replace function public.at_inviter_essai_amis(p_name text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  return coalesce((select jsonb_agg(jsonb_build_object('salle', r.id, 'salle_nom', r.name,
      'membres', coalesce((select jsonb_agg(jsonb_build_object('name', m.name, 'vu', m.last_seen) order by m.last_seen desc nulls last)
        from public.room_members m where m.room_id = r.id and m.name <> n and m.name !~ '^PNJ:'), '[]'::jsonb)) order by r.name)
    from public.rooms r where exists (select 1 from public.room_members x where x.room_id = r.id and x.name = n)), '[]'::jsonb);
end $$;

create or replace function public.at_inviter_essai(p_name text, p_fiche uuid, p_salle bigint, p_a text[])
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; v int; t text; sn text; x record; res jsonb := '[]'::jsonb; i uuid; cv record; mid text; b text; sm public.pg_sms_msg; att int;
begin
  perform public.acct_check(n);
  select * into f from public.at_fiches z where z.id = p_fiche and z.supprime_at is null;
  if f.id is null then raise exception 'projet inconnu'; end if;
  if f.name <> n and not exists (select 1 from public.at_admins a where a.name = n) then raise exception 'pas ton jeu'; end if;
  if f.jeu is null or f.jeu !~ '^[a-z0-9_-]{2,24}$' or f.etat not in ('alpha', 'publie_salle', 'publie_monde') then raise exception 'jeu pas encore jouable'; end if;
  if not exists (select 1 from public.room_members m where m.room_id = p_salle and m.name = n) then raise exception 'pas dans la salle'; end if;
  perform public.pg_rate(n, 'at-inviter-essai', 30, interval '1 hour');
  v := coalesce(f.version_jeu, 1);
  t := left(coalesce(nullif(btrim(f.titre), ''), 'mon jeu'), 30) || ' (V' || v || ' en essai)';
  select r.name into sn from public.rooms r where r.id = p_salle;
  select count(*) into att from public.live_invites w where w.de = n and w.fiche is not null and w.etat in ('envoyee', 'vue') and w.created_at > now() - interval '2 hours'
    and pegase_int.at_essai_ok(w.fiche, w.version);
  insert into public.live_salons (jeu, salle, vivant_at) values (f.jeu, p_salle, now()) on conflict (jeu, salle) do update set vivant_at = now();
  for x in select m.name from public.room_members m where m.room_id = p_salle and m.name <> n and m.name !~ '^PNJ:'
             and m.name = any (select public.pg_n(z) from unnest(coalesce(p_a, '{}')) z) order by m.name loop
    if exists (select 1 from public.live_invites w where w.de = n and w.a = x.name and w.jeu = f.jeu and w.etat = 'refusee' and w.repondu_at > now() - interval '1 hour') then
      res := res || jsonb_build_object('a', x.name, 'ok', false, 'raison', 'refuse'); continue; end if;
    if exists (select 1 from public.live_invites w where w.de = n and w.a = x.name and w.fiche = f.id and w.version = v and w.etat in ('envoyee', 'vue') and w.created_at > now() - interval '5 minutes') then
      res := res || jsonb_build_object('a', x.name, 'ok', false, 'raison', 'deja'); continue; end if;
    if att >= 5 then res := res || jsonb_build_object('a', x.name, 'ok', false, 'raison', 'cinq'); continue; end if;
    insert into public.live_invites (de, a, jeu, titre, salle, fiche, version) values (n, x.name, f.jeu, t, p_salle, f.id, v) returning id into i;
    att := att + 1;
    begin   -- dans la conversation (le hub dessine « ▶️ Rejoindre ») ; jamais de prix ni de crédits
      select * into cv from pegase_int.sms_conv(n, 'p:' || x.name, true);
      mid := 'inv' || replace(i::text, '-', '');
      b := '🎮 Viens jouer avec moi à ' || t || ', dans la salle ' || coalesce(sn, '') || ' ! Touche « Rejoindre ».';
      insert into public.pg_sms_msg (mid, conv, sender, body, data) values (mid, cv.r_conv, n, b,
        jsonb_build_object('type', 'invite', 'id', i, 'jeu', f.jeu, 'titre', t, 'salle', p_salle, 'salle_nom', sn, 'essai', true)) returning * into sm;
      update public.pg_sms_conv c set last_id = sm.id, last_at = sm.created_at,
          a_got = case when c.a = n then sm.id else c.a_got end, a_read = case when c.a = n then sm.id else c.a_read end,
          b_got = case when c.b = n then sm.id else c.b_got end, b_read = case when c.b = n then sm.id else c.b_read end
        where c.id = cv.r_conv;
      perform pegase_int.sms_poke(x.name);
    exception when others then null;
    end;
    perform pegase_int.live_poke(x.name);
    begin perform pegase_int.at_push_mettre(x.name, f.id, 'invitation', i, v, f.titre); exception when others then null; end;   -- 🔔 s'il est abonné
    res := res || jsonb_build_object('a', x.name, 'ok', true, 'id', i);
  end loop;
  perform pegase_int.sms_poke(n);
  return jsonb_build_object('salle', p_salle, 'version', v, 'jeu', f.jeu, 'envois', res, 'en_attente', att);
end $$;

-- mes invitations encore valables : + fiche / version ; une invitation en essai dont la version est publiée ou remplacée disparaît
create or replace function public.live_invitations(p_name text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  return coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'de', v.de, 'jeu', v.jeu, 'titre', v.titre, 'salle', v.salle, 'salle_nom', r.name, 'at', v.created_at,
      'fiche', v.fiche, 'version', v.version, 'essai', v.fiche is not null) order by v.created_at desc)
    from (select distinct on (v.de, v.jeu, v.salle) v.* from public.live_invites v where v.a = n and v.etat in ('envoyee', 'vue') and v.created_at > now() - interval '2 hours'
            and pegase_int.live_ouvert(v.jeu, v.salle) and (v.fiche is null or pegase_int.at_essai_ok(v.fiche, v.version))
            order by v.de, v.jeu, v.salle, v.created_at desc) v
    join public.rooms r on r.id = v.salle), '[]'::jsonb);
end $$;

create or replace function public.live_invitation_repondre(p_name text, p_id uuid, p_oui boolean) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); v public.live_invites; sn text;
begin
  perform public.acct_check(n);
  select * into v from public.live_invites x where x.id = p_id and x.a = n;
  if v.id is null then raise exception 'invitation inconnue'; end if;
  select r.name into sn from public.rooms r where r.id = v.salle;
  if coalesce(p_oui, false) then
    if not pegase_int.live_ouvert(v.jeu, v.salle) or v.created_at < now() - interval '2 hours'
       or (v.fiche is not null and not pegase_int.at_essai_ok(v.fiche, v.version)) then
      return jsonb_build_object('fini', true, 'de', v.de, 'titre', v.titre, 'essai', v.fiche is not null); end if;
    if not exists (select 1 from public.room_members m where m.room_id = v.salle and m.name = n) then return jsonb_build_object('fini', true, 'de', v.de, 'titre', v.titre, 'essai', v.fiche is not null); end if;
    update public.live_invites x set etat = 'acceptee', repondu_at = now() where x.a = n and x.jeu = v.jeu and x.salle = v.salle and x.etat in ('envoyee', 'vue');
    return jsonb_build_object('ok', true, 'jeu', v.jeu, 'titre', v.titre, 'salle', v.salle, 'salle_nom', sn, 'de', v.de, 'fiche', v.fiche, 'version', v.version, 'essai', v.fiche is not null);
  end if;
  update public.live_invites x set etat = 'refusee', repondu_at = now() where x.a = n and x.de = v.de and x.jeu = v.jeu and x.etat in ('envoyee', 'vue');
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.at_inviter_essai(text, uuid, bigint, text[]), public.at_inviter_essai_amis(text) from public, anon;
grant execute on function public.at_inviter_essai(text, uuid, bigint, text[]), public.at_inviter_essai_amis(text) to authenticated;
revoke all on function pegase_int.at_essai_ok(uuid, int) from public, anon, authenticated;

-- ---- notifications 🔔 : la sorte 'invitation' (file at_push_file de notifs-push.sql, déjà en ligne)
do $$
declare c text;
begin
  if to_regclass('public.at_push_file') is null then raise notice 'at_push_file absente : notifications non branchées'; return; end if;
  for c in select con.conname from pg_constraint con where con.conrelid = 'public.at_push_file'::regclass and con.contype = 'c' and pg_get_constraintdef(con.oid) like '%sorte%' loop
    execute 'alter table public.at_push_file drop constraint ' || quote_ident(c);
  end loop;
  alter table public.at_push_file add constraint at_push_file_sorte_check check (sorte in ('message', 'demande', 'version', 'creation', 'invitation'));
end $$;

-- at_push_prendre (notifs-push.sql) + la sorte 'invitation' : passe avant tout, abandonnée si l'invitation n'attend plus, ouvre ?rejoindre=<id>
create or replace function public.at_push_prendre(p_max int default 50)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  heure time := coalesce(nullif(current_setting('jdw.push_heure', true), '')::time, (now() at time zone 'Europe/Paris')::time);   -- jdw.push_heure : seulement pour les essais
  g jsonb; nom text; res jsonb := '[]'::jsonb; r record; corps text; tab text; t text; u text; de text;
begin
  update public.at_push_file x set envoye_at = now(), etat = 'vieux' where x.envoye_at is null and x.at < now() - interval '24 hours';
  update public.at_push_file x set envoye_at = now(), etat = 'lu' from public.at_fiches f
    where x.envoye_at is null and f.id = x.fiche and x.sorte in ('message', 'version') and f.lu_joueur_at is not null and f.lu_joueur_at >= x.at;
  update public.at_push_file x set envoye_at = now(), etat = 'lu' from public.at_demandes d
    where x.envoye_at is null and x.sorte = 'demande' and d.id = x.ref and d.vu_joueur_at is not null and d.vu_joueur_at >= x.at;
  update public.at_push_file x set envoye_at = now(), etat = 'lu' where x.envoye_at is null and x.sorte = 'invitation'
    and not exists (select 1 from public.live_invites w where w.id = x.ref and w.etat in ('envoyee', 'vue') and w.created_at > now() - interval '2 hours' and (w.fiche is null or pegase_int.at_essai_ok(w.fiche, w.version)));
  update public.at_push_file x set envoye_at = now(), etat = 'sans_abo' where x.envoye_at is null and not exists (select 1 from public.at_push_abos a where a.name = x.name);
  if heure >= time '21:30' or heure < time '08:00' then return res; end if;
  select g0.v into g from public.at_textes g0 where g0.k = 'guide';
  nom := coalesce(nullif(btrim(g ->> 'nom'), ''), 'L’Atelier des jeux'); nom := upper(left(nom, 1)) || substr(nom, 2);
  for r in
    select x.name, x.fiche, array_agg(x.id) ids,
      (array_agg(x.sorte order by case x.sorte when 'invitation' then -1 when 'version' then 0 when 'creation' then 1 when 'demande' then 2 else 3 end, x.at desc))[1] sorte,
      (array_agg(x.version order by case x.sorte when 'invitation' then -1 when 'version' then 0 when 'creation' then 1 when 'demande' then 2 else 3 end, x.at desc))[1] version,
      (array_agg(x.titre order by case x.sorte when 'invitation' then -1 when 'version' then 0 when 'creation' then 1 when 'demande' then 2 else 3 end, x.at desc))[1] titre,
      (array_agg(x.ref order by case x.sorte when 'invitation' then -1 when 'version' then 0 when 'creation' then 1 when 'demande' then 2 else 3 end, x.at desc))[1] ref,
      (select ft.titre from public.at_fiches ft where ft.id = x.fiche) titre_jeu
    from public.at_push_file x
    where x.envoye_at is null and (x.at < now() - interval '90 seconds' or x.sorte = 'invitation')
      and not exists (select 1 from public.at_push_file y where y.name = x.name and y.fiche is not distinct from x.fiche and y.etat = 'ok' and y.envoye_at > now() - interval '5 minutes' and x.sorte <> 'invitation')
    group by x.name, x.fiche
    order by min(x.at)
    limit greatest(1, least(coalesce(p_max, 50), 200))
  loop
    t := nullif(btrim(coalesce(r.titre_jeu, '')), ''); u := null;
    if r.sorte = 'invitation' then select w.de into de from public.live_invites w where w.id = r.ref;
      corps := '🎮 ' || coalesce(de, 'Un ami') || ' t’invite à jouer à « ' || coalesce(t, 'son jeu') || ' » !'; u := '?rejoindre=' || r.ref::text;
    elsif r.sorte = 'version' then corps := '🎮 Ta V' || coalesce(r.version, 1) || ' de « ' || coalesce(t, 'ton jeu') || ' » est prête à essayer !'; tab := 'jeu';
    elsif r.sorte = 'creation' then corps := '✨ Ta retouche est prête : « ' || coalesce(nullif(btrim(coalesce(r.titre, '')), ''), 'ton image') || ' »' || coalesce(' V' || r.version, '') || ' !'; tab := '';
    elsif r.sorte = 'demande' then corps := '✅ C’est fait ! Ta demande pour « ' || coalesce(t, 'ton jeu') || ' » est prête.'; tab := 'demandes';
    else corps := '💬 Je t’ai répondu pour « ' || coalesce(t, 'ton projet') || ' »'; tab := 'demandes';
    end if;
    res := res || jsonb_build_object('ids', to_jsonb(r.ids), 'name', r.name,
      'notif', jsonb_build_object('t', nom, 'b', corps, 'tag', 'atl-' || coalesce(r.fiche::text, 'atelier'),
        'u', coalesce(u, '?atelier=projet' || coalesce('&f=' || r.fiche::text, '') || case when tab <> '' then '&o=' || tab else '' end)),
      'abos', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth)), '[]'::jsonb) from public.at_push_abos a where a.name = r.name));
    update public.at_push_file x set envoye_at = now(), etat = 'envoi' where x.id = any (r.ids);
  end loop;
  return res;
end $$;
revoke all on function public.at_push_prendre(int) from public, anon, authenticated;
grant execute on function public.at_push_prendre(int) to service_role;
-- le réveil part tout de suite pour une invitation (pas d'attente de 80 s) : la tâche cron accepte aussi les invitations récentes
select cron.unschedule('atelier-push') where exists (select 1 from cron.job where jobname = 'atelier-push');
select cron.schedule('atelier-push', '* * * * *',
  $c$ select pegase_int.at_push_reveil() where exists (select 1 from public.at_push_file where envoye_at is null and (at < now() - interval '80 seconds' or sorte = 'invitation')) $c$);
