import Capacitor
import CoreNFC

@objc(NfcPlugin)
public class NfcPlugin: CAPPlugin, NFCTagReaderSessionDelegate {

    private var tagSession: NFCTagReaderSession?
    private var isScanning = false
    private var isWriting = false
    private var pendingWriteUrl: String?
    private var pendingWriteData: String?
    private var pendingWriteCall: CAPPluginCall?

    @objc func isEnabled(_ call: CAPPluginCall) {
        call.resolve(["enabled": NFCTagReaderSession.readingAvailable])
    }

    @objc func startScan(_ call: CAPPluginCall) {
        guard NFCTagReaderSession.readingAvailable else {
            call.reject("NFC not available on this device")
            return
        }
        isScanning = true
        isWriting = false
        startSession(alertMessage: "NFC 태그를 스캔하려면 iPhone 상단을 태그에 가까이 대세요.")
        call.resolve()
    }

    @objc func stopScan(_ call: CAPPluginCall) {
        isScanning = false
        if !isWriting {
            tagSession?.invalidate()
            tagSession = nil
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
        pendingWriteUrl = url
        pendingWriteData = nil
        pendingWriteCall = call
        isWriting = true
        startSession(alertMessage: "NFC 태그에 쓰려면 iPhone 상단을 태그에 가까이 대세요.")
    }

    @objc func writeData(_ call: CAPPluginCall) {
        guard let data = call.getString("data"), !data.isEmpty else {
            call.reject("data parameter is required"); return
        }
        guard NFCTagReaderSession.readingAvailable else {
            call.reject("NFC not available"); return
        }
        call.keepAlive = true
        pendingWriteData = data
        pendingWriteUrl = nil
        pendingWriteCall = call
        isWriting = true
        startSession(alertMessage: "NFC 태그에 쓰려면 iPhone 상단을 태그에 가까이 대세요.")
    }

    private func startSession(alertMessage: String) {
        // Capacitor 플러그인 메서드는 백그라운드 브리지 큐에서 호출되므로 세션 시작은 main 큐에서
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.tagSession?.invalidate()
            // .iso18092(FeliCa)는 Info.plist에 felica.systemcodes 키가 없으면
            // begin() 즉시 SecurityViolation으로 세션이 무효화되어 스캔 시트가 뜨지 않음 - 포함 금지
            guard let session = NFCTagReaderSession(
                pollingOption: [.iso14443, .iso15693],
                delegate: self,
                queue: DispatchQueue.global(qos: .userInitiated)
            ) else {
                if self.isWriting {
                    self.pendingWriteCall?.reject("NFC 세션을 시작할 수 없습니다.")
                    self.resetWriteState()
                } else if self.isScanning {
                    self.isScanning = false
                    self.notifyListeners("nfcScanCancelled", data: ["reason": "NFC 세션을 시작할 수 없습니다."])
                }
                return
            }
            session.alertMessage = alertMessage
            self.tagSession = session
            session.begin()
        }
    }

    // MARK: - NFCTagReaderSessionDelegate

    public func tagReaderSessionDidBecomeActive(_ session: NFCTagReaderSession) {}

    public func tagReaderSession(_ session: NFCTagReaderSession, didInvalidateWithError error: Error) {
        let isCancelled: Bool
        if let nfcError = error as? NFCReaderError {
            isCancelled = (nfcError.code == .readerSessionInvalidationErrorUserCanceled)
        } else {
            isCancelled = false
        }

        if isWriting {
            // 쓰기 대기 중 취소/오류 → pendingWriteCall을 reject하지 않으면 JS Promise가 영구 pending 상태가 됨
            let msg = isCancelled
                ? "사용자가 NFC 스캔을 취소했습니다."
                : "NFC 세션 오류: \(error.localizedDescription)"
            pendingWriteCall?.reject(msg)
            resetWriteState()
        } else if isScanning {
            // 읽기 대기 중 취소/오류 → JS의 readNFCTag/readNFCUid 타임아웃을 기다리지 않도록 이벤트 전달
            isScanning = false
            let reason = isCancelled ? "userCancelled" : error.localizedDescription
            notifyListeners("nfcScanCancelled", data: ["reason": reason])
        }
    }

