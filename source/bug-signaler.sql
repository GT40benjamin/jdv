-- 8 nov. 2026 (l'admin) : « 🐞 Signaler un bug » dans la pause des jeux publiés. Le joueur écrit son message, une capture du moment est jointe ;
-- ça arrive dans la conversation du CRÉATEUR avec la mascotte : « 🐞 <pseudo> t'a remonté un bug : … », avec la capture. Le joueur reçoit un merci,
-- sans voir la conversation. Pas de crédit, pas de demande créée : la mascotte propose ensuite une correction (règle donnée par le chef à la session discussions).
--   * public.at_bugs (id = le message, fiche, jeu, name, texte, at, etat) : le signalement, lu par le serveur et l'équipe seulement ;
--   * public.at_bug_signaler(p_name, p_jeu, p_texte, p_x, p_y, p_image) : le jeu doit être publié et accessible à ce joueur (mêmes règles qu'at_jeux) ;
--     10 par heure et par joueur ; filtre de texte ; le message est un message de la mascotte dans la discussion (de_atelier, discussion), sans demande ;
--     rend { id, image } : la capture va en a/<id>.jpg ;
--   * pegase_int.atelier_ok : celui qui signale peut déposer SA capture pendant 1 heure (patch ciblé, motif présent 1 fois).
-- Essai : begin; <ce fichier>; … ; rollback; — puis pour de vrai. Rejouable. Test : node test-bug-signaler-sql.mjs (PGlite).

create table if not exists public.at_bugs (
  id uuid primary key, fiche uuid not null references public.at_fiches (id) on delete cascade, jeu text not null, name text not null, texte text not null,
  at timestamptz not null default now(), etat text not null default 'nouveau');
create index if not exists at_bugs_fiche on public.at_bugs (fiche, at desc);
alter table public.at_bugs enable row level security;
revoke all on table public.at_bugs from public, anon, authenticated;

create or replace function public.at_bug_signaler(p_name text, p_jeu text, p_texte text, p_x numeric default null, p_y numeric default null, p_image boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); f public.at_fiches; t text := left(btrim(coalesce(p_texte, '')), 2000); why text; i uuid; vis text := '';
begin
  perform public.acct_check(n);
  select * into f from public.at_fiches x where x.jeu = p_jeu and x.supprime_at is null and x.etat in ('publie_salle', 'publie_monde') and (
      x.etat = 'publie_monde' or x.name = n
      or exists (select 1 from public.room_members ra join public.room_members rv on rv.room_id = ra.room_id where ra.name = x.name and rv.name = n))
    order by x.etat = 'publie_monde' desc limit 1;
  if f.id is null then raise exception 'jeu inconnu'; end if;
  if length(t) < 3 then raise exception 'texte vide'; end if;
  perform public.pg_rate(n, 'atelier-bug', 10, interval '1 hour');
  why := pegase_int.at_filtre(t); if why not in ('', 'protege') then raise exception 'filtre %', why; end if;
  if p_x is not null and p_y is not null and p_x between 0 and 100 and p_y between 0 and 100 then vis := ' (viseur à ' || round(p_x) || ' % de la largeur, ' || round(p_y) || ' % de la hauteur)'; end if;
  insert into public.at_messages (fiche, texte, image, de_atelier, discussion, auteur)
    values (f.id, '🐞 ' || n || ' t’a remonté un bug' || vis || ' : ' || t, coalesce(p_image, false), true, true, n) returning id into i;
  insert into public.at_bugs (id, fiche, jeu, name, texte) values (i, f.id, p_jeu, n, t);
  update public.at_fiches x set maj_at = now() where x.id = f.id;
  return jsonb_build_object('ok', true, 'id', i, 'image', case when coalesce(p_image, false) then 'a/' || i || '.jpg' end);
end $$;
revoke all on function public.at_bug_signaler(text, text, text, numeric, numeric, boolean) from public, anon;
grant execute on function public.at_bug_signaler(text, text, text, numeric, numeric, boolean) to authenticated, service_role;

-- la capture : celui qui signale peut la déposer (a/<id du message>.jpg), 1 heure, lui seul
do $do$
declare d text; k int;
  a constant text := '  select f.name, x.at into n, a from public.at_messages x join public.at_fiches f on f.id = x.fiche where x.id = m[1]::uuid and x.image and not x.de_atelier;';
  b constant text := '  if exists (select 1 from public.at_bugs b join public.at_messages y on y.id = b.id where b.id = m[1]::uuid and y.image and b.at > now() - interval ''1 hour'' and public.acct_own(b.name)) then return true; end if;
  select f.name, x.at into n, a from public.at_messages x join public.at_fiches f on f.id = x.fiche where x.id = m[1]::uuid and x.image and not x.de_atelier;';
begin
  d := pg_get_functiondef('pegase_int.atelier_ok(text)'::regprocedure);
  if position('public.at_bugs' in d) > 0 then raise notice 'atelier_ok : déjà fait'; return; end if;
  k := (length(d) - length(replace(d, a, ''))) / length(a);
  if k <> 1 then raise exception 'atelier_ok : motif trouvé % fois (attendu 1)', k; end if;
  execute replace(d, a, b);
  raise notice 'atelier_ok : capture du signalement';
end $do$;
-- vérifications (en essai) : select public.at_bug_signaler('PATOU', 'lune', 'le bouton ne marche pas', 40, 60, true);
