-- borne 2.0.130 (SQL v139) — BOUTIQUE DES CRÉATEURS (fiche ~/jdv-tools/boutiques/BOUTIQUE-CREATEURS.md, confirmée par l'admin le 5 nov. 2026).
-- Le créateur d'un jeu de l'Atelier vend des éléments de son jeu (apparence, contenu en plus) EN CRÉDITS ; l'acheteur paie, le créateur reçoit
-- 100 % (réglage boutique_part_createur = 100 : commission 0 %, décision de l'admin) — tout dans UNE opération (at_boutique_acheter). Jamais d'euros : les crédits
-- gagnés servent à créer des jeux et à acheter dans la borne. Rien au hasard. Confirmation avant chaque achat (côté borne). Un élément acheté
-- reste au joueur à vie, n'est ni donné ni échangé. Le créateur n'achète pas ses propres éléments. Plafond de dépense par mois
-- (boutique_plafond_mois, 300 crédits) : l'âge des joueurs n'est pas enregistré, il vaut donc pour TOUS les comptes (protège les 13-17 ans).
-- Chaque article passe le filtre (nom) avant d'être en vente ; « Signaler » ; l'admin retire et rembourse (at_boutique_admin).
create table if not exists public.at_boutique_articles (
  id uuid primary key default gen_random_uuid(),
  fiche uuid not null references public.at_fiches(id) on delete cascade,
  jeu text not null, cle text not null, nom text not null, image text, prix int not null check (prix between 1 and 5000),
  actif boolean not null default true, filtre_ok boolean not null default false, created_at timestamptz not null default now(), retire_at timestamptz,
  unique (jeu, cle)
);
create table if not exists public.at_boutique_achats (
  id uuid primary key default gen_random_uuid(),
  article uuid not null references public.at_boutique_articles(id) on delete restrict,
  acheteur text not null, createur text not null, prix int not null, part_createur int not null, commission int not null,
  at timestamptz not null default now(), rembourse_at timestamptz,
  unique (article, acheteur)
);
create index if not exists at_boutique_achats_acheteur on public.at_boutique_achats (acheteur, at desc);
create table if not exists public.at_boutique_signalements (
  id bigserial primary key, article uuid not null references public.at_boutique_articles(id) on delete cascade, par text not null, motif text, at timestamptz not null default now(), unique (article, par)
);
alter table public.at_boutique_articles enable row level security;
alter table public.at_boutique_achats enable row level security;
alter table public.at_boutique_signalements enable row level security;
insert into public.at_reglages (k, v) values ('boutique_part_createur', 100), ('boutique_plafond_mois', 300) on conflict (k) do nothing;

-- un crédit ajouté (la part du créateur, un remboursement) : même chemin que les débits (journal at_credit_journal, motif = la fonction)
create or replace function pegase_int.at_crediter(n text, c integer) returns integer language plpgsql security definer set search_path = public as $$
declare s int := pegase_int.at_solde(n);
begin
  if coalesce(c, 0) <= 0 then return s; end if;
  update public.at_credits x set solde = x.solde + c, maj_at = now() where x.name = n returning solde into s;
  return s;
end $$;
revoke all on function pegase_int.at_crediter(text, integer) from public, anon, authenticated;

-- la liste d'un jeu (ce qui est en vente + ce que je possède) : prix en crédits et en euros indicatifs (au prix de l'abonnement)
create or replace function public.at_boutique_liste(p_name text, p_jeu text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); taux numeric := coalesce(pegase_int.at_reglage('abo_prix'), 300)::numeric / greatest(coalesce(pegase_int.at_reglage('abo_credits'), 400), 1);
  plaf int := coalesce(pegase_int.at_reglage('boutique_plafond_mois'), 300); dep int;
begin
  if n <> '' and public.acct_own(n) then
    select coalesce(sum(a.prix), 0) into dep from public.at_boutique_achats a where a.acheteur = n and a.rembourse_at is null and a.at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  end if;
  return jsonb_build_object('plafond_mois', plaf, 'depense_mois', coalesce(dep, 0), 'articles', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'cle', a.cle, 'nom', a.nom, 'image', a.image, 'prix', a.prix, 'euros_cents', round(a.prix * taux),
      'possede', exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null),
      'mien', f.name = n) order by a.prix, a.nom)
    from public.at_boutique_articles a join public.at_fiches f on f.id = a.fiche
    where a.jeu = lower(p_jeu) and ((a.actif and a.filtre_ok and a.retire_at is null) or exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null))), '[]'::jsonb));
