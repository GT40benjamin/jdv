package fr.bornearcade.app;

import android.app.DownloadManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.database.Cursor;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.List;
import java.util.Locale;

/**
 * Applis natives ouvertes depuis la borne (Pégase…), appli 1.8 et suivantes.
 * Page : window.JDWAndroid (api, device, appInstalled, openApp, canInstall, openInstallSettings, downloadAndInstall, retryInstall,
 * installState, background, cancelInstall, uninstall) ; nouvelles vers la page : window.JDWAndroidEvent({ state, … }).
 * Chemin : DownloadManager (continue si on quitte la borne ou si Android la ferme) → empreinte SHA-256 vérifiée → PackageInstaller
 * (Android demande « Installer ? » la 1re fois ; Android 12+ : la mise à jour d'une appli installée par la borne passe sans question).
 * États : download → verify → ready → prepare → install → confirm (écran d'Android) → done | cancel | error (err = code).
 * Sécurité : seulement les paquets fr.bornearcade.* / com.jdv.*, seulement depuis le site de la borne ou les « releases » du dépôt,
 * et seulement un fichier dont l'empreinte est celle annoncée.
 */
public final class Natif {
    static final String[] PKG_OK = { "fr.bornearcade.", "com.jdv." };
    static final String REL = "https://github.com/GT40benjamin/jdv/releases/download/";
    static final String DIR = "natif";
    static Natif live;            // l'activité ouverte : le récepteur d'état d'installation lui passe les nouvelles
    static Intent confirm;        // l'écran « Installer ? » d'Android, gardé si la borne n'était pas devant à ce moment-là
    static boolean committed;     // une installation a été lancée par CE processus (sinon, après un redémarrage, on la relance)
    static boolean fresh = true;  // premier retour au premier plan depuis le démarrage du processus

    final MainActivity act;
    final WebView web;
    final SharedPreferences sp;
    final Handler ui = new Handler(Looper.getMainLooper());
    boolean resumed, polling;
    volatile boolean working;     // vérification ou copie vers l'installateur en cours (fil à part)

    Natif(MainActivity a, WebView w) { act = a; web = w; sp = a.getSharedPreferences("natif", 0); live = this; }
    Bridge bridge() { return new Bridge(); }

    /** Ce que voit la page (window.JDWAndroid). Appelé sur le fil « JavaBridge » de la WebView. */
    public final class Bridge {
        @JavascriptInterface public int api() { return 1; }
        @JavascriptInterface public String device() { return deviceJson(); }
        @JavascriptInterface public String appInstalled(String pkg) { return installedJson(pkg); }
        @JavascriptInterface public boolean openApp(String pkg, String uri) { return open(pkg, uri); }
        @JavascriptInterface public boolean canInstall() { return Natif.this.canInstall(); }
        @JavascriptInterface public boolean openInstallSettings() { return Natif.this.openInstallSettings(); }
        @JavascriptInterface public String downloadAndInstall(String url, String sha256, double size, String pkg, String title) { return request(url, sha256, (long) size, pkg, title); }
        @JavascriptInterface public void retryInstall() { ui.post(new Runnable() { public void run() { retry(); } }); }
        @JavascriptInterface public String installState() { return stateJson(); }
        @JavascriptInterface public void background() { sp.edit().putBoolean("auto", false).apply(); }
        @JavascriptInterface public void cancelInstall() { ui.post(new Runnable() { public void run() { cancel(true); } }); }
        @JavascriptInterface public boolean uninstall(String pkg) { return Natif.this.uninstall(pkg); }
    }

