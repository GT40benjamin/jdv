-- v148 (borne 2.0.142) : l'ESPACE DU JEU — statistiques RÉELLES d'un jeu de l'Atelier et fond généré par projet.
-- Jamais de faux chiffres : seulement ce que la borne a vraiment compté (lancements, joueurs, temps joué, visites de la boutique)
-- + ce qui existe déjà (achats de la boutique, scores). Lecture : le créateur pour SON jeu, l'admin pour tous.
create table if not exists public.at_stats_evenements (
  id bigserial primary key,
  jeu text not null,
  name text not null,
  sorte text not null check (sorte in ('lancement', 'temps', 'boutique')),
  valeur int not null default 0,                                         -- secondes pour « temps »
  jour date not null default ((now() at time zone 'Europe/Paris')::date),
  at timestamptz not null default now());
create index if not exists at_stats_ev_jeu_jour on public.at_stats_evenements (jeu, jour);
create index if not exists at_stats_ev_name_jour on public.at_stats_evenements (name, jour);
alter table public.at_stats_evenements enable row level security;     -- aucune politique : seulement par les fonctions
revoke all on public.at_stats_evenements from anon, authenticated;

-- écrire : un joueur connecté, pour un jeu de l'Atelier qui existe ; 400 évènements par joueur et par jour au plus ; temps : 3 s à 1 h
create or replace function public.at_stats_ecrire(p_name text, p_jeu text, p_sorte text, p_valeur int default 0)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); j text := lower(btrim(coalesce(p_jeu, ''))); v int := greatest(0, coalesce(p_valeur, 0));
begin
  perform public.acct_check(n);
  if p_sorte not in ('lancement', 'temps', 'boutique') then raise exception 'sorte inconnue'; end if;
  if not exists (select 1 from public.at_fiches f where f.jeu = j and f.supprime_at is null) then return jsonb_build_object('ok', false); end if;
  if (select count(*) from public.at_stats_evenements e where e.name = n and e.jour = (now() at time zone 'Europe/Paris')::date) >= 400 then
    return jsonb_build_object('ok', false, 'trop', true); end if;
  if p_sorte = 'temps' then v := least(v, 3600); if v < 3 then return jsonb_build_object('ok', false); end if; else v := 0; end if;
  insert into public.at_stats_evenements (jeu, name, sorte, valeur) values (j, n, p_sorte, v);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.at_stats_ecrire(text, text, text, int) from public, anon;
grant execute on function public.at_stats_ecrire(text, text, text, int) to authenticated;

-- lire : totaux, une ligne par jour (p_jours derniers jours, zéros compris), achats de la boutique (part du créateur), scores
create or replace function public.at_stats_lire(p_name text, p_jeu text, p_jours int default 30)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); j text := lower(btrim(coalesce(p_jeu, ''))); d int := least(greatest(coalesce(p_jours, 30), 1), 90);
  aujourd date := (now() at time zone 'Europe/Paris')::date; d0 date; r jsonb;
begin
  perform public.acct_check(n);
  d0 := aujourd - (d - 1);
  if not exists (select 1 from public.at_admins a where a.name = n)
     and not exists (select 1 from public.at_fiches f where f.jeu = j and f.supprime_at is null and f.name = n) then raise exception 'pas ton jeu'; end if;
  select jsonb_build_object(
    'total', (select jsonb_build_object('lancements', count(*) filter (where e.sorte = 'lancement'), 'joueurs', count(distinct e.name) filter (where e.sorte = 'lancement'),
                'temps', coalesce(sum(e.valeur) filter (where e.sorte = 'temps'), 0), 'boutique', count(*) filter (where e.sorte = 'boutique'), 'depuis', min(e.jour))
              from public.at_stats_evenements e where e.jeu = j),
    'jours', (select coalesce(jsonb_agg(jsonb_build_object('jour', g::date, 'lancements', coalesce(x.l, 0), 'joueurs', coalesce(x.p, 0), 'temps', coalesce(x.t, 0), 'boutique', coalesce(x.b, 0)) order by g), '[]'::jsonb)
              from generate_series(d0, aujourd, interval '1 day') g
              left join (select e.jour, count(*) filter (where e.sorte = 'lancement') l, count(distinct e.name) filter (where e.sorte = 'lancement') p,
                           sum(e.valeur) filter (where e.sorte = 'temps') t, count(*) filter (where e.sorte = 'boutique') b
                         from public.at_stats_evenements e where e.jeu = j and e.jour >= d0 group by e.jour) x on x.jour = g::date),
    'achats', (select jsonb_build_object('nombre', count(*), 'credits', coalesce(sum(a.part_createur), 0))
               from public.at_boutique_achats a join public.at_boutique_articles ar on ar.id = a.article where ar.jeu = j and a.rembourse_at is null),
    'articles', (select count(*) from public.at_boutique_articles ar where ar.jeu = j and ar.retire_at is null and coalesce(ar.actif, true)),
    'scores', (select jsonb_build_object('record', max(s.score), 'joueurs', count(distinct s.name), 'parties', count(*)) from public.scores s where s.game = j)
  ) into r;
  return r;
