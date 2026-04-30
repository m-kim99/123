# 음성모드 버그 수정 계획

> 이 문서는 음성모드 호환성 분석 보고서(버그 ①~⑮)에 대한 수정 계획입니다.
> 수정 대상 파일: `src/components/AIChatbot.tsx`, `src/lib/appBridge.ts`
> 수정 순서: ⑩ → ⑪ → ① → ⑧ → ⑦ → ② → ⑤ → ④⑥ → ③

---

## 1. [치명] 버그 ⑩: Android 앱 STT 완전 불작동

### 원인
`startNativeSTT()`가 `window.webkit?.messageHandlers?.cordova_iab`를 체크하는데 Android WebView에는 `window.webkit`이 없어서 즉시 return됨. 그런데 `toggleLiveVoice`에서는 그 뒤에 `isVoiceModeRef = true`, `setIsVoiceMode(true)`가 실행되니까 **UI만 켜지고 STT는 안 돌아가는 상태**.

### 수정 파일: `src/components/AIChatbot.tsx`

### 수정 위치: `toggleLiveVoice` 내부, `isRunningInApp()` 분기

### 수정 내용
기존 앱 분기를 네이티브 브릿지 존재 여부에 따라 분기 추가:

```typescript
if (isRunningInApp()) {
  const hasNativeBridge = !!window.webkit?.messageHandlers?.cordova_iab;
  
  if (hasNativeBridge) {
    // 기존 네이티브 STT 로직 그대로 유지
    audio.onended = () => { currentAudioRef.current = null; };
    audio.play()
      .then(() => console.log('✅ 시작 사운드 재생 성공'))
      .catch(err => console.error('❌ 시작 사운드 재생 실패:', err));

    setTimeout(() => {
      startNativeSTT((text) => {
        console.log('🎤 네이티브 STT 결과:', text);
        isVoiceModeRef.current = false;
        setIsVoiceMode(false);
        handleUserSpeech(text);
      });
      isVoiceModeRef.current = true;
      setIsVoiceMode(true);
    }, 300);
  } else {
    // Android 앱: 네이티브 브릿지 없음 → 브라우저 Web Speech API 폴백
    // 브라우저 환경과 동일한 경로 사용
    hasEverStartedRef.current = false;
    notAllowedRetryCountRef.current = 0;
    try { window.speechSynthesis?.cancel(); } catch (_) {}
    isVoiceModeRef.current = true;
    speechRecognition.startListening();
    setIsVoiceMode(true);
    console.log('✅ Android 앱 Web Speech API 폴백 시작');

    // 시작음도 브라우저 방식으로
    currentAudioRef.current = audio;
    audio.onended = () => { currentAudioRef.current = null; };
    setTimeout(() => {
      audio.play().catch(err => console.warn('시작음 재생 실패:', err));
    }, 1500);
  }
}
```

### 추가 수정 파일: `src/lib/appBridge.ts`

`requestNativeMicrophonePermission()`도 동일 문제가 있으므로 Android에서 조용히 실패하도록 처리 (Android WebView는 자체 권한 다이얼로그에 의존):

```typescript
export function requestNativeMicrophonePermission(): void {
  if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
    window.webkit.messageHandlers.cordova_iab.postMessage(
      JSON.stringify({ action: 'request_microphone' })
    );
  }
  // Android 앱: window.webkit 없음 → WebView 자체 권한 다이얼로그에 의존, 별도 처리 불필요
}
```

---

## 2. [높음] 버그 ⑪: Firefox 음성모드 버튼 고착

### 원인
`useSpeechRecognition` 내부에서 Web Speech API 미지원 시 `onError('음성 인식이 지원되지 않는 브라우저입니다.')`를 호출하는데, `onError` 핸들러가 `'not-allowed'`, `'audio-capture'`, `'network'`, `'service-not-available'`만 처리함. **그 외 에러는 무시되니까 voice mode가 ON 상태로 고착**. 입력창 disabled, 앱 먹통.

