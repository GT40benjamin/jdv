-- ===== gagner-credits.sql : « 💎 Gagner des crédits » — pubs récompensées, parrainage, records mondiaux (lot validé par l'admin, 8 nov. 2026) =====
-- REJOUABLE (create if not exists, create or replace, on conflict do nothing). Essai : begin; <ce fichier>; rollback;  C'est le chef qui l'applique.
--
-- Principe : TOUS les gains sont décidés ici, côté serveur. La page ne dit jamais « donne-moi N crédits » ; elle lit le résultat.
-- Les crédits passent par pegase_int.at_crediter, donc par le journal habituel (déclencheur at_cj_log → public.at_credit_journal).
-- Le déclencheur écrit comme motif la fonction la plus extérieure (add_score, chrono_save…) : gc_payer corrige la ligne avec le vrai motif
-- (gc_pub, gc_parrain, gc_filleul, gc_parrain_achat, gc_record, gc_course).
--
-- Rien n'achète jamais de crédits. Ces fonctions ne renvoient aux joueurs que des 💎 : l'argent n'est vu que dans gc_admin_etat.
--
-- TANT QUE gagner_credits_ouvert = 0 : la section n'existe que pour PATOU et BENJAMIN, en mode test, et AUCUN crédit réel n'est versé (garde dans gc_payer).
-- L'ouverture à tous, seulement quand l'admin le dit : update public.at_reglages set v = 1 where k = 'gagner_credits_ouvert';
--
-- ORDRE : après atelier.sql, boutique.sql (at_crediter) et chrono.sql. Les déclencheurs tiennent même si add_score ou chrono_save sont redéfinis.

-- ---------- 1. les réglages (tous modifiables : update public.at_reglages set v = … where k = …) ----------
insert into public.at_reglages (k, v) values
  ('gagner_credits_ouvert', 0),         -- 0 = visible seulement par PATOU et BENJAMIN, en mode test, aucun crédit réel. 1 = ouvert à tous
  ('gc_actif', 1),                      -- 0 = toute la section est coupée
  ('gc_pub_test', 1),                   -- 1 = MODE TEST : admins seulement, aucun crédit versé. 0 = pubs ouvertes (il faut l'identifiant de la régie)
  ('gc_pub_courte_credits', 3), ('gc_pub_courte_s', 15),
  ('gc_pub_longue_credits', 5), ('gc_pub_longue_s', 30),
  ('gc_pub_max_jour', 10),
  ('gc_parrain_credits', 100),          -- pour le parrain, quand le filleul est vérifié et a vraiment joué
  ('gc_filleul_credits', 100),          -- pour le filleul, en même temps
  ('gc_parrain_achat_credits', 100),    -- en plus pour le parrain, au premier pack acheté par le filleul
  ('gc_parrain_max', 10),               -- filleuls récompensés au plus, par compte
  ('gc_parrain_depense_min', 50),       -- plus utilisé : la condition « a vraiment joué » a été retirée (décision de l'admin, 8 nov.)
  ('gc_parrain_compte_jours', 30),      -- un code ne s'entre que sur un compte créé depuis moins de N jours (sinon les anciens joueurs se parrainent entre eux)
  ('gc_record_credits', 20),            -- record mondial d'un jeu
  ('gc_course_credits', 10),            -- record mondial d'une course
  ('gc_record_joueurs_min', 5),         -- au moins N joueurs différents sur ce jeu ou cette course
  ('gc_record_auto', 0),                -- jeux à score (pas les courses) : 0 = un admin vérifie avant de payer ; 1 = payé si les contrôles passent
  ('gc_record_duree_min', 20),          -- une partie ouverte depuis au moins N secondes (heure du serveur)
  ('gc_record_saut_pct', 300),          -- au-delà de +N % sur l'ancien record : toujours vérifié par un admin
  ('gc_record_soi_meme', 0)             -- 1 = améliorer son propre record mondial paie aussi
on conflict (k) do nothing;

-- l'identifiant de la régie (texte : at_reglages ne prend que des nombres) : vide tant que l'admin n'a pas de compte
insert into public.at_textes (k, v) values ('gc_regie', '{"adsense": "", "admob_app": "", "admob_recompense": ""}'::jsonb) on conflict (k) do nothing;
-- les jeux d'arcade qui donnent des records (liste fermée : un nouveau jeu n'y entre que si on l'ajoute ; un jeu créé par un joueur n'y entre jamais)
-- pas Abracadabra, pas Tête de Cible (flechettes), pas Pégase ; chrono est payé par course (gc_course), pas à ses points
insert into public.at_textes (k, v) values ('gc_jeux_records',
  '["noisette","lune","licornes","trone","jetporte","sorcier","pigeon","strike","remparts","sensinterdit","sensinterdit-km","neon","smoothie","ilo","magic","pleingaz","pleingaz-1vie","empilo","glouton","mouches","carreaux","rouleaux","canards"]'::jsonb)
on conflict (k) do nothing;

-- ---------- 2. les tables (schéma privé : aucun accès direct depuis la page) ----------
create table if not exists pegase_int.gc_pubs (
  id uuid primary key default gen_random_uuid(),
  name text not null, sorte text not null check (sorte in ('courte', 'longue')),
  debut_at timestamptz not null default now(), fin_at timestamptz,
  credits int not null default 0, test boolean not null default false,
  jour date not null default (now() at time zone 'Europe/Paris')::date
);
create index if not exists gc_pubs_jour on pegase_int.gc_pubs (name, jour);

create table if not exists pegase_int.gc_codes (name text primary key, code text not null unique, at timestamptz not null default now());

create table if not exists pegase_int.gc_filleuls (
  user_id uuid primary key,             -- un seul parrain par COMPTE (pas par pseudo)
  filleul text not null, parrain text not null, parrain_user uuid not null,
  lie_at timestamptz not null default now(), recompense_at timestamptz, achat_at timestamptz
);
create index if not exists gc_filleuls_parrain on pegase_int.gc_filleuls (parrain_user);

create table if not exists pegase_int.gc_parties (name text not null, jeu text not null, debut_at timestamptz not null default now(), primary key (name, jeu));

create table if not exists pegase_int.gc_records (
  id bigint generated always as identity primary key,
  name text not null, jeu text not null, niveau text not null default '',
  sorte text not null check (sorte in ('jeu', 'course')),
  score int not null, ancien int, ancien_nom text,
  credits int not null, etat text not null check (etat in ('paye', 'attente', 'refuse')), raison text,
  jour date not null default (now() at time zone 'Europe/Paris')::date,
  at timestamptz not null default now(), decide_at timestamptz, vu_at timestamptz
);
-- une fois par jour, par jeu et par course, pour un joueur
create unique index if not exists gc_records_un_par_jour on pegase_int.gc_records (name, jeu, niveau, jour) where etat <> 'refuse';
create index if not exists gc_records_attente on pegase_int.gc_records (at) where etat = 'attente';
create index if not exists gc_records_a_voir on pegase_int.gc_records (name) where vu_at is null;

revoke all on pegase_int.gc_pubs, pegase_int.gc_codes, pegase_int.gc_filleuls, pegase_int.gc_parties, pegase_int.gc_records from public, anon, authenticated;

-- ---------- 3. outils internes ----------
create or replace function pegase_int.gc_reglage(k text, d int) returns int language sql stable security definer set search_path = public as $$
  select coalesce((select r.v from public.at_reglages r where r.k = gc_reglage.k), d) $$;

create or replace function pegase_int.gc_ouvert() returns boolean language sql stable security definer set search_path = public as $$
  select pegase_int.gc_reglage('gc_actif', 1) = 1 and pegase_int.gc_reglage('gagner_credits_ouvert', 0) = 1 $$;

create or replace function pegase_int.gc_jour() returns date language sql stable as $$ select (now() at time zone 'Europe/Paris')::date $$;

-- un crédit gagné : le chemin habituel (at_crediter → journal), puis le vrai motif sur la ligne que le journal vient d'écrire
create or replace function pegase_int.gc_payer(n text, c int, m text) returns int language plpgsql security definer set search_path = public as $$
declare s int;
begin
  if coalesce(c, 0) <= 0 or not pegase_int.gc_ouvert() then return pegase_int.at_solde(n); end if;   -- fermé = mode test : jamais un vrai crédit
  perform pegase_int.at_solde(n);
  s := pegase_int.at_crediter(n, c);
  update public.at_credit_journal j set motif = m where j.id = (select max(x.id) from public.at_credit_journal x where x.name = n and x.delta = c);
  return s;
end $$;

-- le compte d'un pseudo (null si le pseudo n'a pas de compte)
create or replace function pegase_int.gc_compte(n text) returns uuid language sql stable security definer set search_path = public as $$
  select p.user_id from public.players p where p.name = n $$;

-- les deux comptes sont-ils les mêmes (ou de la même famille : un parent et le compte d'un enfant) ?
create or replace function pegase_int.gc_meme_famille(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select a = b or exists (
    select 1 from public.player_parents k
    where (k.parent = a and (k.child = b or exists (select 1 from public.players p where p.name = k.name and p.user_id = b)))
       or (k.parent = b and (k.child = a or exists (select 1 from public.players p where p.name = k.name and p.user_id = a)))) $$;

-- ---------- 4. parrainage : la règle, au même endroit pour tous les chemins ----------
-- L'ami invité et celui qui l'invite sont récompensés dès que le compte de l'ami est vérifié ; idempotent (appelé au lien, à chaque visite, à chaque achat, à l'ouverture du menu).
create or replace function pegase_int.gc_parrain_maj(u uuid) returns void language plpgsql security definer set search_path = public as $$
declare f pegase_int.gc_filleuls; verifie boolean; n int; gain_p int; gain_f int; gain_a int;
begin
  if u is null or not pegase_int.gc_ouvert() then return; end if;
  select * into f from pegase_int.gc_filleuls x where x.user_id = u for update;
  if f.user_id is null then return; end if;
  if f.recompense_at is null then
    select x.email_confirmed_at is not null into verifie from auth.users x where x.id = u;   -- e-mail confirmé, ou connexion Google (qui le remplit)
    if coalesce(verifie, false) then
      perform 1 from pegase_int.gc_codes c where c.name = f.parrain for update;   -- deux amis en même temps : le plafond tient
      select count(*) into n from pegase_int.gc_filleuls x where x.parrain_user = f.parrain_user and x.recompense_at is not null;
      if n < pegase_int.gc_reglage('gc_parrain_max', 10) then
        update pegase_int.gc_filleuls x set recompense_at = now() where x.user_id = u;
        f.recompense_at := now();
        gain_p := pegase_int.gc_reglage('gc_parrain_credits', 100); gain_f := pegase_int.gc_reglage('gc_filleul_credits', 100);
        perform pegase_int.gc_payer(f.parrain, gain_p, 'gc_parrain');
        perform pegase_int.gc_payer(f.filleul, gain_f, 'gc_filleul');
      end if;
    end if;
  end if;
  if f.recompense_at is not null and f.achat_at is null
     and exists (select 1 from public.at_achats a where a.etat = 'paye' and a.name in (select p.name from public.players p where p.user_id = u)) then
    update pegase_int.gc_filleuls x set achat_at = now() where x.user_id = u;
    gain_a := pegase_int.gc_reglage('gc_parrain_achat_credits', 100);
    perform pegase_int.gc_payer(f.parrain, gain_a, 'gc_parrain_achat');
  end if;
end $$;

drop trigger if exists gc_journal on public.at_credit_journal;
drop function if exists pegase_int.gc_journal_trg();

-- un pack payé : +100 💎 au parrain (ne bloque jamais le paiement)
create or replace function pegase_int.gc_achat_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.etat = 'paye' and old.etat is distinct from 'paye' and pegase_int.gc_ouvert() then
    begin perform pegase_int.gc_parrain_maj(pegase_int.gc_compte(new.name)); exception when others then null; end;
  end if;
  return new;
end $$;
drop trigger if exists gc_achat on public.at_achats;
create trigger gc_achat after update of etat on public.at_achats for each row execute function pegase_int.gc_achat_trg();

-- ---------- 5. records mondiaux : décidés à l'arrivée du score, jamais sur ce que dit la page ----------
create or replace function pegase_int.gc_record_noter(n text, j text, niv text, so text, val int, anc int, anc_nom text, cred int, et text, rs text) returns void language plpgsql security definer set search_path = public as $$
declare k int; m text := case so when 'course' then 'gc_course' else 'gc_record' end;
begin
  insert into pegase_int.gc_records (name, jeu, niveau, sorte, score, ancien, ancien_nom, credits, etat, raison)
    values (n, j, niv, so, val, anc, anc_nom, cred, et, rs)
    on conflict (name, jeu, niveau, jour) where etat <> 'refuse' do nothing;
  get diagnostics k = row_count;
  if k = 1 and et = 'paye' then perform pegase_int.gc_payer(n, cred, m); end if;
end $$;

-- les jeux à score : la partie doit avoir été ouverte côté serveur, assez longtemps ; un saut énorme ou le mode « vérification » passe par un admin
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
    if nom = new.name and pegase_int.gc_reglage('gc_record_soi_meme', 0) <> 1 then return new; end if;
    select count(*) into nb from (select s.name from public.scores s where s.game = new.game union select w.name from public.world_bests w where w.game = new.game) a;
    if nb < pegase_int.gc_reglage('gc_record_joueurs_min', 5) then return new; end if;
    c := pegase_int.gc_reglage('gc_record_credits', 20);
    select p.debut_at into deb from pegase_int.gc_parties p where p.name = new.name and p.jeu in (new.game, split_part(new.game, '-', 1)) order by p.debut_at desc limit 1;   -- sensinterdit-km : la partie s'ouvre sous le nom du jeu
    duree := pegase_int.gc_reglage('gc_record_duree_min', 20);
    if deb is null or deb < now() - interval '6 hours' or deb > now() - make_interval(secs => duree) then
      et := 'refuse'; rs := 'partie non ouverte ou trop courte';
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
drop trigger if exists gc_score on public.scores;
create trigger gc_score after insert on public.scores for each row execute function pegase_int.gc_score_trg();

-- les courses : chrono_save a déjà rejoué le fantôme (chrono_check) avant d'écrire ici : c'est un temps vérifié par le serveur, payé tout de suite
create or replace function pegase_int.gc_course_trg() returns trigger language plpgsql security definer set search_path = public as $$
declare tv int; autres int; nom text; nb int; avant int;
begin
  begin
    if not pegase_int.gc_ouvert() then return new; end if;
    select k.ver into tv from public.chrono_tracks k where k.id = new.track;
    if tv is null or new.ver < tv then return new; end if;
    select c.ms, c.name into autres, nom from public.chrono_runs c where c.track = new.track and c.ver >= tv and c.name <> new.name order by c.ms, c.created_at limit 1;
    if autres is null or new.ms >= autres then return new; end if;
    avant := case when tg_op = 'UPDATE' and old.ver >= tv then old.ms end;
    if avant is not null and avant < autres and pegase_int.gc_reglage('gc_record_soi_meme', 0) <> 1 then return new; end if;   -- il était déjà devant
    select count(distinct c.name) into nb from public.chrono_runs c where c.track = new.track and c.ver >= tv;
    if nb < pegase_int.gc_reglage('gc_record_joueurs_min', 5) then return new; end if;
    perform pegase_int.gc_record_noter(new.name, 'chrono', new.track, 'course', new.ms, autres, nom, pegase_int.gc_reglage('gc_course_credits', 10), 'paye', null);
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists gc_course on public.chrono_runs;
create trigger gc_course after insert or update of ms on public.chrono_runs for each row execute function pegase_int.gc_course_trg();

-- ---------- 6. ce que la page appelle ----------
-- une partie commence (heure du serveur) : sert au contrôle de durée
create or replace function public.gc_partie_debut(p_name text, p_jeu text) returns void language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  if char_length(coalesce(p_jeu, '')) not between 1 and 40 or not pegase_int.gc_ouvert() then return; end if;
  insert into pegase_int.gc_parties (name, jeu, debut_at) values (n, p_jeu, now())
    on conflict (name, jeu) do update set debut_at = now();
end $$;

-- les gains à annoncer (une seule fois chacun) : le grand message « 🏆 Record mondial battu ! »
create or replace function public.gc_mes_gains(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); r jsonb;
begin
  perform public.acct_check(n);
  if not pegase_int.gc_ouvert() then return '[]'::jsonb; end if;
  begin perform pegase_int.gc_parrain_maj(pegase_int.gc_compte(n)); exception when others then null; end;   -- compte vérifié depuis la dernière visite : le cadeau part ici
  with a as (update pegase_int.gc_records x set vu_at = now() where x.name = n and x.vu_at is null and x.etat in ('paye', 'attente') returning x.*)
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'sorte', a.sorte, 'jeu', a.jeu, 'niveau', nullif(a.niveau, ''), 'credits', a.credits, 'etat', a.etat, 'score', a.score, 'ancien', a.ancien, 'ancien_nom', a.ancien_nom) order by a.id), '[]'::jsonb) into r from a;
  return r;
