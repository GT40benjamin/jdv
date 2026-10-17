package android.database;
public interface Cursor extends java.io.Closeable {
  boolean moveToFirst(); int getColumnIndex(String c); int getInt(int i); long getLong(int i); String getString(int i); void close();
}
