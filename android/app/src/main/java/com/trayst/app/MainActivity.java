package com.trayst.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
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