    // ---------- l'appareil ----------
    String deviceJson() {
        StringBuilder b = new StringBuilder("{\"api\":1,\"sdk\":").append(Build.VERSION.SDK_INT).append(",\"app\":").append(MainActivity.VERSION);
        b.append(",\"abis\":[");
        String[] a = Build.SUPPORTED_ABIS;
        if (a != null) for (int i = 0; i < a.length; i++) b.append(i > 0 ? "," : "").append(q(a[i]));
        b.append("],\"model\":").append(q(Build.MODEL)).append(",\"brand\":").append(q(Build.MANUFACTURER));
        long free = -1;
        try { File d = act.getExternalFilesDir(DIR); if (d != null) free = d.getUsableSpace(); } catch (Throwable ignore) { }
        b.append(",\"free\":").append(free).append(",\"perm\":").append(canInstall());
        String net = "none"; boolean metered = false;
        try {
            ConnectivityManager cm = (ConnectivityManager) act.getSystemService("connectivity");
            NetworkCapabilities c = cm.getNetworkCapabilities(cm.getActiveNetwork());
            if (c != null) net = c.hasTransport(1) ? "wifi" : c.hasTransport(0) ? "cellular" : c.hasTransport(3) ? "ethernet" : "other";   // TRANSPORT_WIFI / CELLULAR / ETHERNET
            metered = cm.isActiveNetworkMetered();
        } catch (Throwable ignore) { net = "?"; }
        b.append(",\"net\":").append(q(net)).append(",\"metered\":").append(metered);
        return b.append('}').toString();
    }

    // ---------- une appli installée ? (version, installateur, empreinte du certificat qui la signe) ----------
    String installedJson(String pkg) {
        if (!okPkg(pkg)) return null;
        try {
            PackageManager pm = act.getPackageManager();
            PackageInfo pi = pm.getPackageInfo(pkg, Build.VERSION.SDK_INT >= 28 ? 0x08000000 : 0x40);   // GET_SIGNING_CERTIFICATES : GET_SIGNATURES
            long vc = Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
            String inst = null;
            try { inst = pm.getInstallerPackageName(pkg); } catch (Throwable ignore) { }
            Signature[] sg = null;
            if (Build.VERSION.SDK_INT >= 28) { if (pi.signingInfo != null) sg = pi.signingInfo.getApkContentsSigners(); } else sg = pi.signatures;
            String cert = null;
            try { if (sg != null && sg.length > 0) cert = hex(MessageDigest.getInstance("SHA-256").digest(sg[0].toByteArray())); } catch (Throwable ignore) { }
            return "{\"pkg\":" + q(pkg) + ",\"versionCode\":" + vc + ",\"versionName\":" + q(pi.versionName) + ",\"installer\":" + q(inst)
                + ",\"mine\":" + act.getPackageName().equals(inst) + ",\"cert\":" + q(cert) + ",\"first\":" + pi.firstInstallTime + ",\"last\":" + pi.lastUpdateTime + "}";
        } catch (PackageManager.NameNotFoundException e) {
            return null;
        } catch (Throwable e) {
            return null;
        }
    }
    long installedVc(String pkg) {
        try {
            PackageInfo pi = act.getPackageManager().getPackageInfo(pkg, 0);
            return Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
        } catch (Throwable e) { return -1; }
    }

    // ---------- ouvrir (adresse « pegase://… » passée à l'appli, pour la suite : jeton de session) ----------
    boolean open(String pkg, String uri) {
        if (!okPkg(pkg)) return false;
        final Intent i;
        try { i = act.getPackageManager().getLaunchIntentForPackage(pkg); } catch (Throwable e) { return false; }
        if (i == null) return false;
        if (uri != null && uri.matches("[a-z][a-z0-9]{1,20}://\\S{0,1500}") && !uri.matches("(https?|file|content|intent|javascript)://.*")) i.setData(Uri.parse(uri));
        i.addFlags(0x10000000);   // FLAG_ACTIVITY_NEW_TASK
        i.putExtra("fr.bornearcade.from", "borne");
        ui.post(new Runnable() { public void run() {
            try { act.startActivity(i); } catch (Throwable e) { emit("{\"state\":\"openfail\",\"msg\":" + q(String.valueOf(e)) + "}"); }
        } });
        return true;
    }

