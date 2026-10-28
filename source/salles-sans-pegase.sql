-- ============================================================================================================================
-- Salles « sans Pégase » (borne 1.49.2, 28 oct. 2026). Demande de Benjamin (00 h 50) : « tous les gens de Les couverts, il faut leur
-- donner accès qu'à la borne et à leur salle, mais pas à l'onglet Pégase ».
--   rooms.pegase = false : la salle ferme Pégase à ses joueurs. Un JOUEUR (pseudo) dont TOUTES les salles sont « sans Pégase » :
--   - la borne ne lui montre rien de Pégase (onglet, îles, Regarder, hub, appels) : public.pg_acces(p_code, p_name) → false ;
--   - il n'entre sur aucune île, d'où qu'il vienne (borne, hub, jeu PC ou Android) : refusé à l'entrée dans pg_ile_membres
--     (déclencheur : pg_island_join, pg_island_create, une demande acceptée… échouent avec « pegase ferme pour ce joueur »).
--   Un joueur sans salle, ou dans au moins une salle « avec Pégase » (PATOU), garde tout ; un visiteur sans compte : rien ne change.
-- Rien n'est effacé : un joueur déjà habitant d'une île le reste (requête de contrôle en bas). À appliquer une fois (SQL Editor).
-- ============================================================================================================================

alter table public.rooms add column if not exists pegase boolean not null default true;
update public.rooms set pegase = false where id = 6 and lower(trim(name)) = 'les couverts';   -- doit toucher 1 ligne

-- vrai si TOUTES les salles de ce pseudo sont « sans Pégase » (et qu'il en a au moins une) ; interne
create or replace function public.pg_sans_pegase(p_nom text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.room_members m where m.name = p_nom)
    and not exists (select 1 from public.room_members m join public.rooms r on r.id = m.room_id where m.name = p_nom and r.pegase);
$$;
revoke all on function public.pg_sans_pegase(text) from public, anon, authenticated;

-- la borne : Pégase est-il ouvert à ce joueur de mon compte ? (toujours vrai pour un visiteur sans compte)
create or replace function public.pg_acces(p_code text, p_name text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  if auth.uid() is null then return true; end if;
  perform public.acct_check(n);
  return not public.pg_sans_pegase(n);
end $$;
grant execute on function public.pg_acces(text, text) to anon, authenticated;

-- aucune île pour eux : refusé à l'entrée dans pg_ile_membres
create or replace function pegase_int.pg_ile_membres_salle() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if public.pg_sans_pegase(new.name) then raise exception 'pegase ferme pour ce joueur (salle sans pegase)'; end if;
  return new;
end $$;
revoke all on function pegase_int.pg_ile_membres_salle() from public, anon, authenticated;
drop trigger if exists pg_ile_membres_salle on public.pg_ile_membres;
create trigger pg_ile_membres_salle before insert on public.pg_ile_membres
  for each row execute function pegase_int.pg_ile_membres_salle();

-- ---- contrôles (à lancer après) ----
-- select id, name, owner, pegase from public.rooms where not pegase;                                   -- 6 « Les couverts »
-- select m.name, public.pg_sans_pegase(m.name) as sans_pegase from public.room_members m where m.room_id = 6;   -- PATOU : false
-- select m.ile_id, m.name from public.pg_ile_membres m where public.pg_sans_pegase(m.name);             -- déjà habitants d'une île (rien d'effacé)

-- ---- pour revenir en arrière ----
-- drop trigger if exists pg_ile_membres_salle on public.pg_ile_membres;
-- drop function if exists pegase_int.pg_ile_membres_salle(); drop function if exists public.pg_acces(text, text);
-- drop function if exists public.pg_sans_pegase(text); update public.rooms set pegase = true where id = 6;
