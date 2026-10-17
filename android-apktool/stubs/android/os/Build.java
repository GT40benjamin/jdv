package android.os;
// valeurs lues à l'exécution sur le téléphone : surtout PAS de constantes (javac les recopierait dans le code)
public class Build {
  public static final String MODEL; public static final String MANUFACTURER; public static final String[] SUPPORTED_ABIS;
  static { MODEL = null; MANUFACTURER = null; SUPPORTED_ABIS = null; }
  public static class VERSION { public static final int SDK_INT; static { SDK_INT = Integer.parseInt("0"); } }
}
