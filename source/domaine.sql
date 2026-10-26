-- Déménagement du site sur https://elixirgamestudio.com (GitHub Pages, domaine personnalisé ; l'ancienne adresse
-- https://gt40benjamin.github.io/jdv/… renvoie vers la nouvelle). À lancer LE JOUR DE LA BASCULE, une fois la nouvelle adresse en HTTPS.
-- Relançable. Ne change que les adresses, en reprenant la définition ACTUELLE des fonctions (pg_get_functiondef) :
--  * pg_island_list : la photo d'une île est acceptée si elle est sur l'ancienne OU la nouvelle adresse du site ;
--  * pegase_int.ile_photo_monde : la carte 3D de l'île pointe sur la nouvelle adresse (même origine que la borne : pas de CORS).
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.pg_island_list(text, text)'::regprocedure);
  n := replace(d, '~ ''^https://gt40benjamin\.github\.io/''', '~ ''^https://(gt40benjamin\.github\.io|(www\.)?elixirgamestudio\.com)/''');
  if n <> d then execute n;
  elsif position('elixirgamestudio' in d) = 0 then raise exception 'pg_island_list : adresse attendue introuvable'; end if;
  d := pg_get_functiondef('pegase_int.ile_photo_monde()'::regprocedure);
  n := replace(d, 'https://gt40benjamin.github.io/jdv/', 'https://elixirgamestudio.com/');
  if n <> d then execute n;
  elsif position('elixirgamestudio' in d) = 0 then raise exception 'ile_photo_monde : adresse attendue introuvable'; end if;
end $$;
