-- borne 2.0.131 (SQL v140) — l'ADMIN envoie un « Arrêt sur image » (ou une remarque) sur le projet d'un joueur : « 🛡️ Remarque de l'admin ».
-- Un ticket GRATUIT (0 crédit, jamais de débit du joueur ni de l'admin), créé comme une demande du projet (déclencheur at_demande_auto) :
-- il sonne la sonnette (demande « envoyée » → at_en_attente) et l'équipe le voit ; la mascotte écrit au joueur s'il faut (« c'est offert »).
-- La capture (a/<id>.jpg du seau atelier) peut être déposée par l'admin (pegase_int.atelier_ok accepte un admin).
create or replace function public.at_admin_remarque(p_name text, p_fiche uuid, p_texte text, p_x numeric default null, p_y numeric default null, p_image boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; t text := left(btrim(coalesce(p_texte, '')), 15000); i uuid; vis text := '';
begin
  perform pegase_int.at_admin_ok(n);
  select * into f from public.at_fiches x where x.id = p_fiche and x.supprime_at is null; if f.id is null then raise exception 'projet inconnu'; end if;
  if length(t) < 2 then raise exception 'texte vide'; end if;
  if p_x is not null and p_y is not null and p_x between 0 and 100 and p_y between 0 and 100 then vis := ' (viseur à ' || round(p_x) || ' % de la largeur, ' || round(p_y) || ' % de la hauteur)'; end if;
  perform set_config('atelier.cout', '0', true);
  insert into public.at_messages (fiche, texte, image, auteur) values (f.id, '🛡️ Remarque de l''admin — 🎯 Arrêt sur image' || vis || ' : ' || t, coalesce(p_image, false), n) returning id into i;
  update public.at_fiches x set maj_at = now() where x.id = f.id;
  begin insert into public.at_admin_journal (admin, fiche, action, detail) values (n, f.id, 'remarque', jsonb_build_object('message', i)); exception when others then null; end;
  return jsonb_build_object('id', i, 'image', case when coalesce(p_image, false) then 'a/' || i || '.jpg' end, 'solde', null);
end $$;
revoke all on function public.at_admin_remarque(text, uuid, text, numeric, numeric, boolean) from public, anon;
grant execute on function public.at_admin_remarque(text, uuid, text, numeric, numeric, boolean) to authenticated;

-- dépôt de la capture : le joueur du projet (comme avant) OU un admin connecté, dans l'heure
create or replace function pegase_int.atelier_ok(p_path text) returns boolean language plpgsql stable security definer set search_path = public, extensions as $$
declare m text[]; n text; a timestamptz;
begin
  if auth.uid() is null then return false; end if;
  m := regexp_match(coalesce(p_path, ''), '^a/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})[.]jpg$');
  if m is null then return false; end if;
  select f.name, x.at into n, a from public.at_messages x join public.at_fiches f on f.id = x.fiche where x.id = m[1]::uuid and x.image and not x.de_atelier;
  if n is null or a < now() - interval '1 hour' then return false; end if;
  return public.acct_own(n) or exists (select 1 from public.at_admins ad where public.acct_own(ad.name));
end $$;
