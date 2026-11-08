-- 8 nov. 2026 (l'admin : « chaque arrêt sur image, il faut ABSOLUMENT l'image dans la conversation avec la mascotte, et même pouvoir répondre
-- pour récupérer l'image si j'ai des choses à dire sur un élément ») : RÉPONDRE À UN ARRÊT SUR IMAGE dans la discussion d'un jeu.
-- Rien de nouveau dans les tables : la réponse est un message de la discussion (discussion = true) dont la colonne existante
-- at_messages.demande pointe vers l'arrêt sur image cité. L'id d'un arrêt sur image est le même pour son message et pour sa demande
-- (at_demande → at_demande_auto), et son image est toujours a/<id>.jpg. Donc, pour qui lit la discussion (la mascotte, l'équipe) :
--   message.demande = l'arrêt cité → son texte (at_demandes.texte) et son image (a/<demande>.jpg) vont avec la remarque.
-- at_lire / at_admin_lire renvoient déjà 'demande' pour chaque message : la borne affiche la citation (miniature + texte) au-dessus.
--   * public.at_discuter_sur(p_name, p_fiche, p_cite, p_texte, p_micro, p_fichiers) : comme at_discuter (+ at_fichiers_joindre),
--     et le message est rattaché à p_cite, qui doit être un message AVEC IMAGE du même projet (sinon : refus, rien n'est écrit) ;
--   * at_admin_agir('discussion', { texte, cite }) : la réponse de l'admin, rattachée de la même façon (patch ciblé, motif présent 1 fois).
-- Essai : begin; <ce fichier>; … ; rollback; — puis pour de vrai. Rejouable. Test : node test-discussion-citer-sql.mjs (PGlite).

create or replace function public.at_discuter_sur(p_name text, p_fiche uuid, p_cite uuid, p_texte text, p_micro boolean default false, p_fichiers uuid[] default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r jsonb; j jsonb; i uuid;
begin
  r := public.at_discuter(p_name, p_fiche, p_texte, p_micro);   -- compte, projet, filtre, limite, doublon : les mêmes règles
  i := (r ->> 'id')::uuid;
  if not exists (select 1 from public.at_messages m where m.id = p_cite and m.fiche = p_fiche and m.image) then raise exception 'image citee inconnue'; end if;
  if coalesce((r ->> 'doublon')::boolean, false) then return r || jsonb_build_object('cite', p_cite); end if;
  update public.at_messages m set demande = p_cite where m.id = i;
  if coalesce(array_length(p_fichiers, 1), 0) > 0 then j := public.at_fichiers_joindre(p_name, i, p_fichiers); r := r || jsonb_build_object('fichiers', j -> 'fichiers'); end if;
  return r || jsonb_build_object('cite', p_cite);
end $$;
revoke all on function public.at_discuter_sur(text, uuid, uuid, text, boolean, uuid[]) from public, anon;
grant execute on function public.at_discuter_sur(text, uuid, uuid, text, boolean, uuid[]) to authenticated, service_role;

-- l'admin (« Discuter du jeu » en vue admin) : la même citation
do $do$
declare d text; k int;
  a constant text := 'insert into public.at_messages (fiche, texte, de_atelier, discussion, auteur) values (f.id, t, true, true, n) returning id into i;';
  b constant text := 'insert into public.at_messages (fiche, texte, de_atelier, discussion, auteur, demande) values (f.id, t, true, true, n, (select m.id from public.at_messages m where m.fiche = f.id and m.image and m.id::text = coalesce(a ->> ''cite'', ''''))) returning id into i;';
begin
  d := pg_get_functiondef('public.at_admin_agir(text,uuid,text,jsonb)'::regprocedure);
  if position('a ->> ''cite''' in d) > 0 then raise notice 'at_admin_agir : déjà fait'; return; end if;
  k := (length(d) - length(replace(d, a, ''))) / length(a);
  if k <> 1 then raise exception 'at_admin_agir : motif trouvé % fois (attendu 1)', k; end if;
  execute replace(d, a, b);
  raise notice 'at_admin_agir : citation ajoutée';
end $do$;
-- vérifications (en essai) :
--   select public.at_discuter_sur('PATOU', '<fiche>', '<id d''un arrêt sur image>', 'le bouton est trop petit');
--   select demande from public.at_messages where discussion order by at desc limit 1;
