-- ===== gagner-credits-invite.sql : inviter un ami (après v191_gagner_credits) =====
-- REJOUABLE. Décision de l'admin, 8 nov. 2026 : +100 💎 chacun dès que le compte de l'ami est vérifié (e-mail confirmé ou Google).
-- La condition « a créé quelque chose ou dépensé 50 💎 » est retirée. Restent : un seul parrain par compte, pas d'auto-parrainage, même famille refusée,
-- 10 amis au plus, compte vérifié obligatoire, +100 💎 à l'achat d'un pack. Tant que gagner_credits_ouvert = 0, rien n'est versé.
drop trigger if exists gc_journal on public.at_credit_journal;
drop function if exists pegase_int.gc_journal_trg();
create or replace function pegase_int.gc_parrain_maj(u uuid) returns void language plpgsql security definer set search_path = public as $$
declare f pegase_int.gc_filleuls; verifie boolean; n int; gain_p int; gain_f int; gain_a int;
begin
  if u is null or not pegase_int.gc_ouvert() then return; end if;
  select * into f from pegase_int.gc_filleuls x where x.user_id = u for update;
  if f.user_id is null then return; end if;
  if f.recompense_at is null then
    select x.email_confirmed_at is not null into verifie from auth.users x where x.id = u;   -- e-mail confirmé, ou connexion Google (qui le remplit)
    if coalesce(verifie, false) then
      perform 1 from pegase_int.gc_codes c where c.name = f.parrain for update;   -- deux amis en même temps : le plafond tient
      select count(*) into n from pegase_int.gc_filleuls x where x.parrain_user = f.parrain_user and x.recompense_at is not null;
      if n < pegase_int.gc_reglage('gc_parrain_max', 10) then
        update pegase_int.gc_filleuls x set recompense_at = now() where x.user_id = u;
        f.recompense_at := now();
        gain_p := pegase_int.gc_reglage('gc_parrain_credits', 100); gain_f := pegase_int.gc_reglage('gc_filleul_credits', 100);
        perform pegase_int.gc_payer(f.parrain, gain_p, 'gc_parrain');
        perform pegase_int.gc_payer(f.filleul, gain_f, 'gc_filleul');
      end if;
    end if;
  end if;
  if f.recompense_at is not null and f.achat_at is null
     and exists (select 1 from public.at_achats a where a.etat = 'paye' and a.name in (select p.name from public.players p where p.user_id = u)) then
    update pegase_int.gc_filleuls x set achat_at = now() where x.user_id = u;
    gain_a := pegase_int.gc_reglage('gc_parrain_achat_credits', 100);
    perform pegase_int.gc_payer(f.parrain, gain_a, 'gc_parrain_achat');
  end if;
end $$;
create or replace function public.gc_mes_gains(p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name); r jsonb;
begin
  perform public.acct_check(n);
  if not pegase_int.gc_ouvert() then return '[]'::jsonb; end if;
  begin perform pegase_int.gc_parrain_maj(pegase_int.gc_compte(n)); exception when others then null; end;   -- compte vérifié depuis la dernière visite : le cadeau part ici
  with a as (update pegase_int.gc_records x set vu_at = now() where x.name = n and x.vu_at is null and x.etat in ('paye', 'attente') returning x.*)
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'sorte', a.sorte, 'jeu', a.jeu, 'niveau', nullif(a.niveau, ''), 'credits', a.credits, 'etat', a.etat, 'score', a.score, 'ancien', a.ancien, 'ancien_nom', a.ancien_nom) order by a.id), '[]'::jsonb) into r from a;
  return r;
end $$;
create or replace function public.gc_mon_code(p_name text) returns text language plpgsql security definer set search_path = public as $$
declare n text := public.pg_n(p_name);
begin
  perform public.acct_check(n);
  if pegase_int.gc_reglage('gc_actif', 1) <> 1 or (not pegase_int.gc_ouvert() and not pegase_int.at_patron(n)) then return null; end if;
  return pegase_int.gc_code_de(n);
end $$;
revoke all on function public.gc_mon_code(text) from public, anon;
grant execute on function public.gc_mon_code(text) to authenticated;
