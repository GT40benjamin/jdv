-- borne 2.0.134 (SQL v145) — l'admin (« grave !!! des messages dans le chat alors que le jeu n'est pas sorti ! ») : un jeu de l'Atelier qui
-- n'est PAS publié dans une salle (ni publié pour tous) ne fait AUCUNE annonce dans cette salle : ni carte « record » / revanche dans le chat,
-- ni notification « X a battu ton record » dans la cloche. Bloqué à la source (déclencheurs sur messages et notifications : l'événement
-- n'est pas créé, quel que soit le chemin : add_score, rec_copains, rec_carte, coop…). Les annonces déjà postées sont MASQUÉES : rangées
-- dans des tables d'archive (rien n'est perdu ; pour les remettre : réinsérer depuis l'archive).
create or replace function pegase_int.jeu_annonce_ok(p_tag text, p_room bigint) returns boolean language sql stable security definer set search_path = public as $$
  with g as (select split_part(coalesce(p_tag, ''), '@', 1) as id),
       f as (select x.* from public.at_fiches x, g where x.jeu is not null and x.supprime_at is null and (x.jeu = g.id or g.id like x.jeu || '-%'))
  select not exists (select 1 from f)
      or exists (select 1 from f where coalesce(f.version_publiee, 0) > 0 and (f.etat = 'publie_monde' or (f.etat = 'publie_salle' and f.salle = p_room)));
$$;
create or replace function pegase_int.annonce_filtre() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.game is not null and not pegase_int.jeu_annonce_ok(new.game, new.room_id) then return null; end if;
  return new;
end $$;
drop trigger if exists annonce_filtre on public.messages;
create trigger annonce_filtre before insert on public.messages for each row execute function pegase_int.annonce_filtre();
drop trigger if exists annonce_filtre on public.notifications;
create trigger annonce_filtre before insert or update on public.notifications for each row execute function pegase_int.annonce_filtre();
-- les annonces déjà postées pour un jeu pas publié dans leur salle : masquées (archivées, avec leurs réactions)
create table if not exists public.annonces_masquees (id bigserial primary key, quoi text not null, ligne jsonb not null, reactions jsonb, masque_at timestamptz not null default now());
alter table public.annonces_masquees enable row level security;   -- aucune politique : l'équipe seulement
insert into public.annonces_masquees (quoi, ligne, reactions)
  select 'message', to_jsonb(m), (select jsonb_agg(to_jsonb(r)) from public.reactions r where r.message_id = m.id)
  from public.messages m where m.game is not null and not pegase_int.jeu_annonce_ok(m.game, m.room_id);
delete from public.reactions r using public.messages m where r.message_id = m.id and m.game is not null and not pegase_int.jeu_annonce_ok(m.game, m.room_id);
delete from public.messages m where m.game is not null and not pegase_int.jeu_annonce_ok(m.game, m.room_id);
insert into public.annonces_masquees (quoi, ligne)
  select 'notification', to_jsonb(n) from public.notifications n where n.game is not null and not pegase_int.jeu_annonce_ok(n.game, n.room_id);
delete from public.notifications n where n.game is not null and not pegase_int.jeu_annonce_ok(n.game, n.room_id);
