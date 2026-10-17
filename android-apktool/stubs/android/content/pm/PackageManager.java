package android.content.pm;
public abstract class PackageManager {
  public static class NameNotFoundException extends Exception { public NameNotFoundException() {} }
  public abstract PackageInfo getPackageInfo(String p, int flags) throws NameNotFoundException;
  public abstract android.content.Intent getLaunchIntentForPackage(String p);
  public abstract PackageInstaller getPackageInstaller();
  public abstract boolean canRequestPackageInstalls();
  public abstract String getInstallerPackageName(String p);
  public PackageInfo getPackageArchiveInfo(String path, int flags) { return null; }
}
