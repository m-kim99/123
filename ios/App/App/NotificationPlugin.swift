import Capacitor
import UserNotifications

@objc(NotificationPlugin)
public class NotificationPlugin: CAPPlugin, UNUserNotificationCenterDelegate {

    override public func load() {
        UNUserNotificationCenter.current().delegate = self
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                call.reject("Permission request failed: \(error.localizedDescription)")
                return
            }
            call.resolve(["granted": granted])
        }
    }

    @objc func show(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "알림"
        let body  = call.getString("body")  ?? ""

        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            guard let self = self else { return }

            if settings.authorizationStatus == .notDetermined {
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                    if granted { self.postNotification(title: title, body: body, call: call) }
                    else { call.reject("Notification permission denied") }
                }
            } else if settings.authorizationStatus == .authorized ||
                      settings.authorizationStatus == .provisional {
                self.postNotification(title: title, body: body, call: call)
            } else {
                call.reject("Notification permission denied")
            }
        }
    }

    private func postNotification(title: String, body: String, call: CAPPluginCall) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body  = body
        content.sound = .default

        let identifier = "notif-\(Int(Date().timeIntervalSince1970 * 1000))"
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                call.reject("Failed to show notification: \(error.localizedDescription)")
            } else {
                call.resolve(["success": true, "id": identifier])
            }
        }
    }

    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }
}
