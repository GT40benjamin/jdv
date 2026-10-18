package android.content;
public class Intent implements android.os.Parcelable {
  public Intent() {} public Intent(String a) {} public Intent(String a, android.net.Uri u) {} public Intent(Context c, Class<?> k) {}
  public Intent addCategory(String c) { return this; } public Intent setType(String t) { return this; }
  public Intent putExtra(String n, android.os.Parcelable v) { return this; } public Intent putExtra(String n, int v) { return this; }
  public Intent putExtra(String n, String v) { return this; }
  public Intent putExtra(String n, boolean v) { return this; }
  public Intent putExtra(String n, android.os.Parcelable[] v) { return this; } public Intent addFlags(int f) { return this; }
  public android.net.Uri getData() { return null; }
  public Intent setData(android.net.Uri u) { return this; } public Intent setAction(String a) { return this; } public Intent setPackage(String p) { return this; }
  public String getAction() { return null; }
  public int getIntExtra(String n, int d) { return d; } public String getStringExtra(String n) { return null; }
  public <T extends android.os.Parcelable> T getParcelableExtra(String n) { return null; }
  public static Intent createChooser(Intent t, CharSequence title) { return null; }
}
