-- ===== records-copains.sql : « JUJU a battu ton record » aussi pour les TEMPS de Turbo Chrono et les COFFRES (borne 1.46.9, 27 oct. 2026) =====
-- PATOU : « le fait que quelqu'un a battu ou pas s'affiche en notification dans l'application ; ça se met dans les messages de la salle ».
-- Les scores des jeux classiques le faisaient déjà (add_score : notifications + carte « record » du chat). Les temps par circuit (chrono_runs)
-- et les meilleurs coups par coffre (level_bests) sont gardés par joueur, pour tout le monde : quand l'un d'eux s'améliore, on regarde chaque
-- salle du joueur :
--   * chaque membre dont il vient de passer devant (il ne l'était pas avant) reçoit une notification (table notifications, lue par
--     get_notifications comme avant) ;
--   * s'il prend la 1re place de la salle sur ce circuit / ce coffre : carte « record » dans le chat de la salle (table messages).
-- game = '<jeu>@<niveau>' : 'chrono@stade', 'coffres@3-7' (les bornes d'avant la 1.46.9 l'affichent sans le nom du jeu, sans planter).
-- score / prev : chrono = millisecondes ; coffres = coups. Plus petit = meilleur.
-- PAS DE SPAM : une même notification (salle, copain, auteur, circuit ou coffre) dans l'heure est mise à jour au lieu d'être répétée ;
-- dans le chat, une seule carte par joueur et par jeu et par heure (la carte de l'heure est mise à jour avec le dernier record).
-- ORDRE : après chrono.sql et sauvegarde.sql. Relançable. Ne change AUCUNE fonction existante (déclencheurs à part).

create or replace function public.rec_copains(p_tag text, p_name text, p_val int, k_new bigint, k_old bigint, p_others jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
-- p_others : { "<salle>": [{ "n": nom, "v": valeur affichée, "k": clé de comparaison }] } = les autres membres de chaque salle du joueur
declare r record; o jsonb; best jsonb; base text := split_part(p_tag, '@', 1); mid bigint;
begin
  if k_old is not null and k_new >= k_old then return; end if;
  for r in select key::bigint as room_id, value as lst from jsonb_each(coalesce(p_others, '{}'::jsonb)) loop
    best := null;
    for o in select value from jsonb_array_elements(r.lst) loop
      if best is null or (o->>'k')::bigint < (best->>'k')::bigint then best := o; end if;
      -- il passe devant ce copain (il ne l'était pas avant) : notification, une seule par heure (mise à jour)
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
    -- 1re place de la salle sur ce circuit / ce coffre : carte « record » dans le chat (une par joueur, par jeu, par heure)
    if best is not null and k_new < (best->>'k')::bigint and (k_old is null or k_old >= (best->>'k')::bigint) then
      update public.messages m set game = p_tag, score = p_val, beaten = best->>'n', beaten_score = (best->>'v')::int,
          body = p_name || ' a battu le record de ' || (best->>'n')
        where m.id = (select z.id from public.messages z where z.room_id = r.room_id and z.kind = 'record' and z.name = p_name
                      and split_part(coalesce(z.game, ''), '@', 1) = base and z.game like '%@%' and z.created_at > now() - interval '1 hour' order by z.id desc limit 1)
        returning m.id into mid;
      if mid is null then
        insert into public.messages (room_id, name, body, kind, game, score, beaten, beaten_score)
          values (r.room_id, p_name, p_name || ' a battu le record de ' || (best->>'n'), 'record', p_tag, p_val, best->>'n', (best->>'v')::int);
      end if;
      mid := null;
    end if;
  end loop;
exception when others then
  -- jamais bloquer l'enregistrement d'un temps ou d'un coffre pour une notification
  raise warning 'rec_copains : %', sqlerrm;
end $$;
revoke all on function public.rec_copains(text, text, int, bigint, bigint, jsonb) from public, anon, authenticated;

-- Turbo Chrono : un temps meilleur sur un circuit
create or replace function public.rec_chrono_trg() returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare oth jsonb;
begin
  if tg_op = 'UPDATE' and new.ms >= old.ms then return new; end if;
  select coalesce(jsonb_object_agg(x.room_id, x.l), '{}'::jsonb) into oth from (
    select m.room_id, jsonb_agg(jsonb_build_object('n', c.name, 'v', c.ms, 'k', c.ms)) l
    from public.room_members m
    join public.room_members o on o.room_id = m.room_id and o.name <> m.name
    join public.chrono_runs c on c.track = new.track and c.name = o.name
    where m.name = new.name group by m.room_id) x;
  perform public.rec_copains('chrono@' || new.track, new.name, new.ms, new.ms::bigint, case when tg_op = 'UPDATE' then old.ms::bigint end, oth);
  return new;
end $$;
do $$ begin if to_regclass('public.chrono_runs') is not null then
  drop trigger if exists rec_chrono on public.chrono_runs;
  create trigger rec_chrono after insert or update of ms on public.chrono_runs for each row execute function public.rec_chrono_trg();
end if; end $$;

-- Coffres à Secrets (et tout jeu à niveaux) : moins de coups, puis moins de temps
create or replace function public.rec_level_trg() returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare oth jsonb; kn bigint := new.moves::bigint * 1000000000 + new.ms; ko bigint;
begin
  if tg_op = 'UPDATE' then ko := old.moves::bigint * 1000000000 + old.ms; if kn >= ko then return new; end if; end if;
  select coalesce(jsonb_object_agg(x.room_id, x.l), '{}'::jsonb) into oth from (
    select m.room_id, jsonb_agg(jsonb_build_object('n', b.name, 'v', b.moves, 'k', b.moves::bigint * 1000000000 + b.ms)) l
    from public.room_members m
    join public.room_members o on o.room_id = m.room_id and o.name <> m.name
    join public.level_bests b on b.game = new.game and b.level = new.level and b.name = o.name
    where m.name = new.name group by m.room_id) x;
  perform public.rec_copains(new.game || '@' || new.level, new.name, new.moves, kn, ko, oth);
  return new;
end $$;
do $$ begin if to_regclass('public.level_bests') is not null then
  drop trigger if exists rec_level on public.level_bests;
  create trigger rec_level after insert or update of moves, ms on public.level_bests for each row execute function public.rec_level_trg();
end if; end $$;
