-- ===== gagner-credits-codes.sql : codes de parrainage lisibles (après v191_gagner_credits) =====
-- REJOUABLE. Le filtre des lettres ambiguës passait avant la mise en majuscules : environ 1 code sur 3 contenait un O, un I ou un L.
-- Les majuscules passent d'abord : plus aucun O, I, L, 0 ni 1 dans un nouveau code.
-- Tant que la section est fermée aux joueurs, aucun code n'a été donné à personne : ceux qui existent et ne servent à aucun filleul sont effacés,
-- et le serveur en refait un au prochain menu. Un code déjà utilisé par un filleul n'est jamais touché.
create or replace function pegase_int.gc_code_de(n text) returns text language plpgsql security definer set search_path = public, extensions as $$
declare c text; essai int := 0;
begin
  select x.code into c from pegase_int.gc_codes x where x.name = n;
  if c is not null then return c; end if;
  loop
    essai := essai + 1;
    c := translate(upper(left(encode(gen_random_bytes(8), 'base64'), 8)), '+/=O0I1L', 'ABCDEFGH');
    begin
      insert into pegase_int.gc_codes (name, code) values (n, c);
      return c;
    exception when unique_violation then
      select x.code into c from pegase_int.gc_codes x where x.name = n;
      if c is not null then return c; end if;
      if essai > 8 then raise; end if;
    end;
  end loop;
end $$;
revoke all on function pegase_int.gc_code_de(text) from public, anon, authenticated;
delete from pegase_int.gc_codes c where c.code ~ '[OIL01]' and not exists (select 1 from pegase_int.gc_filleuls f where f.parrain = c.name);
