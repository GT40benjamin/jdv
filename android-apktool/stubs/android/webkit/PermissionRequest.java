package android.webkit;
public abstract class PermissionRequest {
  public static final String RESOURCE_AUDIO_CAPTURE = "android.webkit.resource.AUDIO_CAPTURE";
  public static final String RESOURCE_VIDEO_CAPTURE = "android.webkit.resource.VIDEO_CAPTURE";
  public String[] getResources() { return null; }
  public void grant(String[] r) {}
  public void deny() {}
}