end $$;

-- acheter : TOUT d'un coup (débit de l'acheteur, 100 % au créateur (commission 0 %), l'achat écrit) ; déjà possédé = rendu tel quel
create or replace function public.at_boutique_acheter(p_name text, p_article uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); a public.at_boutique_articles; cr text; part int; com int; s int; plaf int := coalesce(pegase_int.at_reglage('boutique_plafond_mois'), 300); dep int; i uuid;
begin
  perform public.acct_check(n);
  perform pg_advisory_xact_lock(hashtext('boutique:' || n));
  select * into a from public.at_boutique_articles x where x.id = p_article; if a.id is null then raise exception 'article inconnu'; end if;
  if exists (select 1 from public.at_boutique_achats b where b.article = a.id and b.acheteur = n and b.rembourse_at is null) then
    return jsonb_build_object('ok', true, 'deja', true, 'solde', pegase_int.at_solde(n)); end if;
  if not (a.actif and a.filtre_ok and a.retire_at is null) then raise exception 'pas en vente'; end if;
  select f.name into cr from public.at_fiches f where f.id = a.fiche;
  -- le créateur lui-même, un autre pseudo du même compte, ou sa famille (comptes de famille : player_parents) = son propre jeu
  if cr = n or exists (select 1 from public.players x join public.players y on y.user_id = x.user_id where x.name = n and y.name = cr and x.user_id is not null)
     or exists (select 1 from public.player_parents pp join public.players q on q.user_id = pp.parent where (pp.name = cr and q.name = n) or (pp.name = n and q.name = cr)) then raise exception 'ton propre jeu'; end if;
  select coalesce(sum(b.prix), 0) into dep from public.at_boutique_achats b where b.acheteur = n and b.rembourse_at is null and b.at >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  if dep + a.prix > plaf then raise exception 'plafond du mois'; end if;
  part := floor(a.prix * coalesce(pegase_int.at_reglage('boutique_part_createur'), 100) / 100.0)::int; com := a.prix - part;
  s := pegase_int.at_debiter(n, a.prix);
  perform pegase_int.at_crediter(cr, part);
  insert into public.at_boutique_achats (article, acheteur, createur, prix, part_createur, commission) values (a.id, n, cr, a.prix, part, com) returning id into i;
  return jsonb_build_object('ok', true, 'id', i, 'cle', a.cle, 'solde', s, 'prix', a.prix);
end $$;

create or replace function public.at_boutique_signaler(p_name text, p_article uuid, p_motif text default null) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  perform public.pg_rate(n, 'boutique-signaler', 20, interval '1 hour');
  insert into public.at_boutique_signalements (article, par, motif) values (p_article, n, left(btrim(coalesce(p_motif, '')), 200)) on conflict (article, par) do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- le créateur : ses articles, ses ventes, ses crédits gagnés (écran « Ma boutique »)
