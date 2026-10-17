package android.content.pm;
public class PackageInstaller {
  public int createSession(SessionParams p) throws java.io.IOException { return 0; }
  public Session openSession(int id) throws java.io.IOException { return null; }
  public void abandonSession(int id) {}
  public java.util.List<SessionInfo> getMySessions() { return null; }
  public static class Session implements java.io.Closeable {
    public java.io.OutputStream openWrite(String name, long off, long len) throws java.io.IOException { return null; }
    public void fsync(java.io.OutputStream o) throws java.io.IOException {}
    public void commit(android.content.IntentSender s) {} public void close() {} public void abandon() {}
  }
  public static class SessionParams implements android.os.Parcelable {
    public SessionParams(int mode) {}
    public void setAppPackageName(String p) {} public void setSize(long s) {} public void setInstallReason(int r) {} public void setRequireUserAction(int a) {}
  }
  public static class SessionInfo implements android.os.Parcelable { public int getSessionId() { return 0; } }
}
