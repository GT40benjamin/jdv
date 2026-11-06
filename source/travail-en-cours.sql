-- v161 (borne 2.0.176) : le TRAVAIL EN COURS d'un projet de l'Atelier, posé par l'équipe du jeu (demande de l'admin : « montre la mascotte
-- qui bosse dessus, avec un texte qui dit ce qu'elle fait ») — même quand le travail ne vient pas d'un ticket (demandes directes de l'admin).
-- at_travail_poser(p_fiche, p_texte, p_etape, p_fin) : réservée (rôle service : les équipes, jamais un joueur) ; p_fin = vrai → effacé.
-- at_travail_lire(p_name, p_fiche) : le joueur du projet (ou un admin) → { texte, etape, at } ou null. Texte pour les joueurs : jamais de prénom.
create table if not exists public.at_travaux (
  fiche uuid primary key references public.at_fiches(id) on delete cascade,
  texte text not null, etape text, at timestamptz not null default now()
);
alter table public.at_travaux enable row level security;   -- aucune politique : lu seulement par les fonctions

create or replace function public.at_travail_poser(p_fiche uuid, p_texte text, p_etape text default null, p_fin boolean default false)
 returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare tx text := left(btrim(coalesce(p_texte, '')), 400); et text := nullif(left(btrim(coalesce(p_etape, '')), 60), '');
begin
  if pegase_int.at_joueur_appel() then raise exception 'reserve'; end if;
  if not exists (select 1 from public.at_fiches f where f.id = p_fiche) then raise exception 'projet inconnu'; end if;
  if coalesce(p_fin, false) then delete from public.at_travaux t where t.fiche = p_fiche; return jsonb_build_object('ok', true, 'fin', true); end if;
  if tx = '' then raise exception 'texte vide'; end if;
  if pegase_int.at_filtre(tx) <> '' or (et is not null and pegase_int.at_filtre(et) <> '') then raise exception 'texte refuse'; end if;
  insert into public.at_travaux (fiche, texte, etape, at) values (p_fiche, tx, et, now())
    on conflict (fiche) do update set texte = excluded.texte, etape = excluded.etape, at = now();
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function public.at_travail_poser(uuid, text, text, boolean) from public, anon, authenticated;

create or replace function public.at_travail_lire(p_name text, p_fiche uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions' as $function$
declare n text := public.pg_n(p_name); r public.at_travaux;
begin
  perform public.acct_check(n);
  if not exists (select 1 from public.at_fiches f where f.id = p_fiche and f.name = n) then perform pegase_int.at_admin_ok(n); end if;
  select * into r from public.at_travaux t where t.fiche = p_fiche and t.at > now() - interval '3 days';   -- oublié par l'équipe : disparaît seul après 3 jours
  if r.fiche is null then return null; end if;
  return jsonb_build_object('texte', r.texte, 'etape', r.etape, 'at', r.at);
end $function$;
revoke all on function public.at_travail_lire(text, uuid) from public, anon;
grant execute on function public.at_travail_lire(text, uuid) to authenticated, service_role;
