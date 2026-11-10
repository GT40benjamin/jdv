-- « Gagner des crédits » : les jeux où ce joueur ne peut PAS gagner de crédits (créateur d'un jeu de l'Atelier, admin sur les jeux de base).
-- Même règle que les déclencheurs des records (pegase_int.gc_createur) : la borne n'affiche pas l'indicateur à quelqu'un dont le gain serait refusé.
create or replace function public.gc_exclus(p_name text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  return coalesce((select jsonb_agg(y.j order by y.j) from (
    select x.j from (
      select jsonb_array_elements_text(g.v) j from public.at_textes g where g.k = 'gc_jeux_records'
      union select jsonb_object_keys(g.v) from public.at_textes g where g.k in ('gc_jeux_niveaux', 'gc_jeux_distances')
      union select 'chrono') x
    where pegase_int.gc_createur(n, x.j)) y), '[]'::jsonb);
end $$;
revoke all on function public.gc_exclus(text) from public;
grant execute on function public.gc_exclus(text) to authenticated;
notify pgrst, 'reload schema';
