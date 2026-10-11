package android.content;
public class Intent implements android.os.Parcelable {
  public Intent(String a) {} public Intent(String a, android.net.Uri u) {}
  public Intent addCategory(String c) { return this; } public Intent setType(String t) { return this; }
  public Intent putExtra(String n, android.os.Parcelable v) { return this; } public Intent putExtra(String n, int v) { return this; }
  public Intent putExtra(String n, android.os.Parcelable[] v) { return this; } public Intent addFlags(int f) { return this; }
  public android.net.Uri getData() { return null; }
  public static Intent createChooser(Intent t, CharSequence title) { return null; }
}
