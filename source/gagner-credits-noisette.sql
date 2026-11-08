-- ===== gagner-credits-noisette.sql : records de vitesse par niveau, créateur exclu, plafond, alertes (décisions de l'admin, 8 nov. 2026) =====
-- REJOUABLE, après gagner-credits-ecran.sql. Ne touche ni à gc_record_auto ni à gagner_credits_ouvert.
-- Vitesse par niveau (jeux de gc_jeux_niveaux) : battre le temps d'un autre joueur, même de 1 ms, ou finir le niveau le premier : gc_niveau_credits, une seule fois par niveau et par joueur.
-- Le temps vient de la page : garde-fou adapté aux temps : au moins gc_niveau_ms_min, et pas plus court que le temps écoulé depuis l'ouverture du jeu (heure du serveur).
-- Le créateur d'un jeu ne gagne jamais sur son propre jeu. Jeux du studio (sans fiche) : les 2 admins en sont les créateurs.
-- Plafond : au-delà de gc_plafond_jeu_jour 💎 versés sur un jeu dans la journée, les gains passent en vérification par un admin.
-- Alertes : select * from pegase_int.gc_alertes;
insert into public.at_reglages (k, v) values ('gc_niveau_credits', 20), ('gc_niveau_joueurs_min', 1), ('gc_niveau_ms_min', 3000), ('gc_plafond_jeu_jour', 400), ('gc_alerte_groupes', 6), ('gc_alerte_copain', 3) on conflict (k) do nothing;
insert into public.at_textes (k, v) values ('gc_jeux_niveaux', '{"noisette": 30}'::jsonb) on conflict (k) do nothing;
alter table pegase_int.gc_records drop constraint if exists gc_records_sorte_check;
alter table pegase_int.gc_records add constraint gc_records_sorte_check check (sorte in ('jeu', 'course', 'niveau'));

create or replace function pegase_int.gc_createur(n text, j text) returns boolean language sql stable security definer set search_path = public as $$
  with fiche as (select f.name from public.at_fiches f where f.jeu in (j, split_part(j, '-', 1)) and f.etat <> 'supprime')
  select case when exists (select 1 from fiche) then exists (select 1 from fiche x where x.name = n or pegase_int.gc_compte(x.name) = pegase_int.gc_compte(n))
    else pegase_int.at_patron(n) end $$;

create or replace function pegase_int.gc_record_noter(n text, j text, niv text, so text, val int, anc int, anc_nom text, cred int, et text, rs text) returns void language plpgsql security definer set search_path = public as $$
declare k int; m text := case so when 'course' then 'gc_course' else 'gc_record' end; e text := et; ra text := rs;
begin
  if e = 'paye' and (select coalesce(sum(r.credits), 0) from pegase_int.gc_records r where r.jeu = j and r.jour = pegase_int.gc_jour() and r.etat = 'paye') + cred > pegase_int.gc_reglage('gc_plafond_jeu_jour', 400) then
    e := 'attente'; ra := 'plafond du jeu atteint';
  end if;
  insert into pegase_int.gc_records (name, jeu, niveau, sorte, score, ancien, ancien_nom, credits, etat, raison)
    values (n, j, niv, so, val, anc, anc_nom, cred, e, ra)
    on conflict (name, jeu, niveau, jour) where etat <> 'refuse' do nothing;
  get diagnostics k = row_count;
  if k = 1 and e = 'paye' then perform pegase_int.gc_payer(n, cred, m); end if;
  if k = 0 then
    insert into pegase_int.gc_records (name, jeu, niveau, sorte, score, ancien, ancien_nom, credits, etat, raison)
      values (n, j, niv, so, val, anc, anc_nom, cred, 'refuse', 'deja');
  end if;
end $$;

create or replace function pegase_int.gc_score_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare top int; nom text; nb int; deb timestamptz; duree int; saut int; et text := 'paye'; rs text; c int;
begin
  begin
    if not pegase_int.gc_ouvert() then return new; end if;
    if not coalesce((select g.v ? new.game from public.at_textes g where g.k = 'gc_jeux_records'), false) then return new; end if;
    select a.score, a.name into top, nom from (
      select s.score, s.name, s.created_at from public.scores s where s.game = new.game and s.id <> new.id
      union all select w.score, w.name, w.created_at from public.world_bests w where w.game = new.game) a
      order by a.score desc, a.created_at limit 1;
    if top is null or new.score <= top then return new; end if;
    c := pegase_int.gc_reglage('gc_record_credits', 20);
    if pegase_int.gc_createur(new.name, new.game) then
      perform pegase_int.gc_record_noter(new.name, new.game, '', 'jeu', new.score, top, nom, c, 'refuse', 'createur');
      return new;
    end if;
    if nom = new.name and pegase_int.gc_reglage('gc_record_soi_meme', 0) <> 1 then
      perform pegase_int.gc_record_noter(new.name, new.game, '', 'jeu', new.score, top, nom, c, 'refuse', 'soi_meme');
      return new;
    end if;
    select count(*) into nb from (select s.name from public.scores s where s.game = new.game union select w.name from public.world_bests w where w.game = new.game) a;
    if nb < pegase_int.gc_reglage('gc_record_joueurs_min', 5) then
      perform pegase_int.gc_record_noter(new.name, new.game, '', 'jeu', new.score, top, nom, c, 'refuse', 'joueurs');
      return new;
    end if;
    select p.debut_at into deb from pegase_int.gc_parties p where p.name = new.name and p.jeu in (new.game, split_part(new.game, '-', 1)) order by p.debut_at desc limit 1;
    duree := pegase_int.gc_reglage('gc_record_duree_min', 20);
    if deb is null or deb < now() - interval '6 hours' or deb > now() - make_interval(secs => duree) then
      et := 'refuse'; rs := 'partie';
    else
      saut := pegase_int.gc_reglage('gc_record_saut_pct', 300);
      if top > 0 and new.score::numeric > top::numeric * (100 + saut) / 100 then et := 'attente'; rs := 'saut tres grand par rapport au record';
      elsif pegase_int.gc_reglage('gc_record_auto', 0) <> 1 then et := 'attente'; rs := 'verification par un admin';
      end if;
    end if;
    perform pegase_int.gc_record_noter(new.name, new.game, '', 'jeu', new.score, top, nom, c, et, rs);
  exception when others then null;   -- un gain raté ne doit jamais empêcher d'enregistrer un score
  end;
  return new;
end $$;

create or replace function pegase_int.gc_course_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare tv int; autres int; nom text; nb int; avant int; c int;
begin
  begin
    if not pegase_int.gc_ouvert() then return new; end if;
    select k.ver into tv from public.chrono_tracks k where k.id = new.track;
    if tv is null or new.ver < tv then return new; end if;
    c := pegase_int.gc_reglage('gc_course_credits', 10);
    avant := case when tg_op = 'UPDATE' and old.ver >= tv then old.ms end;
    select x.ms, x.name into autres, nom from public.chrono_runs x where x.track = new.track and x.ver >= tv and x.name <> new.name order by x.ms, x.created_at limit 1;
    if autres is null then   -- seul sur cette course : il améliore son propre temps
      if avant is not null and new.ms < avant then perform pegase_int.gc_record_noter(new.name, 'chrono', new.track, 'course', new.ms, avant, new.name, c, 'refuse', 'soi_meme'); end if;
      return new;
    end if;
    if new.ms >= autres then return new; end if;
    if pegase_int.gc_createur(new.name, 'chrono') then
      perform pegase_int.gc_record_noter(new.name, 'chrono', new.track, 'course', new.ms, autres, nom, c, 'refuse', 'createur');
      return new;
    end if;
    if avant is not null and avant < autres and pegase_int.gc_reglage('gc_record_soi_meme', 0) <> 1 then
      perform pegase_int.gc_record_noter(new.name, 'chrono', new.track, 'course', new.ms, avant, new.name, c, 'refuse', 'soi_meme');
      return new;
    end if;
    select count(distinct x.name) into nb from public.chrono_runs x where x.track = new.track and x.ver >= tv;
    if nb < pegase_int.gc_reglage('gc_record_joueurs_min', 5) then
      perform pegase_int.gc_record_noter(new.name, 'chrono', new.track, 'course', new.ms, autres, nom, c, 'refuse', 'joueurs');
      return new;
    end if;
    perform pegase_int.gc_record_noter(new.name, 'chrono', new.track, 'course', new.ms, autres, nom, c, 'paye', null);
  exception when others then null;
  end;
  return new;
end $$;

create or replace function pegase_int.gc_niveau_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare c int; avant int; autres int; nom text; nb int; deb timestamptz; premier boolean;
begin
  begin
    if not pegase_int.gc_ouvert() or new.moves <> 1 or new.level !~ '^t[0-9]+$' then return new; end if;
    if not coalesce((select g.v ? new.game from public.at_textes g where g.k = 'gc_jeux_niveaux'), false) then return new; end if;
    c := pegase_int.gc_reglage('gc_niveau_credits', 20);
    avant := case when tg_op = 'UPDATE' then old.ms end;
    select b.ms, b.name into autres, nom from public.level_bests b where b.game = new.game and b.level = new.level and b.name <> new.name and b.moves = 1 order by b.ms, b.at limit 1;
    if autres is null and avant is not null then   -- seul sur ce niveau : il améliore son propre temps
      if new.ms < avant then perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'niveau', new.ms, avant, new.name, c, 'refuse', 'soi_meme'); end if;
      return new;
    end if;
    if autres is not null and new.ms >= autres then return new; end if;
    if autres is not null and avant is not null and avant < autres and pegase_int.gc_reglage('gc_record_soi_meme', 0) <> 1 then
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'niveau', new.ms, avant, new.name, c, 'refuse', 'soi_meme');
      return new;
    end if;
    premier := autres is null;
    if pegase_int.gc_createur(new.name, new.game) then
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'niveau', new.ms, autres, nom, c, 'refuse', 'createur');
      return new;
    end if;
    select count(distinct b.name) into nb from public.level_bests b where b.game = new.game and b.level = new.level and b.moves = 1;
    if nb < pegase_int.gc_reglage('gc_niveau_joueurs_min', 1) then
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'niveau', new.ms, autres, nom, c, 'refuse', 'joueurs');
      return new;
    end if;
    select p.debut_at into deb from pegase_int.gc_parties p where p.name = new.name and p.jeu = new.game;
    if new.ms < pegase_int.gc_reglage('gc_niveau_ms_min', 3000) or deb is null or deb < now() - interval '6 hours' or deb > now() - make_interval(secs => (new.ms / 1000.0)::double precision) then
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'niveau', new.ms, autres, nom, c, 'refuse', 'partie');
      return new;
    end if;
    if exists (select 1 from pegase_int.gc_records r where r.name = new.name and r.jeu = new.game and r.niveau = new.level and r.etat in ('paye', 'attente')) then   -- une seule fois par niveau, pour toujours
      perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'niveau', new.ms, autres, nom, c, 'refuse', 'deja_niveau');
      return new;
    end if;
    perform pegase_int.gc_record_noter(new.name, new.game, new.level, 'niveau', new.ms, autres, nom, c, 'paye', case when premier then 'premier' end);
  exception when others then null;   -- un gain raté ne doit jamais empêcher d'enregistrer un temps
  end;
  return new;
