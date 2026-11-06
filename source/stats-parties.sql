-- v154 (borne 2.0.153) : UNE SEULE SOURCE pour les parties et les joueurs de l'espace du jeu (chef, 6 nov.) : la table des scores (chaque partie
-- terminée), jour par jour (heure de Paris) ; 'periode' = parties / joueurs différents / temps sur les p_jours derniers jours. Le temps de jeu
-- et les visites de la boutique restent mesurés par la borne (at_stats_evenements, depuis le 5 nov.).
CREATE OR REPLACE FUNCTION public.at_stats_lire(p_name text, p_jeu text, p_jours integer DEFAULT 30)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
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
    'periode', jsonb_build_object(
      'parties', (select count(*) from public.scores s where s.game = j and (s.created_at at time zone 'Europe/Paris')::date >= d0),
      'joueurs', (select count(distinct s.name) from public.scores s where s.game = j and (s.created_at at time zone 'Europe/Paris')::date >= d0),
      'temps', (select coalesce(sum(e.valeur), 0) from public.at_stats_evenements e where e.jeu = j and e.sorte = 'temps' and e.jour >= d0),
      'boutique', (select count(*) from public.at_stats_evenements e where e.jeu = j and e.sorte = 'boutique' and e.jour >= d0),
      'jours', d),
    'jours', (select coalesce(jsonb_agg(jsonb_build_object('jour', g::date, 'parties', coalesce(sc.n, 0), 'pjoueurs', coalesce(sc.p, 0), 'lancements', coalesce(x.l, 0), 'joueurs', coalesce(x.p, 0), 'temps', coalesce(x.t, 0), 'boutique', coalesce(x.b, 0)) order by g), '[]'::jsonb)
              from generate_series(d0, aujourd, interval '1 day') g
              left join (select e.jour, count(*) filter (where e.sorte = 'lancement') l, count(distinct e.name) filter (where e.sorte = 'lancement') p,
                           sum(e.valeur) filter (where e.sorte = 'temps') t, count(*) filter (where e.sorte = 'boutique') b
                         from public.at_stats_evenements e where e.jeu = j and e.jour >= d0 group by e.jour) x on x.jour = g::date
              left join (select (s.created_at at time zone 'Europe/Paris')::date jour, count(*) n, count(distinct s.name) p
                         from public.scores s where s.game = j and (s.created_at at time zone 'Europe/Paris')::date >= d0 group by 1) sc on sc.jour = g::date),
    'achats', (select jsonb_build_object('nombre', count(*), 'credits', coalesce(sum(a.part_createur), 0))
               from public.at_boutique_achats a join public.at_boutique_articles ar on ar.id = a.article where ar.jeu = j and a.rembourse_at is null),
    'articles', (select count(*) from public.at_boutique_articles ar where ar.jeu = j and ar.retire_at is null and coalesce(ar.actif, true)),
    'scores', (select jsonb_build_object('record', max(s.score), 'joueurs', count(distinct s.name), 'parties', count(*)) from public.scores s where s.game = j)
  ) into r;
  return r;
end $function$;