### 수정 파일: `src/components/AIChatbot.tsx`

### 수정 위치: `useSpeechRecognition`의 `onError` 콜백 맨 끝

### 수정 내용
기존 if-else 체인 맨 끝에 catch-all else 블록 추가:

```typescript
onError: (error) => {
  console.error('음성 인식 오류:', error);

  if (error === 'not-allowed') {
    // ... 기존 로직 그대로 유지 ...
  } else if (error === 'audio-capture') {
    // ... 기존 로직 그대로 유지 ...
  } else if (error === 'network' || error === 'service-not-available') {
    // ... 기존 로직 그대로 유지 ...
  } else {
    // ★ 추가: catch-all — 미지원 브라우저, 알 수 없는 오류 등
    console.error('처리되지 않은 STT 오류, 음성모드 종료:', error);
    isVoiceModeRef.current = false;
    setIsVoiceMode(false);
    setMessages(prev => [...prev, {
      id: `${Date.now()}-system`,
      role: 'assistant' as const,
      content: '🎤 이 브라우저에서는 음성 인식이 지원되지 않습니다. Chrome 또는 Safari를 사용해주세요.',
      timestamp: new Date(),
    }]);
  }
}
```

---

## 3. [중간] 버그 ①: iOS Safari 배경 전환 시 STT 죽음 (복구 없음)

### 원인
앱 전환 후 돌아오면 SpeechRecognition이 자동 종료되는데 `visibilitychange` 핸들러가 없어서 복구 안 됨. 마이크 버튼은 빨간색(켜짐)인데 STT는 죽어있음.

### 수정 파일: `src/components/AIChatbot.tsx`

### 수정 내용
새 `useEffect` 추가 (컴포넌트 내부, 다른 useEffect들 근처):

```typescript
// ★ 추가: 배경 전환 시 음성모드 STT 복구
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden && isVoiceModeRef.current) {
      console.log('📱 포그라운드 복귀 - STT 재시작 시도');
      setTimeout(() => {
        if (isVoiceModeRef.current && !isProcessingSpeechRef.current) {
          if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
            // iOS 앱: 네이티브 STT 재시작
            startNativeSTT((text) => {
              handleUserSpeech(text);
            });
          } else {
            // 브라우저 또는 Android 앱 폴백: Web Speech API 재시작
            speechRecognitionRef.current?.startListening();
          }
        }
      }, 500); // iOS 오디오세션 재활성화 대기
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [handleUserSpeech]);
```

---

## 4. [중간] 버그 ⑧: 더블탭 경쟁 조건

### 원인
`toggleLiveVoice`를 빠르게 두 번 호출하면 `window.onNativeSTTResult` 콜백이 덮어써지거나 상태가 꼬임.

### 수정 파일: `src/components/AIChatbot.tsx`

### 수정 내용
`toggleLiveVoice` 시작 부분에 debounce 플래그 추가:

```typescript
// ★ 추가: ref 선언 (다른 ref들 근처)
const isTogglingVoiceRef = useRef(false);

// toggleLiveVoice 내부 맨 첫 줄에 추가:
const toggleLiveVoice = useCallback(() => {
  // ★ 추가: 더블탭 방지
  if (isTogglingVoiceRef.current) return;
  isTogglingVoiceRef.current = true;
  setTimeout(() => { isTogglingVoiceRef.current = false; }, 500);

  console.log('🎤 음성 모드 토글 - 현재 상태:', isVoiceMode ? '켜짐' : '꺼짐');
  // ... 기존 로직 계속 ...
}, [/* 기존 deps */]);
```

---

## 5. [중간] 버그 ⑦: iOS 앱 1회성 음성모드 (연속 대화 불가)

### 원인
`onNativeSTTResult` 콜백에서 즉시 `isVoiceModeRef = false` 해버려서 한 번 인식 후 음성모드 종료. 브라우저는 STT→TTS→STT 자동 재시작 루프가 있지만 앱에는 없음.