end $$;
drop trigger if exists gc_niveau on public.level_bests;
create trigger gc_niveau after insert or update of ms on public.level_bests for each row execute function pegase_int.gc_niveau_trg();

create or replace function public.gc_mes_gains(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); u uuid; r jsonb; am jsonb; s int;
begin
  perform public.acct_check(n);
  if not pegase_int.gc_ouvert() then return '[]'::jsonb; end if;
  u := pegase_int.gc_compte(n);
  begin perform pegase_int.gc_parrain_maj(u); exception when others then null; end;   -- compte vérifié depuis la dernière visite : le cadeau part ici
  with a as (update pegase_int.gc_records x set vu_at = now() where x.name = n and x.vu_at is null
      and (x.etat in ('paye', 'attente') or (x.etat = 'refuse' and x.at > now() - interval '1 day' and x.raison in ('soi_meme', 'joueurs', 'deja', 'partie', 'createur', 'deja_niveau'))) returning x.*)
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'sorte', a.sorte, 'jeu', a.jeu, 'niveau', nullif(a.niveau, ''), 'credits', a.credits, 'etat', a.etat, 'raison', a.raison, 'score', a.score, 'ancien', a.ancien, 'ancien_nom', a.ancien_nom) order by a.id), '[]'::jsonb) into r from a;
  with f as (update pegase_int.gc_filleuls x set vu_filleul_at = now() where x.user_id = u and x.recompense_at is not null and x.vu_filleul_at is null returning x.parrain)
  select coalesce(jsonb_agg(jsonb_build_object('sorte', 'ami', 'role', 'filleul', 'nom', f.parrain, 'credits', pegase_int.gc_reglage('gc_filleul_credits', 100), 'etat', 'paye')), '[]'::jsonb) into am from f;
  r := r || am;
  with p as (update pegase_int.gc_filleuls x set vu_parrain_at = now() where x.parrain_user = u and x.recompense_at is not null and x.vu_parrain_at is null returning x.filleul)
  select coalesce(jsonb_agg(jsonb_build_object('sorte', 'ami', 'role', 'parrain', 'nom', p.filleul, 'credits', pegase_int.gc_reglage('gc_parrain_credits', 100), 'etat', 'paye')), '[]'::jsonb) into am from p;
  r := r || am;
  with h as (update pegase_int.gc_filleuls x set vu_achat_at = now() where x.parrain_user = u and x.achat_at is not null and x.vu_achat_at is null returning x.filleul)
  select coalesce(jsonb_agg(jsonb_build_object('sorte', 'ami', 'role', 'achat', 'nom', h.filleul, 'credits', pegase_int.gc_reglage('gc_parrain_achat_credits', 100), 'etat', 'paye')), '[]'::jsonb) into am from h;
  r := r || am;
  if jsonb_array_length(r) = 0 then return r; end if;
  s := pegase_int.at_solde(n);
  return (select jsonb_agg(e || jsonb_build_object('solde', s)) from jsonb_array_elements(r) e);
