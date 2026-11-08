-- ===== gagner-credits-distance.sql : le gain au record mondial de distance (Pigeon Bombardier), décision de l'admin, 9 nov. 2026 =====
-- REJOUABLE, après gagner-credits-noisette.sql. Le jeu n'est pas modifié : il envoie sa distance avec api.levelBest.putScore('m', mètres), rangée PAR SALLE (level_bests, niveau m-r<salle>, moves = 100 000 - mètres) et rien sans salle.
-- La borne (gagner.js) l'envoie donc aussi au niveau m-r0 : la « salle 0 » n'existe pas, c'est le classement mondial, et rec_level_trg ne prévient personne pour un niveau de cette salle.
-- Battre la distance d'un autre joueur : gc_distance_credits, une seule fois par joueur et pour toujours. Le créateur du jeu est exclu, améliorer sa propre distance ne paie pas.
-- La toute première distance du classement ne paie pas : il n'y a personne à battre.
-- Garde-fous : une partie ouverte depuis au moins gc_record_duree_min secondes (heure du serveur), et un saut de plus de gc_record_saut_pct % passe par un admin.
insert into public.at_reglages (k, v) values ('gc_distance_credits', 20) on conflict (k) do nothing;
insert into public.at_textes (k, v) values ('gc_jeux_distances', '{"pigeon": "m-r0"}'::jsonb) on conflict (k) do nothing;
alter table pegase_int.gc_records drop constraint if exists gc_records_sorte_check;
alter table pegase_int.gc_records add constraint gc_records_sorte_check check (sorte in ('jeu', 'course', 'niveau', 'distance'));

create or replace function pegase_int.gc_distance_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare c int; val int; avant int; autres int; nom text; nb int; deb timestamptz; saut int;
begin
  begin
    if not pegase_int.gc_ouvert() then return new; end if;
    if coalesce((select g.v ->> new.game from public.at_textes g where g.k = 'gc_jeux_distances'), '') <> new.level then return new; end if;
    val := 100000 - new.moves; if val <= 0 then return new; end if;
    c := pegase_int.gc_reglage('gc_distance_credits', 20);
    avant := case when tg_op = 'UPDATE' then 100000 - old.moves end;
    select 100000 - b.moves, b.name into autres, nom from public.level_bests b where b.game = new.game and b.level = new.level and b.name <> new.name order by b.moves, b.at limit 1;
    if autres is null then   -- seul au classement : personne à battre
      if avant is not null and val > avant then perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'distance', val, avant, new.name, c, 'refuse', 'soi_meme'); end if;
      return new;
    end if;
    if val <= autres then return new; end if;
    if avant is not null and avant > autres and pegase_int.gc_reglage('gc_record_soi_meme', 0) <> 1 then
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'distance', val, avant, new.name, c, 'refuse', 'soi_meme');
      return new;
    end if;
    if pegase_int.gc_createur(new.name, new.game) then
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'distance', val, autres, nom, c, 'refuse', 'createur');
      return new;
    end if;
    select count(distinct b.name) into nb from public.level_bests b where b.game = new.game and b.level = new.level;
    if nb < pegase_int.gc_reglage('gc_niveau_joueurs_min', 1) then
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'distance', val, autres, nom, c, 'refuse', 'joueurs');
      return new;
    end if;
    select p.debut_at into deb from pegase_int.gc_parties p where p.name = new.name and p.jeu = new.game;
    if deb is null or deb < now() - interval '6 hours' or deb > now() - make_interval(secs => pegase_int.gc_reglage('gc_record_duree_min', 20)) then
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'distance', val, autres, nom, c, 'refuse', 'partie');
      return new;
    end if;
    if exists (select 1 from pegase_int.gc_records r where r.name = new.name and r.jeu = new.game and r.niveau = new.level and r.etat in ('paye', 'attente')) then   -- une seule fois, pour toujours
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'distance', val, autres, nom, c, 'refuse', 'deja_niveau');
      return new;
    end if;
    saut := pegase_int.gc_reglage('gc_record_saut_pct', 300);
    if autres > 0 and val::numeric > autres::numeric * (100 + saut) / 100 then
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'distance', val, autres, nom, c, 'attente', 'saut tres grand par rapport au record');
      return new;
    end if;
    perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'distance', val, autres, nom, c, 'paye', null);
  exception when others then null;   -- un gain raté ne doit jamais empêcher d'enregistrer une distance
  end;
  return new;
