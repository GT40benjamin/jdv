-- 8 nov. 2026 (l'admin) : « 🖼️ Posters » — le téléchargement en 4K est VERROUILLÉ 🔒 et payant en crédits 💎 (il coûte des crédits à produire) ; les autres
-- résolutions sont gratuites. Prix : at_reglages.prix_poster_4k (10 par défaut, modifiable par l'admin). Débit par at_debiter (donc au journal, motif at_poster_4k),
-- UNE SEULE FOIS par poster et par joueur ; on montre le prix avant, avec un « oui » : jamais d'achat de crédits automatique.
-- Le chemin de la 4K (assets[].image_4k) est dans un seau public : il ne doit pas partir vers la borne avant l'achat.
--   * pegase_int.at_assets_sans_4k(assets) : retire image_4k, met a_4k = true ; at_lire / at_admin_lire / at_voir renvoient assets ainsi (patch ciblé, motif présent 1 fois) ;
--   * public.at_poster_achats (name, fiche, poster, prix, at) : un achat par joueur, projet et poster (poster = le chemin assets[].image) ; lue par le serveur seulement ;
--   * public.at_poster_4k(p_name, p_fiche, p_poster, p_acheter) :
--       p_acheter = false : { achete, prix, solde } et, si déjà acheté, { image } ;
--       p_acheter = true  : débite une seule fois et rend { achete: true, image, solde, debit } ; crédits insuffisants : refus, rien n'est débité.
--     Le propriétaire du projet (un admin sur SON projet paie comme un joueur) ; un admin sur le projet d'un joueur la lit sans payer.
-- LIMITE : le fichier 4K reste dans un seau public sous un nom impossible à deviner ; qui a déjà le lien peut le rouvrir.
-- Essai : begin; <ce fichier>; … ; rollback; — puis pour de vrai. Rejouable. Test : node test-poster-4k-sql.mjs (PGlite).

insert into public.at_reglages (k, v) values ('prix_poster_4k', 10) on conflict (k) do nothing;

create table if not exists public.at_poster_achats (
  name text not null, fiche uuid not null references public.at_fiches (id) on delete cascade, poster text not null,
  prix int not null, at timestamptz not null default now(), primary key (name, fiche, poster));
alter table public.at_poster_achats enable row level security;
revoke all on table public.at_poster_achats from public, anon, authenticated;

create or replace function pegase_int.at_assets_sans_4k(p jsonb) returns jsonb language sql immutable as $$
  select case when jsonb_typeof(p) = 'array' then coalesce((select jsonb_agg(case when jsonb_typeof(x) = 'object' and x ? 'image_4k' then (x - 'image_4k') || jsonb_build_object('a_4k', true) else x end order by i)
    from jsonb_array_elements(p) with ordinality t(x, i)), '[]'::jsonb) else p end
$$;
revoke all on function pegase_int.at_assets_sans_4k(jsonb) from public, anon, authenticated;

do $do$
declare fn text; d text; k int;
  a constant text := '''assets'', f.assets,';
  b constant text := '''assets'', pegase_int.at_assets_sans_4k(f.assets),';
begin
  foreach fn in array array['public.at_lire(text,uuid)', 'public.at_admin_lire(text,uuid)', 'public.at_voir(text,uuid)'] loop
    d := pg_get_functiondef(fn::regprocedure);
    if position('at_assets_sans_4k' in d) > 0 then raise notice '% : déjà fait', fn; continue; end if;
    k := (length(d) - length(replace(d, a, ''))) / length(a);
    if k <> 1 then raise exception '% : motif trouvé % fois (attendu 1)', fn, k; end if;
    execute replace(d, a, b);
    raise notice '% : 4K retirée', fn;
  end loop;
end $do$;

create or replace function public.at_poster_4k(p_name text, p_fiche uuid, p_poster text, p_acheter boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; adm boolean; a jsonb; pr int := greatest(0, coalesce(pegase_int.at_reglage('prix_poster_4k'), 10)); s int; p4 text;
begin
  perform public.acct_check(n);
  select * into f from public.at_fiches x where x.id = p_fiche and x.supprime_at is null;
  if f.id is null then raise exception 'projet inconnu'; end if;
  adm := exists (select 1 from public.at_admins z where z.name = n);
  if f.name <> n and not adm then raise exception 'pas ton projet'; end if;
  select x into a from jsonb_array_elements(case when jsonb_typeof(f.assets) = 'array' then f.assets else '[]'::jsonb end) x
    where x ->> 'image' = p_poster and coalesce((x ->> 'telechargeable')::boolean, false) and coalesce(x ->> 'image_4k', '') <> '' limit 1;
  if a is null then raise exception 'poster inconnu'; end if;
  p4 := a ->> 'image_4k';
  if f.name <> n then return jsonb_build_object('ok', true, 'achete', true, 'admin', true, 'image', p4, 'prix', pr); end if;   -- un admin sur le projet d'un joueur : sans payer
  perform pg_advisory_xact_lock(hashtext('poster4k:' || n));
  if exists (select 1 from public.at_poster_achats y where y.name = n and y.fiche = f.id and y.poster = p_poster) then
    return jsonb_build_object('ok', true, 'achete', true, 'image', p4, 'prix', pr, 'solde', pegase_int.at_solde(n)); end if;
  if not coalesce(p_acheter, false) then return jsonb_build_object('ok', true, 'achete', false, 'prix', pr, 'solde', pegase_int.at_solde(n)); end if;
  s := pegase_int.at_debiter(n, pr);   -- « credits insuffisants » si le solde manque : rien n'est écrit
  insert into public.at_poster_achats (name, fiche, poster, prix) values (n, f.id, p_poster, pr);
  begin update public.at_credit_journal cj set fiche = coalesce(cj.fiche, f.id) where cj.tx = txid_current(); exception when others then null; end;
  return jsonb_build_object('ok', true, 'achete', true, 'debit', pr, 'image', p4, 'prix', pr, 'solde', s);
end $$;
revoke all on function public.at_poster_4k(text, uuid, text, boolean) from public, anon;
grant execute on function public.at_poster_4k(text, uuid, text, boolean) to authenticated, service_role;
-- vérifications (en essai) :
--   select public.at_poster_4k('PATOU', '<fiche>', 'i/<image>.jpg');  -- { achete: false, prix: 10, solde }
--   select count(*) from jsonb_array_elements((public.at_lire('PATOU', '<fiche>') -> 'fiche') -> 'assets') x where x ? 'image_4k';  -- 0