end $$;

create or replace function public.gc_records_carte(p_name text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare n text := public.pg_n(p_name); j date := pegase_int.gc_jour(); mini int := pegase_int.gc_reglage('gc_record_joueurs_min', 5);
  gj int := pegase_int.gc_reglage('gc_record_credits', 20); gc int := pegase_int.gc_reglage('gc_course_credits', 10); gn int := pegase_int.gc_reglage('gc_niveau_credits', 20);
begin
  if pegase_int.gc_reglage('gc_actif', 1) <> 1 then return jsonb_build_object('actif', false); end if;
  if not pegase_int.gc_ouvert() and not (pegase_int.at_patron(n) and public.acct_own(n)) then return jsonb_build_object('actif', false); end if;   -- fermé : rien pour les joueurs, pas même les sigles
  return jsonb_build_object('actif', true, 'test', not pegase_int.gc_ouvert(), 'gain_jeu', gj, 'gain_course', gc, 'gain_niveau', gn, 'min', mini,
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
      from public.at_textes ta, jsonb_each(ta.v) g where ta.k = 'gc_jeux_niveaux'), '{}'::jsonb));
end $$;

-- les alertes, à lire : select * from pegase_int.gc_alertes;
create or replace view pegase_int.gc_alertes as
  select 'gains_groupes'::text as alerte, r.jeu, null::text as joueur, r.jour, count(*)::int as nb, sum(r.credits)::int as credits, 'plusieurs gains le même jour sur ce jeu'::text as detail
    from pegase_int.gc_records r where r.etat = 'paye' and r.jour > pegase_int.gc_jour() - 7 group by r.jeu, r.jour having count(*) >= pegase_int.gc_reglage('gc_alerte_groupes', 6)
  union all
  select 'temps_court', r.jeu, r.name, r.jour, 1, r.credits, r.sorte || ' ' || r.niveau || ' : ' || r.score || ' ms contre ' || r.ancien || ' ms'
    from pegase_int.gc_records r where r.sorte in ('niveau', 'course') and r.etat in ('paye', 'attente') and r.ancien is not null and r.score < r.ancien * 0.5 and r.jour > pegase_int.gc_jour() - 7
  union all
  select 'copain_du_createur', r.jeu, r.name, max(r.jour), count(*)::int, sum(r.credits)::int, 'membre d''une salle du créateur ' || f.name
    from pegase_int.gc_records r join public.at_fiches f on f.jeu in (r.jeu, split_part(r.jeu, '-', 1)) and f.etat <> 'supprime'
    where r.etat = 'paye' and r.jour > pegase_int.gc_jour() - 7 and r.name <> f.name
      and exists (select 1 from public.room_members a join public.room_members b on a.room_id = b.room_id where a.name = r.name and b.name = f.name)
    group by r.jeu, r.name, f.name having count(*) >= pegase_int.gc_reglage('gc_alerte_copain', 3);
revoke all on pegase_int.gc_alertes from public, anon, authenticated;
revoke all on function pegase_int.gc_createur(text, text), pegase_int.gc_niveau_trg() from public, anon, authenticated;