end $$;

-- le sigle 🏆 : public (les invités le voient aussi). Seulement les jeux et les courses où le gain est ouvert ; p_name = 'déjà gagné aujourd'hui'
create or replace function public.gc_records_carte(p_name text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare n text := public.pg_n(p_name); j date := pegase_int.gc_jour(); mini int := pegase_int.gc_reglage('gc_record_joueurs_min', 5);
  gj int := pegase_int.gc_reglage('gc_record_credits', 20); gc int := pegase_int.gc_reglage('gc_course_credits', 10);
begin
  if pegase_int.gc_reglage('gc_actif', 1) <> 1 then return jsonb_build_object('actif', false); end if;
  if not pegase_int.gc_ouvert() and not (pegase_int.at_patron(n) and public.acct_own(n)) then return jsonb_build_object('actif', false); end if;   -- fermé : rien pour les joueurs, pas même les sigles
  return jsonb_build_object('actif', true, 'test', not pegase_int.gc_ouvert(), 'gain_jeu', gj, 'gain_course', gc, 'min', mini,
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
            order by c.track, c.ms, c.created_at) t where t.nb >= mini), '{}'::jsonb));
end $$;

-- ouvre une pub : un ticket du serveur (la durée se mesure à l'heure du serveur, pas de la page)
create or replace function public.gc_pub_debut(p_name text, p_sorte text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); en_test boolean := pegase_int.gc_reglage('gc_pub_test', 1) = 1 or not pegase_int.gc_ouvert(); maxi int := pegase_int.gc_reglage('gc_pub_max_jour', 10); nb int; t pegase_int.gc_pubs; s int; c int;
  j date := pegase_int.gc_jour();
begin
  perform public.acct_check(n);
  if p_sorte not in ('courte', 'longue') then return jsonb_build_object('ok', false, 'why', 'sorte'); end if;
  if pegase_int.gc_reglage('gc_actif', 1) <> 1 then return jsonb_build_object('ok', false, 'why', 'coupe'); end if;
  if en_test and not pegase_int.at_patron(n) then return jsonb_build_object('ok', false, 'why', 'bientot'); end if;
  perform 1 from public.players p where p.name = n for update;   -- deux onglets en même temps : le plafond tient
  select count(*) into nb from pegase_int.gc_pubs x where x.name = n and x.jour = j and x.fin_at is not null and x.test = en_test;   -- en test, un compteur simulé à part
  if nb >= maxi then return jsonb_build_object('ok', false, 'why', 'plafond', 'max', maxi); end if;
  if exists (select 1 from pegase_int.gc_pubs x where x.name = n and x.fin_at is null and x.debut_at > now() - interval '3 minutes') then
    return jsonb_build_object('ok', false, 'why', 'en_cours');
  end if;
  s := pegase_int.gc_reglage(case p_sorte when 'courte' then 'gc_pub_courte_s' else 'gc_pub_longue_s' end, 15);
  c := pegase_int.gc_reglage(case p_sorte when 'courte' then 'gc_pub_courte_credits' else 'gc_pub_longue_credits' end, 3);
  insert into pegase_int.gc_pubs (name, sorte, test) values (n, p_sorte, en_test) returning * into t;
  return jsonb_build_object('ok', true, 'id', t.id, 'duree', s, 'credits', case when en_test then 0 else c end, 'simule', case when en_test then c else 0 end, 'test', en_test);
end $$;

-- abandon : le ticket est fermé sans gain
create or replace function public.gc_pub_annuler(p_name text, p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  delete from pegase_int.gc_pubs x where x.id = p_id and x.name = n and x.fin_at is null;
end $$;

-- la vidéo est finie : le gain dépend du temps réellement écoulé côté serveur (une pub longue coupée après 15 s rapporte le prix d'une courte)
create or replace function public.gc_pub_fin(p_name text, p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); t pegase_int.gc_pubs; ecoule numeric; maxi int := pegase_int.gc_reglage('gc_pub_max_jour', 10); nb int; c int := 0; so int; gain int;
  sc int := pegase_int.gc_reglage('gc_pub_courte_s', 15); sl int := pegase_int.gc_reglage('gc_pub_longue_s', 30);
begin
  perform public.acct_check(n);
  select * into t from pegase_int.gc_pubs x where x.id = p_id and x.name = n for update;
  if t.id is null or t.fin_at is not null then return jsonb_build_object('ok', false, 'why', 'ticket'); end if;
  if t.debut_at < now() - interval '10 minutes' then return jsonb_build_object('ok', false, 'why', 'ticket'); end if;
  ecoule := extract(epoch from now() - t.debut_at);
  if ecoule < sc then return jsonb_build_object('ok', false, 'why', 'trop_tot'); end if;
  select count(*) into nb from pegase_int.gc_pubs x where x.name = n and x.jour = t.jour and x.fin_at is not null and x.test = t.test;
  if nb >= maxi then return jsonb_build_object('ok', false, 'why', 'plafond', 'max', maxi); end if;
  gain := pegase_int.gc_reglage(case when t.sorte = 'longue' and ecoule >= sl then 'gc_pub_longue_credits' else 'gc_pub_courte_credits' end, 3);
  if not t.test then c := gain; end if;
  update pegase_int.gc_pubs x set fin_at = now(), credits = c where x.id = t.id;
  if c > 0 then so := pegase_int.gc_payer(n, c, 'gc_pub'); else so := pegase_int.at_solde(n); end if;
  return jsonb_build_object('ok', true, 'credits', c, 'simule', case when t.test then gain else 0 end, 'solde', so, 'test', t.test,
    'restant', greatest(0, maxi - (select count(*) from pegase_int.gc_pubs x where x.name = n and x.jour = t.jour and x.fin_at is not null and x.test = t.test)));
end $$;

-- le code du joueur (créé à la première demande)
create or replace function pegase_int.gc_code_de(n text) returns text language plpgsql security definer set search_path = public, extensions as $$
declare c text; essai int := 0;
begin
  select x.code into c from pegase_int.gc_codes x where x.name = n;
  if c is not null then return c; end if;
  loop
    essai := essai + 1;
    c := translate(upper(left(encode(gen_random_bytes(8), 'base64'), 8)), '+/=O0I1L', 'ABCDEFGH');   -- les majuscules AVANT le filtre : ni O, I, L, ni 0, 1
    begin
      insert into pegase_int.gc_codes (name, code) values (n, c);
      return c;
    exception when unique_violation then
      select x.code into c from pegase_int.gc_codes x where x.name = n;
      if c is not null then return c; end if;
      if essai > 8 then raise; end if;
    end;
  end loop;
end $$;

-- le jeton du joueur, ajouté au lien quand il invite un ami
create or replace function public.gc_mon_code(p_name text) returns text language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  if pegase_int.gc_reglage('gc_actif', 1) <> 1 or (not pegase_int.gc_ouvert() and not pegase_int.at_patron(n)) then return null; end if;
  return pegase_int.gc_code_de(n);
end $$;

-- entrer un code ou arriver par un lien ; réponses simples pour le menu
create or replace function public.gc_parrain_lier(p_name text, p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); u uuid := auth.uid(); c pegase_int.gc_codes; pu uuid; cree timestamptz; nb int;
begin
  perform public.acct_check(n);
  if not pegase_int.gc_ouvert() then return jsonb_build_object('ok', false, 'why', case when pegase_int.at_patron(n) then 'test' else 'coupe' end); end if;
  u := coalesce(pegase_int.gc_compte(n), u);
  if exists (select 1 from pegase_int.gc_filleuls x where x.user_id = u) then return jsonb_build_object('ok', false, 'why', 'deja'); end if;
  select * into c from pegase_int.gc_codes x where x.code = upper(trim(coalesce(p_code, '')));
  if c.name is null then return jsonb_build_object('ok', false, 'why', 'code'); end if;
  pu := pegase_int.gc_compte(c.name);
  if pu is null then return jsonb_build_object('ok', false, 'why', 'code'); end if;
  if pegase_int.gc_meme_famille(u, pu) then return jsonb_build_object('ok', false, 'why', 'soi'); end if;
  if exists (select 1 from pegase_int.gc_filleuls x where x.user_id = pu and x.parrain_user = u) then return jsonb_build_object('ok', false, 'why', 'soi'); end if;   -- pas de parrainage croisé
  select x.created_at into cree from auth.users x where x.id = u;
  if cree is null or cree < now() - make_interval(days => pegase_int.gc_reglage('gc_parrain_compte_jours', 30)) then return jsonb_build_object('ok', false, 'why', 'ancien'); end if;
  select count(*) into nb from pegase_int.gc_filleuls x where x.parrain_user = pu and x.recompense_at is not null;
  if nb >= pegase_int.gc_reglage('gc_parrain_max', 10) then return jsonb_build_object('ok', false, 'why', 'complet'); end if;
  begin
    insert into pegase_int.gc_filleuls (user_id, filleul, parrain, parrain_user) values (u, n, c.name, pu);
  exception when unique_violation then return jsonb_build_object('ok', false, 'why', 'deja');
  end;
  perform pegase_int.gc_parrain_maj(u);
  return jsonb_build_object('ok', true, 'parrain', c.name);
end $$;

-- tout le menu d'un coup (que des 💎 : aucun coût, aucun euro)
create or replace function public.gc_etat(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); u uuid; j date := pegase_int.gc_jour(); ouvert boolean := pegase_int.gc_ouvert(); en_test boolean := pegase_int.gc_reglage('gc_pub_test', 1) = 1 or not pegase_int.gc_ouvert(); adm boolean; regie jsonb; maxi int := pegase_int.gc_reglage('gc_pub_max_jour', 10);
  nb int; f pegase_int.gc_filleuls;
begin
  perform public.acct_check(n);
  u := pegase_int.gc_compte(n);
  if pegase_int.gc_reglage('gc_actif', 1) <> 1 or (not ouvert and not pegase_int.at_patron(n)) then return jsonb_build_object('actif', false); end if;
  begin perform pegase_int.gc_parrain_maj(u); exception when others then null; end;
  begin perform pegase_int.gc_parrain_maj(x.user_id) from pegase_int.gc_filleuls x where x.parrain_user = u and (x.recompense_at is null or x.achat_at is null); exception when others then null; end;
  adm := pegase_int.at_patron(n);
  select g.v into regie from public.at_textes g where g.k = 'gc_regie';
  select count(*) into nb from pegase_int.gc_pubs x where x.name = n and x.jour = j and x.fin_at is not null and x.test = en_test;
  select * into f from pegase_int.gc_filleuls x where x.user_id = u;
  return jsonb_build_object('actif', true, 'ouvert', ouvert, 'admin', adm, 'solde', pegase_int.at_solde(n),
    'pub', jsonb_build_object('test', en_test, 'dispo', (not en_test and coalesce(regie->>'adsense', '') <> '') or (en_test and adm),
      'regie', case when not en_test or adm then coalesce(regie->>'adsense', '') else '' end,
      'courte', jsonb_build_object('credits', pegase_int.gc_reglage('gc_pub_courte_credits', 3), 'duree', pegase_int.gc_reglage('gc_pub_courte_s', 15)),
      'longue', jsonb_build_object('credits', pegase_int.gc_reglage('gc_pub_longue_credits', 5), 'duree', pegase_int.gc_reglage('gc_pub_longue_s', 30)),
      'faites', nb, 'max', maxi),
    'parrain', jsonb_build_object('code', pegase_int.gc_code_de(n),
      'gain', pegase_int.gc_reglage('gc_parrain_credits', 100), 'gain_filleul', pegase_int.gc_reglage('gc_filleul_credits', 100), 'gain_achat', pegase_int.gc_reglage('gc_parrain_achat_credits', 100),
      'depense_min', pegase_int.gc_reglage('gc_parrain_depense_min', 50), 'max', pegase_int.gc_reglage('gc_parrain_max', 10),
      'filleuls', (select count(*) from pegase_int.gc_filleuls x where x.parrain_user = u),
      'recompenses', (select count(*) from pegase_int.gc_filleuls x where x.parrain_user = u and x.recompense_at is not null),
      'liste', coalesce((select jsonb_agg(jsonb_build_object('nom', x.filleul, 'ok', x.recompense_at is not null, 'achat', x.achat_at is not null) order by x.lie_at desc) from pegase_int.gc_filleuls x where x.parrain_user = u), '[]'::jsonb),
      'mon_parrain', f.parrain, 'mon_parrain_ok', f.recompense_at is not null),
    'records', jsonb_build_object('gain_jeu', pegase_int.gc_reglage('gc_record_credits', 20), 'gain_course', pegase_int.gc_reglage('gc_course_credits', 10), 'min', pegase_int.gc_reglage('gc_record_joueurs_min', 5), 'auto', pegase_int.gc_reglage('gc_record_auto', 0) = 1));
end $$;

-- ---------- 7. l'admin ----------
-- le seul endroit où l'argent apparaît. Aucun faux revenu : la régie n'est pas branchée, donc aucun revenu n'est écrit ici.
create or replace function public.gc_admin_etat(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); deb timestamptz := date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'; regie jsonb; cents numeric; cout_img numeric; prix_img numeric; c int;
begin
  perform public.acct_check(n);
  if not pegase_int.at_patron(n) then raise exception 'admin requis'; end if;
  select g.v into regie from public.at_textes g where g.k = 'gc_regie';
  cout_img := coalesce(pegase_int.at_reglage('cout_image_centimes'), 4); prix_img := greatest(coalesce(pegase_int.at_reglage('prix_esp_image'), 20), 1);
  select coalesce(sum(j.delta), 0) into c from public.at_credit_journal j where j.motif like 'gc\_%' and j.at >= deb;
  cents := round(c * cout_img / prix_img, 1);
  return jsonb_build_object('ouvert', pegase_int.gc_ouvert(), 'regie', regie, 'pub_test', pegase_int.gc_reglage('gc_pub_test', 1) = 1, 'record_auto', pegase_int.gc_reglage('gc_record_auto', 0) = 1,
    'donnes_mois', c, 'cout_max_centimes', cents,
    'par_motif', coalesce((select jsonb_object_agg(x.motif, x.d) from (select j.motif, sum(j.delta) d from public.at_credit_journal j where j.motif like 'gc\_%' and j.at >= deb group by 1) x), '{}'::jsonb),
    'attente', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'joueur', r.name, 'jeu', r.jeu, 'score', r.score, 'ancien', r.ancien, 'ancien_nom', r.ancien_nom, 'credits', r.credits, 'raison', r.raison, 'at', r.at) order by r.at) from pegase_int.gc_records r where r.etat = 'attente'), '[]'::jsonb));