create or replace function public.at_boutique_mes_ventes(p_name text) returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  return coalesce((select jsonb_agg(jsonb_build_object('fiche', f.id, 'titre', f.titre, 'id', a.id, 'cle', a.cle, 'nom', a.nom, 'image', a.image, 'prix', a.prix,
      'en_vente', a.actif and a.filtre_ok and a.retire_at is null, 'filtre_ok', a.filtre_ok,
      'ventes', (select count(*) from public.at_boutique_achats b where b.article = a.id and b.rembourse_at is null),
      'gagne', (select coalesce(sum(b.part_createur), 0) from public.at_boutique_achats b where b.article = a.id and b.rembourse_at is null)) order by f.titre, a.prix)
    from public.at_boutique_articles a join public.at_fiches f on f.id = a.fiche where f.name = n and f.supprime_at is null), '[]'::jsonb);
end $$;

-- la mascotte (service) pose les articles décidés avec le créateur (fiche.boutique) : le nom passe le filtre, sinon l'article reste hors vente
create or replace function public.at_boutique_poser(p_fiche uuid, p_cle text, p_nom text, p_prix int, p_image text default null) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare f public.at_fiches; k text := left(lower(btrim(coalesce(p_cle, ''))), 40); nm text := left(btrim(coalesce(p_nom, '')), 60); ok boolean; aid uuid;
begin
  if pegase_int.at_joueur_appel() then raise exception 'reserve'; end if;
  select * into f from public.at_fiches x where x.id = p_fiche; if f.id is null or f.jeu is null then raise exception 'projet sans jeu'; end if;
  if k !~ '^[a-z0-9_-]{1,40}$' or nm = '' then raise exception 'article invalide'; end if;
  if p_image is not null and p_image !~ '^i/[0-9a-f-]{36}[.](png|jpg|webp)$' then raise exception 'image invalide'; end if;
  ok := pegase_int.at_filtre(nm) = '';
  insert into public.at_boutique_articles (fiche, jeu, cle, nom, image, prix, filtre_ok) values (f.id, f.jeu, k, nm, p_image, p_prix, ok)
    on conflict (jeu, cle) do update set nom = excluded.nom, image = excluded.image, prix = excluded.prix, filtre_ok = excluded.filtre_ok, actif = true, retire_at = null
    returning at_boutique_articles.id into aid;
  return jsonb_build_object('id', aid, 'filtre_ok', ok);
end $$;
revoke all on function public.at_boutique_poser(uuid, text, text, int, text) from public, anon, authenticated;

-- l'ADMIN retire un article (« Signaler ») et, s'il le veut, rembourse les acheteurs (le créateur rend sa part)
create or replace function public.at_boutique_admin(p_name text, p_article uuid, p_action text) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare n text := public.pg_n(p_name); b record; k int := 0;
begin
  perform pegase_int.at_admin_ok(n);
  if p_action = 'retirer' then update public.at_boutique_articles set actif = false, retire_at = now() where id = p_article;
  elsif p_action = 'remettre' then update public.at_boutique_articles set actif = true, retire_at = null where id = p_article;
  elsif p_action = 'rembourser' then
    update public.at_boutique_articles set actif = false, retire_at = coalesce(retire_at, now()) where id = p_article;
    for b in select * from public.at_boutique_achats x where x.article = p_article and x.rembourse_at is null loop
      perform pegase_int.at_crediter(b.acheteur, b.prix);
      update public.at_credits c set solde = greatest(0, c.solde - b.part_createur), maj_at = now() where c.name = b.createur;
      update public.at_boutique_achats set rembourse_at = now() where id = b.id; k := k + 1;
    end loop;
  else raise exception 'action inconnue'; end if;
  return jsonb_build_object('ok', true, 'rembourses', k);
end $$;

revoke all on function public.at_boutique_liste(text, text), public.at_boutique_acheter(text, uuid), public.at_boutique_signaler(text, uuid, text),
  public.at_boutique_mes_ventes(text), public.at_boutique_admin(text, uuid, text) from public, anon;
grant execute on function public.at_boutique_liste(text, text), public.at_boutique_acheter(text, uuid), public.at_boutique_signaler(text, uuid, text),
  public.at_boutique_mes_ventes(text), public.at_boutique_admin(text, uuid, text) to authenticated;
