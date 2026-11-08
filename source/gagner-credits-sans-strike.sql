-- ===== gagner-credits-sans-strike.sql : plus de gain par record sur Strike Monstres (id strike), décision de l'admin, 8 nov. 2026 =====
-- REJOUABLE. Même principe que Coffres à Secrets : le jeu sorti de gc_jeux_records, plus de gain, plus de sigle, plus de ligne dans le menu.
-- Un record de ce jeu déjà en attente de vérification est retiré aussi. Les crédits déjà versés ne sont pas repris.
update public.at_textes set v = v - 'strike', maj_at = now() where k = 'gc_jeux_records' and v ? 'strike';
update pegase_int.gc_records set etat = 'refuse', raison = 'jeu retire des gains', decide_at = now(), vu_at = now() where jeu = 'strike' and etat = 'attente';
