import Capacitor
import CoreNFC
import os.log

@objc(NfcPlugin)
public class NfcPlugin: CAPPlugin, NFCTagReaderSessionDelegate {

    private static let osLog = OSLog(subsystem: "com.trayst.app", category: "NfcPlugin")

    /// Console.app에서 "NfcPlugin" 카테고리로 필터링해 전체 세션 흐름을 추적할 수 있다.
    private func log(_ message: String, error: Bool = false) {
        os_log("%{public}@", log: NfcPlugin.osLog, type: error ? .error : .info, message)
    }

    // ─────────────────────────────────────────────
    // 아래 상태는 전부 main 큐에서만 읽고 쓴다.
    // Capacitor 브리지 큐(플러그인 메서드) / CoreNFC 세션 큐(델리게이트) / main 큐가
    // 락 없이 같은 값을 만지던 데이터 레이스를 제거하기 위함.
    // ─────────────────────────────────────────────
    private var tagSession: NFCTagReaderSession?
    private var isScanning = false
    private var isWriting = false
    private var pendingWriteUrl: String?
    private var pendingWriteData: String?
    private var pendingWriteCall: CAPPluginCall?
    /// 이전 세션의 didInvalidateWithError를 받은 뒤에 실행할 "다음 세션 시작" 동작.
    /// iOS는 리더 세션을 시스템 전체에 1개만 허용하므로, teardown을 기다리지 않고
    /// begin()하면 systemIsBusy(203)로 시트가 아예 뜨지 않는다.
    private var pendingSessionStart: (() -> Void)?

    @objc func isEnabled(_ call: CAPPluginCall) {
        call.resolve(["enabled": NFCTagReaderSession.readingAvailable])
    }

    @objc func startScan(_ call: CAPPluginCall) {
        guard NFCTagReaderSession.readingAvailable else {
            call.reject("NFC not available on this device")
            return
        }
        DispatchQueue.main.async {
            // 쓰기 대기 중에 startScan이 들어오면 그 쓰기 call은 영영 settle되지 않는다.
            // 조용히 매달아두지 말고 명시적으로 종료시킨다.
            if self.isWriting {
                self.log("startScan이 쓰기 대기 중 호출됨 → 대기 중이던 쓰기를 종료", error: true)
                self.settleWrite(rejecting: "쓰기 도중 새 스캔이 시작되었습니다.")
            }
            self.isScanning = true
            self.isWriting = false
            self.log("startScan 요청")
            self.startSession(alertMessage: "NFC 태그를 스캔하려면 iPhone 상단을 태그에 가까이 대세요.")
        }
        call.resolve()
    }

