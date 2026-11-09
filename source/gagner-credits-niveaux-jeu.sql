-- ===== gagner-credits-niveaux-jeu.sql : ce que chaque niveau d'un jeu peut rapporter, pour que le jeu l'affiche (décision de l'admin, 8 nov. 2026) =====
-- REJOUABLE, après gagner-credits-noisette.sql. Ne change aucune règle de gain : une lecture seule, appelée par api.levelBest.gains() (gagner.js).
-- Rend null si la section est fermée ou si le jeu n'est pas dans gc_jeux_niveaux. Sinon :
-- { gain, nb, createur, niveaux: { "1": { etat, record, nom }, … } }, etat parmi a_gagner, gagne, ton_record, createur ; record en ms (null : personne n'a fini ce niveau).
create or replace function public.gc_niveaux_jeu(p_name text, p_jeu text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare n text := public.pg_n(p_name); g int := pegase_int.gc_reglage('gc_niveau_credits', 20); nb int; crea boolean;
begin
  if pegase_int.gc_reglage('gc_actif', 1) <> 1 or not pegase_int.gc_ouvert() then return null; end if;
  select (t.v ->> p_jeu)::int into nb from public.at_textes t where t.k = 'gc_jeux_niveaux';
  if nb is null or nb < 1 then return null; end if;
  crea := pegase_int.gc_createur(n, p_jeu);
  return jsonb_build_object('gain', g, 'nb', nb, 'createur', crea, 'niveaux', (
    select jsonb_object_agg(i::text, jsonb_build_object(
      'etat', case when crea then 'createur'
                   when exists (select 1 from pegase_int.gc_records r where r.name = n and r.jeu = p_jeu and r.niveau = 't' || i and r.etat in ('paye', 'attente')) then 'gagne'
                   when b.name = n then 'ton_record'
                   else 'a_gagner' end,
      'record', b.ms, 'nom', b.name))
    from generate_series(1, nb) i
    left join lateral (select l.ms, l.name from public.level_bests l where l.game = p_jeu and l.level = 't' || i and l.moves = 1 order by l.ms, l.at limit 1) b on true));
end $$;
revoke all on function public.gc_niveaux_jeu(text, text) from public, anon;
grant execute on function public.gc_niveaux_jeu(text, text) to authenticated;
