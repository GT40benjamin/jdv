package fr.bornearcade.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import java.util.ArrayList;
import java.util.Locale;

/**
 * Appli 1.9 : la VOIX de l'avatar (hub de Pégase), tout sur le téléphone.
 *  - speak(texte) : TextToSpeech d'Android en français ; chaque mot prononcé est annoncé à la page (onRangeStart, Android 8+) →
 *    window.JDWAndroidEvent({state:'tts', ev:'word', id, start, end}) : la bouche de l'avatar suit le texte mot à mot.
 *    Aussi ev:'start' | 'done' | 'stop' | 'error' (err) et ev:'init' (ok, lang).
 *  - listen() : SpeechRecognizer d'Android (fr-FR) pour répondre « oui » / « non » : reconnaissance SUR L'APPAREIL quand Android l'a
 *    (Android 12+ : createOnDeviceSpeechRecognizer), sinon EXTRA_PREFER_OFFLINE (Android choisit ; mode annoncé à la page).
 *    → {state:'stt', ev:'ready'|'begin'|'end'|'partial'|'result'|'error', mode:'ondevice'|'offline-pref', words:[…], answer:'oui'|'non'|''}.
 *    Rien n'est enregistré ; le micro (RECORD_AUDIO) est demandé par l'appli la 1re fois.
 * Tout ce qui touche TextToSpeech / SpeechRecognizer se fait sur le fil principal.
 */
final class Voix {
    static final int REQ_LISTEN = 44;
    final MainActivity act;
    final Natif nat;
    TextToSpeech tts;
    int ttsState;                 // 0 rien, 1 démarrage, 2 prêt, -1 impossible
    String ttsLang = "";
    String pendingText, pendingId;
    int seq;
    SpeechRecognizer rec;
    String recMode = "";
    boolean listening, wantListen, noDevice;   // noDevice : le français n'est pas installé « sur l'appareil » → reconnaissance d'Android ordinaire

    Voix(MainActivity a, Natif n) { act = a; nat = n; }

