package com.dms.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NfcPlugin.class);
        registerPlugin(SpeechPlugin.class);
        registerPlugin(DownloadPlugin.class);
        super.onCreate(savedInstanceState);
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
