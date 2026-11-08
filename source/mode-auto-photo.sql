-- 8 nov. 2026 — équipe Études : ⚡ MODE AUTO dans l'ATELIER PHOTO (l'admin : « je ne vois pas le mode auto dans l'atelier photo »).
-- Dans l'atelier photo, les propositions chiffrées de la mascotte sont des MESSAGES (« … · 20 💎 ») : elles ne passent PAS par
-- at_demande_proposer / at_discussion_proposer (les demandes des projets photo sont des 'message' regroupés, sans propositions), donc
-- pegase_int.at_auto_choisir ne se déclenche jamais pour elles. Le lancement automatique se fait donc DANS LA BOUCLE de la mascotte, avec
-- les mêmes garde-fous que mode-auto.sql. Cette fonction en LECTURE SEULE les applique (une seule source) :
--   pegase_int.at_auto_photo(p_fiche, p_credits) → { auto: 'off' | 'lance' | 'trop_cher' | 'solde' | 'inconnu', credits, max, solde }
--   * 'lance'     : le mode auto est allumé, prix ≤ auto_max_credits (20 💎) et solde suffisant → la mascotte lance TOUT DE SUITE, exactement
--                   comme sur un « oui » du joueur, et écrit « ⚡ Mode auto : je lance « … » (X 💎). Je m'y mets ! » ;
--   * 'trop_cher' : elle redemande, avec « ⚡ Mode auto : celle-ci coûte X 💎, plus que 20 💎 : je te laisse choisir 👆 » ;
--   * 'solde'     : elle redemande, avec « ⚡ Mode auto : il te manque des crédits pour celle-ci (X 💎) : je te laisse choisir 👆 » ;
--   * 'off'       : comme avant (elle propose, le joueur dit oui).
-- Jamais d'achat de crédits. Rien n'est écrit ni débité ici. L'interrupteur « ⚡ Mode auto » de la page pose at_fiches.auto (at_auto_poser,
-- déjà en ligne v184 + v186 : seul le joueur l'allume, l'admin peut seulement l'éteindre).
-- Essai : begin; <ce fichier>; select pegase_int.at_auto_photo('<fiche>', 20); rollback;  — puis pour de vrai. Rejouable.

create or replace function pegase_int.at_auto_photo(p_fiche uuid, p_credits int)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare f public.at_fiches; c int := greatest(0, coalesce(p_credits, 0)); mx int := coalesce(pegase_int.at_reglage('auto_max_credits'), 20); s int;
begin
  select * into f from public.at_fiches x where x.id = p_fiche;
  if f.id is null or f.supprime_at is not null then return jsonb_build_object('auto', 'inconnu'); end if;
  if not coalesce(f.auto, false) then return jsonb_build_object('auto', 'off', 'credits', c, 'max', mx); end if;
  if c > mx then return jsonb_build_object('auto', 'trop_cher', 'credits', c, 'max', mx); end if;
  s := pegase_int.at_solde(f.name);
  if s < c then return jsonb_build_object('auto', 'solde', 'credits', c, 'solde', s); end if;
  return jsonb_build_object('auto', 'lance', 'credits', c, 'max', mx, 'solde', s);
end $$;
revoke all on function pegase_int.at_auto_photo(uuid, int) from public, anon, authenticated;
grant execute on function pegase_int.at_auto_photo(uuid, int) to service_role;
