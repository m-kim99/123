#import <Capacitor/Capacitor.h>

// Capacitor JS 브리지에 NfcPlugin Swift 클래스를 등록합니다.
// 이 파일이 없으면 JS의 NfcPlugin.startScan() 등 모든 호출이 "not implemented" 오류로 실패합니다.
CAP_PLUGIN(NfcPlugin, "NfcPlugin",
    CAP_PLUGIN_METHOD(isEnabled, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(startScan, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopScan, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(writeUrl, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(writeData, CAPPluginReturnPromise);
)