### 수정 파일: `src/components/AIChatbot.tsx`

### 수정 내용 (2곳)

#### 5-1. `toggleLiveVoice` 내부 네이티브 STT 콜백 수정

음성모드를 바로 끄지 않도록 변경:

```typescript
// 기존:
startNativeSTT((text) => {
  console.log('🎤 네이티브 STT 결과:', text);
  isVoiceModeRef.current = false;   // ← 삭제
  setIsVoiceMode(false);            // ← 삭제
  handleUserSpeech(text);
});

// 변경:
startNativeSTT((text) => {
  console.log('🎤 네이티브 STT 결과:', text);
  // ★ 음성모드 유지 (연속 대화를 위해 여기서 끄지 않음)
  // TTS 완료 후 speakText.onend에서 자동으로 네이티브 STT 재시작
  handleUserSpeech(text);
});
```

#### 5-2. `speakText`의 `utterance.onend`에서 앱 환경 분기 추가

```typescript
utterance.onend = () => {
  console.log('🔊 TTS 완료');
  cleanupTts();
  setIsSpeaking(false);
  // TTS 완료 후 음성모드면 STT 재시작
  if (isVoiceModeRef.current) {
    setTimeout(() => {
      if (!isVoiceModeRef.current) return;
      
      if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
        // ★ 추가: iOS 앱 → TTS 끝나면 네이티브 STT 재시작 (연속 대화)
        startNativeSTT((text) => {
          handleUserSpeech(text);
        });
      } else {
        // 브라우저 또는 Android 앱 폴백
        speechRecognitionRef.current?.startListening();
      }
    }, 600);
  }
};
```

같은 패턴으로 `utterance.onerror`도 수정:

```typescript
utterance.onerror = (e: any) => {
  console.error('🔊 TTS 오류:', e?.error || e);
  cleanupTts();
  setIsSpeaking(false);
  if (isVoiceModeRef.current) {
    setTimeout(() => {
      if (!isVoiceModeRef.current) return;
      
      if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
        startNativeSTT((text) => {
          handleUserSpeech(text);
        });
      } else {
        speechRecognitionRef.current?.startListening();
      }
    }, 500);
  }
};
```

---

## 6. [중간] 버그 ②: not-allowed 3회 카운터 영구 비활성화

### 원인
연속 짧은 질문 시 TTS→STT 전환이 빠르게 반복되면 카운터가 금방 3에 도달하여 음성모드 영구 비활성화.

### 수정 파일: `src/components/AIChatbot.tsx`

### 수정 내용

ref 선언 변경:

```typescript
// 기존:
const notAllowedRetryCountRef = useRef(0);

// 변경:
const notAllowedTimestampsRef = useRef<number[]>([]);
```

`onError` 핸들러의 `'not-allowed'` + `hasEverStartedRef.current === true` 분기 수정:

```typescript
// 기존:
notAllowedRetryCountRef.current++;
console.warn(`iOS not-allowed 재시도 ${notAllowedRetryCountRef.current}/3`);
if (notAllowedRetryCountRef.current >= 3) {
  isVoiceModeRef.current = false;
  setIsVoiceMode(false);
  notAllowedRetryCountRef.current = 0;
  // 사용자 안내 메시지 ...
}

// 변경: 30초 윈도우 기반
const now = Date.now();
const recent = notAllowedTimestampsRef.current.filter(t => now - t < 30000);
recent.push(now);
notAllowedTimestampsRef.current = recent;
console.warn(`iOS not-allowed ${recent.length}/3 (30초 윈도우)`);

if (recent.length >= 3) {
  isVoiceModeRef.current = false;
  setIsVoiceMode(false);
  notAllowedTimestampsRef.current = [];
  setMessages(prev => [...prev, {
    id: `${Date.now()}-system`,
    role: 'assistant' as const,
    content: '🎤 마이크가 비활성화되었습니다. 마이크 버튼을 다시 눌러주세요.',
    timestamp: new Date(),
  }]);
}
```

