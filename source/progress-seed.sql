-- Carte d'avancement : point de départ à partir des scores déjà enregistrés (à coller dans Supabase > SQL Editor, puis Run).
-- À lancer APRÈS progress.sql. Peut être relancé sans risque : n'écrit que si le niveau estimé est PLUS HAUT que celui déjà gardé
-- (la progression enregistrée en jouant n'est jamais baissée), et ne touche à rien d'autre que la table progress.
--
-- Pour chaque membre ACTUEL de chaque salle, et pour Galaxy Wars (ilo) et Plein Gaz (pleingaz) : on prend son meilleur score de
-- la salle et on en déduit le plus haut niveau qu'il est SÛR d'avoir atteint (borne basse : on préfère sous-estimer d'un niveau).
-- Niveau estimé 1 : rien n'est écrit (la carte le met déjà au départ / au niveau 1 dès qu'il rejoue).
--
-- Seuils : « avec au moins min_score points, on a forcément atteint ce niveau ». Ils viennent du code des jeux et de mesures
-- avec des robots invincibles (harnais source/test/ilo.html, pleingaz-src.html piloté en direct) : pour chaque niveau L, le plus
-- gros score qu'on peut avoir SANS l'avoir atteint (score juste avant le passage au niveau L, meilleur des parties mesurées),
-- avec une marge (Galaxy Wars × 1,3 ; Plein Gaz × 1,15 + 20 m). Au-delà du dernier seuil : on s'arrête au dernier niveau du tableau.
--   Galaxy Wars : score = points ; niveau = cycle × 8 + secteur.
--   Plein Gaz   : score = mètres parcourus + primes de boss (30 + 15 × niveau terminé) ; niveau = niveau du jeu.

do $$ begin
  if to_regclass('public.progress') is null then raise exception 'Lance d''abord source/progress.sql (table progress manquante)'; end if;
end $$;

with seuils(game, level, min_score) as (values
  -- Galaxy Wars (ilo) : niveau, points minimum
  ('ilo', 2, 850000), ('ilo', 3, 2200000), ('ilo', 4, 2505000), ('ilo', 5, 4180000), ('ilo', 6, 4654000), ('ilo', 7, 5121000),
  ('ilo', 8, 5629000), ('ilo', 9, 6181000), ('ilo', 10, 6785000), ('ilo', 11, 7473000), ('ilo', 12, 8165000),
  -- Plein Gaz (pleingaz) : niveau, score minimum (m)
  ('pleingaz', 2, 520), ('pleingaz', 3, 1250), ('pleingaz', 4, 2060), ('pleingaz', 5, 3350), ('pleingaz', 6, 4720), ('pleingaz', 7, 6120),
  ('pleingaz', 8, 7610), ('pleingaz', 9, 9130), ('pleingaz', 10, 11430), ('pleingaz', 11, 14060), ('pleingaz', 12, 15780), ('pleingaz', 13, 17650),
  ('pleingaz', 14, 19600), ('pleingaz', 15, 22940), ('pleingaz', 16, 26490), ('pleingaz', 17, 28570), ('pleingaz', 18, 30830), ('pleingaz', 19, 33280),
  ('pleingaz', 20, 37520), ('pleingaz', 21, 42150), ('pleingaz', 22, 44790)
),
-- meilleur score de chaque membre actuel, par salle et par jeu (avec sa date)
best as (
  select distinct on (s.room_id, s.name, s.game) s.room_id, s.name, s.game, s.score, s.created_at
  from public.scores s
  join public.room_members m on m.room_id = s.room_id and m.name = s.name
  where s.game in ('ilo', 'pleingaz') and s.room_id is not null
  order by s.room_id, s.name, s.game, s.score desc, s.created_at
),
estime as (
  select b.room_id, b.name, b.game, b.created_at,
         coalesce((select max(t.level) from seuils t where t.game = b.game and b.score >= t.min_score), 1) as level
  from best b
)
insert into public.progress as g (room_id, name, game, level, at)
select e.room_id, e.name, e.game, e.level, e.created_at from estime e
where e.level > 1 and char_length(e.name) between 1 and 12
on conflict (room_id, name, game) do update set level = excluded.level, at = excluded.at
  where excluded.level > g.level
returning g.room_id as salle, g.name as joueur, g.game as jeu, g.level as niveau;   -- les lignes ajoutées ou montées
