package android.app;
public class DownloadManager {
  public long enqueue(Request r) { return 0; } public android.database.Cursor query(Query q) { return null; } public int remove(long... ids) { return 0; }
  public static class Request {
    public Request(android.net.Uri u) {}
    public Request setTitle(CharSequence t) { return this; } public Request setDescription(CharSequence d) { return this; }
    public Request setNotificationVisibility(int v) { return this; } public Request setMimeType(String m) { return this; }
    public Request setDestinationInExternalFilesDir(android.content.Context c, String type, String sub) { return this; }
    public Request setVisibleInDownloadsUi(boolean b) { return this; } public Request setAllowedOverMetered(boolean b) { return this; }
    public Request setAllowedOverRoaming(boolean b) { return this; }
  }
  public static class Query { public Query() {} public Query setFilterById(long... ids) { return this; } }
}
