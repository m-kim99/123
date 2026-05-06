package com.dms.app;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DownloadPlugin")
public class DownloadPlugin extends Plugin {

    private static final String TAG = "DownloadPlugin";

    @PluginMethod
    public void downloadFile(PluginCall call) {
        String url = call.getString("url");
        String filename = call.getString("filename", "download");

        if (url == null || url.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(filename);
            request.setDescription("다운로드 중...");
            request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS, filename);
            request.allowScanningByMediaScanner();

            DownloadManager dm = (DownloadManager)
                    getActivity().getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm == null) {
                call.reject("DownloadManager not available");
                return;
            }
            dm.enqueue(request);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("filename", filename);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "downloadFile error", e);
            call.reject("Download failed: " + e.getMessage());
        }
    }
}
