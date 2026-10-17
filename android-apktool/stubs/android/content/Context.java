package android.content;
public abstract class Context {
  public android.content.ContentResolver getContentResolver() { throw new RuntimeException(); }
  public android.content.SharedPreferences getSharedPreferences(String n, int m) { throw new RuntimeException(); }
  public void startActivity(Intent i) { throw new RuntimeException(); }
  public int checkSelfPermission(String p) { return -1; }
  public android.content.pm.PackageManager getPackageManager() { throw new RuntimeException(); }
  public Object getSystemService(String n) { throw new RuntimeException(); }
  public java.io.File getExternalFilesDir(String t) { throw new RuntimeException(); }
  public String getPackageName() { throw new RuntimeException(); }
}
