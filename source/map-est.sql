-- Carte d'avancement : position « estimée » (à coller dans Supabase > SQL Editor, puis Run). Peut être relancé sans risque : garde toutes les données.
-- La carte pose chaque tête sur le meilleur niveau du joueur (table progress). Certaines de ces positions viennent de progress-seed.sql :
-- une ESTIMATION tirée d'un ancien score, pas une vraie partie suivie par la carte. Le site l'écrit discrètement (« estimé »).
--   * progress.estimated (boolean, false par défaut).
--   * Marquage (refait à chaque lancement, ne fait que passer à true) : une ligne est estimée quand sa date « at » est EXACTEMENT la date
--     (created_at) d'une ligne de scores du même joueur, dans la même salle et pour le même jeu. Pourquoi c'est sûr :
--       - progress-seed.sql recopie dans « at » la date du meilleur score qui a servi à l'estimation ;
--       - save_progress écrit at = now(), l'heure de SA transaction, jamais égale à la date d'un score (add_score est un autre appel) :
--         une ligne qu'une vraie partie a fait monter n'est donc jamais prise pour une estimation ;
--       - un save_progress qui ne fait pas monter le niveau ne touche pas à la ligne : la position vient toujours de l'estimation.
--     Limite : si le joueur a battu son record de points depuis l'estimation, add_score a remplacé l'ancienne ligne de scores ; sa ligne de
--     progression n'est plus reconnaissable et reste « non estimée » (il a de toute façon rejoué à ce jeu depuis, dans cette salle).
--   * save_progress (la version de public.sql + estimated) : une vraie partie qui fait monter le niveau remet estimated = false ; une vraie
--     partie qui ATTEINT le niveau estimé le confirme aussi (estimated = false, at = maintenant) ; un niveau plus bas ne change rien.
--   * get_progress (la version de public.sql) renvoie en plus r_estimated (mêmes paramètres ; les anciens sites ignorent la colonne).
-- ORDRE : après public.sql (supabase.sql le contient à la fin, après public.sql et invite.sql).
--   Si progress-seed.sql est relancé, relancer ce fichier ensuite (marquage des nouvelles estimations).
--   ATTENTION : public.sql relancé SEUL après ce fichier s'arrête sur get_progress (« cannot change return type », une colonne de plus) :
--   relancer plutôt supabase.sql en entier ; ou bien d'abord « drop function public.get_progress(text, bigint, text); », puis public.sql,
--   puis ce fichier.

do $$ begin
  if to_regclass('public.progress') is null then raise exception 'Lance d''abord source/progress.sql (table progress manquante)'; end if;
  if to_regprocedure('public.room_guard(bigint)') is null then raise exception 'Lance d''abord source/public.sql (room_guard manquante)'; end if;
end $$;

alter table public.progress add column if not exists estimated boolean not null default false;

-- positions venues de l'estimation (progress-seed.sql) : date = celle d'un score du joueur, même salle, même jeu
update public.progress g set estimated = true
where not g.estimated
  and exists (select 1 from public.scores s where s.room_id = g.room_id and s.name = g.name and s.game = g.game and s.created_at = g.at);

-- renvoie le meilleur niveau gardé pour ce joueur et ce jeu (null : pas membre de la salle, rien d'enregistré)
create or replace function public.save_progress(p_code text, p_room bigint, p_room_code text, p_name text, p_game text, p_level int) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n text := upper(left(trim(coalesce(p_name, '')), 12)); v int;
begin
  perform public.room_guard(p_room);
  if n = '' then raise exception 'nom vide'; end if;
  perform public.acct_check(n);
  if p_game is null or p_game !~ '^[a-z0-9_-]{2,20}$' then raise exception 'jeu invalide'; end if;
  if p_level is null or p_level < 1 or p_level > 9999 then raise exception 'niveau invalide'; end if;
  if not exists (select 1 from public.room_members m where m.room_id = p_room and m.name = n) then return null; end if;
  -- vraie partie : le niveau monte (ou atteint enfin le niveau estimé) → ce n'est plus une estimation
  insert into public.progress as g (room_id, name, game, level, at, estimated) values (p_room, n, p_game, p_level, now(), false)
    on conflict (room_id, name, game) do update set level = excluded.level, at = excluded.at, estimated = false
    where excluded.level > g.level or (g.estimated and excluded.level = g.level);
  select g.level into v from public.progress g where g.room_id = p_room and g.name = n and g.game = p_game;
  return v;
end $$;

-- même fonction que public.sql, + r_estimated (colonne de plus dans le résultat : il faut la recréer)
drop function if exists public.get_progress(text, bigint, text);
create function public.get_progress(p_code text, p_room bigint, p_room_code text)
returns table(r_name text, r_game text, r_level int, r_at timestamptz, r_estimated boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.room_guard(p_room);
  return query
    select g.name, g.game, g.level, g.at, g.estimated from public.progress g
    where g.room_id = p_room and exists (select 1 from public.room_members m where m.room_id = p_room and m.name = g.name)
    order by g.game, g.level desc, g.at;
end $$;

revoke all on function public.save_progress(text, bigint, text, text, text, int), public.get_progress(text, bigint, text) from public;
grant execute on function public.save_progress(text, bigint, text, text, text, int), public.get_progress(text, bigint, text) to anon, authenticated;
