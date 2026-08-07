package com.trayst.app;

import android.app.PendingIntent;
import android.content.Intent;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
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

    // 아래 상태는 두 스레드에서 만진다.
    // 플러그인 메서드(writeUrl/startScan/...)는 Capacitor의 "CapacitorPlugins" 스레드에서,
    // handleNfcIntent는 메인 스레드에서 실행된다. volatile이 없으면 메인 스레드가
    // isWriting=true를 보면서 pendingWriteUrl은 아직 null로 보는 조합이 가능해,
    // 멀쩡한 태그에 "No data to write"를 뱉는다.
    private volatile boolean isScanning = false;
    private volatile boolean isWriting = false;
    private boolean isForegroundDispatchEnabled = false;
    private volatile String pendingWriteUrl = null;
    private volatile String pendingWriteData = null;
    private volatile PluginCall pendingWriteCall = null;

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
        // 쓰기가 걸려 있는 채로 스캔을 시작하면 handleNfcIntent가 isWriting을 먼저 보므로
        // 다음 태그가 읽히는 대신 덮어써진다. 매달린 쓰기를 명시적으로 끝낸다(iOS와 동일).
        if (isWriting) {
            Log.w(TAG, "startScan called while a write was pending → cancelling that write");
            settleWrite("쓰기 도중 새 스캔이 시작되었습니다.");
        }
        isScanning = true;
        enableForegroundDispatch();
        Log.d(TAG, "NFC scan started");
        call.resolve();
    }

    /**
     * 대기 중인 쓰기를 취소한다. 다이얼로그를 닫거나 타임아웃이 났을 때 반드시 불러야 한다.
     * 이걸 안 부르면 isWriting이 true인 채로 남아, 사용자가 나중에 아무 태그나 대는 순간
     * 그 태그가 조용히 덮어써진다.
     */
    @PluginMethod
    public void cancelWrite(PluginCall call) {
        // handleNfcIntent와 같은 스레드(메인)에서 정리해야 경합이 없다.
        getActivity().runOnUiThread(() -> {
            if (isWriting || pendingWriteCall != null) {
                Log.d(TAG, "cancelWrite → 대기 중이던 쓰기 해제");
                settleWrite("NFC 쓰기가 취소되었습니다.");
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        isScanning = false;
        // foreground dispatch는 비활성화하지 않음 (항상 활성 상태 유지 for NFCAutoRedirect)
        Log.d(TAG, "NFC scan stopped (foreground dispatch remains active)");
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
        // 앞선 쓰기가 아직 매달려 있으면 여기서 끝낸다. 덮어쓰기만 하면 그 call은
        // 영원히 settle되지 않고 bridge에 저장된 채로 샌다.
        if (isWriting) settleWrite("새 쓰기 요청으로 대체되었습니다.");
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
        if (isWriting) settleWrite("새 쓰기 요청으로 대체되었습니다.");
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
    // Lifecycle (called by MainActivity)
    // ─────────────────────────────────────────────

    public void onActivityResume() {
        // 항상 foreground dispatch 활성화 (NFCAutoRedirect가 리스너로 상시 수신)
        enableForegroundDispatch();
    }

    public void onActivityPause() {
        disableForegroundDispatch();
    }

    // ─────────────────────────────────────────────
    // Called by MainActivity.onNewIntent / onCreate
    // ─────────────────────────────────────────────

    public void handleNfcIntent(Intent intent) {
        // cold start 또는 앱이 NFC 태그로 실행된 경우에도 처리
        if (!isScanning && !isWriting) {
            // 스캔/쓰기 중이 아니면 cold start NFC → JS에 이벤트만 전달
            String action = intent.getAction();
            if (action != null && (NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action)
                    || NfcAdapter.ACTION_TECH_DISCOVERED.equals(action)
                    || NfcAdapter.ACTION_TAG_DISCOVERED.equals(action))) {
                Tag tag = extractTag(intent);
                if (tag != null) {
                    String uid = bytesToHex(tag.getId()).toUpperCase();
                    Log.d(TAG, "NFC cold start tag: UID=" + uid);
                    performRead(tag, uid);
                }
            }
            return;
        }

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
        // retainUntilConsumed=true: cold start 시 MainActivity.onCreate()가 WebView 로딩(및 JS 리스너 등록)보다
        // 먼저 이 이벤트를 발생시킬 수 있음. false(기본값)면 그 시점에 리스너가 없어 이벤트가 유실됨.
        // true로 큐잉해두면 JS의 addListener 호출 시 Capacitor가 자동으로 재생(replay)해준다.
        notifyListeners(EVENT_TAG_DETECTED, data, true);
    }

    // ─────────────────────────────────────────────
    // NFC Write
    // ─────────────────────────────────────────────

    private void performWrite(Tag tag, String uid) {
        // UID는 쓰기 성공 시 DB 키로 등록된다. 빈 값이면 태그만 쓰고 DB에는 식별
        // 불가능한 행이 남으므로, 태그를 건드리기 전에 멈춘다(iOS와 동일).
        if (uid == null || uid.isEmpty()) {
            Log.e(TAG, "Tag UID unavailable → aborting write");
            settleWrite("태그를 식별할 수 없습니다. 다른 태그를 사용해 주세요.");
            return;
        }
        Ndef ndef = null;
        NdefFormatable formatable = null;
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
                settleWrite("쓸 데이터가 없습니다.");
                return;
            }

            ndef = Ndef.get(tag);
            if (ndef == null) {
                // 공장 출하 상태의 미포맷 태그. 포맷하면서 쓴다.
                // (iOS CoreNFC에는 이에 해당하는 API가 없어 안드로이드만 가능하다)
                formatable = NdefFormatable.get(tag);
                if (formatable == null) {
                    settleWrite("이 태그는 NDEF 쓰기를 지원하지 않습니다.");
                    return;
                }
                formatable.connect();
                formatable.format(message);

                Log.d(TAG, "NFC format+write successful");
                settleWriteSuccess(uid);
                return;
            }

            ndef.connect();

            if (!ndef.isWritable()) {
                settleWrite("이 태그는 읽기 전용이라 쓸 수 없습니다.");
                return;
            }
            int needed = message.toByteArray().length;
            if (ndef.getMaxSize() < needed) {
                settleWrite("태그 용량이 부족합니다. 용량이 더 큰 태그를 사용해 주세요. ("
                        + needed + " > " + ndef.getMaxSize() + ")");
                return;
            }

            ndef.writeNdefMessage(message);

            Log.d(TAG, "NFC write successful");
            settleWriteSuccess(uid);

        } catch (Exception e) {
            // 쓰기 도중 태그가 떨어지면 IOException이 난다. 사용자가 바로 고칠 수 있는
            // 상황이므로 원문 대신 행동 가능한 안내를 준다(원문은 로그에 남는다).
            Log.e(TAG, "NFC write failed", e);
            String reason = (e instanceof java.io.IOException)
                    ? "태그가 떨어졌습니다. 쓰기가 끝날 때까지 태그를 대고 계세요."
                    : "쓰기에 실패했습니다: " + e.getMessage();
            settleWrite(reason);
        } finally {
            // 예외가 나도 태그 연결을 반드시 끊는다. 안 그러면 다음 재시도가 막힌다.
            closeQuietly(ndef);
            closeQuietly(formatable);
            resetWriteState();
        }
    }

    private void closeQuietly(android.nfc.tech.TagTechnology tech) {
        if (tech == null) return;
        try {
            tech.close();
        } catch (Exception e) {
            Log.w(TAG, "Failed to close tag technology", e);
        }
    }

    /** 쓰기 call을 정확히 한 번만 settle한다. bridge에 저장된 call도 함께 해제한다. */
    private void settleWriteSuccess(String uid) {
        PluginCall call = pendingWriteCall;
        resetWriteState();
        if (call == null) return;
        JSObject ret = new JSObject();
        ret.put("uid", uid);
        call.resolve(ret);
        releaseWriteCall(call);
    }

    /** 쓰기 call을 정확히 한 번만 settle한다. bridge에 저장된 call도 함께 해제한다. */
    private void settleWrite(String rejectMessage) {
        PluginCall call = pendingWriteCall;
        resetWriteState();
        if (call == null) return;
        call.reject(rejectMessage);
        releaseWriteCall(call);
    }

    /** setKeepAlive(true)로 bridge에 저장된 call을 해제한다. 안 하면 호출마다 하나씩 샌다. */
    private void releaseWriteCall(PluginCall call) {
        if (bridge != null) {
            call.release(bridge);
        } else {
            call.setKeepAlive(false);
        }
    }

    private void resetWriteState() {
        isWriting = false;
        pendingWriteUrl = null;
        pendingWriteData = null;
        pendingWriteCall = null;
        // foreground dispatch는 비활성화하지 않음 (항상 활성 상태 유지)
    }

    // ─────────────────────────────────────────────
    // Foreground Dispatch
    // ─────────────────────────────────────────────

    private void enableForegroundDispatch() {
        if (isForegroundDispatchEnabled) return;
        try {
            if (nfcAdapter == null || getActivity() == null) return;
            Intent intent = new Intent(getActivity(), getActivity().getClass());
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                    ? PendingIntent.FLAG_MUTABLE
                    : 0;
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    getActivity(), 0, intent, flags
            );
            nfcAdapter.enableForegroundDispatch(getActivity(), pendingIntent, null, null);
            isForegroundDispatchEnabled = true;
            Log.d(TAG, "NFC foreground dispatch enabled");
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable foreground dispatch", e);
        }
    }

    private void disableForegroundDispatch() {
        if (!isForegroundDispatchEnabled) return;
        try {
            if (nfcAdapter != null && getActivity() != null) {
                nfcAdapter.disableForegroundDispatch(getActivity());
                isForegroundDispatchEnabled = false;
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
