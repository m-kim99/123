package com.dms.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;

@CapacitorPlugin(name = "SpeechPlugin")
public class SpeechPlugin extends Plugin {

    private static final String TAG = "SpeechPlugin";
    private SpeechRecognizer recognizer;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void isSupported(PluginCall call) {
        boolean ok = SpeechRecognizer.isRecognitionAvailable(getContext());
        JSObject r = new JSObject();
        r.put("supported", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        String language = call.getString("language", "ko-KR");
        mainHandler.post(() -> {
            try {
                destroyRecognizer();
                recognizer = SpeechRecognizer.createSpeechRecognizer(getActivity());
                recognizer.setRecognitionListener(makeListener());

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                intent.putExtra(
                        RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L);
                intent.putExtra(
                        RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS,
                        1500L);

                recognizer.startListening(intent);
                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "startListening error", e);
                call.reject("startListening failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        mainHandler.post(() -> {
            if (recognizer != null) recognizer.stopListening();
            if (call != null) call.resolve();
        });
    }

    private RecognitionListener makeListener() {
        return new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                notifyListeners("speechReady", new JSObject());
            }

            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}

            @Override
            public void onError(int error) {
                JSObject d = new JSObject();
                d.put("error", errorName(error));
                d.put("code", error);
                notifyListeners("speechError", d);
            }

            @Override
            public void onResults(Bundle results) {
                ArrayList<String> matches =
                        results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) {
                    JSObject d = new JSObject();
                    d.put("transcript", matches.get(0));
                    d.put("isFinal", true);
                    notifyListeners("speechResult", d);
                }
            }

            @Override
            public void onPartialResults(Bundle partial) {
                ArrayList<String> list =
                        partial.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (list != null && !list.isEmpty()) {
                    JSObject d = new JSObject();
                    d.put("transcript", list.get(0));
                    d.put("isFinal", false);
                    notifyListeners("speechResult", d);
                }
            }

            @Override public void onEvent(int eventType, Bundle params) {}
        };
    }

    private void destroyRecognizer() {
        if (recognizer != null) {
            try { recognizer.destroy(); } catch (Exception ignored) {}
            recognizer = null;
        }
    }

    private String errorName(int code) {
        switch (code) {
            case SpeechRecognizer.ERROR_AUDIO:                  return "audio_error";
            case SpeechRecognizer.ERROR_CLIENT:                 return "client_error";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "insufficient_permissions";
            case SpeechRecognizer.ERROR_NETWORK:                return "network_error";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:        return "network_timeout";
            case SpeechRecognizer.ERROR_NO_MATCH:               return "no_match";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:        return "recognizer_busy";
            case SpeechRecognizer.ERROR_SERVER:                 return "server_error";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:         return "speech_timeout";
            default:                                             return "unknown";
        }
    }

    @Override
    protected void handleOnDestroy() {
        mainHandler.post(this::destroyRecognizer);
    }
}