end $$;

create or replace function public.gc_admin_record(p_name text, p_id bigint, p_ok boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); r pegase_int.gc_records;
begin
  perform public.acct_check(n);
  if not pegase_int.at_patron(n) then raise exception 'admin requis'; end if;
  select * into r from pegase_int.gc_records x where x.id = p_id for update;
  if r.id is null or r.etat <> 'attente' or not pegase_int.gc_ouvert() then return jsonb_build_object('ok', false); end if;
  update pegase_int.gc_records x set etat = case when p_ok then 'paye' else 'refuse' end, decide_at = now(), vu_at = case when p_ok then null else now() end where x.id = r.id;
  if p_ok then perform pegase_int.gc_payer(r.name, r.credits, case r.sorte when 'course' then 'gc_course' else 'gc_record' end); end if;
  return jsonb_build_object('ok', true);
end $$;

-- brancher l'identifiant de la régie, plus tard (ca-pub-… pour le site, ca-app-pub-… pour l'appli)
create or replace function public.gc_admin_regie(p_name text, p_adsense text, p_admob_app text, p_admob_recompense text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); a text := trim(coalesce(p_adsense, '')); b text := trim(coalesce(p_admob_app, '')); c text := trim(coalesce(p_admob_recompense, ''));
begin
  perform public.acct_check(n);
  if not pegase_int.at_patron(n) then raise exception 'admin requis'; end if;
  if a <> '' and a !~ '^ca-pub-[0-9]{10,20}$' then return jsonb_build_object('ok', false, 'why', 'adsense'); end if;
  if b <> '' and b !~ '^ca-app-pub-[0-9]{10,20}~[0-9]{6,12}$' then return jsonb_build_object('ok', false, 'why', 'admob_app'); end if;
  if c <> '' and c !~ '^ca-app-pub-[0-9]{10,20}/[0-9]{6,12}$' then return jsonb_build_object('ok', false, 'why', 'admob_recompense'); end if;
  insert into public.at_textes (k, v) values ('gc_regie', jsonb_build_object('adsense', a, 'admob_app', b, 'admob_recompense', c))
    on conflict (k) do update set v = excluded.v, maj_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- ---------- 8. droits ----------
