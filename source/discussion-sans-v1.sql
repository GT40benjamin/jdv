-- borne 2.0.131 (SQL v142) — demande de l'équipe des discussions (5 nov.) : la mascotte peut PROPOSER un choix aussi sur un projet
-- SANS V1 (ex. « nouvelle image d'ambiance · 10 » pendant le montage) ; avant, at_discussion_proposer refusait (« pas jouable »).
-- Seul un projet supprimé est refusé. Le reste ne change pas (ticket « vue » gratuit, message de la discussion, at_demande_proposer).
create or replace function public.at_discussion_proposer(p_fiche uuid, p_propositions jsonb, p_texte text default null, p_titre text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare f public.at_fiches; d uuid := gen_random_uuid(); ti text; tx text := nullif(btrim(coalesce(p_texte, '')), ''); r jsonb;
begin
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null then raise exception 'fiche inconnue'; end if;
  if f.supprime_at is not null then raise exception 'projet supprime'; end if;   -- v142 : plus de « pas jouable »
  if jsonb_typeof(p_propositions) <> 'array' or jsonb_array_length(p_propositions) < 1 then raise exception 'propositions invalides'; end if;
  ti := left(coalesce(nullif(btrim(coalesce(p_titre, '')), ''), p_propositions -> 0 ->> 'libelle', 'Une idée pour ton jeu'), 200);
  insert into public.at_demandes (id, fiche, name, sorte, texte, cout, etat) values (d, f.id, f.name, 'message', '💡 Idée de la discussion : ' || ti, 0, 'vue');
  insert into public.at_messages (fiche, texte, de_atelier, demande, discussion) values (f.id, coalesce(tx, '💡 Je te propose : ' || ti || ' 👇'), true, d, true);
  r := public.at_demande_proposer(d, p_propositions, coalesce(tx, '💡 Je te propose : ' || ti || ' 👇'));
  update public.at_fiches x set maj_at = now() where x.id = f.id;
  return r || jsonb_build_object('demande', d);
end $$;