    // ---------- « Installer des applis inconnues » pour la borne (Android 8+) ----------
    boolean canInstall() {
        if (Build.VERSION.SDK_INT < 26) return true;   // Android 7 : réglage global, l'écran d'Android s'en occupe
        try { return act.getPackageManager().canRequestPackageInstalls(); } catch (Throwable e) { return false; }
    }
    boolean openInstallSettings() {
        if (Build.VERSION.SDK_INT < 26) return false;
        final Intent i = new Intent("android.settings.MANAGE_UNKNOWN_APP_SOURCES", Uri.parse("package:" + act.getPackageName()));
        ui.post(new Runnable() { public void run() { try { act.startActivity(i); } catch (Throwable e) { emit("{\"state\":\"settingsfail\"}"); } } });
        return true;
    }
    boolean uninstall(String pkg) {
        if (!okPkg(pkg) || pkg.equals(act.getPackageName())) return false;
        final Intent i = new Intent("android.intent.action.DELETE", Uri.parse("package:" + pkg));
        ui.post(new Runnable() { public void run() { try { act.startActivity(i); } catch (Throwable ignore) { } } });
        return true;
    }

    // ---------- télécharger puis installer ----------
    String request(final String url, String sha256, final long size, final String pkg, final String title) {
        if (!okPkg(pkg)) return "pkg";
        if (!okUrl(url)) return "url";
        if (sha256 == null || !sha256.matches("[0-9a-fA-F]{64}")) return "sha";
        final String sha = sha256.toLowerCase(Locale.ROOT);
        ui.post(new Runnable() { public void run() { begin(url, sha, size, pkg, title, false); } });
        return "ok";
    }

    /** Fil principal. Même fichier que la tâche en cours : on reprend là où on en était ; sinon nouvelle tâche. */
    void begin(String url, String sha, long size, String pkg, String title, boolean force) {
        String st = sp.getString("state", "");
        boolean same = sha.equals(sp.getString("sha", null)) && pkg.equals(sp.getString("pkg", null));
        if (same && !force) {
            sp.edit().putBoolean("auto", true).apply();
            if ("done".equals(st) && installedVc(pkg) >= sp.getLong("vc", Long.MAX_VALUE)) { emitState(); return; }
            if (!"done".equals(st)) { resume(); return; }
        }
        cancel(false);
        SharedPreferences.Editor e = sp.edit().putString("pkg", pkg).putString("url", url).putString("sha", sha).putLong("size", size)
            .putString("title", title).putBoolean("auto", true).putLong("t", System.currentTimeMillis());
        File dir = act.getExternalFilesDir(DIR);
        if (dir == null) { e.apply(); fail("storage", "stockage indisponible"); return; }
        long free = dir.getUsableSpace(), need = size * 2 + (150L << 20);   // le fichier + sa copie dans l'installateur d'Android
        if (size > 0 && free < need) { e.putLong("need", need).putLong("free", free).apply(); fail("space", "place libre " + free); return; }
        File f = new File(dir, pkg + "-" + sha.substring(0, 12) + ".apk");
        f.delete();
        long id;
        try {
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
            r.setTitle(title != null && title.length() > 0 ? title : "Appli de la borne");
            r.setDescription("Téléchargement pour la borne d'arcade");
            r.setNotificationVisibility(0);   // VISIBILITY_VISIBLE : progression dans les notifications, rien à la fin
            r.setDestinationInExternalFilesDir(act, DIR, f.getName());
            r.setMimeType("application/vnd.android.package-archive");
            r.setAllowedOverMetered(true);
            r.setAllowedOverRoaming(true);
            if (Build.VERSION.SDK_INT < 29) r.setVisibleInDownloadsUi(false);
            id = dm().enqueue(r);
        } catch (Throwable x) { e.apply(); fail("dm", String.valueOf(x)); return; }
        e.putLong("dl", id).putString("file", f.getAbsolutePath()).putString("state", "download").apply();
        emitState();
        poll();
    }

