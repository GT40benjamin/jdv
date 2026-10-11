package fr.bornearcade.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Parcelable;
import android.provider.MediaStore;
import android.view.View;
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
    static final String HOME = "https://gt40benjamin.github.io/jdv/";
    static final int VERSION = __VC__;
    static final int REQ_FILE = 42;
    static final int REQ_MIC = 43;
    PermissionRequest micReq;
    WebView web;
    ValueCallback<Uri[]> fileCb;
    Uri cameraUri;

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
        s.setUserAgentString(s.getUserAgentString() + " BorneArcade/" + VERSION);
        web.addJavascriptInterface(new Bridge(), "BorneApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (url.startsWith(HOME) && url.indexOf("/telecharger") < 0) return false;
                try { startActivity(new Intent("android.intent.action.VIEW", Uri.parse(url))); } catch (Throwable ignore) { }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, WebChromeClient.FileChooserParams p) {
                String[] t = null; try { t = p.getAcceptTypes(); } catch (Throwable ignore) { }
                boolean audio = false; if (t != null) for (String s : t) if (s != null && s.startsWith("audio")) audio = true;
                return audio ? openAudioChooser(cb) : openChooser(cb);
            }
            // micro pour enregistrer son cri dans le site
            @Override
            public void onPermissionRequest(final PermissionRequest r) {
                boolean audio = false;
                try { for (String s : r.getResources()) if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(s)) audio = true; } catch (Throwable ignore) { }
                if (!audio) { try { r.deny(); } catch (Throwable ignore) { } return; }
                try {
                    if (checkSelfPermission("android.permission.RECORD_AUDIO") == 0) { r.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE}); return; }
                    micReq = r; requestPermissions(new String[]{"android.permission.RECORD_AUDIO"}, REQ_MIC);
                } catch (Throwable e) { try { r.deny(); } catch (Throwable ignore) { } }
            }
        });
        web.loadUrl(HOME);
        immersive();
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req != REQ_MIC || micReq == null) return;
        try {
            if (res != null && res.length > 0 && res[0] == 0) micReq.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else micReq.deny();
        } catch (Throwable ignore) { }
        micReq = null;
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
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); immersive(); }
    @Override protected void onPause() { super.onPause(); if (web != null) web.onPause(); }

    @Override
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("(window.JDW_BACK ? JDW_BACK() : false)", new ValueCallback<String>() {
            public void onReceiveValue(String v) { if (!"true".equals(v)) moveTaskToBack(true); }
        });
    }

    public static class Bridge {
        @JavascriptInterface public String code() { return "__CODE__"; }
        @JavascriptInterface public int version() { return VERSION; }
    }
}
