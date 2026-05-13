package com.dms.app;

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
            settings.setAppCacheEnabled(false);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
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
