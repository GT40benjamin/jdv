-- ===== records-une-carte.sql : UNE SEULE carte « record » par exploit (borne 2.0.15, 3 nov. 2026) =====
-- Benjamin (capture du 2 nov. 22:00, Coffres à Secrets) : « je ne comprends pas pourquoi tu le mets deux fois ! » — EMPEREUR avait battu PATOU
-- au coffre 4 du monde 3 (level_bests → rec_level_trg → rec_copains, game 'coffres@3-4') ET au score total (add_score, game 'coffres') dans
-- la même partie : deux cartes à la même seconde (messages 224 et 225, écrits par deux requêtes EN PARALLÈLE). Même chose pour Sens Interdit
-- (« Plus loin » sensinterdit-km et « Plus vite » sensinterdit-vitesse, messages 210 et 211).
-- Désormais toutes les cartes « record » passent par public.rec_carte :
--   * même salle, même gagnant, même perdant, même JEU (rec_famille : 'coffres@3-4' et 'coffres' = coffres ; sensinterdit-km et -vitesse =
--     sensinterdit) posée il y a moins de 2 minutes → la carte est FUSIONNÉE : meta.lignes = [{g: tag, v: score, b: score battu}, …] (une ligne
--     par record battu, la même ligne remplacée si le même record est rebattu) ;
--   * sinon, pour un niveau ('jeu@niveau'), la règle d'avant reste : une carte par joueur, par jeu et par heure, remplacée par le dernier record ;
--   * la carte fusionnée ou remplacée est RÉÉCRITE (nouvel id, réactions déplacées) : les bornes ouvertes la reçoivent en direct (get_messages2
--     ne relit que les id plus grands) ; la borne regroupe aussi l'ancienne à l'affichage (même clé, 2 min), et les anciennes cartes doublées.
--   * verrou pg_advisory_xact_lock (salle, gagnant, jeu) : les deux requêtes parallèles d'une même partie passent l'une après l'autre.
-- La cloche (notifications) garde une ligne par record battu (score et ancien score de chacun) : la BORNE les regroupe en UNE notification
-- (même auteur, même jeu, moins de 2 min d'écart), avec ses lignes.
-- ORDRE : à RELANCER après public.sql, members.sql, accounts.sql ou records-copains.sql (ils redéfinissent add_score / rec_copains sans rec_carte).
-- Relançable. Ne change que rec_copains et add_score (mêmes signatures, mêmes droits) ; ajoute rec_famille et rec_carte (internes).

create or replace function public.rec_famille(p_tag text) returns text
language sql immutable set search_path to 'public', 'extensions' as $$
  select case when split_part(coalesce(p_tag, ''), '@', 1) like 'sensinterdit-%' then 'sensinterdit' else split_part(coalesce(p_tag, ''), '@', 1) end
$$;
revoke all on function public.rec_famille(text) from public, anon, authenticated;

create or replace function public.rec_carte(p_room bigint, p_name text, p_tag text, p_val int, p_beaten text, p_bval int)
returns void language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare fam text := public.rec_famille(p_tag); m public.messages%rowtype; fusion boolean := false; l jsonb := null; nid bigint;
begin
  perform pg_advisory_xact_lock(hashtext('rec_carte:' || p_room || ':' || coalesce(p_name, '') || ':' || fam));
  select z.* into m from public.messages z
    where z.room_id = p_room and z.kind = 'record' and z.name = p_name and public.rec_famille(z.game) = fam
      and ((z.beaten = p_beaten and z.created_at > now() - interval '2 minutes')
           or (p_tag like '%@%' and z.game like '%@%' and z.created_at > now() - interval '1 hour'))
    order by (z.beaten = p_beaten and z.created_at > now() - interval '2 minutes') desc, z.id desc limit 1;
  if m.id is not null then
    fusion := m.beaten = p_beaten and m.created_at > now() - interval '2 minutes';
    if fusion then
      l := coalesce(m.meta -> 'lignes', jsonb_build_array(jsonb_build_object('g', m.game, 'v', m.score, 'b', m.beaten_score)));
      select coalesce(jsonb_agg(e), '[]'::jsonb) into l from jsonb_array_elements(l) e where e ->> 'g' <> p_tag;
      l := l || jsonb_build_array(jsonb_build_object('g', p_tag, 'v', p_val, 'b', p_bval));
    end if;
  end if;
  insert into public.messages (room_id, name, body, kind, game, score, beaten, beaten_score, meta)
    values (p_room, p_name, p_name || ' a battu le record de ' || p_beaten, 'record', p_tag, p_val, p_beaten, p_bval,
            case when l is not null and jsonb_array_length(l) > 1 then coalesce(m.meta, '{}'::jsonb) || jsonb_build_object('lignes', l) end)
    returning id into nid;
  if m.id is not null then
    update public.reactions set message_id = nid where message_id = m.id;
    delete from public.messages where id = m.id;
  end if;
exception when others then
  raise warning 'rec_carte : %', sqlerrm;
end $$;
revoke all on function public.rec_carte(bigint, text, text, int, text, int) from public, anon, authenticated;

create or replace function public.rec_copains(p_tag text, p_name text, p_val integer, k_new bigint, k_old bigint, p_others jsonb)
 returns void language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare r record; o jsonb; best jsonb; mid bigint;
begin
  if k_old is not null and k_new >= k_old then return; end if;
  for r in select key::bigint as room_id, value as lst from jsonb_each(coalesce(p_others, '{}'::jsonb)) loop
    best := null;
    for o in select value from jsonb_array_elements(r.lst) loop
      if best is null or (o->>'k')::bigint < (best->>'k')::bigint then best := o; end if;
      if k_new < (o->>'k')::bigint and (k_old is null or k_old >= (o->>'k')::bigint) then
        update public.notifications x set score = p_val, prev = (o->>'v')::int, created_at = now()
          where x.id = (select y.id from public.notifications y where y.room_id = r.room_id and y.target = o->>'n' and y.actor = p_name
                        and y.game = p_tag and y.created_at > now() - interval '1 hour' order by y.id desc limit 1)
          returning x.id into mid;
        if mid is null then
          insert into public.notifications (room_id, target, actor, game, score, prev) values (r.room_id, o->>'n', p_name, p_tag, p_val, (o->>'v')::int);
        end if;
        mid := null;
      end if;
    end loop;
    if best is not null and k_new < (best->>'k')::bigint and (k_old is null or k_old >= (best->>'k')::bigint) then
      perform public.rec_carte(r.room_id, p_name, p_tag, p_val, best->>'n', (best->>'v')::int);   -- 2.0.15 : une seule carte par exploit
    end if;
  end loop;
exception when others then
  raise warning 'rec_copains : %', sqlerrm;
end $function$;
revoke all on function public.rec_copains(text, text, int, bigint, bigint, jsonb) from public, anon, authenticated;

create or replace function public.add_score(p_code text, p_room bigint, p_room_code text, p_game text, p_name text, p_score integer)
 returns void language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); v_prev int; v_top int; v_top_name text;
