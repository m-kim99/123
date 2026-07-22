import UIKit
import WebKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        // iOS WKWebView 고무줄(rubber-band) 오버스크롤 제거 —
        // 스크롤 시 sticky 헤더 뒤로 배경/콘텐츠가 비치는 현상 방지
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false

        // 스플래시 오버레이: capacitor.config.ts의 launchShowDuration은 Android
        // 네이티브 오버레이(MainActivity)와 겹치지 않도록 0으로 고정돼 있어서,
        // 그 설정에 의존하는 iOS는 스플래시가 사실상 표시되지 않음 — Android와
        // 동일하게 직접 표시.
        showSplashOverlay()
    }

    private func showSplashOverlay() {
        let splashOverlay = UIImageView(image: UIImage(named: "Splash"))
        splashOverlay.contentMode = .scaleAspectFill
        splashOverlay.backgroundColor = .white
        splashOverlay.clipsToBounds = true
        splashOverlay.frame = view.bounds
        splashOverlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(splashOverlay)

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            UIView.animate(withDuration: 0.3, animations: {
                splashOverlay.alpha = 0
            }, completion: { _ in
                splashOverlay.removeFromSuperview()
            })
        }
    }
}