end $$;
revoke all on function public.at_stats_lire(text, text, int) from public, anon;
grant execute on function public.at_stats_lire(text, text, int) to authenticated;

-- le FOND de l'espace du jeu : une image par projet (file sûre at_gen_image, génération offerte par l'équipe, jamais débitée au joueur),
-- refaite seulement si le thème change (titre, style, décor), 3 au plus par projet (garde-fou du budget)
alter table public.at_fiches add column if not exists espace_fond text, add column if not exists espace_cle text, add column if not exists espace_gen uuid;
create or replace function public.at_espace_fond(p_name text, p_fiche uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; g public.at_gen_file; th text; cle text; u uuid; consigne text;
begin
  perform public.acct_check(n);
  select * into f from public.at_fiches x where x.id = p_fiche and x.supprime_at is null;
  if f.id is null then raise exception 'fiche inconnue'; end if;
  if f.name <> n and not exists (select 1 from public.at_admins a where a.name = n) then raise exception 'pas ton jeu'; end if;
  if f.espace_gen is not null then
    select * into g from public.at_gen_file x where x.id = f.espace_gen;
    if g.id is not null and g.etat = 'fait' and coalesce(g.resultat ->> 'path', '') ~ '^i/[0-9a-f-]{36}\.(png|jpe?g|webp)$' then
      update public.at_fiches x set espace_fond = g.resultat ->> 'path', espace_gen = null where x.id = f.id;
      return jsonb_build_object('fond', g.resultat ->> 'path');
    elsif g.id is null or g.etat = 'erreur' or g.at < now() - interval '1 hour' then
      update public.at_fiches x set espace_gen = null where x.id = f.id;
      return jsonb_build_object('fond', f.espace_fond);       -- raté : on garde l'ancien (ou le fond aux couleurs du jeu), pas de nouvel essai tout seul
    else
      return jsonb_build_object('fond', f.espace_fond, 'en_cours', true);
    end if;
  end if;
  if f.etat not in ('alpha', 'publie_salle', 'publie_monde') then return jsonb_build_object('fond', f.espace_fond); end if;
  th := concat_ws(' | ', f.titre, f.fiche ->> 'style', f.fiche ->> 'decor', f.fiche ->> 'monde');
  cle := md5(coalesce(th, ''));
  if f.espace_fond is not null and f.espace_cle = cle then return jsonb_build_object('fond', f.espace_fond); end if;
  if (select count(*) from public.at_gen_file x where x.fiche = f.id and x.titre = 'Fond de l''espace du jeu') >= 3 then return jsonb_build_object('fond', f.espace_fond); end if;
  consigne := 'un paysage de fond continu, doux et calme, qui remplit toute l''image d''un bord à l''autre, dans le monde du jeu « ' || coalesce(f.titre, '') || ' » : '
    || left(coalesce(nullif(f.fiche ->> 'decor', ''), nullif(f.fiche ->> 'monde', ''), nullif(f.fiche ->> 'idee', ''), 'un joli paysage'), 240)
    || ' ; couleurs douces et un peu pâles ; aucun personnage au premier plan, aucun texte, aucun titre, aucun cadre, aucun panneau, aucun rectangle, aucune interface';
  begin
    perform set_config('atelier.gen_motif', 'offert:fond de l''espace du jeu:EQUIPE', true);
    u := public.at_gen_image(f.id, 'Fond de l''espace du jeu', array[consigne]);
  exception when others then
    return jsonb_build_object('fond', f.espace_fond, 'refus', left(sqlerrm, 80));
  end;
  update public.at_fiches x set espace_gen = u, espace_cle = cle where x.id = f.id;
  return jsonb_build_object('fond', f.espace_fond, 'en_cours', true);
end $$;
revoke all on function public.at_espace_fond(text, uuid) from public, anon;
grant execute on function public.at_espace_fond(text, uuid) to authenticated;
