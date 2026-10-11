package android.view;
public abstract class ViewGroup extends View {
  public ViewGroup(android.content.Context c) { super(c); }
  public static class LayoutParams { public static final int MATCH_PARENT = -1; public int width; public int height; public LayoutParams(int w, int h) {} }
}
