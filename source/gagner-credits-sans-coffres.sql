-- ===== gagner-credits-sans-coffres.sql : plus de gain par record sur Coffres à Secrets (id coffres), décision de l'admin, 8 nov. 2026 =====
-- REJOUABLE. La liste gc_jeux_records décide de tout côté serveur : le jeu sorti, plus de gain, plus de sigle sur sa tuile, plus de ligne dans le menu.
-- Un record de ce jeu déjà en attente de vérification est retiré aussi. Les crédits déjà versés ne sont pas repris.
update public.at_textes set v = v - 'coffres', maj_at = now() where k = 'gc_jeux_records' and v ? 'coffres';
update pegase_int.gc_records set etat = 'refuse', raison = 'jeu retire des gains', decide_at = now(), vu_at = now() where jeu = 'coffres' and etat = 'attente';