`toggleLiveVoice` 시작 부분과 `onStart` 콜백에서 초기화 코드도 맞춰서 변경:

```typescript
// toggleLiveVoice 브라우저 분기:
// 기존: notAllowedRetryCountRef.current = 0;
// 변경:
notAllowedTimestampsRef.current = [];

// onStart 콜백:
// 기존: notAllowedRetryCountRef.current = 0;
// 변경:
notAllowedTimestampsRef.current = [];
```

---

## 7. [중간] 버그 ⑤: Android 중복 transcript 누적

### 원인
Android Chrome continuous=true에서 "안녕 트로이" 말하면 isFinal이 "안녕", "안녕 트로이" 두 번 옴. 둘 다 `accumulatedTranscriptRef`에 누적되어 "안녕 안녕 트로이"로 전송됨.

### 수정 파일: `src/components/AIChatbot.tsx`

### 수정 위치: `onResult` 콜백의 `isFinal` 분기

### 수정 내용

```typescript
if (isFinal) {
  if (transcript === lastFinalTranscriptRef.current) return;

  const prev = lastFinalTranscriptRef.current;
  lastFinalTranscriptRef.current = transcript;

  // ★ 수정: Android 누적 패턴 처리
  // 새 transcript가 이전 것을 포함하면 → 교체 (replace)
  // 완전히 새로운 발화면 → 누적 (append)
  if (prev && transcript.startsWith(prev)) {
    // "안녕 트로이"가 "안녕"을 포함 → 이전 것 제거 후 교체
    const accumulated = accumulatedTranscriptRef.current;
    if (accumulated.endsWith(prev)) {
      accumulatedTranscriptRef.current =
        (accumulated.slice(0, -prev.length).trim() + ' ' + transcript).trim();
    } else {
      accumulatedTranscriptRef.current = transcript;
    }
  } else {
    // 완전히 새로운 발화
    accumulatedTranscriptRef.current =
      (accumulatedTranscriptRef.current + ' ' + transcript).trim();
  }

  if (speechDebounceTimerRef.current) {
    clearTimeout(speechDebounceTimerRef.current);
  }

  // 즉시 인식 중단 (연속 인식 반복 방지)
  if (speechRecognitionRef.current?.isListening) {
    speechRecognitionRef.current.stopListening();
  }

  speechDebounceTimerRef.current = setTimeout(() => {
    lastFinalTranscriptRef.current = '';
    const fullTranscript = accumulatedTranscriptRef.current;
    accumulatedTranscriptRef.current = '';
    speechDebounceTimerRef.current = null;
    if (fullTranscript) {
      handleUserSpeech(fullTranscript);
    }
  }, 1000);
}
```

---

## 8. [낮음] 버그 ④⑥: 한국어 TTS 음성 미보장

### 원인
- iOS: 한국어 음성 미설치 시 영어 발음으로 읽거나 무음
- Android: `getVoices()`가 비동기이고 `voiceschanged` 이벤트 후에야 사용 가능. 첫 TTS가 무음될 수 있음

### 수정 파일: `src/components/AIChatbot.tsx`

### 수정 위치: `speakText` 함수 내부, `utterance.lang = 'ko-KR'` 다음

### 수정 내용

```typescript
utterance.lang = 'ko-KR';
utterance.rate = 1.1;
utterance.pitch = 1.0;

// ★ 추가: 한국어 TTS 음성 명시적 설정
const voices = window.speechSynthesis.getVoices();
const koVoice = voices.find(v => v.lang.startsWith('ko'));
if (koVoice) {
  utterance.voice = koVoice;
} else if (voices.length === 0) {
  // 음성 목록 아직 로드 안 됨 → voiceschanged 이벤트 대기 후 재시도
  const waitForVoices = new Promise<void>((resolve) => {
    const handler = () => {
      const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('ko'));
      if (v) utterance.voice = v;
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve();
    }, 1000); // 최대 1초 대기
  });
  await waitForVoices;
}
```

