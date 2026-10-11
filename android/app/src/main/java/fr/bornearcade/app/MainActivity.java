package fr.bornearcade.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Borne d'arcade : ouvre la salle d'arcade en plein écran. Les jeux se mettent à jour tout seuls (ils viennent du site). */
public class MainActivity extends Activity {
    static final String HOME = "https://gt40benjamin.github.io/jdv/";
    static final String CODE = "__CODE__";
    static final int REQ_FILE = 42;
    WebView web;
    ValueCallback<Uri[]> fileCb;
    Uri cameraUri;
    int versionCode = 0;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        try { versionCode = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode; } catch (Exception e) { versionCode = 0; }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0b141c"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " BorneArcade/" + versionCode);
        web.addJavascriptInterface(new Bridge(), "BorneApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String url = r.getUrl().toString();
                if (url.startsWith(HOME) && !url.contains("/telecharger")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl())); } catch (Exception e) { /* rien */ }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("image/*");
                Intent chooser = Intent.createChooser(pick, "Ta photo");
                cameraUri = null;
                try {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Images.Media.DISPLAY_NAME, "selfie_" + System.currentTimeMillis() + ".jpg");
                    cv.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                    cameraUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
                    if (cameraUri != null) {
                        Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        cam.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                        cam.putExtra("android.intent.extras.CAMERA_FACING", 1);
                        cam.putExtra("android.intent.extra.USE_FRONT_CAMERA", true);
                        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cam});
                    }
                } catch (Exception e) { cameraUri = null; }
                try { startActivityForResult(chooser, REQ_FILE); }
                catch (Exception e) { fileCb = null; return false; }
                return true;
            }
        });

        web.setDownloadListener((url, ua, cd, mime, len) -> {
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) { /* rien */ }
        });

        if (saved != null) web.restoreState(saved); else web.loadUrl(HOME);
        immersive();
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_FILE || fileCb == null) return;
        Uri[] out = null;
        if (res == RESULT_OK) {
            if (data != null && data.getData() != null) out = new Uri[]{data.getData()};
            else if (cameraUri != null) out = new Uri[]{cameraUri};
        }
        if (out == null && cameraUri != null) {
            try { getContentResolver().delete(cameraUri, null, null); } catch (Exception e) { /* rien */ }
        }
        fileCb.onReceiveValue(out);
        fileCb = null;
    }

    void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.JDW_BACK ? JDW_BACK() : false)", v -> {
            if (!"true".equals(v)) moveTaskToBack(true);
        });
    }

    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); immersive(); }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    class Bridge {
        @JavascriptInterface public String code() { return CODE; }
        @JavascriptInterface public int version() { return versionCode; }
    }
}
