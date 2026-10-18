package android.speech;
public interface RecognitionListener {
  void onReadyForSpeech(android.os.Bundle p); void onBeginningOfSpeech(); void onRmsChanged(float db); void onBufferReceived(byte[] b);
  void onEndOfSpeech(); void onError(int e); void onResults(android.os.Bundle r); void onPartialResults(android.os.Bundle r); void onEvent(int t, android.os.Bundle p);
}