    /** Fil principal : reprendre la tâche gardée (retour dans la borne, page rechargée, processus relancé par Android). */
    void resume() {
        String st = sp.getString("state", "");
        String pkg = sp.getString("pkg", "");
        boolean fileOk = sp.getBoolean("ok", false) && new File(sp.getString("file", "")).exists();
        if ("download".equals(st)) { poll(); emitState(); return; }
        if ("verify".equals(st) || ("prepare".equals(st) && !fileOk)) { if (!working) verifyAsync(); else emitState(); return; }
        if ("prepare".equals(st)) { if (!working) installAsync(); else emitState(); return; }
        if ("install".equals(st) || "confirm".equals(st)) {
            if (confirm != null) { showConfirm(); return; }
            if (installedVc(pkg) >= sp.getLong("vc", Long.MAX_VALUE)) { done(); return; }   // installée pendant qu'on était fermé
            if (committed) { emitState(); return; }                                          // Android installe : on attend sa réponse
            if (fileOk) { sp.edit().putString("state", "ready").apply(); emitState(); maybeInstall(); return; }
        }
        if (fileOk) { sp.edit().putString("state", "ready").apply(); emitState(); maybeInstall(); return; }   // ready, cancel, error après vérification
        String url = sp.getString("url", null), sha = sp.getString("sha", null);
        if (url != null && sha != null) begin(url, sha, sp.getLong("size", 0), pkg, sp.getString("title", null), true);   // à refaire depuis le début
    }

    /** Fil principal : « Réessayer » (écran d'Android disparu, installation refusée…). */
    void retry() {
        String st = sp.getString("state", "");
        if (st.length() == 0) return;
        sp.edit().putBoolean("auto", true).apply();
        boolean fileOk = sp.getBoolean("ok", false) && new File(sp.getString("file", "")).exists();
        if (fileOk && !working && !"download".equals(st)) { confirm = null; sp.edit().putString("state", "ready").apply(); maybeInstall(); emitState(); return; }
        resume();
    }

    DownloadManager dm() { return (DownloadManager) act.getSystemService("download"); }

    /** [octets reçus, taille, état (1 attente, 2 en cours, 4 en pause, 8 fini, 16 raté, 0 disparu), raison] */
    long[] dlProgress() {
        long[] r = { 0, sp.getLong("size", 0), 0, 0 };
        Cursor c = null;
        try {
            c = dm().query(new DownloadManager.Query().setFilterById(sp.getLong("dl", -1)));
            if (c != null && c.moveToFirst()) {
                r[0] = c.getLong(c.getColumnIndex("bytes_so_far"));
                long t = c.getLong(c.getColumnIndex("total_size")); if (t > 0) r[1] = t;
                r[2] = c.getInt(c.getColumnIndex("status"));
                r[3] = c.getInt(c.getColumnIndex("reason"));
                if (r[2] == 8) {   // le vrai chemin du fichier (au cas où Android l'aurait renommé)
                    String lu = c.getString(c.getColumnIndex("local_uri"));
                    if (lu != null && lu.startsWith("file://")) sp.edit().putString("file", Uri.parse(lu).getPath()).apply();
                }
            }
        } catch (Throwable ignore) {
        } finally { try { if (c != null) c.close(); } catch (Throwable ignore) { } }
        return r;
    }

    final Runnable tick = new Runnable() { public void run() {
        polling = false;
        if (!"download".equals(sp.getString("state", ""))) return;
        long[] p = dlProgress();
        int status = (int) p[2], reason = (int) p[3];
        if (status == 8) { verifyAsync(); return; }
        if (status == 16 || status == 0) {
            fail(reason == 1006 ? "space" : (reason == 404 || reason == 410) ? "missing" : "net", status == 0 ? "téléchargement disparu" : "téléchargement : " + reason);
            return;
        }
        emitState();
        if (resumed) { polling = true; ui.postDelayed(this, 500); }
    } };
    void poll() { if (polling) return; polling = true; ui.post(tick); }

