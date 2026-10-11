package android.webkit;
public abstract class WebSettings {
  public abstract void setJavaScriptEnabled(boolean f); public abstract void setDomStorageEnabled(boolean f); public abstract void setDatabaseEnabled(boolean f);
  public abstract void setMediaPlaybackRequiresUserGesture(boolean f); public abstract String getUserAgentString(); public abstract void setUserAgentString(String s);
}
