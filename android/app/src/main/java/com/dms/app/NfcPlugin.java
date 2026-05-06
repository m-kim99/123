package com.dms.app;

import android.app.PendingIntent;
import android.content.Intent;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@CapacitorPlugin(name = "NfcPlugin")
public class NfcPlugin extends Plugin {

    private static final String TAG = "NfcPlugin";
    private static final String EVENT_TAG_DETECTED = "nfcTagDetected";

    private NfcAdapter nfcAdapter;

    private boolean isScanning = false;
    private boolean isWriting = false;
    private String pendingWriteUrl = null;
    private String pendingWriteData = null;
    private PluginCall pendingWriteCall = null;

    @Override
    public void load() {
        nfcAdapter = NfcAdapter.getDefaultAdapter(getActivity());
        Log.d(TAG, "NfcPlugin loaded. NFC adapter: " + (nfcAdapter != null ? "available" : "null"));
    }

    // ─────────────────────────────────────────────
    // Plugin Methods (JS → Java)
    // ─────────────────────────────────────────────

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", nfcAdapter != null && nfcAdapter.isEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void startScan(PluginCall call) {
        if (nfcAdapter == null) {
            call.reject("NFC hardware not found on this device");
            return;
        }
        if (!nfcAdapter.isEnabled()) {
            call.reject("NFC is disabled. Please enable NFC in device settings.");
            return;
        }
        isScanning = true;
        enableForegroundDispatch();
        Log.d(TAG, "NFC scan started");
        call.resolve();
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        isScanning = false;
        if (!isWriting) {
            disableForegroundDispatch();
        }
        Log.d(TAG, "NFC scan stopped");
        call.resolve();
    }

    @PluginMethod
    public void writeUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url parameter is required");
            return;
        }
        if (nfcAdapter == null) {
            call.reject("NFC hardware not found");
            return;
        }
        if (!nfcAdapter.isEnabled()) {
            call.reject("NFC is disabled");
            return;
        }
        pendingWriteUrl = url;
        pendingWriteData = null;
        pendingWriteCall = call;
        isWriting = true;
        if (!isScanning) {
            enableForegroundDispatch();
        }
        call.setKeepAlive(true);
        Log.d(TAG, "NFC write URL prepared: " + url);
    }

    @PluginMethod
    public void writeData(PluginCall call) {
        String data = call.getString("data");
        if (data == null || data.isEmpty()) {
            call.reject("data parameter is required");
            return;
        }
        if (nfcAdapter == null) {
            call.reject("NFC hardware not found");
            return;
        }
        if (!nfcAdapter.isEnabled()) {
            call.reject("NFC is disabled");
            return;
        }
        pendingWriteData = data;
        pendingWriteUrl = null;
        pendingWriteCall = call;
        isWriting = true;
        if (!isScanning) {
            enableForegroundDispatch();
        }
        call.setKeepAlive(true);
        Log.d(TAG, "NFC write data prepared (JSON)");
    }

    // ─────────────────────────────────────────────
    // Called by MainActivity.onNewIntent
    // ─────────────────────────────────────────────

    public void handleNfcIntent(Intent intent) {
        if (!isScanning && !isWriting) return;

        String action = intent.getAction();
        if (!NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action)
                && !NfcAdapter.ACTION_TECH_DISCOVERED.equals(action)
                && !NfcAdapter.ACTION_TAG_DISCOVERED.equals(action)) {
            return;
        }

        Tag tag = extractTag(intent);
        if (tag == null) {
            Log.w(TAG, "NFC intent received but tag is null");
            return;
        }

        byte[] tagId = tag.getId();
        String uid = bytesToHex(tagId).toUpperCase();
        Log.d(TAG, "NFC tag detected: UID=" + uid + " | scanning=" + isScanning + " | writing=" + isWriting);

        if (isWriting) {
            performWrite(tag, uid);
        } else if (isScanning) {
            performRead(tag, uid);
        }
    }

    // ─────────────────────────────────────────────
    // NFC Read
    // ─────────────────────────────────────────────

    private void performRead(Tag tag, String uid) {
        JSObject data = new JSObject();
        data.put("uid", uid);

        Ndef ndef = Ndef.get(tag);
        if (ndef != null) {
            try {
                ndef.connect();
                NdefMessage message = ndef.getNdefMessage();
                if (message != null) {
                    NdefRecord[] records = message.getRecords();
                    if (records.length > 0) {
                        NdefRecord record = records[0];
                        data.put("recordType", resolveRecordType(record));
                        data.put("payload", parseNdefPayload(record));
                    }
                }
                ndef.close();
            } catch (Exception e) {
                Log.e(TAG, "Failed to read NDEF data", e);
            }
        }

        Log.d(TAG, "Firing nfcTagDetected event: " + data.toString());
        notifyListeners(EVENT_TAG_DETECTED, data);
    }

    // ─────────────────────────────────────────────
    // NFC Write
    // ─────────────────────────────────────────────

    private void performWrite(Tag tag, String uid) {
        try {
            NdefMessage message;
            if (pendingWriteUrl != null) {
                NdefRecord urlRecord = NdefRecord.createUri(pendingWriteUrl);
                message = new NdefMessage(new NdefRecord[]{ urlRecord });
            } else if (pendingWriteData != null) {
                byte[] payload = pendingWriteData.getBytes(StandardCharsets.UTF_8);
                NdefRecord mimeRecord = NdefRecord.createMime("application/json", payload);
                message = new NdefMessage(new NdefRecord[]{ mimeRecord });
            } else {
                if (pendingWriteCall != null) pendingWriteCall.reject("No data to write");
                resetWriteState();
                return;
            }

            Ndef ndef = Ndef.get(tag);
            if (ndef == null) {
                if (pendingWriteCall != null) pendingWriteCall.reject("Tag does not support NDEF format");
                resetWriteState();
                return;
            }

            ndef.connect();

            if (!ndef.isWritable()) {
                if (pendingWriteCall != null) pendingWriteCall.reject("NFC tag is read-only");
                ndef.close();
                resetWriteState();
                return;
            }
            if (ndef.getMaxSize() < message.toByteArray().length) {
                if (pendingWriteCall != null) pendingWriteCall.reject("NFC tag storage is insufficient");
                ndef.close();
                resetWriteState();
                return;
            }

            ndef.writeNdefMessage(message);
            ndef.close();

            Log.d(TAG, "NFC write successful");
            if (pendingWriteCall != null) pendingWriteCall.resolve();

        } catch (Exception e) {
            Log.e(TAG, "NFC write failed", e);
            if (pendingWriteCall != null) {
                pendingWriteCall.reject("NFC write failed: " + e.getMessage());
            }
        } finally {
            resetWriteState();
        }
    }

    private void resetWriteState() {
        isWriting = false;
        pendingWriteUrl = null;
        pendingWriteData = null;
        pendingWriteCall = null;
        if (!isScanning) {
            disableForegroundDispatch();
        }
    }

    // ─────────────────────────────────────────────
    // Foreground Dispatch
    // ─────────────────────────────────────────────

    private void enableForegroundDispatch() {
        try {
            Intent intent = new Intent(getActivity(), getActivity().getClass());
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                    ? PendingIntent.FLAG_MUTABLE
                    : 0;
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    getActivity(), 0, intent, flags
            );
            nfcAdapter.enableForegroundDispatch(getActivity(), pendingIntent, null, null);
            Log.d(TAG, "NFC foreground dispatch enabled");
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable foreground dispatch", e);
        }
    }

    private void disableForegroundDispatch() {
        try {
            if (nfcAdapter != null) {
                nfcAdapter.disableForegroundDispatch(getActivity());
                Log.d(TAG, "NFC foreground dispatch disabled");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to disable foreground dispatch", e);
        }
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    @SuppressWarnings("deprecation")
    private Tag extractTag(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag.class);
        } else {
            return (Tag) intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
        }
    }

    private String resolveRecordType(NdefRecord record) {
        if (record.getTnf() == NdefRecord.TNF_WELL_KNOWN) {
            if (Arrays.equals(record.getType(), NdefRecord.RTD_URI))  return "url";
            if (Arrays.equals(record.getType(), NdefRecord.RTD_TEXT)) return "text";
        }
        if (record.getTnf() == NdefRecord.TNF_MIME_MEDIA) return "mime";
        return "other";
    }

    private String parseNdefPayload(NdefRecord record) {
        try {
            byte[] payload = record.getPayload();
            if (record.getTnf() == NdefRecord.TNF_WELL_KNOWN
                    && Arrays.equals(record.getType(), NdefRecord.RTD_URI)) {
                String prefix = getUriPrefix(payload[0]);
                String suffix = new String(payload, 1, payload.length - 1, StandardCharsets.UTF_8);
                return prefix + suffix;
            }
            return new String(payload, StandardCharsets.UTF_8);
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse NDEF payload", e);
            return "";
        }
    }

    private String getUriPrefix(byte code) {
        switch (code) {
            case 0x01: return "http://www.";
            case 0x02: return "https://www.";
            case 0x03: return "http://";
            case 0x04: return "https://";
            case 0x05: return "tel:";
            case 0x06: return "mailto:";
            default:   return "";
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
