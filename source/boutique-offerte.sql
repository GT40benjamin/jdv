-- borne 2.0.134 (SQL v144) — décision de l'admin (5 nov. soir) : 100 crédits OFFERTS à chaque créateur pour construire la boutique de
-- son jeu (ses premiers articles), UNE seule fois par projet. Appelée par l'équipe (rôle service) quand le créateur dit oui ;
-- motif du journal des crédits = « boutique_offerte » (nom de la fonction, pegase_int.at_cj_log).
create table if not exists public.at_boutique_offertes (fiche uuid primary key references public.at_fiches(id) on delete cascade, name text not null, credits int not null, at timestamptz not null default now());
alter table public.at_boutique_offertes enable row level security;   -- aucune politique : lue par l'équipe seulement
create or replace function public.boutique_offerte(p_fiche uuid, p_credits integer default 100)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare f public.at_fiches; c int := least(greatest(coalesce(p_credits, 100), 1), 100); s int;
begin
  select * into f from public.at_fiches x where x.id = p_fiche and x.supprime_at is null; if f.id is null then raise exception 'projet inconnu'; end if;
  insert into public.at_boutique_offertes (fiche, name, credits) values (f.id, f.name, c) on conflict (fiche) do nothing;
  if not found then return jsonb_build_object('ok', true, 'deja', true, 'solde', pegase_int.at_solde(f.name)); end if;
  s := pegase_int.at_crediter(f.name, c);
  return jsonb_build_object('ok', true, 'deja', false, 'credits', c, 'name', f.name, 'solde', s);
end $$;
revoke all on function public.boutique_offerte(uuid, integer) from public, anon, authenticated;
