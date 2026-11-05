-- borne 2.0.136 (SQL v146) — le chef : quand la mascotte regroupe plusieurs tickets d'idées en une seule carte d'offre, les anciens tickets ne
-- sont ni « impossible » (ça sonne comme un refus) ni « en cours » : état neutre « regroupee », affiché « 🔗 Regroupée dans ta discussion »,
-- compté nulle part (ni en cours, ni faites, ni dans la file de l'équipe). Les 2 tickets de J2B (Le Sorcier du Royaume) y passent.
alter table public.at_demandes drop constraint if exists at_demandes_etat_check;
alter table public.at_demandes add constraint at_demandes_etat_check check (etat = any (array['envoyee', 'vue', 'en_cours', 'faite', 'impossible', 'plus_tard', 'regroupee']));
update public.at_demandes set etat = 'regroupee', etat_at = now() where id::text like '2716e9de%' or id::text like '1d61f212%';