    /** Empreinte SHA-256 du fichier + nom du paquet dedans (fil à part). */
    void verifyAsync() {
        if (working) return;
        working = true;
        final String path = sp.getString("file", ""), sha = sp.getString("sha", ""), pkg = sp.getString("pkg", "");
        sp.edit().putString("state", "verify").apply();
        emitState();
        new Thread(new Runnable() { public void run() {
            String err = null, msg = null; long vc = 0;
            try {
                File f = new File(path);
                long len = f.length(), done = 0, step = Math.max(len / 40, 1 << 20), next = step;
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                byte[] buf = new byte[1 << 20];
                InputStream in = new FileInputStream(f);
                try {
                    int n;
                    while ((n = in.read(buf)) > 0) { md.update(buf, 0, n); done += n; if (done >= next) { next += step; emit(prog("verify", done, len)); } }
                } finally { in.close(); }
                if (!hex(md.digest()).equals(sha)) { err = "sha"; msg = "empreinte différente (fichier abîmé ou remplacé)"; f.delete(); }
                else {
                    PackageInfo ai = act.getPackageManager().getPackageArchiveInfo(path, 0);
                    if (ai == null || !pkg.equals(ai.packageName)) { err = "invalid"; msg = ai == null ? "APK illisible" : "paquet " + ai.packageName; f.delete(); }
                    else vc = Build.VERSION.SDK_INT >= 28 ? ai.getLongVersionCode() : ai.versionCode;
                }
            } catch (Throwable e) { err = "storage"; msg = String.valueOf(e); }
            final String fe = err, fm = msg; final long fvc = vc;
            ui.post(new Runnable() { public void run() {
                working = false;
                if (!sha.equals(sp.getString("sha", null))) return;   // tâche annulée entre-temps
                if (fe != null) { fail(fe, fm); return; }
                sp.edit().putString("state", "ready").putBoolean("ok", true).putLong("vc", fvc).apply();
                emitState();
                maybeInstall();
            } });
        } }).start();
    }

    /** Fil principal : on installe seulement si la page le veut (auto), si la borne est devant et si Android le permet déjà. */
    void maybeInstall() {
        if (!"ready".equals(sp.getString("state", "")) || !sp.getBoolean("auto", false) || !resumed || working) return;
        if (!canInstall()) { emitState(); return; }   // la page montre « Autorise la borne… » ; on reprend au retour (onResume)
        installAsync();
    }

    /** Copie le fichier dans une session de l'installateur d'Android puis la valide (fil à part). */
    void installAsync() {
        if (working) return;
        working = true;
        final String path = sp.getString("file", ""), pkg = sp.getString("pkg", ""), sha = sp.getString("sha", "");
        sp.edit().putString("state", "prepare").apply();
        emitState();
        new Thread(new Runnable() { public void run() {
            String err = null, msg = null;
            try {
                PackageInstaller pi = act.getPackageManager().getPackageInstaller();
                abandonAll(pi);
                File f = new File(path);
                long len = f.length();
                PackageInstaller.SessionParams p = new PackageInstaller.SessionParams(1);   // MODE_FULL_INSTALL
                p.setAppPackageName(pkg);
                p.setSize(len);
                if (Build.VERSION.SDK_INT >= 26) p.setInstallReason(4);       // INSTALL_REASON_USER
                if (Build.VERSION.SDK_INT >= 31) p.setRequireUserAction(2);   // USER_ACTION_NOT_REQUIRED : pas de question pour une mise à jour, si Android le permet
                int sid = pi.createSession(p);
                PackageInstaller.Session s = pi.openSession(sid);
                try {
                    OutputStream out = s.openWrite("base.apk", 0, len);
                    InputStream in = new FileInputStream(f);
                    try {
                        byte[] buf = new byte[1 << 20];
                        long done = 0, step = Math.max(len / 40, 1 << 20), next = step;
                        int n;
                        while ((n = in.read(buf)) > 0) { out.write(buf, 0, n); done += n; if (done >= next) { next += step; emit(prog("prepare", done, len)); } }
                        s.fsync(out);
                    } finally { in.close(); out.close(); }
                    Intent it = new Intent(act, Statut.class).setAction("fr.bornearcade.app.STATUT_INSTALL").setPackage(act.getPackageName()).putExtra("fr.bornearcade.sid", sid);
                    PendingIntent pend = PendingIntent.getBroadcast(act, sid, it, 0x08000000 | (Build.VERSION.SDK_INT >= 31 ? 0x02000000 : 0));   // UPDATE_CURRENT | MUTABLE (Android y ajoute le résultat)
                    sp.edit().putString("state", "install").putInt("sid", sid).putLong("t", System.currentTimeMillis()).apply();
                    committed = true;
                    s.commit(pend.getIntentSender());
                } finally { s.close(); }
            } catch (Throwable e) { err = "install"; msg = String.valueOf(e); }
            final String fe = err, fm = msg;
            ui.post(new Runnable() { public void run() {
                working = false;
                if (!sha.equals(sp.getString("sha", null))) return;
                if (fe != null) fail(fe, fm); else emitState();
            } });
        } }).start();
    }

