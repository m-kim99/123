import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSpeechRecognitionProps {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  language?: string;
  onSilenceEnd?: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

export function useSpeechRecognition({
  onResult,
  onError,
  onStart,
  language = 'ko-KR',
  onSilenceEnd,
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const pendingRestartRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs로 콜백 관리 (recognition 이벤트 핸들러의 stale closure 방지)
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onStartRef = useRef(onStart);
  const onSilenceEndRef = useRef(onSilenceEnd);
  onResultRef.current = onResult;
  onErrorRef.current = onError;
  onStartRef.current = onStart;
  onSilenceEndRef.current = onSilenceEnd;

  // 브라우저 지원 확인
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // 내부: 새 recognition 인스턴스 생성 및 시작
  const doStartRef = useRef<() => void>(() => {});

  const doStart = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // iOS 17/18 회귀 버그: continuous=true면 발화 없을 때 1~2초 만에 onend 발화
    // continuous=false로 설정하면 iOS가 발화를 기다리는 시간이 7~10초로 증가
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = !isIOS;  // iOS: false, 그 외: true
    recognition.interimResults = true;

    // iOS Safari: continuous=true에서 stop() 호출 전까지 isFinal이 발생하지 않음
    // → 발화 감지 후 2.5초 침묵 시 강제 stop()으로 isFinal 유도
    // 발화 없을 때는 8초 후 stop() (iOS 내부 타임아웃보다 넉넉히)
    // Chrome: isFinal이 자연 발생 → stopListening()이 타이머를 먼저 정리 → 간섭 없음
    const NO_SPEECH_TIMEOUT_MS = 8000;   // 발화 전 최대 대기
    const AFTER_SPEECH_SILENCE_MS = 2500; // 발화 후 침묵 감지
    const resetSilenceTimer = (ms: number) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        if (recognitionRef.current === recognition) {
          try { recognition.stop(); } catch (_) {}
        }
      }, ms);
    };

    recognition.onstart = () => {
      console.log('🎤 음성 인식 시작 (continuous:', recognition.continuous, ', iOS:', isIOS, ')');
      // onStart를 SYNCHRONOUSLY 호출 — useEffect 타이밍 버그 방지
      // onerror가 onstart 직후 발화해도 이미 hasEverStartedRef=true가 설정됨
      onStartRef.current?.();
      setIsListening(true);
      resetSilenceTimer(NO_SPEECH_TIMEOUT_MS);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimer(AFTER_SPEECH_SILENCE_MS);
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        console.log('🎤 최종 전사:', finalTranscript);
        onResultRef.current?.(finalTranscript, true);
      } else if (interimTranscript) {
        console.log('🎤 중간 전사:', interimTranscript);
        onResultRef.current?.(interimTranscript, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('음성 인식 오류:', event.error);
      if (event.error !== 'aborted') {
        onErrorRef.current?.(event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🎤 음성 인식 종료 (intentional:', intentionalStopRef.current, ')');
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognitionRef.current = null;
      setIsListening(false);

      // Safari: 이전 세션이 완전히 해제된 후에만 재시작
      if (pendingRestartRef.current) {
        pendingRestartRef.current = false;
        intentionalStopRef.current = false;
        setTimeout(() => doStartRef.current(), 500);
      } else if (!intentionalStopRef.current) {
        // Safari silence timeout 자동 복구 콜백
        // stopListening()으로 의도적 중단한 경우에는 호출하지 않음
        onSilenceEndRef.current?.();
      }
      intentionalStopRef.current = false;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language]);

  doStartRef.current = doStart;

  // 음성 인식 시작
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onErrorRef.current?.('음성 인식이 지원되지 않는 브라우저입니다.');
      return;
    }

    // 이전 인스턴스가 아직 종료 중이면 onend 후 재시작 예약
    if (recognitionRef.current) {
      pendingRestartRef.current = true;
      try { recognitionRef.current.stop(); } catch (_) {}
      return;
    }

    doStart();
  }, [doStart]);

  // 음성 인식 중단
  const stopListening = useCallback(() => {
    pendingRestartRef.current = false;
    intentionalStopRef.current = true;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      // Safari: ref를 여기서 null로 설정하지 않음
      // onend에서 처리해야 Safari가 마이크를 완전히 해제한 뒤 새 인스턴스 생성 가능
    }
    setIsListening(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      pendingRestartRef.current = false;
      intentionalStopRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}