> 주의: `speakText`가 현재 동기 함수(useCallback)이므로 async로 변경 필요. 또는 voiceschanged를 컴포넌트 마운트 시 미리 처리하는 방식으로 대체 가능:

```typescript
// 대안: 컴포넌트 마운트 시 음성 프리로드 (별도 useEffect)
const koreanVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

useEffect(() => {
  const loadVoices = () => {
    const voices = window.speechSynthesis?.getVoices() || [];
    koreanVoiceRef.current = voices.find(v => v.lang.startsWith('ko')) || null;
  };
  loadVoices();
  window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
  return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
}, []);

// speakText 내부에서:
if (koreanVoiceRef.current) {
  utterance.voice = koreanVoiceRef.current;
}
```

이 대안이 더 깔끔함. speakText를 async로 바꿀 필요 없음.

---

## 9. [낮음] 버그 ③: 시작음 1500ms 지연 → iOS gesture context 이탈

### 원인
`setTimeout(() => { audio.play().catch(() => {}); }, 1500);`에서 1500ms 후는 user gesture context 밖이라 iOS Safari에서 `Audio.play()` 차단됨. `.catch(() => {})`로 에러가 무시됨.

### 수정 파일: `src/components/AIChatbot.tsx`

### 수정 내용
에러 무시 대신 최소한 경고 로그 추가:

```typescript
// 기존:
audio.play().catch(() => {});

// 변경:
audio.play().catch(err => console.warn('⚠️ 시작음 재생 차단 (gesture context 이탈):', err));
```

> 근본적 해결은 gesture context 안에서 즉시 play()하는 것인데, 현재 브라우저 경로에서는 STT가 먼저 오디오 세션을 잡아야 해서 의도적으로 지연시킨 것. 시작음은 UX 개선 요소이지 필수가 아니므로 현재는 경고 로그만 추가.

---

## 10. [나중에] Gemini Live 관련 (버그 ⑫~⑮)

현재 `useGeminiLive` + `useAudioPlayer`는 정의만 되어있고 AIChatbot에서 미사용. **실제 통합 시점에 처리**.

핵심 수정 포인트:
- **⑫ sampleRate**: `audioContext.sampleRate` 실제 값 확인 후 16000Hz로 리샘플링
- **⑬ AudioWorklet**: iOS 16.4 미만용 `ScriptProcessorNode` fallback
- **⑭ 절대 경로**: `/audio-processor.js` → `import.meta.env.BASE_URL + 'audio-processor.js'`
- **⑮ API 키 노출**: WebSocket URL에 키 직접 포함 대신 서버 프록시 경유

---

## 수정 순서 요약

| 순서 | 버그 | 심각도 | 예상 작업량 | 수정 파일 |
|------|------|--------|-------------|-----------|
| 1 | ⑩ Android 앱 STT 불작동 | 치명 | 30분 | AIChatbot.tsx, appBridge.ts |
| 2 | ⑪ Firefox 버튼 고착 | 높음 | 15분 | AIChatbot.tsx |
| 3 | ① iOS 배경전환 STT 죽음 | 중간 | 30분 | AIChatbot.tsx |
| 4 | ⑧ 더블탭 경쟁 조건 | 중간 | 10분 | AIChatbot.tsx |
| 5 | ⑦ iOS 앱 연속 대화 | 중간 | 45분 | AIChatbot.tsx |
| 6 | ② not-allowed 카운터 | 중간 | 20분 | AIChatbot.tsx |
| 7 | ⑤ Android 중복 transcript | 중간 | 30분 | AIChatbot.tsx |
| 8 | ④⑥ 한국어 TTS 음성 | 낮음 | 20분 | AIChatbot.tsx |
| 9 | ③ 시작음 gesture context | 낮음 | 5분 | AIChatbot.tsx |
| 10 | ⑫~⑮ Gemini Live | 보류 | - | useGeminiLive.ts |