begin
  perform public.room_guard(p_room);
  perform public.acct_check(n);
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then return; end if;
  select s.score, s.name into v_top, v_top_name from public.scores s where s.room_id = p_room and s.game = p_game and s.name <> n
    and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = s.name)
    order by s.score desc, s.created_at limit 1;
  select max(s.score) into v_prev from public.scores s where s.room_id = p_room and s.game = p_game and s.name = n;
  if v_prev is null or p_score > v_prev then
    insert into public.notifications (room_id, target, actor, game, score, prev)
      select p_room, b.name, n, p_game, p_score, b.best
      from (select s.name, max(s.score) as best from public.scores s
            where s.room_id = p_room and s.game = p_game and s.name <> n
              and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = s.name) group by s.name) b
      where b.best > 0 and b.best < p_score and b.best >= coalesce(v_prev, 0);
    if v_top is not null and v_top > 0 and p_score > v_top and v_top >= coalesce(v_prev, 0) then
      perform public.rec_carte(p_room, n, p_game, p_score, v_top_name, v_top);   -- 2.0.15 : une seule carte par exploit
    end if;
  end if;
  insert into public.scores (room_id, game, name, score) values (p_room, p_game, n, p_score);
  delete from public.scores s where s.room_id = p_room and s.game = p_game and s.name = n and s.id <> (
    select x.id from public.scores x where x.room_id = p_room and x.game = p_game and x.name = n
    order by x.score desc, x.created_at limit 1);
  delete from public.notifications where created_at < now() - interval '60 days';
end $function$;
