package android.webkit;
public class WebView extends android.view.View {
  public WebView(android.content.Context c) { super(c); }
  public WebSettings getSettings() { return null; } public void addJavascriptInterface(Object o, String n) {}
  public void setWebViewClient(WebViewClient c) {} public void setWebChromeClient(WebChromeClient c) {}
  public void loadUrl(String u) {} public void evaluateJavascript(String s, ValueCallback<String> cb) {}
  public void onPause() {} public void onResume() {} public void reload() {}
  public void loadDataWithBaseURL(String base, String data, String mime, String enc, String hist) {}
}
