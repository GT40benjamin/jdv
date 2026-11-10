-- La roue du jour (« Gagner des crédits ») : 1 lancer gratuit par compte et par jour, 3 lancers de plus contre une pub (le 3e sur la roue dorée).
-- Le tirage se fait ici et une seule fois : un double clic, un 2e appareil ou un retour arrière retrouvent le même résultat.
-- Relançable. Réglages : at_reglages (roue_*), lots et chances : at_textes 'roue_lots' (poids sur 100 000).
insert into public.at_reglages (k, v) values ('roue_actif', 1), ('roue_plafond_mois', 20000), ('roue_jackpot_max_mois', 1), ('roue_jackpot_gagnant', 1000), ('roue_jackpot_copain', 50), ('roue_jackpot_copains_max', 8), ('roue_pub_max_jour', 3), ('roue_booster_actif', 0), ('roue_serie_jours', 5), ('roue_serie_credits', 20) on conflict (k) do nothing;
insert into public.at_textes (k, v) values ('roue_lots', '{
  "cases": { "gratuit": ["J","1","2","5","1","B","2","1","10","2","25","1"], "pub": ["J","1","2","1","5","1","B","2","1","2","1","2"], "or": ["J","1","2","5","1","B","2","1","10","2","25","1"] },
  "gratuit": { "1": 48000, "2": 30000, "5": 12000, "10": 4000, "25": 1950, "B": 4000, "J": 50 },
  "pub": { "1": 80000, "2": 16000, "5": 1500, "B": 2495, "J": 5 },
  "or": { "1": 55000, "2": 28000, "5": 10000, "10": 3000, "25": 500, "B": 3480, "J": 20 }
}'::jsonb) on conflict (k) do nothing;

create table if not exists pegase_int.roue_lancers (
  id bigint generated always as identity primary key, compte uuid not null, name text not null, jour date not null,
  rang int not null,              -- 0 : gratuit ; 1, 2, 3 : par pub
  sorte text not null check (sorte in ('gratuit', 'pub', 'or')),
  case_i int not null, lot text not null, credits int not null default 0, booster jsonb, test boolean not null default false,
  pub uuid unique, at timestamptz not null default now(), unique (compte, jour, rang));
alter table pegase_int.roue_lancers add column if not exists bonus int not null default 0;   -- la série : payé le jour où elle atteint son compte
create table if not exists pegase_int.roue_partages (
  id bigint generated always as identity primary key, gagnant text not null, salle bigint not null, copain text not null, compte uuid not null,
  credits int not null, vu boolean not null default false, at timestamptz not null default now());
create index if not exists roue_partages_copain on pegase_int.roue_partages (copain, vu);
create table if not exists pegase_int.roue_revenus (mois text primary key, centimes int not null, maj_at timestamptz not null default now());
alter table pegase_int.roue_lancers enable row level security; alter table pegase_int.roue_partages enable row level security; alter table pegase_int.roue_revenus enable row level security;

create or replace function pegase_int.roue_mois() returns timestamptz language sql stable as $$ select date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' $$;
create or replace function pegase_int.roue_donnes_mois() returns int language sql stable security definer set search_path = public as $$
  select (coalesce((select sum(l.credits + l.bonus) from pegase_int.roue_lancers l where not l.test and l.at >= pegase_int.roue_mois()), 0)
        + coalesce((select sum(p.credits) from pegase_int.roue_partages p where p.at >= pegase_int.roue_mois()), 0))::int $$;