    @objc func stopScan(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.isScanning = false
            if !self.isWriting {
                self.log("stopScan → 세션 무효화 요청")
                // tagSession을 여기서 nil로 만들지 않는다.
                // didInvalidateWithError가 유일한 정리 지점이어야 세션 신원 비교가 성립한다.
                self.tagSession?.invalidate()
            } else {
                self.log("stopScan 무시 (쓰기 진행 중)")
            }
        }
        call.resolve()
    }

    @objc func writeUrl(_ call: CAPPluginCall) {
        guard let url = call.getString("url"), !url.isEmpty else {
            call.reject("url parameter is required"); return
        }
        guard NFCTagReaderSession.readingAvailable else {
            call.reject("NFC not available"); return
        }
        call.keepAlive = true
        DispatchQueue.main.async {
            self.pendingWriteUrl = url
            self.pendingWriteData = nil
            self.pendingWriteCall = call
            self.isWriting = true
            self.log("writeUrl 요청: \(url)")
            self.startSession(alertMessage: "NFC 태그에 쓰려면 iPhone 상단을 태그에 가까이 대세요.")
        }
    }

    @objc func writeData(_ call: CAPPluginCall) {
        guard let data = call.getString("data"), !data.isEmpty else {
            call.reject("data parameter is required"); return
        }
        guard NFCTagReaderSession.readingAvailable else {
            call.reject("NFC not available"); return
        }
        call.keepAlive = true
        DispatchQueue.main.async {
            self.pendingWriteData = data
            self.pendingWriteUrl = nil
            self.pendingWriteCall = call
            self.isWriting = true
            self.log("writeData 요청 (\(data.count)자)")
            self.startSession(alertMessage: "NFC 태그에 쓰려면 iPhone 상단을 태그에 가까이 대세요.")
        }
    }

    // MARK: - Session

    /// main 큐에서만 호출할 것.
    private func startSession(alertMessage: String) {
        let begin = { [weak self] in
            guard let self = self else { return }
            // .iso18092(FeliCa)는 Info.plist에 felica.systemcodes 키가 없으면
            // begin() 즉시 SecurityViolation으로 세션이 무효화되어 스캔 시트가 뜨지 않음 - 포함 금지
            guard let session = NFCTagReaderSession(
                pollingOption: [.iso14443, .iso15693],
                delegate: self,
                // queue: nil → 프레임워크가 내부에 serial 큐를 생성한다.
                // 기존 DispatchQueue.global()은 concurrent 큐라 델리게이트 콜백과
                // 태그 연산 완료 핸들러가 서로 겹쳐 실행될 수 있었다.
                queue: nil
            ) else {
                self.log("NFCTagReaderSession 생성 실패", error: true)
                if self.isWriting {
                    self.settleWrite(rejecting: "NFC 세션을 시작할 수 없습니다.")
                } else if self.isScanning {
                    self.isScanning = false
                    self.notifyListeners("nfcScanCancelled", data: ["reason": "NFC 세션을 시작할 수 없습니다."])
                }
                return
            }
            session.alertMessage = alertMessage
            self.tagSession = session
            self.log("session.begin() (writing=\(self.isWriting), scanning=\(self.isScanning))")
            session.begin()
        }

        if let live = tagSession {
            // 이전 세션이 아직 살아 있다 → 무효화하고 teardown 콜백을 기다렸다가 시작한다.
            // 고정 딜레이가 아니라 실제 teardown을 기다리는 핸드셰이크여야 systemIsBusy를 피할 수 있다.
            log("이전 세션이 아직 살아있음 → teardown 대기 후 시작")
            pendingSessionStart = begin
            live.invalidate()
            return
        }
        begin()
    }

    // MARK: - NFCTagReaderSessionDelegate

    public func tagReaderSessionDidBecomeActive(_ session: NFCTagReaderSession) {
        log("세션 활성화됨 (스캔 시트 표시)")
    }

    public func tagReaderSession(_ session: NFCTagReaderSession, didInvalidateWithError error: Error) {
        let nfcError = error as? NFCReaderError
        let code = nfcError?.code.rawValue ?? -1
        log("didInvalidateWithError code=\(code) desc=\(error.localizedDescription)")

        DispatchQueue.main.async {
            // 이 콜백이 현재 세션의 것이 아니면 무시한다.
            // 읽기 세션의 늦은 teardown이 방금 시작한 쓰기 call을 reject하던 문제를 막는다.
            guard session === self.tagSession else {
                self.log("현재 세션이 아닌 invalidate 콜백 → 무시")
                return
            }
            self.tagSession = nil

            // 다음 세션을 시작하려고 우리가 일부러 무효화한 경우 → 실패로 처리하지 않는다.
            if let start = self.pendingSessionStart {
                self.pendingSessionStart = nil
                self.log("teardown 완료 → 대기 중이던 세션 시작")
                start()
                return
            }

            let isCancelled = (nfcError?.code == .readerSessionInvalidationErrorUserCanceled)

            if self.isWriting {
                let msg = isCancelled
                    ? "사용자가 NFC 스캔을 취소했습니다."
                    : "NFC 세션 오류: \(error.localizedDescription) (code \(code))"
                self.settleWrite(rejecting: msg)
            } else if self.isScanning {
                self.isScanning = false
                let reason = isCancelled ? "userCancelled" : error.localizedDescription
                self.notifyListeners("nfcScanCancelled", data: ["reason": reason])
            }
        }
    }

    public func tagReaderSession(_ session: NFCTagReaderSession, didDetect tags: [NFCTag]) {
        log("didDetect (tags=\(tags.count))")
        guard let tag = tags.first else { return }

        session.connect(to: tag) { [weak self] error in
            guard let self = self else { return }
            if let error = error {
                self.log("connect 실패: \(error.localizedDescription)", error: true)
                session.invalidate(errorMessage: "연결 실패: \(error.localizedDescription)")
                return
            }
            let uid = self.uidString(from: tag)
            DispatchQueue.main.async {
                guard session === self.tagSession else {
                    self.log("현재 세션이 아닌 didDetect → 무시")
                    return
                }
                self.log("태그 연결됨 uid=\(uid) writing=\(self.isWriting) scanning=\(self.isScanning)")
                if self.isWriting {
                    self.performWrite(session: session, tag: tag, uid: uid)
                } else if self.isScanning {
                    self.performRead(session: session, tag: tag, uid: uid)
                } else {
                    // 여기 걸리면 상태가 유실된 것. 예전에는 아무 일도 없이 시트가 60초간 떠 있었다.
                    self.log("쓰기/읽기 상태가 아님 → 세션 종료", error: true)
                    session.invalidate(errorMessage: "세션 상태가 유효하지 않습니다. 다시 시도해 주세요.")
                }
            }
        }
    }

    // MARK: - UID

    private func uidString(from tag: NFCTag) -> String {
        switch tag {
        case .iso7816(let t):  return t.identifier.hexString
        case .miFare(let t):   return t.identifier.hexString
        case .iso15693(let t): return t.identifier.hexString
        case .feliCa(let t):   return t.currentIDm.hexString
        @unknown default:      return ""
        }
    }

    private func asNDEFTag(_ tag: NFCTag) -> NFCNDEFTag? {
        switch tag {
        case .iso7816(let t):  return t
        case .miFare(let t):   return t
        case .iso15693(let t): return t
        case .feliCa:          return nil
        @unknown default:      return nil
        }
    }

    // MARK: - Read

    /// main 큐에서만 호출할 것.
    private func performRead(session: NFCTagReaderSession, tag: NFCTag, uid: String) {
        guard let ndefTag = asNDEFTag(tag) else {
            log("[read] NDEF 미지원 태그 → uid만 전달")
            finishRead(session: session, data: ["uid": uid])
            return
        }

        ndefTag.queryNDEFStatus { [weak self] status, capacity, error in
            guard let self = self else { return }
            // 실패해도 uid는 전달하지만(기존 동작 유지), 사유는 반드시 로그로 남긴다.
            // 이 에러가 조용히 삼켜져서 "읽기는 되는데 쓰기만 안 된다"처럼 보였다.
            if let error = error {
                self.log("[read] queryNDEFStatus 실패: \(error.localizedDescription)", error: true)
                self.finishRead(session: session, data: ["uid": uid])
                return
            }
            self.log("[read] status=\(status.rawValue) capacity=\(capacity)")
            guard status != .notSupported else {
                self.log("[read] 태그가 NDEF 포맷이 아님 → uid만 전달", error: true)
                self.finishRead(session: session, data: ["uid": uid])
                return
            }

            ndefTag.readNDEF { message, error in
                var result: [String: Any] = ["uid": uid]
                if let error = error {
                    self.log("[read] readNDEF 실패: \(error.localizedDescription)", error: true)
                }
                if let record = message?.records.first {
                    result["recordType"] = self.resolveRecordType(record)
                    result["payload"] = self.parsePayload(record)
                }
                self.finishRead(session: session, data: result)
            }
        }
    }

    private func finishRead(session: NFCTagReaderSession, data: [String: Any]) {
        DispatchQueue.main.async {
            // invalidate 전에 내려둬야 성공적인 읽기 직후 nfcScanCancelled가 잘못 발사되지 않는다.
            self.isScanning = false
            self.notifyListeners("nfcTagDetected", data: data)
            session.invalidate()
        }
    }

    private func resolveRecordType(_ record: NFCNDEFPayload) -> String {
        if record.typeNameFormat == .nfcWellKnown {
            if record.type == Data([0x55]) { return "url" }
            if record.type == Data([0x54]) { return "text" }
        }
        if record.typeNameFormat == .media { return "mime" }
        return "other"
    }

    private func parsePayload(_ record: NFCNDEFPayload) -> String {
        if record.typeNameFormat == .nfcWellKnown && record.type == Data([0x55]) {
            guard !record.payload.isEmpty else { return "" }
            let suffix = String(data: record.payload.dropFirst(), encoding: .utf8) ?? ""
            return uriPrefix(record.payload[0]) + suffix
        }
        return String(data: record.payload, encoding: .utf8) ?? ""
    }

    private func uriPrefix(_ byte: UInt8) -> String {
        switch byte {
        case 0x01: return "http://www."
        case 0x02: return "https://www."
        case 0x03: return "http://"
        case 0x04: return "https://"
        case 0x05: return "tel:"
        case 0x06: return "mailto:"
        default:   return ""
        }
    }

    // MARK: - Write

    /// main 큐에서만 호출할 것.
    private func performWrite(session: NFCTagReaderSession, tag: NFCTag, uid: String) {
        // main 큐에서 실행되므로 여기서 메시지를 미리 만들어둔다.
        // 이후 비동기 완료 핸들러들은 공유 상태를 전혀 건드리지 않는다.
        guard let message = buildPendingMessage() else {
            failWrite(session: session, reject: "No data to write", alert: "쓸 데이터가 없습니다.")
            return
        }
        guard let ndefTag = asNDEFTag(tag) else {
            log("[write] NDEF 미지원 태그", error: true)
            failWrite(session: session,
                      reject: "Tag does not support NDEF format",
                      alert: "이 태그는 쓰기를 지원하지 않습니다.")
            return
        }

        ndefTag.queryNDEFStatus { [weak self] status, capacity, error in
            guard let self = self else { return }

            // ★ error를 status/capacity보다 먼저 검사한다.
            // 에러가 나면 status와 capacity는 의미 없는 값(실무상 capacity=0)이라,
            // 아래 용량 비교가 항상 참이 되어 멀쩡한 태그에 "용량 부족"을 뱉었다.
            if let error = error {
                self.log("[write] queryNDEFStatus 실패: \(error.localizedDescription)", error: true)
                self.failWrite(session: session,
                               reject: "NDEF status query failed: \(error.localizedDescription)",
                               alert: "태그 상태를 확인할 수 없습니다. 다시 시도해 주세요.")
                return
            }

            self.log("[write] status=\(status.rawValue) capacity=\(capacity) messageLength=\(message.length)")

            switch status {
            case .notSupported:
                // iOS에는 Android의 NdefFormatable에 해당하는 API가 없다.
                // 미포맷 태그는 iOS에서 포맷도 쓰기도 불가능하다.
                self.log("[write] 태그가 NDEF 포맷이 아님 (iOS는 포맷 불가)", error: true)
                self.failWrite(session: session,
                               reject: "Tag is not NDEF formatted (iOS cannot format tags)",
                               alert: "이 태그는 NDEF 포맷이 아닙니다.")
                return
            case .readOnly:
                self.failWrite(session: session,
                               reject: "NFC tag is read-only",
                               alert: "이 태그는 읽기 전용입니다.")
                return
            case .readWrite:
                break
            @unknown default:
                self.failWrite(session: session,
                               reject: "Unknown NDEF status (\(status.rawValue))",
                               alert: "태그 상태를 알 수 없습니다.")
                return
            }

            guard message.length <= capacity else {
                self.failWrite(session: session,
                               reject: "NFC tag storage is insufficient (\(message.length) > \(capacity))",
                               alert: "태그 용량이 부족합니다.")
                return
            }

            ndefTag.writeNDEF(message) { error in
                if let error = error {
                    self.log("[write] writeNDEF 실패: \(error.localizedDescription)", error: true)
                    self.failWrite(session: session,
                                   reject: "NFC write failed: \(error.localizedDescription)",
                                   alert: "쓰기에 실패했습니다.")
                    return
                }
                self.log("[write] 쓰기 성공")
                DispatchQueue.main.async {
                    session.alertMessage = "쓰기 완료!"
                    self.settleWriteSuccess()
                    session.invalidate()
                }
            }
        }
    }

    /// main 큐에서만 호출할 것.
    private func buildPendingMessage() -> NFCNDEFMessage? {
        if let urlString = pendingWriteUrl,
           let url = URL(string: urlString),
           let record = NFCNDEFPayload.wellKnownTypeURIPayload(url: url) {
            return NFCNDEFMessage(records: [record])
        }
        if let data = pendingWriteData,
           let jsonData = data.data(using: .utf8) {
            let record = NFCNDEFPayload(
                format: .media,
                type: "application/json".data(using: .utf8)!,
                identifier: Data(),
                payload: jsonData
            )
            return NFCNDEFMessage(records: [record])
        }
        return nil
    }

    private func failWrite(session: NFCTagReaderSession, reject: String, alert: String) {
        DispatchQueue.main.async {
            self.settleWrite(rejecting: reject)
            session.invalidate(errorMessage: alert)
        }
    }

    /// 쓰기 call을 정확히 한 번만 settle한다. main 큐에서만 호출할 것.
    private func settleWriteSuccess() {
        guard let call = pendingWriteCall else {
            log("settleWriteSuccess: 이미 settle된 call → 무시", error: true)
            resetWriteState()
            return
        }
        resetWriteState()
        call.resolve()
        bridge?.releaseCall(call)
    }

    /// 쓰기 call을 정확히 한 번만 settle한다. main 큐에서만 호출할 것.
    private func settleWrite(rejecting message: String) {
        guard let call = pendingWriteCall else {
            log("settleWrite: 이미 settle된 call → 무시 (\(message))")
            resetWriteState()
            return
        }
        resetWriteState()
        call.reject(message)
        bridge?.releaseCall(call)
    }

    private func resetWriteState() {
        isWriting = false
        pendingWriteUrl = nil
        pendingWriteData = nil
        pendingWriteCall = nil
    }
}

private extension Data {
    var hexString: String { map { String(format: "%02X", $0) }.joined() }
}
