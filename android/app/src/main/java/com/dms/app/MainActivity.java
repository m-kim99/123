package com.dms.app;

import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        NfcPlugin nfcPlugin = (NfcPlugin) getBridge().getPlugin("NfcPlugin").getInstance();
        if (nfcPlugin != null) {
            nfcPlugin.handleNfcIntent(intent);
        }
    }
}
