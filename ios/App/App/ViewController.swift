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
    }
}
