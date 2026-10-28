-- ============================================================================================================================
-- Cartes des îles en STOCKAGE PRIVÉ (28 oct. 2026). Le dépôt du site est PUBLIC (GitHub) : la vraie carte de l'île n'y est plus
-- (assets/pegase/ile_3d_*, carte_ile_* retirés par la borne qui lit « pg: » ; l'historique du dépôt, lui, reste public : décision de JDCEA,
-- expliquée à Benjamin, pas de réécriture). Elle est dans un seau PRIVÉ du Storage, « pegase-cartes » (copiée par la fonction
-- pegase-cartes-copie, source/cartes-privees-copie.ts). Un compte dont un pseudo HABITE une île la lit avec son jeton (règle « pg cartes lire ») ;
-- pg_island_list la donne aux MEMBRES sous la forme « pg:carte/<fichier> » : la borne la lit dans le Storage ; une borne plus ancienne ne
-- comprend pas « pg: » et montre le dessin de l'île (jamais la vraie carte en clair).
-- ORDRE :
--   1) ce SQL, partie 1 (le seau et sa règle) ;
--   2) déployer puis lancer UNE fois pegase-cartes-copie (les fichiers sont encore sur le site), vérifier les 7 fichiers (contrôle 1), la retirer ;
--   3) ce SQL, partie 2 (ile_photo_monde → « pg: ») ;
--   4) publier la borne (elle retire les fichiers du site).
-- ============================================================================================================================

-- ---------- partie 1 : le seau privé et qui peut le lire ----------
insert into storage.buckets (id, name, public) values ('pegase-cartes', 'pegase-cartes', false) on conflict (id) do update set public = false;

-- vrai si un pseudo du compte qui appelle habite une île (la carte est la même pour toutes les îles : le monde de Pégase)
create or replace function pegase_int.carte_ok() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select auth.uid() is not null and exists (
    select 1 from public.players p join public.pg_ile_membres m on m.name = p.name where p.user_id = auth.uid())
$$;
revoke all on function pegase_int.carte_ok() from public, anon, authenticated;
grant execute on function pegase_int.carte_ok() to authenticated;   -- appelée par la règle du Storage (comme pegase_int.photo_ok)

drop policy if exists "pg cartes lire" on storage.objects;
create policy "pg cartes lire" on storage.objects for select to authenticated
  using (bucket_id = 'pegase-cartes' and pegase_int.carte_ok());
-- (aucune règle d'écriture : seule la fonction de copie, avec la clé du service, y dépose les fichiers)

-- ---------- partie 2 (APRÈS la copie) : la photo du monde = des chemins du seau privé ----------
create or replace function pegase_int.ile_photo_monde() returns jsonb language sql immutable as $$
  select '{"url":"pg:carte/ile_3d_1024.webp","r":[0,0,1800,1800],"proj":"pg:carte/ile_3d_proj.json","cote":"pg:carte/ile_3d_cote.json","plate":"pg:carte/carte_ile_1024.webp"}'::jsonb $$;
revoke all on function pegase_int.ile_photo_monde() from public, anon, authenticated;

-- ---- contrôles ----
-- 1. les 7 fichiers, et leur taille (octets) : ile_3d_1024.webp 113336 · ile_3d_2048.webp 338468 · ile_3d_proj.json 25819 · ile_3d_cote.json 11105 ·
--    carte_ile_1024.webp 201420 · carte_ile_1024.jpg 247944 · carte_ile_2048.webp 850886
-- select name, (metadata ->> 'size')::int as octets from storage.objects where bucket_id = 'pegase-cartes' order by name;
-- 2. select pegase_int.ile_photo_monde();
-- 3. un visiteur (sans compte) ne lit rien : GET /storage/v1/object/authenticated/pegase-cartes/ile_3d_1024.webp sans jeton → 400/404
-- ---- pour revenir en arrière (les fichiers sont dans l'historique du dépôt : les remettre dans assets/pegase/, et l'ancienne photo du monde) ----
-- create or replace function pegase_int.ile_photo_monde() returns jsonb language sql immutable as $$ select '{"url":"https://elixirgamestudio.com/assets/pegase/ile_3d_1024.webp","r":[0,0,1800,1800],"proj":"https://elixirgamestudio.com/assets/pegase/ile_3d_proj.json","cote":"https://elixirgamestudio.com/assets/pegase/ile_3d_cote.json","plate":"https://elixirgamestudio.com/assets/pegase/carte_ile_1024.webp"}'::jsonb $$;
-- drop policy if exists "pg cartes lire" on storage.objects; drop function if exists pegase_int.carte_ok();
