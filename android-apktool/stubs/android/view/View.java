package android.view;
public class View {
  public View(android.content.Context c) {}
  public void setSystemUiVisibility(int v) {} public void setBackgroundColor(int c) {} public void setPadding(int a, int b, int c, int d) {}
  public void setOnClickListener(OnClickListener l) {} public interface OnClickListener { void onClick(View v); }
  public ViewTreeObserver getViewTreeObserver() { return null; }
  public void getWindowVisibleDisplayFrame(android.graphics.Rect r) {}
  public int getHeight() { return 0; }
  public ViewGroup.LayoutParams getLayoutParams() { return null; }
  public void setLayoutParams(ViewGroup.LayoutParams p) {}
}
