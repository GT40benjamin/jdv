package fr.bornearcade.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Parcelable;
import android.provider.MediaStore;
import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

/** Borne d'arcade : ouvre la salle d'arcade en plein écran. Les jeux viennent du site et se mettent à jour tout seuls. */
public class MainActivity extends Activity {
    // Le site a déménagé sur elixirgamestudio.com le 26 oct. 2026 (GitHub renvoie l'ancienne adresse vers la nouvelle). L'appli accepte les
    // DEUX. 1.11 : ouvrait l'ancienne tant qu'elle n'avait pas vu la nouvelle répondre ; 1.12 : ouvre directement la nouvelle (la redirection
    // de GitHub passe par http://, refusé par l'appli : les adresses http:// du site sont reprises en https://).
    static final String HOME = "https://gt40benjamin.github.io/jdv/";   // ancienne adresse
    static final String NEUF = "https://elixirgamestudio.com/";          // nouvelle adresse
    static final String NEUF_WWW = "https://www.elixirgamestudio.com/";
    static final String BORNE = NEUF + "jouer/";   // la borne (la racine est la page d'accueil publique)
    static boolean site(String u) { return u != null && (u.startsWith(HOME) || u.startsWith(NEUF) || u.startsWith(NEUF_WWW)); }
    // « http://elixirgamestudio.com/… » (redirection de GitHub) → la même adresse en https://, sinon null
    static String https(String u) {
        if (u == null || !u.startsWith("http://")) return null;
        String h = "https://" + u.substring(7);
        return h.startsWith(NEUF) || h.startsWith(NEUF_WWW) ? h : null;
    }
    // REPRISE (1.11) : les réglages de la borne (profils, connexion, records de l'appareil…) sont rangés par le WebView sous l'ADRESSE du
    // site ; à la nouvelle adresse, ils seraient perdus. Tant que la nouvelle adresse ne les a pas repris, l'appli ouvre d'abord une page
    // vide « à l'ancienne adresse » (sans réseau : loadDataWithBaseURL) qui les lit et les donne à l'appli (BorneApp.garde), puis la borne ;
    // à la nouvelle adresse, la borne les demande une fois (BorneApp.reprise, tout en haut de la page, avant tout le reste). Rien ne quitte
    // le téléphone, rien dans une adresse.
    static final String CAPTURE_PAGE = "<!doctype html><meta charset=utf-8><body style='background:#0b141c'><script>"
        + "try{BorneApp.garde(JSON.stringify(localStorage))}catch(e){}location.replace('" + BORNE + "')</script>";
    static final int VERSION = __VC__;
    static final String VNAME = "__VN__";   // même numéro que le site (ex. 1.5)
    // sans réseau au tout premier lancement (rien de gardé) : jolie page plutôt que l'erreur d'Android ; Réessayer = recharger la borne
    static final String OFFLINE_PAGE = "<!doctype html><html lang=fr><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
        + "<style>html,body{margin:0;height:100%;background:#0b141c;color:#e9f0f3;font:16px/1.45 sans-serif}"
        + "main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box}"
        + ".orb{width:92px;height:92px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#22394a,#111d27);box-shadow:0 0 0 2px #22394a,0 0 40px rgba(255,166,48,.2);font-size:42px}"
        + "h1{font:800 26px/1.15 sans-serif;letter-spacing:.04em;margin:22px 0 8px;color:#ffd34d}p{margin:0 0 22px;color:#8aa0ae;max-width:320px}"
        + "a{display:inline-block;font:700 17px sans-serif;color:#0b141c;background:#ffa630;border-radius:14px;padding:14px 30px;text-decoration:none;box-shadow:0 6px 0 #b86d10}"
        + "a:active{transform:translateY(3px);box-shadow:0 3px 0 #b86d10}</style></head><body><main><div class=orb>📡</div><h1>Pas de connexion</h1>"
        + "<p>La borne a besoin d'internet la première fois. Vérifie le Wi-Fi ou les données mobiles, puis réessaie.</p>"
        + "<a id=r href='" + "https://elixirgamestudio.com/jouer/" + "'>Réessayer</a></main>"
        + "<script>addEventListener('online',function(){setTimeout(function(){location.href=document.getElementById('r').href},800)})</script></body></html>";
    static final int REQ_FILE = 42;
    static final int REQ_MIC = 43;
    PermissionRequest micReq;
    boolean micAudio, micVideo;   // 1.10 : ce que la page a demandé (micro et / ou caméra)
    WebView web;
    ValueCallback<Uri[]> fileCb;
    Uri cameraUri;
    Natif natif;   // 1.8 : applis natives (Pégase) téléchargées, installées et ouvertes depuis la borne (Natif.java)

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        final SharedPreferences prefs = getSharedPreferences("borne", 0);
        final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            public void uncaughtException(Thread t, Throwable e) {
                try { prefs.edit().putString("crash", trace(e)).commit(); } catch (Throwable ignore) { }
                if (prev != null) prev.uncaughtException(t, e);
            }
        });
        String last = null;
        try { last = prefs.getString("crash", null); } catch (Throwable ignore) { }
        if (last != null) {
            try { prefs.edit().remove("crash").commit(); } catch (Throwable ignore) { }
            showError("L'appli s'est arrêtée la dernière fois. Envoie une capture de cet écran à Claude :\n\n" + last);
            return;
        }
        try {
            start();
        } catch (Throwable e) {
            showError("Erreur au démarrage. Envoie une capture de cet écran à Claude :\n\n" + trace(e));
        }
    }

    static String trace(Throwable e) {
        StringBuilder sb = new StringBuilder();
        Throwable c = e;
        int depth = 0;
        while (c != null && depth < 4) {
            sb.append(c.toString()).append('\n');
            StackTraceElement[] st = c.getStackTrace();
            for (int i = 0; i < st.length && i < 8; i++) sb.append("  at ").append(st[i].toString()).append('\n');
            c = c.getCause();
            depth++;
        }
        return sb.toString();
    }

    void showError(String msg) {
        TextView tv = new TextView(this);
        tv.setText(msg + "\n\n(Touchez l'écran pour relancer.)");
        tv.setTextColor(0xffe9f0f3);
        tv.setBackgroundColor(0xff0b141c);
        tv.setTextSize(13f);
        tv.setPadding(40, 80, 40, 40);
        tv.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) { try { start(); } catch (Throwable e) { showError("Erreur :\n\n" + trace(e)); } }
        });
        setContentView(tv);
    }

    void start() {
        try { getWindow().addFlags(0x80); } catch (Throwable ignore) { }
        web = new WebView(this);
        web.setBackgroundColor(0xff0b141c);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " BorneArcade/" + VERSION + " BorneArcadeV/" + VNAME);
        web.addJavascriptInterface(new Bridge(), "BorneApp");
        natif = new Natif(this, web);
        web.addJavascriptInterface(natif.bridge(), "JDWAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (site(url) && url.indexOf("/telecharger") < 0) return false;   // 1.11 : aussi la nouvelle adresse (sinon la redirection partait dans Chrome)
                String h = https(url);
                if (h != null && h.indexOf("/telecharger") < 0) { try { v.loadUrl(h); } catch (Throwable ignore) { } return true; }   // 1.12
                try { startActivity(new Intent("android.intent.action.VIEW", Uri.parse(url))); } catch (Throwable ignore) { }
                return true;
            }
            // La borne ne vient pas (pas de réseau ET pas encore gardée par son service worker, jouer/sw.js) : page « Pas de connexion »
            // avec un bouton Réessayer, plutôt que la page d'erreur d'Android. (Appelée seulement pour la page principale.)
            @Override
            public void onReceivedError(WebView v, int code, String desc, String failingUrl) {
                try { v.loadDataWithBaseURL(null, OFFLINE_PAGE, "text/html", "utf-8", null); } catch (Throwable ignore) { }
            }
            // la nouvelle adresse a répondu : les prochaines fois, on l'ouvre directement (plus de détour par l'ancienne)
            @Override
            public void onPageFinished(WebView v, String url) {
                if (url != null && (url.startsWith(NEUF) || url.startsWith(NEUF_WWW)) && !prefs().getBoolean("neuf", false)) {
                    try { prefs().edit().putBoolean("neuf", true).apply(); } catch (Throwable ignore) { }
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, WebChromeClient.FileChooserParams p) {
                String[] t = null; try { t = p.getAcceptTypes(); } catch (Throwable ignore) { }
                boolean audio = false; if (t != null) for (String s : t) if (s != null && s.startsWith("audio")) audio = true;
                return audio ? openAudioChooser(cb) : openChooser(cb);
            }
            // micro (cri, 🎤 du hub, appels) et, depuis la 1.10, caméra de face (appels vidéo du hub de Pégase) : Android demande ce qui manque
            @Override
            public void onPermissionRequest(final PermissionRequest r) {
                boolean audio = false, video = false;
                try {
                    for (String s : r.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(s)) audio = true;
                        else if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(s)) video = true;
                    }
                } catch (Throwable ignore) { }
                if (!audio && !video) { try { r.deny(); } catch (Throwable ignore) { } return; }
                try {
                    java.util.ArrayList<String> manque = new java.util.ArrayList<String>();
                    if (audio && checkSelfPermission("android.permission.RECORD_AUDIO") != 0) manque.add("android.permission.RECORD_AUDIO");
                    if (video && checkSelfPermission("android.permission.CAMERA") != 0) manque.add("android.permission.CAMERA");
                    if (manque.isEmpty()) { mediaGrant(r, audio, video, true, true); return; }
                    if (micReq != null) { try { micReq.deny(); } catch (Throwable ignore) { } }
                    micReq = r; micAudio = audio; micVideo = video; requestPermissions(manque.toArray(new String[0]), REQ_MIC);
                } catch (Throwable e) { try { r.deny(); } catch (Throwable ignore) { } }
            }
        });
        if (!prefs().getBoolean("repris", false)) {
            try { web.loadDataWithBaseURL(HOME + "jouer/", CAPTURE_PAGE, "text/html", "utf-8", null); } catch (Throwable e) { web.loadUrl(borne()); }
        } else web.loadUrl(borne());
        immersive();
        fitKeyboard();
    }

    // Plein écran (immersif) + clavier : Android ne réduit pas la page, il la pousse vers le haut.
    // On redimensionne nous-mêmes le WebView pour qu'il s'arrête juste au-dessus du clavier.
    void fitKeyboard() {
        try {
            final View root = getWindow().getDecorView();
            root.getViewTreeObserver().addOnGlobalLayoutListener(new ViewTreeObserver.OnGlobalLayoutListener() {
                int last = -2;
                public void onGlobalLayout() {
                    try {
                        Rect r = new Rect();
                        root.getWindowVisibleDisplayFrame(r);
                        int full = root.getHeight();
                        if (full <= 0) return;
                        int h = (full - r.bottom > full / 6) ? r.bottom : ViewGroup.LayoutParams.MATCH_PARENT;
                        if (h == last) return;
                        last = h;
                        ViewGroup.LayoutParams lp = web.getLayoutParams();
                        if (lp == null) return;
                        lp.height = h;
                        web.setLayoutParams(lp);
                    } catch (Throwable ignore) { }
                }
            });
        } catch (Throwable ignore) { }
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req == Voix.REQ_LISTEN) { if (natif != null) natif.voix.onPermission(res != null && res.length > 0 && res[0] == 0); return; }   // 1.9 : « oui / non » à voix haute
        if (req != REQ_MIC || micReq == null) return;
        try {
            boolean audioOk = checkSelfPermission("android.permission.RECORD_AUDIO") == 0, videoOk = checkSelfPermission("android.permission.CAMERA") == 0;
            mediaGrant(micReq, micAudio, micVideo, audioOk, videoOk);
        } catch (Throwable ignore) { try { micReq.deny(); } catch (Throwable e) { } }
        micReq = null;
    }
    // ce que la page a demandé ET qu'Android permet ; rien → refus (la page réessaie alors avec le micro seul : l'appel garde l'avatar)
    static void mediaGrant(PermissionRequest r, boolean audio, boolean video, boolean audioOk, boolean videoOk) {
        java.util.ArrayList<String> ok = new java.util.ArrayList<String>();
        if (audio && audioOk) ok.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
        if (video && videoOk) ok.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
        try { if (ok.isEmpty() || (audio && !audioOk) || (video && !videoOk)) r.deny(); else r.grant(ok.toArray(new String[0])); } catch (Throwable ignore) { }
    }

    boolean openAudioChooser(ValueCallback<Uri[]> cb) {
        if (fileCb != null) { try { fileCb.onReceiveValue(null); } catch (Throwable ignore) { } }
        fileCb = cb; cameraUri = null;
        Intent pick = new Intent("android.intent.action.GET_CONTENT");
        pick.addCategory("android.intent.category.OPENABLE");
        pick.setType("audio/*");
        Intent chooser = Intent.createChooser(pick, "Ton cri");
        try { chooser.putExtra("android.intent.extra.INITIAL_INTENTS", new Parcelable[]{new Intent("android.provider.MediaStore.RECORD_SOUND")}); } catch (Throwable ignore) { }
        try { startActivityForResult(chooser, REQ_FILE); return true; }
        catch (Throwable e) { fileCb = null; return false; }
    }

    boolean openChooser(ValueCallback<Uri[]> cb) {
        if (fileCb != null) { try { fileCb.onReceiveValue(null); } catch (Throwable ignore) { } }
        fileCb = cb;
        Intent pick = new Intent("android.intent.action.GET_CONTENT");
        pick.addCategory("android.intent.category.OPENABLE");
        pick.setType("image/*");
        Intent chooser = Intent.createChooser(pick, "Ta photo");
        cameraUri = null;
        try {
            ContentValues cv = new ContentValues();
            cv.put("mime_type", "image/jpeg");
            cv.put("_display_name", "selfie_borne_" + System.currentTimeMillis() + ".jpg");
            cameraUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
            if (cameraUri != null) {
                Intent cam = new Intent("android.media.action.IMAGE_CAPTURE");
                cam.putExtra("output", cameraUri);
                cam.putExtra("android.intent.extras.CAMERA_FACING", 1);
                cam.addFlags(3);
                chooser.putExtra("android.intent.extra.INITIAL_INTENTS", new Parcelable[]{cam});
            }
        } catch (Throwable e) { cameraUri = null; }
        try { startActivityForResult(chooser, REQ_FILE); return true; }
        catch (Throwable e) { fileCb = null; return false; }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_FILE || fileCb == null) return;
        Uri[] out = null;
        if (res == -1) {
            Uri d = data != null ? data.getData() : null;
            if (d != null) out = new Uri[]{d};
            else if (cameraUri != null) out = new Uri[]{cameraUri};
        }
        if (out == null && cameraUri != null) {
            try { getContentResolver().delete(cameraUri, null, null); } catch (Throwable ignore) { }
        }
        try { fileCb.onReceiveValue(out); } catch (Throwable ignore) { }
        fileCb = null;
    }

    void immersive() {
        try { getWindow().getDecorView().setSystemUiVisibility(0x1706); } catch (Throwable ignore) { }
    }

    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            // retour dans l'appli : le site rafraîchit tout (scores, chat, joueurs, nouvelle version)
            try { web.evaluateJavascript("window.JDW_RESUME && JDW_RESUME()", null); } catch (Throwable ignore) { }
        }
        if (natif != null) { try { natif.onResume(); } catch (Throwable ignore) { } }   // téléchargement / installation de Pégase en cours
        immersive();
    }
    @Override protected void onPause() { super.onPause(); if (natif != null) natif.onPause(); if (web != null) web.onPause(); }
    @Override protected void onDestroy() { if (natif != null) { try { natif.onDestroy(); } catch (Throwable ignore) { } if (Natif.live == natif) Natif.live = null; } super.onDestroy(); }

    @Override
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("(window.JDW_BACK ? JDW_BACK() : false)", new ValueCallback<String>() {
            public void onReceiveValue(String v) { if (!"true".equals(v)) moveTaskToBack(true); }
        });
    }

    SharedPreferences prefs() { return getSharedPreferences("borne", 0); }
    String borne() { return BORNE; }
    static String origin(String u) { int i = u.indexOf('/', u.indexOf("://") + 3); return i < 0 ? u : u.substring(0, i); }   // « https://hôte[:port] »

    public class Bridge {
        @JavascriptInterface public int version() { return VERSION; }
        // REPRISE (1.11) : la page vide à l'ancienne adresse donne ses réglages (JSON de son localStorage), gardés sur le téléphone
        @JavascriptInterface public void garde(String json) {
            try {
                if (json == null || json.length() < 3 || json.length() > 12000000 || prefs().getBoolean("repris", false)) return;
                getSharedPreferences("reprise", 0).edit().putString("ls", json).commit();
            } catch (Throwable ignore) { }
        }
        // … et la borne À LA NOUVELLE ADRESSE les reprend, une seule fois (puis ils sont effacés de l'appli)
        @JavascriptInterface public String reprise(String pageOrigin) {
            try {
                if (pageOrigin == null || pageOrigin.equals(origin(HOME))) return null;
                SharedPreferences r = getSharedPreferences("reprise", 0);
                String json = r.getString("ls", null);
                r.edit().remove("ls").commit();
                prefs().edit().putBoolean("repris", true).commit();
                return json;
            } catch (Throwable e) { return null; }
        }
    }
}