end $$;
drop trigger if exists gc_distance on public.level_bests;
create trigger gc_distance after insert or update of moves, ms on public.level_bests for each row execute function pegase_int.gc_distance_trg();
revoke all on function pegase_int.gc_distance_trg() from public, anon, authenticated;

create or replace function public.gc_records_carte(p_name text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare n text := public.pg_n(p_name); j date := pegase_int.gc_jour(); mini int := pegase_int.gc_reglage('gc_record_joueurs_min', 5);
  gj int := pegase_int.gc_reglage('gc_record_credits', 20); gc int := pegase_int.gc_reglage('gc_course_credits', 10); gn int := pegase_int.gc_reglage('gc_niveau_credits', 20); gd int := pegase_int.gc_reglage('gc_distance_credits', 20);
begin
  if pegase_int.gc_reglage('gc_actif', 1) <> 1 then return jsonb_build_object('actif', false); end if;
  if not pegase_int.gc_ouvert() and not (pegase_int.at_patron(n) and public.acct_own(n)) then return jsonb_build_object('actif', false); end if;   -- fermé : rien pour les joueurs, pas même les sigles
  return jsonb_build_object('actif', true, 'test', not pegase_int.gc_ouvert(), 'gain_jeu', gj, 'gain_course', gc, 'gain_niveau', gn, 'gain_distance', gd, 'min', mini,
    'jeux', coalesce((select jsonb_object_agg(t.game, jsonb_build_object('record', t.score, 'nom', t.name, 'deja', exists (select 1 from pegase_int.gc_records r where r.name = n and r.jeu = t.game and r.niveau = '' and r.jour = j and r.etat <> 'refuse')))
      from (select distinct on (a.game) a.game, a.score, a.name, count(*) over (partition by a.game) nb
            from (select distinct on (u.game, u.name) u.game, u.name, u.score, u.created_at
                  from (select s.game, s.name, s.score, s.created_at from public.scores s union all select w.game, w.name, w.score, w.created_at from public.world_bests w) u
                  order by u.game, u.name, u.score desc) a
            where exists (select 1 from public.at_textes g where g.k = 'gc_jeux_records' and g.v ? a.game)
            order by a.game, a.score desc, a.created_at) t where t.nb >= mini), '{}'::jsonb),
    'courses', coalesce((select jsonb_object_agg(t.track, jsonb_build_object('record', t.ms, 'nom', t.name, 'deja', exists (select 1 from pegase_int.gc_records r where r.name = n and r.jeu = 'chrono' and r.niveau = t.track and r.jour = j and r.etat <> 'refuse')))
      from (select distinct on (c.track) c.track, c.ms, c.name, count(*) over (partition by c.track) nb
            from public.chrono_runs c join public.chrono_tracks k on k.id = c.track and c.ver >= k.ver
            order by c.track, c.ms, c.created_at) t where t.nb >= mini), '{}'::jsonb),
    'niveaux', coalesce((select jsonb_object_agg(g.key, jsonb_build_object('nb', g.value, 'lv', coalesce((select jsonb_object_agg(t.level, jsonb_build_object('record', t.ms, 'nom', t.name, 'deja', exists (select 1 from pegase_int.gc_records r where r.name = n and r.jeu = g.key and r.niveau = t.level and r.etat in ('paye', 'attente'))))
        from (select distinct on (b.level) b.level, b.ms, b.name from public.level_bests b where b.game = g.key and b.moves = 1 and b.level ~ '^t[0-9]+$' order by b.level, b.ms, b.at) t), '{}'::jsonb)))
      from public.at_textes ta, jsonb_each(ta.v) g where ta.k = 'gc_jeux_niveaux'), '{}'::jsonb),
    'distances', coalesce((select jsonb_object_agg(g.key, coalesce((select jsonb_build_object('record', 100000 - b.moves, 'nom', b.name, 'deja', exists (select 1 from pegase_int.gc_records r where r.name = n and r.jeu = g.key and r.niveau = (g.value #>> '{}') and r.etat in ('paye', 'attente')))
        from public.level_bests b where b.game = g.key and b.level = (g.value #>> '{}') order by b.moves, b.at limit 1), '{}'::jsonb))
      from public.at_textes ta, jsonb_each(ta.v) g where ta.k = 'gc_jeux_distances'), '{}'::jsonb));
end $$;
