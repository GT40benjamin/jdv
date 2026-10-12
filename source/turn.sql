-- Relais TURN (Cloudflare Realtime) pour les liaisons de téléphone à téléphone : duel en ligne, regarder un copain jouer.
-- La clé reste ici, sur le serveur : le site ne reçoit que des identifiants temporaires (24 h), et seulement avec le mot de passe du site.
-- Remplace CHANGE-MOI-TURN-ID et CHANGE-MOI-TURN-TOKEN (ligne 10) par les deux codes de la clé TURN Cloudflare. Peut être relancé.
create extension if not exists http with schema extensions;
create table if not exists public.turn_cfg (
  id int primary key default 1 check (id = 1), key_id text not null, token text not null, ice jsonb, until timestamptz);
alter table public.turn_cfg enable row level security;   -- aucune règle : illisible depuis le site
revoke all on public.turn_cfg from anon, authenticated;
insert into public.turn_cfg (id, key_id, token)
  values (1, 'CHANGE-MOI-TURN-ID', 'CHANGE-MOI-TURN-TOKEN')
  on conflict (id) do update set key_id = excluded.key_id, token = excluded.token, ice = null, until = null;

create or replace function public.get_turn(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c public.turn_cfg; r extensions.http_response;
begin
  if not public.check_code(p_code) then raise exception 'mauvais mot de passe'; end if;
  select * into c from public.turn_cfg where id = 1;
  if not found then return null; end if;
  if c.ice is null or c.until < now() + interval '3 hours' then
    r := extensions.http((
      'POST',
      'https://rtc.live.cloudflare.com/v1/turn/keys/' || c.key_id || '/credentials/generate-ice-servers',
      array[extensions.http_header('Authorization', 'Bearer ' || c.token)],
      'application/json',
      '{"ttl": 86400}'
    )::extensions.http_request);
    if r.status in (200, 201) then
      update public.turn_cfg set ice = r.content::jsonb, until = now() + interval '24 hours' where id = 1
        returning * into c;
    elsif c.ice is null then
      return jsonb_build_object('erreur', r.status);
    end if;
  end if;
  return jsonb_build_object('iceServers', c.ice -> 'iceServers', 'until', floor(extract(epoch from c.until) * 1000));
end $$;
revoke all on function public.get_turn(text) from public;
grant execute on function public.get_turn(text) to anon;
