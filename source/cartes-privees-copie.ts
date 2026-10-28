// Fonction Edge « pegase-cartes-copie » (Supabase) — À DÉPLOYER ET LANCER UNE FOIS (28 oct. 2026), PUIS À RETIRER.
// Copie la carte de l'île (7 fichiers), ENCORE publique sur le site à ce moment-là, dans le seau PRIVÉ « pegase-cartes » du Storage (voir
// source/cartes-privees.sql : partie 1 avant, partie 2 après). Sans argument ; rejouable (upsert : rien ne se double). Répond ce qui a été copié,
// avec la taille de chaque fichier (à comparer au contrôle 1 du SQL). Ne lit et n'écrit RIEN d'autre.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE = 'https://elixirgamestudio.com/assets/pegase/';
const FILES: [string, string][] = [
  ['ile_3d_1024.webp', 'image/webp'], ['ile_3d_2048.webp', 'image/webp'], ['ile_3d_proj.json', 'application/json'], ['ile_3d_cote.json', 'application/json'],
  ['carte_ile_1024.webp', 'image/webp'], ['carte_ile_1024.jpg', 'image/jpeg'], ['carte_ile_2048.webp', 'image/webp'],
];

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const out: { f: string; ok: boolean; octets?: number; why?: string }[] = [];
  for (const [f, type] of FILES) {
    const r = await fetch(SITE + f + '?copie=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) { out.push({ f, ok: false, why: 'site ' + r.status }); continue; }
    const body = new Uint8Array(await r.arrayBuffer());
    const { error } = await sb.storage.from('pegase-cartes').upload(f, body, { contentType: type, upsert: true, cacheControl: '3600' });
    out.push(error ? { f, ok: false, octets: body.length, why: error.message } : { f, ok: true, octets: body.length });
  }
  return new Response(JSON.stringify(out, null, 1), { headers: { 'content-type': 'application/json; charset=utf-8' } });
});