-- les vrais poids du moment : booster coupé, plafond du mois atteint, jackpot déjà tombé ce mois : leur chance repart sur « 1 crédit »
create or replace function pegase_int.roue_poids(p_sorte text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare w jsonb := (select g.v -> p_sorte from public.at_textes g where g.k = 'roue_lots'); s int; k text;
  bo boolean := pegase_int.gc_reglage('roue_booster_actif', 0) = 1 and to_regproc('pegase_int.af_booster_tirer') is not null;
  plein boolean := pegase_int.roue_donnes_mois() >= pegase_int.gc_reglage('roue_plafond_mois', 20000);
  jp boolean := (select count(*) from pegase_int.roue_lancers l where l.lot = 'J' and not l.test and l.at >= pegase_int.roue_mois()) >= pegase_int.gc_reglage('roue_jackpot_max_mois', 1);
begin
  for k in select jsonb_object_keys(w) loop
    if (k = 'B' and not bo) or (k = 'J' and (jp or plein)) or (plein and k not in ('1', 'B')) then
      s := (w ->> k)::int; w := (w - k) || jsonb_build_object('1', coalesce((w ->> '1')::int, 0) + s);
    end if;
  end loop;
  return w;
end $$;

create or replace function pegase_int.roue_tirer(w jsonb) returns text language plpgsql volatile as $$
declare tot int := (select sum(v::int) from jsonb_each_text(w) e(k, v)); x int := floor(random() * tot)::int; r record;
begin
  for r in select k, v::int v from jsonb_each_text(w) e(k, v) order by k loop
    if x < r.v then return r.k; end if; x := x - r.v;
  end loop;
  return '1';
end $$;

-- la série : nombre de jours d'affilée avec un lancer gratuit, jusqu'à p_jour compris (un jour manqué : on repart de zéro)
create or replace function pegase_int.roue_serie(u uuid, p_jour date) returns int language plpgsql stable security definer set search_path = public as $$
declare d date := p_jour; n int := 0;
begin
  while exists (select 1 from pegase_int.roue_lancers l where l.compte = u and l.jour = d and l.rang = 0) loop n := n + 1; d := d - 1; end loop;
  return n;
end $$;

-- les cases affichées : le booster coupé ne figure pas sur la roue
create or replace function pegase_int.roue_cases(p_sorte text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(case when e.v = 'B' and not (pegase_int.roue_poids(p_sorte) ? 'B') then '1' else e.v end order by e.o), '[]'::jsonb)
  from public.at_textes g, jsonb_array_elements_text(g.v -> 'cases' -> p_sorte) with ordinality e(v, o) where g.k = 'roue_lots' $$;

create or replace function pegase_int.roue_reponse(l pegase_int.roue_lancers, p_deja boolean, n text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'deja', p_deja, 'rang', l.rang, 'sorte', l.sorte, 'case', l.case_i, 'lot', l.lot, 'credits', l.credits, 'booster', l.booster, 'test', l.test, 'solde', pegase_int.at_solde(n), 'cases', pegase_int.roue_cases(l.sorte), 'bonus', l.bonus, 'serie', pegase_int.roue_serie(l.compte, l.jour)) $$;

-- le jackpot : une seule salle, celle du gagnant vue le plus récemment. Payés : ses copains réels (compte à part, membres depuis 14 jours, scores sur 3 jours différents en 30 jours).
create or replace function pegase_int.roue_partager(n text, u uuid) returns int language plpgsql security definer set search_path = public as $$
declare sa bigint; c int := pegase_int.gc_reglage('roue_jackpot_copain', 50); mx int := pegase_int.gc_reglage('roue_jackpot_copains_max', 8); r record; nb int := 0;
begin
  select m.room_id into sa from public.room_members m where m.name = n order by m.last_seen desc nulls last limit 1;
  if sa is null or c <= 0 then return 0; end if;
  if exists (select 1 from pegase_int.roue_partages p where p.salle = sa and p.at > now() - interval '30 days') then return 0; end if;
  for r in
    select m.name, p.user_id from public.room_members m join public.players p on p.name = m.name
    where m.room_id = sa and m.name <> n and p.user_id is not null and p.user_id <> u
      and not pegase_int.gc_meme_famille(p.user_id, u)
      and m.joined_at <= now() - interval '14 days' and m.last_seen >= now() - interval '14 days'
      and (select count(distinct (s.created_at at time zone 'Europe/Paris')::date) from public.scores s where s.name = m.name and s.created_at > now() - interval '30 days') >= 3
      and not exists (select 1 from pegase_int.roue_partages q where q.compte = p.user_id and q.at > now() - interval '30 days')
    order by m.joined_at limit mx
  loop
    insert into pegase_int.roue_partages (gagnant, salle, copain, compte, credits) values (n, sa, r.name, r.user_id, c);
    perform pegase_int.gc_payer(r.name, c, 'gc_roue_copain');
    nb := nb + 1;
  end loop;
  return nb;
end $$;

create or replace function public.roue_etat(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); u uuid; j date := pegase_int.gc_jour(); adm boolean; ouvert boolean := pegase_int.gc_ouvert(); pf int; mx int := pegase_int.gc_reglage('roue_pub_max_jour', 3); g pegase_int.roue_lancers; cad jsonb; se int;
begin
  perform public.acct_check(n);
  adm := pegase_int.at_patron(n);
  if pegase_int.gc_reglage('roue_actif', 1) <> 1 or pegase_int.gc_reglage('gc_actif', 1) <> 1 or (not ouvert and not adm) then return jsonb_build_object('actif', false); end if;
  u := pegase_int.gc_compte(n); if u is null then return jsonb_build_object('actif', false); end if;
  select * into g from pegase_int.roue_lancers l where l.compte = u and l.jour = j and l.rang = 0;
  select count(*) into pf from pegase_int.roue_lancers l where l.compte = u and l.jour = j and l.rang > 0;
  select coalesce(jsonb_agg(jsonb_build_object('de', p.gagnant, 'credits', p.credits) order by p.id), '[]'::jsonb) into cad from pegase_int.roue_partages p where p.copain = n and not p.vu;
  update pegase_int.roue_partages p set vu = true where p.copain = n and not p.vu;
  se := case when g.id is not null then pegase_int.roue_serie(u, j) else pegase_int.roue_serie(u, j - 1) end;
  return jsonb_build_object('actif', true, 'test', not ouvert, 'jour', j, 'gratuit', g.id is null, 'pubs_faites', pf, 'pubs_max', mx,
    'pub_dispo', (pf < mx and ouvert and pegase_int.gc_reglage('gc_pub_test', 1) = 0) or (pf < mx and adm), 'pub_test', pegase_int.gc_reglage('gc_pub_test', 1) <> 0,
    'prochaine', case when pf + 1 >= mx then 'or' else 'pub' end,
    'cases', jsonb_build_object('gratuit', pegase_int.roue_cases('gratuit'), 'pub', pegase_int.roue_cases('pub'), 'or', pegase_int.roue_cases('or')),
    'chances', jsonb_build_object('gratuit', pegase_int.roue_poids('gratuit'), 'pub', pegase_int.roue_poids('pub'), 'or', pegase_int.roue_poids('or')),
    'jackpot', jsonb_build_object('gagnant', pegase_int.gc_reglage('roue_jackpot_gagnant', 1000), 'copain', pegase_int.gc_reglage('roue_jackpot_copain', 50)), 'cadeaux', cad, 'solde', pegase_int.at_solde(n), 'serie', se, 'serie_jours', pegase_int.gc_reglage('roue_serie_jours', 5), 'serie_credits', pegase_int.gc_reglage('roue_serie_credits', 20));
end $$;

-- p_pub null : le lancer gratuit ; sinon le ticket d'une pub vue en entier (gc_pub_debut)
create or replace function public.roue_lancer(p_name text, p_pub uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); u uuid; j date := pegase_int.gc_jour(); l pegase_int.roue_lancers; t pegase_int.gc_pubs; adm boolean; ouvert boolean := pegase_int.gc_ouvert();
  rg int := 0; so text := 'gratuit'; test boolean := not ouvert; lot text; cred int := 0; se int; sj int := greatest(pegase_int.gc_reglage('roue_serie_jours', 5), 1); bon int := 0; idx int; cs jsonb; bo jsonb; mx int := pegase_int.gc_reglage('roue_pub_max_jour', 3); nb int := 0; ecoule numeric;
begin
  perform public.acct_check(n);
  adm := pegase_int.at_patron(n);
  if pegase_int.gc_reglage('roue_actif', 1) <> 1 or pegase_int.gc_reglage('gc_actif', 1) <> 1 or (not ouvert and not adm) then return jsonb_build_object('ok', false, 'why', 'coupe'); end if;
  u := pegase_int.gc_compte(n); if u is null then return jsonb_build_object('ok', false, 'why', 'compte'); end if;
  perform pg_advisory_xact_lock(hashtextextended('roue:' || u::text, 0));   -- deux appareils en même temps : l'un attend l'autre, puis retrouve son résultat
  if p_pub is null then
    select * into l from pegase_int.roue_lancers x where x.compte = u and x.jour = j and x.rang = 0;
    if l.id is not null then return pegase_int.roue_reponse(l, true, n); end if;
  else
    select * into l from pegase_int.roue_lancers x where x.pub = p_pub and x.compte = u;
    if l.id is not null then return pegase_int.roue_reponse(l, true, n); end if;
    select * into t from pegase_int.gc_pubs x where x.id = p_pub and x.name = n for update;
    if t.id is null or t.fin_at is not null or t.debut_at < now() - interval '10 minutes' then return jsonb_build_object('ok', false, 'why', 'ticket'); end if;
    ecoule := extract(epoch from now() - t.debut_at);
    if ecoule < pegase_int.gc_reglage('gc_pub_courte_s', 15) then return jsonb_build_object('ok', false, 'why', 'trop_tot'); end if;
    if t.test and not adm then return jsonb_build_object('ok', false, 'why', 'bientot'); end if;
    select count(*) into rg from pegase_int.roue_lancers x where x.compte = u and x.jour = j and x.rang > 0;
    rg := rg + 1; if rg > mx then return jsonb_build_object('ok', false, 'why', 'plafond', 'max', mx); end if;
    so := case when rg >= mx then 'or' else 'pub' end; test := test or t.test;
    update pegase_int.gc_pubs x set fin_at = now(), credits = 0 where x.id = t.id;
  end if;
  lot := pegase_int.roue_tirer(pegase_int.roue_poids(so));
  if lot = 'B' then
    begin execute 'select pegase_int.af_booster_tirer($1)' into bo using n; exception when others then bo := null; end;
    if bo is null then lot := '5'; end if;                   -- jamais « rien »
  end if;
  cred := case lot when 'J' then pegase_int.gc_reglage('roue_jackpot_gagnant', 1000) when 'B' then 0 else lot::int end;
  cs := pegase_int.roue_cases(so);
  select (e.o - 1)::int into idx from jsonb_array_elements_text(cs) with ordinality e(v, o) where e.v = lot order by random() limit 1;
  if idx is null then select (e.o - 1)::int into idx from jsonb_array_elements_text(cs) with ordinality e(v, o) where e.v = '1' order by random() limit 1; end if;
  insert into pegase_int.roue_lancers (compte, name, jour, rang, sorte, case_i, lot, credits, booster, test, pub) values (u, n, j, rg, so, idx, lot, cred, bo, test, p_pub) returning * into l;
  if rg = 0 then
    se := pegase_int.roue_serie(u, j);
    if se % sj = 0 then bon := pegase_int.gc_reglage('roue_serie_credits', 20); update pegase_int.roue_lancers x set bonus = bon where x.id = l.id returning * into l; end if;
  end if;
  if not test then
    if bon > 0 then perform pegase_int.gc_payer(n, bon, 'gc_roue_serie'); end if;
    if cred > 0 then perform pegase_int.gc_payer(n, cred, 'gc_roue'); end if;
    if lot = 'J' then nb := pegase_int.roue_partager(n, u); end if;
  end if;
  return pegase_int.roue_reponse(l, false, n) || jsonb_build_object('copains', nb, 'gain_copain', pegase_int.gc_reglage('roue_jackpot_copain', 50));
end $$;

-- l'admin : pour comparer ce que rapportent les pubs à ce que la roue distribue
create or replace function public.roue_admin_etat(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); m text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM'); d timestamptz := pegase_int.roue_mois();
begin
  perform public.acct_check(n);
  if not pegase_int.at_patron(n) then raise exception 'admin requis'; end if;
  return jsonb_build_object('mois', m, 'plafond', pegase_int.gc_reglage('roue_plafond_mois', 20000), 'donnes', pegase_int.roue_donnes_mois(),
    'gratuit', (select jsonb_build_object('lancers', count(*), 'credits', coalesce(sum(l.credits + l.bonus), 0)) from pegase_int.roue_lancers l where l.rang = 0 and not l.test and l.at >= d),
    'pub', (select jsonb_build_object('lancers', count(*), 'credits', coalesce(sum(l.credits), 0)) from pegase_int.roue_lancers l where l.rang > 0 and not l.test and l.at >= d),
    'jackpots', (select count(*) from pegase_int.roue_lancers l where l.lot = 'J' and not l.test and l.at >= d),
    'revenu_centimes', (select r.centimes from pegase_int.roue_revenus r where r.mois = m));
end $$;
create or replace function public.roue_admin_revenu(p_name text, p_centimes int) returns void language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); m text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM');
begin
  perform public.acct_check(n);
  if not pegase_int.at_patron(n) then raise exception 'admin requis'; end if;
  insert into pegase_int.roue_revenus (mois, centimes) values (m, greatest(p_centimes, 0)) on conflict (mois) do update set centimes = excluded.centimes, maj_at = now();
end $$;

revoke all on function pegase_int.roue_mois(), pegase_int.roue_donnes_mois(), pegase_int.roue_poids(text), pegase_int.roue_tirer(jsonb), pegase_int.roue_cases(text), pegase_int.roue_reponse(pegase_int.roue_lancers, boolean, text), pegase_int.roue_partager(text, uuid), pegase_int.roue_serie(uuid, date) from public;
revoke all on function public.roue_etat(text), public.roue_lancer(text, uuid), public.roue_admin_etat(text), public.roue_admin_revenu(text, int) from public;
grant execute on function public.roue_etat(text), public.roue_lancer(text, uuid), public.roue_admin_etat(text), public.roue_admin_revenu(text, int) to authenticated;
notify pgrst, 'reload schema';
