import Capacitor
import UIKit

@objc(DownloadPlugin)
public class DownloadPlugin: CAPPlugin {

    @objc func downloadFile(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), !urlString.isEmpty,
              let url = URL(string: urlString) else {
            call.reject("URL is required")
            return
        }

        let filename = call.getString("filename") ?? "download"

        let task = URLSession.shared.downloadTask(with: url) { [weak self] tempURL, _, error in
            guard let self = self else { return }

            if let error = error {
                call.reject("Download failed: \(error.localizedDescription)")
                return
            }
            guard let tempURL = tempURL else {
                call.reject("Download failed: no file received")
                return
            }

            do {
                let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
                let dest = docs.appendingPathComponent(filename)

                if FileManager.default.fileExists(atPath: dest.path) {
                    try FileManager.default.removeItem(at: dest)
                }
                try FileManager.default.moveItem(at: tempURL, to: dest)

                DispatchQueue.main.async {
                    let activityVC = UIActivityViewController(activityItems: [dest], applicationActivities: nil)

                    if let popover = activityVC.popoverPresentationController,
                       let view = self.bridge?.viewController?.view {
                        popover.sourceView = view
                        popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
                        popover.permittedArrowDirections = []
                    }

                    self.bridge?.viewController?.present(activityVC, animated: true)
                    call.resolve(["success": true, "filename": filename])
                }

            } catch {
                call.reject("File save failed: \(error.localizedDescription)")
            }
        }
        task.resume()
    }
}