    static void abandonAll(PackageInstaller pi) {
        try {
            List<PackageInstaller.SessionInfo> old = pi.getMySessions();
            if (old != null) for (PackageInstaller.SessionInfo s : old) { try { pi.abandonSession(s.getSessionId()); } catch (Throwable ignore) { } }
        } catch (Throwable ignore) { }
    }

    /** Fil principal : montre l'écran « Installer ? » d'Android (seulement si la borne est devant ; sinon au retour). */
    void showConfirm() {
        if (confirm == null) return;
        if (!resumed) { emitState(); return; }
        Intent c = confirm; confirm = null;
        try { act.startActivity(c); } catch (Throwable e) { fail("install", String.valueOf(e)); return; }
        sp.edit().putString("state", "confirm").apply();
        emit(stateJson().replace("{\"state\":\"confirm\"", "{\"state\":\"confirm\",\"shown\":true"));
    }

    void done() {
        String f = sp.getString("file", null);
        if (f != null) new File(f).delete();
        sp.edit().putString("state", "done").putBoolean("ok", false).remove("err").remove("msg").putLong("t", System.currentTimeMillis()).apply();
        emitState();
    }
    void fail(String err, String msg) {
        sp.edit().putString("state", "error").putString("err", err).putString("msg", msg).putLong("t", System.currentTimeMillis()).apply();
        emitState();
    }

    /** Fil principal : tout arrêter (téléchargement, fichier, installation en attente). */
    void cancel(boolean tell) {
        long id = sp.getLong("dl", -1);
        if (id > 0) { try { dm().remove(id); } catch (Throwable ignore) { } }
        try { abandonAll(act.getPackageManager().getPackageInstaller()); } catch (Throwable ignore) { }
        confirm = null;
        committed = false;
        sp.edit().clear().apply();
        try {
            File dir = act.getExternalFilesDir(DIR);
            File[] l = dir != null ? dir.listFiles() : null;
            if (l != null) for (File x : l) x.delete();
        } catch (Throwable ignore) { }
        if (tell) emit("{\"state\":\"idle\"}");
    }

    // ---------- l'activité ----------
    void onResume() {
        resumed = true;
        if (fresh) {   // processus tout neuf : une vieille tâche (plus de 3 h) n'ouvre plus l'écran d'Android toute seule
            fresh = false;
            if (System.currentTimeMillis() - sp.getLong("t", 0) > 3 * 3600 * 1000L) sp.edit().putBoolean("auto", false).apply();
        }
        String st = sp.getString("state", null);
        if (st == null) { emit("{\"resumed\":true,\"state\":\"idle\",\"perm\":" + canInstall() + "}"); return; }   // la page revérifie (ex. ancienne version désinstallée)
        if (confirm != null) { showConfirm(); return; }
        if ("download".equals(st)) poll();
        else if ("ready".equals(st)) maybeInstall();
        else if (!committed && !working && sp.getBoolean("auto", false) && ("verify".equals(st) || "prepare".equals(st) || "install".equals(st) || "confirm".equals(st))) { resume(); return; }
        emit(stateJson().replace("{\"state\":", "{\"resumed\":true,\"state\":"));
    }
    void onPause() { resumed = false; }

