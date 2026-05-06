package com.dms.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(
    name = "NotificationPlugin",
    permissions = {
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" })
    }
)
public class NotificationPlugin extends Plugin {

    private static final String TAG = "NotificationPlugin";
    private static final String CHANNEL_ID = "app_notifications";
    private static final AtomicInteger idCounter = new AtomicInteger(1000);

    @Override
    public void load() {
        createChannel();
        Log.d(TAG, "NotificationPlugin loaded, channel created");
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "앱 알림",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("문서/카테고리/만료 알림");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setShowBadge(true);

            NotificationManager mgr = (NotificationManager)
                getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (mgr != null) {
                mgr.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created: " + CHANNEL_ID);
            }
        }
    }

    private boolean needsPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return false;
        return getPermissionState("notifications") != PermissionState.GRANTED;
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (needsPermission()) {
            requestPermissionForAlias("notifications", call, "permissionCallback");
        } else {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        boolean granted = !needsPermission();
        Log.d(TAG, "permissionCallback: granted=" + granted);
        if ("requestPermission".equals(call.getMethodName())) {
            JSObject r = new JSObject();
            r.put("granted", granted);
            call.resolve(r);
        } else {
            if (granted) {
                doShow(call);
            } else {
                call.reject("Notification permission denied");
            }
        }
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (needsPermission()) {
            requestPermissionForAlias("notifications", call, "permissionCallback");
            return;
        }
        doShow(call);
    }

    private void doShow(PluginCall call) {
        String title = call.getString("title", "알림");
        String body  = call.getString("body",  "");

        Log.d(TAG, "show() called: title=" + title + ", body=" + body);

        int iconRes = getContext().getResources().getIdentifier(
            "ic_launcher", "mipmap", getContext().getPackageName()
        );
        if (iconRes == 0) {
            iconRes = android.R.drawable.ic_dialog_info;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL);

        NotificationManagerCompat mgr = NotificationManagerCompat.from(getContext());

        try {
            int notifId = idCounter.getAndIncrement();
            mgr.notify(notifId, builder.build());
            Log.d(TAG, "Notification posted, id=" + notifId);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("id", notifId);
            call.resolve(result);
        } catch (SecurityException e) {
            Log.e(TAG, "Permission denied: " + e.getMessage());
            call.reject("Permission denied: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Notification error: " + e.getMessage());
            call.reject("Error: " + e.getMessage());
        }
    }
}