    // ---------- parler ----------
    void ttsInit() {
        if (ttsState != 0) return;
        ttsState = 1;
        try {
            tts = new TextToSpeech(act, new TextToSpeech.OnInitListener() {
                public void onInit(int status) {
                    if (status != TextToSpeech.SUCCESS || tts == null) { ttsState = -1; nat.emit("{\"state\":\"tts\",\"ev\":\"init\",\"ok\":false}"); return; }
                    int r = tts.setLanguage(Locale.FRANCE);
                    if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) r = tts.setLanguage(Locale.FRENCH);
                    boolean fr = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
                    ttsLang = fr ? "fr" : "";
                    ttsState = fr ? 2 : -1;
                    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override public void onStart(String id) { nat.emit("{\"state\":\"tts\",\"ev\":\"start\",\"id\":" + Natif.q(id) + "}"); }
                        @Override public void onDone(String id) { nat.emit("{\"state\":\"tts\",\"ev\":\"done\",\"id\":" + Natif.q(id) + "}"); }
                        @Override public void onError(String id) { nat.emit("{\"state\":\"tts\",\"ev\":\"error\",\"id\":" + Natif.q(id) + ",\"err\":-1}"); }
                        @Override public void onError(String id, int code) { nat.emit("{\"state\":\"tts\",\"ev\":\"error\",\"id\":" + Natif.q(id) + ",\"err\":" + code + "}"); }
                        @Override public void onStop(String id, boolean interrupted) { nat.emit("{\"state\":\"tts\",\"ev\":\"stop\",\"id\":" + Natif.q(id) + "}"); }
                        // Android 8+ : le moteur annonce le passage de chaque mot (positions dans le texte, en caractères UTF-16)
                        @Override public void onRangeStart(String id, int start, int end, int frame) {
                            nat.emit("{\"state\":\"tts\",\"ev\":\"word\",\"id\":" + Natif.q(id) + ",\"start\":" + start + ",\"end\":" + end + "}");
                        }
                    });
                    nat.emit("{\"state\":\"tts\",\"ev\":\"init\",\"ok\":" + fr + ",\"lang\":" + Natif.q(ttsLang) + "}");
                    if (fr && pendingText != null) { String t = pendingText, i = pendingId; pendingText = null; pendingId = null; say(t, i); }
                }
            });
        } catch (Throwable e) { ttsState = -1; tts = null; }
    }
    /** Rend le numéro de la phrase (les évènements le portent), "" si impossible (pas de voix française). */
    String speak(String text) {
        if (text == null) return "";
        text = text.trim();
        if (text.isEmpty() || text.length() > 600) return "";
        if (ttsState == -1) return "";
        final String id = "jdw" + (++seq), t = text;
        nat.ui.post(new Runnable() { public void run() {
            if (ttsState == 2) say(t, id);
            else { pendingText = t; pendingId = id; ttsInit(); }
        } });
        return id;
    }
    void say(String text, String id) {
        try { if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id) != TextToSpeech.SUCCESS) nat.emit("{\"state\":\"tts\",\"ev\":\"error\",\"id\":" + Natif.q(id) + ",\"err\":-1}"); }
        catch (Throwable e) { nat.emit("{\"state\":\"tts\",\"ev\":\"error\",\"id\":" + Natif.q(id) + ",\"err\":-1}"); }
    }
    void stopSpeak() {
        nat.ui.post(new Runnable() { public void run() { pendingText = null; try { if (tts != null) tts.stop(); } catch (Throwable ignore) { } } });
    }

    // ---------- écouter (oui / non) ----------
    boolean canListen() {
        try {
            if (Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(act)) return true;
            return SpeechRecognizer.isRecognitionAvailable(act);
        } catch (Throwable e) { return false; }
    }
    /** "ok" (le micro s'ouvre, ou l'appli demande l'autorisation d'abord), "busy", "none" (pas de reconnaissance sur ce téléphone). */
    String listen() {
        if (!canListen()) return "none";
        if (listening) return "busy";
        nat.ui.post(new Runnable() { public void run() {
            if (act.checkSelfPermission("android.permission.RECORD_AUDIO") != 0) {
                wantListen = true;
                try { act.requestPermissions(new String[]{"android.permission.RECORD_AUDIO"}, REQ_LISTEN); }
                catch (Throwable e) { wantListen = false; nat.emit("{\"state\":\"stt\",\"ev\":\"error\",\"err\":\"perm\"}"); }
                return;
            }
            start();
        } });
        return "ok";
    }
    /** Réponse à la question « micro » de l'appli (MainActivity.onRequestPermissionsResult). */
    void onPermission(boolean granted) {
        if (!wantListen) return;
        wantListen = false;
        if (granted) start(); else nat.emit("{\"state\":\"stt\",\"ev\":\"error\",\"err\":\"perm\"}");
    }
    void start() {
        try {
            if (rec == null) {
                boolean dev = false;
                try { dev = !noDevice && Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(act); } catch (Throwable ignore) { }
                rec = dev ? SpeechRecognizer.createOnDeviceSpeechRecognizer(act) : SpeechRecognizer.createSpeechRecognizer(act);
                recMode = dev ? "ondevice" : "offline-pref";
                rec.setRecognitionListener(new Ecoute());
            }
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR");
            i.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
            i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, act.getPackageName());
            listening = true;
            rec.startListening(i);
        } catch (Throwable e) {
            listening = false;
            nat.emit("{\"state\":\"stt\",\"ev\":\"error\",\"err\":\"start\",\"msg\":" + Natif.q(String.valueOf(e)) + "}");
        }
    }
    void stopListen() {
        nat.ui.post(new Runnable() { public void run() { wantListen = false; try { if (rec != null && listening) rec.stopListening(); } catch (Throwable ignore) { } } });
    }
    void pause() {   // la borne passe derrière : on coupe le micro et la voix
        wantListen = false;
        try { if (rec != null && listening) rec.cancel(); } catch (Throwable ignore) { }
        listening = false;
        try { if (tts != null) tts.stop(); } catch (Throwable ignore) { }
    }
    void destroy() {
        pause();
        try { if (rec != null) rec.destroy(); } catch (Throwable ignore) { }
        rec = null;
        try { if (tts != null) tts.shutdown(); } catch (Throwable ignore) { }
        tts = null; ttsState = 0;
    }

    /** « oui » / « non » dans ce qui a été entendu (la page a aussi les mots). */
    static String answer(ArrayList<String> l) {
        if (l == null) return "";
        for (String s : l) {
            if (s == null) continue;
            String t = " " + s.toLowerCase(Locale.FRENCH).replaceAll("[^a-zàâçéèêëîïôûùüÿœ' ]", " ").replaceAll("\\s+", " ").trim() + " ";
            boolean no = t.matches(".* (non|nan|nope|pas du tout|surtout pas|jamais|no) .*");
            boolean yes = t.matches(".* (oui|ouais|ouai|ok|okay|d'accord|bien sûr|carrément|volontiers|exactement|yes|ouep|yep) .*");
            if (yes && !no) return "oui";
            if (no && !yes) return "non";
        }
        return "";
    }
    static String words(ArrayList<String> l) {
        StringBuilder b = new StringBuilder("[");
        if (l != null) for (int i = 0; i < l.size() && i < 5; i++) b.append(i > 0 ? "," : "").append(Natif.q(l.get(i)));
        return b.append(']').toString();
    }

    final class Ecoute implements RecognitionListener {
        public void onReadyForSpeech(Bundle p) { nat.emit("{\"state\":\"stt\",\"ev\":\"ready\",\"mode\":" + Natif.q(recMode) + "}"); }
        public void onBeginningOfSpeech() { nat.emit("{\"state\":\"stt\",\"ev\":\"begin\"}"); }
        public void onRmsChanged(float db) { }
        public void onBufferReceived(byte[] b) { }
        public void onEndOfSpeech() { nat.emit("{\"state\":\"stt\",\"ev\":\"end\"}"); }
        public void onError(int code) {
            listening = false;
            // 12 / 13 = ERROR_LANGUAGE_NOT_SUPPORTED / UNAVAILABLE (Android 12+) : pas de français « sur l'appareil » → on réessaie une fois
            // avec la reconnaissance ordinaire d'Android (EXTRA_PREFER_OFFLINE : hors ligne si le pack français est là)
            if ("ondevice".equals(recMode) && (code == 12 || code == 13) && !noDevice) {
                noDevice = true;
                try { if (rec != null) rec.destroy(); } catch (Throwable ignore) { }
                rec = null; start(); return;
            }
            String e = code == SpeechRecognizer.ERROR_NO_MATCH ? "nomatch" : code == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "silence"
                : code == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ? "perm" : code == SpeechRecognizer.ERROR_NETWORK || code == SpeechRecognizer.ERROR_NETWORK_TIMEOUT ? "net"
                : code == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ? "busy" : code == 12 || code == 13 ? "lang" : "err" + code;
            nat.emit("{\"state\":\"stt\",\"ev\":\"error\",\"err\":" + Natif.q(e) + ",\"mode\":" + Natif.q(recMode) + "}");
        }
        public void onResults(Bundle r) {
            listening = false;
            ArrayList<String> l = null;
            try { l = r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION); } catch (Throwable ignore) { }
            nat.emit("{\"state\":\"stt\",\"ev\":\"result\",\"mode\":" + Natif.q(recMode) + ",\"words\":" + words(l) + ",\"answer\":" + Natif.q(answer(l)) + "}");
        }
        public void onPartialResults(Bundle r) {
            ArrayList<String> l = null;
            try { l = r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION); } catch (Throwable ignore) { }
            if (l != null && !l.isEmpty()) nat.emit("{\"state\":\"stt\",\"ev\":\"partial\",\"words\":" + words(l) + ",\"answer\":" + Natif.q(answer(l)) + "}");
        }
        public void onEvent(int type, Bundle p) { }
    }
}