    /** Réponse de l'installateur d'Android (déclaré dans le manifeste : arrive même si la borne a été fermée entre-temps). */
    public static final class Statut extends BroadcastReceiver {
        @Override public void onReceive(Context c, Intent it) {
            int st = it.getIntExtra("android.content.pm.extra.STATUS", 1);
            String msg = it.getStringExtra("android.content.pm.extra.STATUS_MESSAGE");
            SharedPreferences sp = c.getSharedPreferences("natif", 0);
            if (sp.getInt("sid", -1) != it.getIntExtra("fr.bornearcade.sid", -2)) return;   // réponse d'une vieille session abandonnée
            if (st == -1) {   // STATUS_PENDING_USER_ACTION : Android veut demander « Installer ? »
                Intent ask = it.getParcelableExtra("android.intent.extra.INTENT");
                confirm = ask;
                sp.edit().putString("state", "confirm").apply();
                if (live != null) live.showConfirm();
                return;
            }
            confirm = null;
            committed = false;
            if (st == 0) {   // STATUS_SUCCESS
                if (live != null) { live.done(); return; }
                String f = sp.getString("file", null);
                if (f != null) new File(f).delete();
                sp.edit().putString("state", "done").putBoolean("ok", false).remove("err").remove("msg").putLong("t", System.currentTimeMillis()).apply();
                return;
            }
            String err = st == 3 ? "cancel" : st == 2 ? "blocked" : st == 4 ? "invalid" : st == 5 ? "conflict" : st == 6 ? "storage" : st == 7 ? "incompatible" : st == 8 ? "timeout" : "install";
            sp.edit().putString("state", st == 3 ? "cancel" : "error").putString("err", err).putString("msg", msg).putLong("t", System.currentTimeMillis()).apply();
            if (live != null) live.emitState();
        }
    }

    // ---------- nouvelles vers la page ----------
    String stateJson() {
        String st = sp.getString("state", null);
        if (st == null) return "{\"state\":\"idle\",\"perm\":" + canInstall() + "}";
        StringBuilder b = new StringBuilder("{\"state\":").append(q(st));
        b.append(",\"pkg\":").append(q(sp.getString("pkg", null))).append(",\"sha\":").append(q(sp.getString("sha", null)))
         .append(",\"size\":").append(sp.getLong("size", 0)).append(",\"t\":").append(sp.getLong("t", 0))
         .append(",\"err\":").append(q(sp.getString("err", null))).append(",\"msg\":").append(q(sp.getString("msg", null)))
         .append(",\"perm\":").append(canInstall()).append(",\"auto\":").append(sp.getBoolean("auto", false))
         .append(",\"ok\":").append(sp.getBoolean("ok", false));
        if ("download".equals(st)) {
            long[] p = dlProgress();
            b.append(",\"done\":").append(p[0]).append(",\"total\":").append(p[1]).append(",\"dl\":").append(p[2]).append(",\"reason\":").append(p[3]);
        }
        if ("space".equals(sp.getString("err", null))) b.append(",\"need\":").append(sp.getLong("need", 0)).append(",\"free\":").append(sp.getLong("free", 0));
        return b.append('}').toString();
    }
    String prog(String st, long done, long total) { return "{\"state\":" + q(st) + ",\"pkg\":" + q(sp.getString("pkg", null)) + ",\"done\":" + done + ",\"total\":" + total + "}"; }
    void emitState() { emit(stateJson()); }
    void emit(String json) {
        final String js = "window.JDWAndroidEvent&&JDWAndroidEvent(" + json + ")";
        ui.post(new Runnable() { public void run() { try { web.evaluateJavascript(js, null); } catch (Throwable ignore) { } } });
    }

    // ---------- petits outils ----------
    static boolean okPkg(String p) {
        if (p == null || p.length() > 100 || !p.matches("[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)+")) return false;
        for (String ok : PKG_OK) if (p.startsWith(ok)) return true;
        return false;
    }
    static boolean okUrl(String u) {
        return u != null && u.length() < 2000 && u.indexOf("..") < 0 && u.indexOf('@') < 0 && (u.startsWith(MainActivity.HOME) || u.startsWith(REL));
    }
    static String hex(byte[] d) {
        StringBuilder b = new StringBuilder(d.length * 2);
        for (byte x : d) b.append(Character.forDigit((x >> 4) & 15, 16)).append(Character.forDigit(x & 15, 16));
        return b.toString();
    }
    static String q(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder(s.length() + 2).append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c < 0x20 || c == 0x2028 || c == 0x2029) b.append(String.format(Locale.ROOT, "\\u%04x", (int) c));
            else b.append(c);
        }
        return b.append('"').toString();
    }
}
