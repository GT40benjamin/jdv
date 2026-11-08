-- 8 nov. 2026 (l'admin) : « 🖼️ Posters » — seule la 4K se vend en crédits ; la version à imprimer ne se vend pas et ne se télécharge jamais.
-- Prix : at_reglages.prix_poster_4k (300 par défaut, modifiable). Débit par at_debiter (donc au journal, motif at_poster_4k), UNE SEULE FOIS par poster et par joueur ;
-- on montre le prix avant, avec un « oui » : jamais d'achat de crédits automatique.
-- Les fichiers payants sont dans le seau PRIVÉ atelier-fichiers, à un chemin gardé côté serveur (jamais dans assets, jamais vers la borne avant l'achat) :
--   * public.at_poster_fichiers (fiche, poster, sorte, path, taille) : fermée ; poster = le chemin assets[].image ; sorte = '4k' ou 'impression' ;
--     déposée par l'équipe : fonction atelier-depot-prive, puis select pegase_int.at_poster_fichier_poser(fiche, poster, sorte, path, taille) ;
--   * public.at_poster_achats (name, fiche, poster, prix, at) : un achat par joueur, projet et poster ; fermée ;
--   * public.at_poster_4k(p_name, p_fiche, p_poster, p_acheter) :
--       pas de fichier 4K déposé : { dispo: false } (la borne affiche « Bientôt ») ;
--       p_acheter = false : { dispo, achete, prix, solde } et, si déjà acheté, { path } ;
--       p_acheter = true  : débite une seule fois et rend { achete: true, path, solde, debit } ; crédits insuffisants : refus, rien n'est débité.
--     Le propriétaire du projet (un admin sur SON projet paie comme un joueur) ; un admin sur le projet d'un joueur la lit sans payer.
--   * pegase_int.at_fichier_obj_ok : le fichier 4K se lit après l'achat seulement (ou par un admin) ; un fichier 'impression' ne se lit JAMAIS par un compte
--     (l'imprimeur le reçoit par une URL signée, créée côté serveur à la commande).
--   * public.at_depot_prive_utiliser : le jeton d'équipe (pegase_int.at_depot_jeton), pour la fonction atelier-depot-prive.
-- Essai : begin; <ce fichier>; … ; rollback; — puis pour de vrai. Rejouable. Test : node test-poster-4k-sql.mjs (PGlite).

insert into public.at_reglages (k, v) values ('prix_poster_4k', 300) on conflict (k) do nothing;

create table if not exists public.at_poster_fichiers (
  fiche uuid not null references public.at_fiches (id) on delete cascade, poster text not null, sorte text not null check (sorte in ('4k', 'impression')),
  path text not null unique check (path ~ '^f/[0-9a-f-]{36}[.](jpg|pdf)$'), taille text, depose_at timestamptz not null default now(), primary key (fiche, poster, sorte));
alter table public.at_poster_fichiers enable row level security;
revoke all on table public.at_poster_fichiers from public, anon, authenticated;

create table if not exists public.at_poster_achats (
  name text not null, fiche uuid not null references public.at_fiches (id) on delete cascade, poster text not null,
  prix int not null, at timestamptz not null default now(), primary key (name, fiche, poster));
alter table public.at_poster_achats enable row level security;
revoke all on table public.at_poster_achats from public, anon, authenticated;

create or replace function pegase_int.at_poster_fichier_poser(p_fiche uuid, p_poster text, p_sorte text, p_path text, p_taille text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.at_fiches f, jsonb_array_elements(case when jsonb_typeof(f.assets) = 'array' then f.assets else '[]'::jsonb end) x where f.id = p_fiche and x ->> 'image' = p_poster) then raise exception 'poster inconnu'; end if;
  insert into public.at_poster_fichiers (fiche, poster, sorte, path, taille) values (p_fiche, p_poster, p_sorte, p_path, p_taille)
    on conflict (fiche, poster, sorte) do update set path = excluded.path, taille = excluded.taille, depose_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function pegase_int.at_poster_fichier_poser(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.at_depot_prive_utiliser(p_jeton text, p_path text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_path, '') !~ '^f/[0-9a-f-]{36}[.](jpg|pdf)$' then return false; end if;
  update pegase_int.at_depots d set utilise_at = now(), path = p_path where d.jeton = p_jeton and d.utilise_at is null and d.cree_at > now() - interval '30 minutes';
  return found;
end $$;
revoke all on function public.at_depot_prive_utiliser(text, text) from public, anon, authenticated;
grant execute on function public.at_depot_prive_utiliser(text, text) to service_role;

create or replace function public.at_poster_4k(p_name text, p_fiche uuid, p_poster text, p_acheter boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; adm boolean; pr int := greatest(0, coalesce(pegase_int.at_reglage('prix_poster_4k'), 300)); s int; p4 text;
begin
  perform public.acct_check(n);
  select * into f from public.at_fiches x where x.id = p_fiche and x.supprime_at is null;
  if f.id is null then raise exception 'projet inconnu'; end if;
  adm := exists (select 1 from public.at_admins z where z.name = n);
  if f.name <> n and not adm then raise exception 'pas ton projet'; end if;
  if not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(f.assets) = 'array' then f.assets else '[]'::jsonb end) x where x ->> 'image' = p_poster and coalesce(x -> 'payant', '[]'::jsonb) ? '4k') then raise exception 'poster inconnu'; end if;
  select pf.path into p4 from public.at_poster_fichiers pf where pf.fiche = f.id and pf.poster = p_poster and pf.sorte = '4k';
  if p4 is null then return jsonb_build_object('ok', true, 'dispo', false); end if;
  if f.name <> n then return jsonb_build_object('ok', true, 'dispo', true, 'achete', true, 'admin', true, 'path', p4, 'prix', pr); end if;   -- un admin sur le projet d'un joueur : sans payer
  perform pg_advisory_xact_lock(hashtext('poster4k:' || n));
  if exists (select 1 from public.at_poster_achats y where y.name = n and y.fiche = f.id and y.poster = p_poster) then
    return jsonb_build_object('ok', true, 'dispo', true, 'achete', true, 'path', p4, 'prix', pr, 'solde', pegase_int.at_solde(n)); end if;
  if not coalesce(p_acheter, false) then return jsonb_build_object('ok', true, 'dispo', true, 'achete', false, 'prix', pr, 'solde', pegase_int.at_solde(n)); end if;
  s := pegase_int.at_debiter(n, pr);   -- « credits insuffisants » si le solde manque : rien n'est écrit
  insert into public.at_poster_achats (name, fiche, poster, prix) values (n, f.id, p_poster, pr);
  begin update public.at_credit_journal cj set fiche = coalesce(cj.fiche, f.id) where cj.tx = txid_current(); exception when others then null; end;
  return jsonb_build_object('ok', true, 'dispo', true, 'achete', true, 'debit', pr, 'path', p4, 'prix', pr, 'solde', s);
end $$;
revoke all on function public.at_poster_4k(text, uuid, text, boolean) from public, anon;
grant execute on function public.at_poster_4k(text, uuid, text, boolean) to authenticated, service_role;

-- le seau privé : un fichier 4K se lit après l'achat (ou par un admin) ; jamais un fichier 'impression'
do $do$
declare d text; k int;
  a constant text := '  if x.id is null then return false; end if;';
  b constant text := '  if x.id is null then return p_mode = ''r'' and exists (select 1 from public.at_poster_fichiers pf where pf.path = p_path and pf.sorte = ''4k'' and (exists (select 1 from public.at_admins ad where public.acct_own(ad.name)) or exists (select 1 from public.at_poster_achats pa where pa.fiche = pf.fiche and pa.poster = pf.poster and public.acct_own(pa.name)))); end if;';
begin
  d := pg_get_functiondef('pegase_int.at_fichier_obj_ok(text,text)'::regprocedure);
  if position('public.at_poster_fichiers' in d) > 0 then raise notice 'at_fichier_obj_ok : déjà fait'; return; end if;
  k := (length(d) - length(replace(d, a, ''))) / length(a);
  if k <> 1 then raise exception 'at_fichier_obj_ok : motif trouvé % fois (attendu 1)', k; end if;
  execute replace(d, a, b);
  raise notice 'at_fichier_obj_ok : 4K après achat';
end $do$;
-- vérifications (en essai) : select public.at_poster_4k('PATOU', '<fiche>', 'i/<image>.jpg');  -- { dispo: false } tant que le fichier n'est pas déposé
