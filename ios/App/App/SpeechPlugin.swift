import Capacitor
import Speech
import AVFoundation

@objc(SpeechPlugin)
public class SpeechPlugin: CAPPlugin {

    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var tapInstalled = false

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve(["supported": SFSpeechRecognizer(locale: Locale.current) != nil])
    }

    @objc func startListening(_ call: CAPPluginCall) {
        let language = call.getString("language") ?? "ko-KR"

        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            guard let self = self else { return }
            DispatchQueue.main.async {
                guard status == .authorized else {
                    call.reject("Speech recognition permission denied")
                    return
                }
                AVAudioSession.sharedInstance().requestRecordPermission { granted in
                    DispatchQueue.main.async {
                        if granted {
                            self.doStartListening(language: language, call: call)
                        } else {
                            call.reject("Microphone permission denied")
                        }
                    }
                }
            }
        }
    }

    private func doStartListening(language: String, call: CAPPluginCall) {
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language)),
              recognizer.isAvailable else {
            call.reject("Speech recognizer not available for language: \(language)")
            return
        }

        stopRecognition()

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let engine = AVAudioEngine()
            audioEngine = engine

            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            request.taskHint = .dictation
            recognitionRequest = request

            recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
                guard let self = self else { return }
                if let result = result {
                    let data: [String: Any] = [
                        "transcript": result.bestTranscription.formattedString,
                        "isFinal": result.isFinal
                    ]
                    self.notifyListeners("speechResult", data: data)
                    if result.isFinal { self.stopRecognition() }
                }
                if let error = error {
                    self.notifyListeners("speechError", data: [
                        "error": error.localizedDescription,
                        "code": (error as NSError).code
                    ])
                    self.stopRecognition()
                }
            }

            let format = engine.inputNode.outputFormat(forBus: 0)
            engine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                self?.recognitionRequest?.append(buffer)
            }
            tapInstalled = true

            engine.prepare()
            try engine.start()

            notifyListeners("speechReady", data: [:])
            call.resolve()

        } catch {
            call.reject("Failed to start recognition: \(error.localizedDescription)")
        }
    }

    @objc func stopListening(_ call: CAPPluginCall) {
        stopRecognition()
        call.resolve()
    }

    private func stopRecognition() {
        recognitionRequest?.endAudio()
        recognitionRequest = nil

        recognitionTask?.cancel()
        recognitionTask = nil

        if let engine = audioEngine {
            if tapInstalled {
                engine.inputNode.removeTap(onBus: 0)
                tapInstalled = false
            }
            engine.stop()
        }
        audioEngine = nil

        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    override public func checkPermissions(_ call: CAPPluginCall) {
        let speech: String
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:                   speech = "granted"
        case .denied, .restricted:          speech = "denied"
        case .notDetermined:                speech = "prompt"
        @unknown default:                   speech = "prompt"
        }
        call.resolve(["microphone": speech, "speechRecognition": speech])
    }

    override public func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { _ in
            AVAudioSession.sharedInstance().requestRecordPermission { _ in
                self.checkPermissions(call)
            }
        }
    }
}
