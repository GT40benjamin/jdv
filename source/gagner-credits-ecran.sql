-- ===== gagner-credits-ecran.sql : l'écran de fin « record mondial, gain ou pas, et pourquoi » + l'annonce des invitations =====
-- REJOUABLE, à appliquer après gagner-credits-invite.sql. Aucune règle de gain ne change : le serveur NOTE maintenant aussi les records mondiaux sans gain,
-- avec leur raison (soi_meme, joueurs, deja, partie), pour que la borne puisse le dire au joueur. Rien n'est versé de plus.
alter table pegase_int.gc_filleuls add column if not exists vu_parrain_at timestamptz, add column if not exists vu_filleul_at timestamptz, add column if not exists vu_achat_at timestamptz;
-- ce qui a déjà été versé avant ce lot ne sera pas annoncé après coup
update pegase_int.gc_filleuls set vu_parrain_at = coalesce(vu_parrain_at, now()), vu_filleul_at = coalesce(vu_filleul_at, now()) where recompense_at is not null and (vu_parrain_at is null or vu_filleul_at is null) and recompense_at < now() - interval '1 minute';
update pegase_int.gc_filleuls set vu_achat_at = coalesce(vu_achat_at, now()) where achat_at is not null and vu_achat_at is null and achat_at < now() - interval '1 minute';

create or replace function pegase_int.gc_record_noter(n text, j text, niv text, so text, val int, anc int, anc_nom text, cred int, et text, rs text) returns void language plpgsql security definer set search_path = public as $$
declare k int; m text := case so when 'course' then 'gc_course' else 'gc_record' end;
begin
  insert into pegase_int.gc_records (name, jeu, niveau, sorte, score, ancien, ancien_nom, credits, etat, raison)
    values (n, j, niv, so, val, anc, anc_nom, cred, et, rs)
    on conflict (name, jeu, niveau, jour) where etat <> 'refuse' do nothing;
  get diagnostics k = row_count;
  if k = 1 and et = 'paye' then perform pegase_int.gc_payer(n, cred, m); end if;
  if k = 0 then   -- déjà gagné aujourd'hui : pas de gain, mais on le dit
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

create or replace function public.gc_mes_gains(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); u uuid; r jsonb; am jsonb; s int;
begin
  perform public.acct_check(n);
  if not pegase_int.gc_ouvert() then return '[]'::jsonb; end if;
  u := pegase_int.gc_compte(n);
  begin perform pegase_int.gc_parrain_maj(u); exception when others then null; end;   -- compte vérifié depuis la dernière visite : le cadeau part ici
  with a as (update pegase_int.gc_records x set vu_at = now() where x.name = n and x.vu_at is null
      and (x.etat in ('paye', 'attente') or (x.etat = 'refuse' and x.at > now() - interval '1 day' and x.raison in ('soi_meme', 'joueurs', 'deja', 'partie'))) returning x.*)
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