revoke all on function pegase_int.gc_reglage(text, int), pegase_int.gc_ouvert(), pegase_int.gc_jour(), pegase_int.gc_payer(text, int, text), pegase_int.gc_compte(text), pegase_int.gc_meme_famille(uuid, uuid), pegase_int.gc_parrain_maj(uuid),
  pegase_int.gc_achat_trg(), pegase_int.gc_record_noter(text, text, text, text, int, int, text, int, text, text), pegase_int.gc_score_trg(), pegase_int.gc_course_trg(), pegase_int.gc_code_de(text) from public, anon, authenticated;
revoke all on function public.gc_partie_debut(text, text), public.gc_mes_gains(text), public.gc_records_carte(text), public.gc_pub_debut(text, text), public.gc_pub_annuler(text, uuid), public.gc_pub_fin(text, uuid),
  public.gc_parrain_lier(text, text), public.gc_etat(text), public.gc_admin_etat(text), public.gc_admin_record(text, bigint, boolean), public.gc_admin_regie(text, text, text, text) from public, anon;
grant execute on function public.gc_partie_debut(text, text), public.gc_mes_gains(text), public.gc_records_carte(text), public.gc_pub_debut(text, text), public.gc_pub_annuler(text, uuid), public.gc_pub_fin(text, uuid),
  public.gc_parrain_lier(text, text), public.gc_etat(text), public.gc_admin_etat(text), public.gc_admin_record(text, bigint, boolean), public.gc_admin_regie(text, text, text, text) to authenticated;
grant execute on function public.gc_records_carte(text) to anon;
revoke all on function public.gc_mon_code(text) from public, anon;
grant execute on function public.gc_mon_code(text) to authenticated;
