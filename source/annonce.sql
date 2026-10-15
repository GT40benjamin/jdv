-- PROPOSITION (pas appliquée) : annoncer une publication aux appareils 1.7+ (canaux PRIVÉS du direct).
-- Pourquoi : ~/jdv-tools/annonce.js se joint à « jdw-all » en PUBLIC (private: false, clé publique). Depuis la 1.7, la borne écoute
-- « jdw-all » en PRIVÉ (config.private: true + jeton du compte) : public et privé du même nom sont deux canaux différents pour Realtime
-- (realtime.send et l'API REST ont justement un drapeau « private »). L'annonce n'arrive donc qu'aux vieilles pages d'avant la 1.7
-- (tant que « Allow public access » est activé), plus aux bornes d'aujourd'hui : elles ne voient la nouvelle version qu'au prochain
-- contrôle de site.json (toutes les 60 s quand l'écran est allumé, au retour dans l'onglet, au démarrage).
-- Correctif : le serveur envoie lui-même le signal « version » dans le canal PRIVÉ jdw-all (realtime.send, côté base, passe les règles
-- RLS). Réservé à l'admin : même mot de passe que get_errors (check_code), donc rien de nouveau à protéger.
-- Message reçu par les bornes : { event: 'broadcast', payload: { event: 'poke', payload: { t: 'version', from: 'annonce' } } }
-- → onPoke('jdw-all', 'poke', { t: 'version' }) → checkSiteVersion() : exactement comme l'ancien signal public.
create or replace function public.announce_version(p_code text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then raise exception 'realtime.send absent (Realtime trop ancien)'; end if;
  perform realtime.send(jsonb_build_object('t', 'version', 'from', 'annonce'), 'poke', 'jdw-all', true);
  return true;
end $$;
revoke all on function public.announce_version(text) from public;
grant execute on function public.announce_version(text) to anon, authenticated;
