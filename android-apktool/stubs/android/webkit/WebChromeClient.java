package android.webkit;
public class WebChromeClient {
  public WebChromeClient() {}
  public boolean onShowFileChooser(WebView w, ValueCallback<android.net.Uri[]> cb, FileChooserParams p) { return false; }
  public void onPermissionRequest(PermissionRequest r) {}
  public abstract static class FileChooserParams { public String[] getAcceptTypes() { return null; } }
}
