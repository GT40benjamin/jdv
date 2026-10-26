package android.app;
public class Activity extends android.content.Context {
  protected void onCreate(android.os.Bundle b) {} protected void onResume() {} protected void onPause() {}
  protected void onActivityResult(int r, int c, android.content.Intent d) {}
  public void onWindowFocusChanged(boolean f) {} public void onBackPressed() {}
  public android.view.Window getWindow() { return null; } public void setContentView(android.view.View v) {}
  public void startActivityForResult(android.content.Intent i, int r) {} public boolean moveTaskToBack(boolean b) { return false; }
  public void finish() {} public android.content.Intent getIntent() { return null; }
  public void requestPermissions(String[] p, int r) {}
  public void onRequestPermissionsResult(int r, String[] p, int[] g) {}
  public void runOnUiThread(Runnable r) {}
  protected void onNewIntent(android.content.Intent i) {} protected void onDestroy() {}
}
