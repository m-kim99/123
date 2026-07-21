package com.trayst.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.ImageView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NfcPlugin.class);
        registerPlugin(SpeechPlugin.class);
        registerPlugin(DownloadPlugin.class);
        registerPlugin(NotificationPlugin.class);
        super.onCreate(savedInstanceState);

        // WebView 캐시 비활성화 - 항상 최신 원격 콘텐츠 로드
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        }

        // Cold start: 앱이 NFC 태그로 실행된 경우 initial intent 처리
        handleNfcFromIntent(getIntent());

        // 스플래시 오버레이: Android 12+ 시스템 스플래시는 full-screen 이미지를 지원하지 않으므로 직접 표시
        showSplashOverlay();
    }

    private void showSplashOverlay() {
        final ImageView splashOverlay = new ImageView(this);
        splashOverlay.setImageResource(R.drawable.splash);
        splashOverlay.setScaleType(ImageView.ScaleType.CENTER_CROP);
        splashOverlay.setBackgroundColor(Color.WHITE);
        splashOverlay.setClickable(true);
        addContentView(
            splashOverlay,
            new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        );
        new Handler(Looper.getMainLooper())
            .postDelayed(
                () ->
                    splashOverlay
                        .animate()
                        .alpha(0f)
                        .setDuration(300)
                        .withEndAction(() -> {
                            ViewGroup parent = (ViewGroup) splashOverlay.getParent();
                            if (parent != null) {
                                parent.removeView(splashOverlay);
                            }
                        })
                        .start(),
                2000
            );
    }

    @Override
    public void onResume() {
        super.onResume();
        // NFC foreground dispatch 활성화 (Activity가 포그라운드일 때 NFC 태그 우선 수신)
        try {
            PluginHandle handle = getBridge().getPlugin("NfcPlugin");
            if (handle != null) {
                NfcPlugin nfcPlugin = (NfcPlugin) handle.getInstance();
                if (nfcPlugin != null) {
                    nfcPlugin.onActivityResume();
                }
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "NFC onResume error", e);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // NFC foreground dispatch 비활성화
        try {
            PluginHandle handle = getBridge().getPlugin("NfcPlugin");
            if (handle != null) {
                NfcPlugin nfcPlugin = (NfcPlugin) handle.getInstance();
                if (nfcPlugin != null) {
                    nfcPlugin.onActivityPause();
                }
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "NFC onPause error", e);
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNfcFromIntent(intent);
    }

    private void handleNfcFromIntent(Intent intent) {
        if (intent == null) return;
        try {
            PluginHandle handle = getBridge().getPlugin("NfcPlugin");
            if (handle != null) {
                NfcPlugin nfcPlugin = (NfcPlugin) handle.getInstance();
                if (nfcPlugin != null) {
                    nfcPlugin.handleNfcIntent(intent);
                }
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "NFC intent handling error", e);
        }
    }
}
