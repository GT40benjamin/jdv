-- borne 2.0.127 (SQL v138) — l'admin publie un projet depuis sa page (non publié / dans la salle du joueur / partout) et choisit l'ONGLET
-- de la borne où sa tuile apparaît (classique / duel / coop : at_fiches.rayon, à la place d'ATL_DEFI écrit en dur ; Trôn-e = duel par défaut).
alter table public.at_fiches add column if not exists rayon text;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'at_fiches_rayon_ok') then
    alter table public.at_fiches add constraint at_fiches_rayon_ok check (rayon is null or rayon in ('classique', 'duel', 'coop'));
  end if;
end $c$;
update public.at_fiches set rayon = 'duel' where jeu = 'trone' and rayon is null;

-- les listes de jeux et les fiches disent l'onglet
do $t$
declare fn text; d text;
begin
  foreach fn in array array['public.at_jeux(text,bigint)', 'public.at_jeux_monde()', 'public.at_lire(text,uuid)', 'public.at_admin_lire(text,uuid)'] loop
    d := pg_get_functiondef(fn::regprocedure);
    if position('''rayon''' in d) = 0 then
      d := replace(d, '''orientation'', f.orientation,', '''orientation'', f.orientation, ''rayon'', f.rayon,');
      if position('''rayon''' in d) = 0 then raise exception 'v138 : ancre orientation introuvable dans %', fn; end if;
      execute d;
    end if;
  end loop;
end $t$;

-- l'admin publie : p_niveau 'non' | 'salle' | 'monde' ; p_rayon 'classique' | 'duel' | 'coop' (null = inchangé) ; p_salle = la salle (sinon
-- celle déjà choisie, sinon la salle où le joueur a été vu en dernier). Le joueur reçoit un message de la mascotte (notification).
create or replace function public.at_admin_publier(p_name text, p_fiche uuid, p_niveau text, p_rayon text default null, p_salle bigint default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; s bigint; sn text; v int; msg text; niv text := lower(coalesce(p_niveau, '')); ray text := nullif(lower(coalesce(p_rayon, '')), '');
begin
  perform pegase_int.at_admin_ok(n);
  select * into f from public.at_fiches x where x.id = p_fiche and x.supprime_at is null; if f.id is null then raise exception 'projet inconnu'; end if;
  if ray is not null and ray not in ('classique', 'duel', 'coop') then raise exception 'onglet inconnu'; end if;
  if niv not in ('non', 'salle', 'monde', '') then raise exception 'niveau inconnu'; end if;
  if niv <> '' and (f.jeu is null or f.etat not in ('alpha', 'publie_salle', 'publie_monde')) then raise exception 'jeu pas pret'; end if;
  v := coalesce(f.version_jeu, 1);
  if niv = 'salle' then
    s := coalesce(p_salle, f.salle, (select m.room_id from public.room_members m where m.name = f.name order by m.last_seen desc nulls last limit 1));
    if s is null or not exists (select 1 from public.room_members m where m.room_id = s and m.name = f.name) then raise exception 'pas de salle'; end if;
    select r.name into sn from public.rooms r where r.id = s;
    update public.at_fiches x set etat = 'publie_salle', salle = s, version_publiee = v, monde_demande_at = null, rayon = coalesce(ray, x.rayon), maj_at = now() where x.id = f.id;
    msg := '🌟 Ton jeu (V' || v || ') est publié dans ta salle « ' || coalesce(sn, '?') || ' » ! Tes copains le voient sur leur borne, avec son classement.';
  elsif niv = 'monde' then
    update public.at_fiches x set etat = 'publie_monde', version_publiee = v, monde_demande_at = null, monde_reponse = 'ok', decision_at = now(), rayon = coalesce(ray, x.rayon), maj_at = now() where x.id = f.id;
    update public.at_demandes d set etat = 'faite', reponse = '🌍 Publié partout !', etat_at = now(), vu_joueur_at = null
      where d.fiche = f.id and d.etat not in ('faite', 'impossible') and d.texte like '🌍 Je demande la mise en ligne mondiale%';
    msg := '🌍 Ton jeu (V' || v || ') est publié partout ! Tout le monde peut y jouer, avec le classement mondial.';
  elsif niv = 'non' then
    update public.at_fiches x set etat = 'alpha', monde_demande_at = null, rayon = coalesce(ray, x.rayon), maj_at = now() where x.id = f.id;
    if f.etat <> 'alpha' then msg := 'Ton jeu n’est plus publié pour le moment : il reste à toi, en essai, dans l’Atelier.'; end if;
  else
    update public.at_fiches x set rayon = coalesce(ray, x.rayon), maj_at = now() where x.id = f.id;
  end if;
  if msg is not null then insert into public.at_messages (fiche, texte, de_atelier) values (f.id, msg, true); end if;
  select * into f from public.at_fiches x where x.id = p_fiche;
  return jsonb_build_object('id', f.id, 'etat', f.etat, 'salle', f.salle, 'salle_nom', sn, 'version_publiee', f.version_publiee, 'rayon', f.rayon);
end $$;
revoke all on function public.at_admin_publier(text, uuid, text, text, bigint) from public, anon;
grant execute on function public.at_admin_publier(text, uuid, text, text, bigint) to authenticated;
