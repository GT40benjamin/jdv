package android.speech;
public class SpeechRecognizer {
  public static final String RESULTS_RECOGNITION = "results_recognition";
  public static final int ERROR_NETWORK_TIMEOUT = 1; public static final int ERROR_NETWORK = 2; public static final int ERROR_SPEECH_TIMEOUT = 6;
  public static final int ERROR_NO_MATCH = 7; public static final int ERROR_RECOGNIZER_BUSY = 8; public static final int ERROR_INSUFFICIENT_PERMISSIONS = 9;
  public static boolean isRecognitionAvailable(android.content.Context c) { return false; }
  public static boolean isOnDeviceRecognitionAvailable(android.content.Context c) { return false; }
  public static SpeechRecognizer createSpeechRecognizer(android.content.Context c) { return null; }
  public static SpeechRecognizer createOnDeviceSpeechRecognizer(android.content.Context c) { return null; }
  public void setRecognitionListener(RecognitionListener l) {}
  public void startListening(android.content.Intent i) {} public void stopListening() {} public void cancel() {} public void destroy() {}
}
