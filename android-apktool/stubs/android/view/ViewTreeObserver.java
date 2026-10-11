package android.view;
public final class ViewTreeObserver {
  public interface OnGlobalLayoutListener { void onGlobalLayout(); }
  public void addOnGlobalLayoutListener(OnGlobalLayoutListener l) {}
}
