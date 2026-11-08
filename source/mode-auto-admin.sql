-- 8 nov. 2026 — Interface : mode auto, SEUL LE JOUEUR l'allume (remarque du 2e testeur sur lot-nuit 02d3010 ; décision du chef).
-- Avant : un admin pouvait allumer le mode auto sur le projet d'un joueur, et les propositions jusqu'à 20 💎 étaient alors débitées des
-- crédits DU JOUEUR sans qu'il ait choisi. Maintenant : un admin peut seulement l'ÉTEINDRE (journal admin comme avant).
-- Rejouable : le bloc DO ne touche at_auto_poser que si le contrôle n'y est pas encore, et exige que le motif soit présent UNE fois.
do $do$
declare d text; a text := 'if f.name <> n and not adm then raise exception ''pas ton projet''; end if;';
  b text := 'if f.name <> n and not adm then raise exception ''pas ton projet''; end if;
  if f.name <> n and coalesce(p_on, false) then raise exception ''seul le joueur allume le mode auto''; end if;';
begin
  d := pg_get_functiondef('public.at_auto_poser(text,uuid,boolean)'::regprocedure);
  if position('seul le joueur allume le mode auto' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'at_auto_poser : motif introuvable ou en double'; end if;
  execute replace(d, a, b);
end $do$;
