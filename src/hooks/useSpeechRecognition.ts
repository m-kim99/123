import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSpeechRecognitionProps {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
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
  const onSilenceEndRef = useRef(onSilenceEnd);
  onResultRef.current = onResult;
  onErrorRef.current = onError;
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

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;

    // iOS Safari: continuous=true에서 stop() 호출 전까지 isFinal이 발생하지 않음
    // → 3초 침묵 감지 후 강제 stop()으로 isFinal 유도
    // Chrome: isFinal이 자연 발생 → stopListening()이 타이머를 먼저 정리 → 간섭 없음
    const SILENCE_MS = 3000;
    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        if (recognitionRef.current === recognition) {
          try { recognition.stop(); } catch (_) {}
        }
      }, SILENCE_MS);
    };

    recognition.onstart = () => {
      console.log('🎤 음성 인식 시작');
      setIsListening(true);
      resetSilenceTimer();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimer();
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
        setTimeout(() => doStartRef.current(), 100);
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