    public func tagReaderSession(_ session: NFCTagReaderSession, didDetect tags: [NFCTag]) {
        guard let tag = tags.first else { return }

        session.connect(to: tag) { [weak self] error in
            guard let self = self else { return }
            if let error = error {
                session.invalidate(errorMessage: "연결 실패: \(error.localizedDescription)")
                return
            }
            let uid = self.uidString(from: tag)
            if self.isWriting {
                self.performWrite(session: session, tag: tag, uid: uid)
            } else if self.isScanning {
                self.performRead(session: session, tag: tag, uid: uid)
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

    private func performRead(session: NFCTagReaderSession, tag: NFCTag, uid: String) {
        guard let ndefTag = asNDEFTag(tag) else {
            notifyListeners("nfcTagDetected", data: ["uid": uid])
            session.invalidate()
            return
        }

        ndefTag.queryNDEFStatus { [weak self] status, _, error in
            guard let self = self else { return }
            guard status != .notSupported, error == nil else {
                self.notifyListeners("nfcTagDetected", data: ["uid": uid])
                session.invalidate()
                return
            }

            ndefTag.readNDEF { message, error in
                var result: [String: Any] = ["uid": uid]
                if let record = message?.records.first {
                    result["recordType"] = self.resolveRecordType(record)
                    result["payload"] = self.parsePayload(record)
                }
                self.notifyListeners("nfcTagDetected", data: result)
                session.invalidate()
            }
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

    private func performWrite(session: NFCTagReaderSession, tag: NFCTag, uid: String) {
        guard let ndefTag = asNDEFTag(tag) else {
            pendingWriteCall?.reject("Tag does not support NDEF format")
            resetWriteState()
            session.invalidate(errorMessage: "이 태그는 쓰기를 지원하지 않습니다.")
            return
        }

        ndefTag.queryNDEFStatus { [weak self] status, capacity, error in
            guard let self = self else { return }

            if status == .notSupported {
                self.pendingWriteCall?.reject("Tag does not support NDEF format")
                self.resetWriteState()
                session.invalidate(errorMessage: "이 태그는 NDEF를 지원하지 않습니다.")
                return
            }
            if status == .readOnly {
                self.pendingWriteCall?.reject("NFC tag is read-only")
                self.resetWriteState()
                session.invalidate(errorMessage: "이 태그는 읽기 전용입니다.")
                return
            }

            let message: NFCNDEFMessage
            if let urlString = self.pendingWriteUrl,
               let url = URL(string: urlString),
               let record = NFCNDEFPayload.wellKnownTypeURIPayload(url: url) {
                message = NFCNDEFMessage(records: [record])
            } else if let data = self.pendingWriteData,
                      let jsonData = data.data(using: .utf8) {
                let record = NFCNDEFPayload(
                    format: .media,
                    type: "application/json".data(using: .utf8)!,
                    identifier: Data(),
                    payload: jsonData
                )
                message = NFCNDEFMessage(records: [record])
            } else {
                self.pendingWriteCall?.reject("No data to write")
                self.resetWriteState()
                session.invalidate()
                return
            }

            if message.length > capacity {
                self.pendingWriteCall?.reject("NFC tag storage is insufficient")
                self.resetWriteState()
                session.invalidate(errorMessage: "태그 용량이 부족합니다.")
                return
            }

            ndefTag.writeNDEF(message) { error in
                if let error = error {
                    self.pendingWriteCall?.reject("NFC write failed: \(error.localizedDescription)")
                } else {
                    session.alertMessage = "쓰기 완료!"
                    self.pendingWriteCall?.resolve()
                }
                self.resetWriteState()
                session.invalidate()
            }
        }
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
