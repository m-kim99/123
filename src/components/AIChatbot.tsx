import React, { useState, useRef, useEffect, FormEvent, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAuthStore } from '@/store/authStore';
import expandIcon from '@/assets/expand.svg';
import reduceIcon from '@/assets/reduce.svg';
import closeIcon from '@/assets/close.svg';
import micIcon from '@/assets/mic.svg';
import micOnIcon from '@/assets/mic_on.svg';
import sendIcon from '@/assets/send.svg';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateResponse, type ChatSearchResult, type ChatHistoryItem } from '@/lib/chatbot';
import { formatDateTimeSimple } from '@/lib/utils';
import { isRunningInApp, requestNativeMicrophonePermission } from '@/lib/appBridge';

// **텍스트** 패턴을 <strong>으로 변환하는 함수
function parseBoldText(text: string, keyPrefix: string): ReactNode[] {
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={`${keyPrefix}-bold-${keyIndex++}`} className="font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// 링크 추출용 인터페이스
interface ExtractedLink {
  path: string;
  label: string;
}

// 텍스트에서 링크 패턴을 "아래"로 대치
function parseContentWithoutLinks(content: string): ReactNode[] {
  // 링크 패턴을 "아래"로 대치 (→ /path/... 또는 문서: /path/...)
  const cleanedContent = content
    .replace(/→\s*\/[^\s\n]+/g, '아래') // → /path/... → 아래
    .replace(/문서:\s*\/[^\s\n]+/g, '아래 문서') // 문서: /path/... → 아래 문서
    .replace(/\n{3,}/g, '\n\n') // 여러 줄바꿈 정리
    .trim();
  
  return parseBoldText(cleanedContent, 'content');
}

// 메시지에서 링크 추출 및 경로 수정
function extractLinksFromMessage(content: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const linkRegex = /(?:→\s*|문서:\s*)(\/[^\s\n]+)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    let path = match[1];
    let label = '문서 보기';
    
    // 경로 수정: /department/ → /departments/ (라우트와 일치시키기)
    if (path.includes('/department/') && !path.includes('/departments/')) {
      path = path.replace('/department/', '/departments/');
    }
    
    // 레이블 설정
    if (path.includes('/departments/')) {
      label = '부서 페이지로 이동';
    } else if (path.includes('/parent-category/') && path.includes('/subcategory/')) {
      label = '세부 스토리지로 이동';
    } else if (path.includes('/parent-category/')) {
      label = '대분류로 이동';
    } else if (path.includes('/documents')) {
      label = '문서 보기';
    } else if (path.includes('/shared')) {
      label = '공유 문서함';
    }
    links.push({ path, label });
  }
  
  return links;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  searchResults?: ChatSearchResult[];
}

interface AIChatbotProps {
  primaryColor: string;
}

const CHAT_STORAGE_KEY = 'troy_chat_messages';
const CHAT_OPEN_KEY = 'troy_chat_open';

const defaultMessage: ChatMessage = {
  id: '1',
  role: 'assistant',
  content: '안녕하세요! 저는 TrayStorage Connect의 AI 어시스턴트 트로이입니다. 😊 문서 검색과 관리를 도와드릴게요!',
  timestamp: new Date(Date.now() - 60000),
};

function loadMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
  } catch { /* ignore */ }
  return [defaultMessage];
}

export const AIChatbot = React.memo(function AIChatbot({ primaryColor }: AIChatbotProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem(CHAT_OPEN_KEY) === 'true');
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTall, setIsTall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 대화 내용을 sessionStorage에 저장 (페이지 이동 시 유지)
  useEffect(() => {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem(CHAT_OPEN_KEY, String(isOpen));
  }, [isOpen]);

  // 웹뷰 Pull-to-Refresh 방지
  useEffect(() => {
    if (isOpen) {
      window.scrollTo(0, window.scrollY + 1);
    }
  }, [isOpen]);


  // 음성 모드 상태
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const isVoiceModeRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRecognitionRef = useRef<{ startListening: () => void; stopListening: () => void; isListening: boolean } | null>(null);
  // iOS Safari: not-allowed 에러가 재시작 타이밍 문제인지 실제 권한거부인지 구분
  const hasEverStartedRef = useRef(false);
  const notAllowedRetryCountRef = useRef(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsKeepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 음성 중복 처리 방지용 ref
  const lastProcessedTranscriptRef = useRef<string>('');
  const isProcessingSpeechRef = useRef<boolean>(false);

  // 음성 인식 디바운스용 ref
  const speechDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const lastFinalTranscriptRef = useRef<string>('');

  // 브라우저 TTS로 텍스트 읽기 (읽는 동안 STT 정지)
  const speakText = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return;

    // 마크다운 기호 및 이모지 정리
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23FF}\u{24C2}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}\u{2623}\u{2626}\u{262A}\u{262E}\u{262F}\u{2638}-\u{263A}\u{2648}-\u{2653}\u{2660}\u{2663}\u{2665}\u{2666}\u{2668}\u{267B}\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}\u{269C}\u{26A0}\u{26A1}\u{26AA}\u{26AB}\u{26B0}\u{26B1}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26C8}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/→\s*\/[^\s\n]+/g, '')
      .replace(/문서:\s*\/[^\s\n]+/g, '')
      .replace(/[-·•]/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, '. ')
      .trim();

    if (!cleanText) return;

    // TTS 시작 전 STT 완전 정지 (Safari 오디오 세션 충돌 방지)
    if (speechRecognitionRef.current?.isListening) {
      speechRecognitionRef.current.stopListening();
    }

    // 이전 keep-alive 타이머 정리
    if (ttsKeepAliveRef.current) {
      clearInterval(ttsKeepAliveRef.current);
      ttsKeepAliveRef.current = null;
    }

    try { window.speechSynthesis.cancel(); } catch (_) {}

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;

    // Safari: utterance가 GC되면 TTS가 즉시 중단됨 → ref로 참조 유지
    currentUtteranceRef.current = utterance;

    const cleanupTts = () => {
      currentUtteranceRef.current = null;
      if (ttsKeepAliveRef.current) {
        clearInterval(ttsKeepAliveRef.current);
        ttsKeepAliveRef.current = null;
      }
    };

    utterance.onstart = () => {
      console.log('🔊 TTS 시작됨');
      setIsSpeaking(true);
      // Safari: 긴 텍스트 TTS가 ~15초 후 멈추는 버그 대응
      // 주기적 pause/resume으로 활성 상태 유지
      ttsKeepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          cleanupTts();
        }
      }, 10000);
    };

    utterance.onend = () => {
      console.log('🔊 TTS 완료');
      cleanupTts();
      setIsSpeaking(false);
      // TTS 완료 후 음성모드면 STT 재시작 (300ms→600ms: iOS TTS 오디오세션 해제 대기)
      if (isVoiceModeRef.current && speechRecognitionRef.current) {
        setTimeout(() => {
          if (isVoiceModeRef.current) {
            speechRecognitionRef.current?.startListening();
          }
        }, 600);
      }
    };

    utterance.onerror = (e: any) => {
      console.error('🔊 TTS 오류:', e?.error || e);
      cleanupTts();
      setIsSpeaking(false);
      // setTimeout 추가: async 컨텍스트에서 iOS recognition.start() 실패 방지
      if (isVoiceModeRef.current && speechRecognitionRef.current) {
        setTimeout(() => {
          speechRecognitionRef.current?.startListening();
        }, 500);
      }
    };

    // Safari: cancel() 직후 speak() 시 무시됨 + STT 오디오 세션 해제 대기
    console.log('🔊 TTS 예약 (150ms 후 speak)');
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 150);
  }, []);

  // 사용자 음성 전사 처리 - generateResponse 호출 후 TTS로 읽어줌
  const handleUserSpeech = useCallback(async (transcript: string) => {
    const trimmed = transcript.trim();
    if (!trimmed) return;

    // 중복 처리 방지
    if (trimmed === lastProcessedTranscriptRef.current || isProcessingSpeechRef.current) {
      return;
    }

    lastProcessedTranscriptRef.current = trimmed;
    isProcessingSpeechRef.current = true;

    // STT 일시정지 (응답 생성 동안)
    if (speechRecognitionRef.current?.isListening) {
      speechRecognitionRef.current.stopListening();
    }
    
    // 1. 사용자 메시지 + 빈 assistant 메시지 추가
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    const assistantId = `${Date.now()}-assistant`;
    
    setMessages(prev => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);
    setIsTyping(true);
    
    // 2. generateResponse 호출
    let finalText = '';
    let firstChunkReceived = false;
    
    try {
      const history: ChatHistoryItem[] = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      
      await generateResponse(trimmed, history, (partial, docs) => {
        if (!firstChunkReceived) {
          firstChunkReceived = true;
          setIsTyping(false);
        }
        
        finalText = partial;
        
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content: partial,
                  searchResults: docs && docs.length > 0 ? docs : undefined,
                  timestamp: new Date(),
                }
              : m
          )
        );
      });
      
      // 3. 최종 응답을 브라우저 TTS로 읽기
      if (finalText && isVoiceModeRef.current) {
        speakText(finalText);
      } else if (isVoiceModeRef.current && speechRecognitionRef.current) {
        // TTS 할 내용이 없으면 STT 재시작 (await 이후 async context → 800ms 딜레이)
        setTimeout(() => { speechRecognitionRef.current?.startListening(); }, 800);
      }
    } catch (error) {
      console.error('응답 생성 오류:', error);
      // 에러 시에도 음성모드면 STT 재시작 (800ms 딜레이)
      if (isVoiceModeRef.current && speechRecognitionRef.current) {
        setTimeout(() => { speechRecognitionRef.current?.startListening(); }, 800);
      }
    } finally {
      setIsTyping(false);
      isProcessingSpeechRef.current = false;
      lastProcessedTranscriptRef.current = '';
    }
  }, [messages, speakText]);

  // Web Speech API로 음성 인식 (STT)
  const speechRecognition = useSpeechRecognition({
    language: 'ko-KR',
    onStart: () => {
      // SYNCHRONOUS: onstart 핸들러 내부에서 바로 호출 → useEffect 타이밍 버그 없음
      hasEverStartedRef.current = true;
      notAllowedRetryCountRef.current = 0;
    },
    onSilenceEnd: () => {
      // onend 발생 후 재시작: iOS 오디오세션 해제 대기 (100ms→1000ms)
      if (isVoiceModeRef.current && !isProcessingSpeechRef.current) {
        setTimeout(() => {
          if (isVoiceModeRef.current) {
            speechRecognitionRef.current?.startListening();
          }
        }, 1000);
      }
    },
    onResult: (transcript, isFinal) => {
      if (isFinal) {
        // stop() 비동기로 인한 동일 transcript 중복만 차단
        // 다른 transcript는 통과 (Android 단어별/버퍼 finals 누적 허용)
        if (transcript === lastFinalTranscriptRef.current) return;
        lastFinalTranscriptRef.current = transcript;

        accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + transcript).trim();

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
    },
    onError: (error) => {
      console.error('음성 인식 오류:', error);

      if (error === 'not-allowed') {
        if (!hasEverStartedRef.current) {
          // 최초 권한 거부 (진짜 권한 문제)
          isVoiceModeRef.current = false;
          setIsVoiceMode(false);
          if (isRunningInApp()) {
            requestNativeMicrophonePermission();
            setMessages(prev => [...prev, {
              id: `${Date.now()}-system`,
              role: 'assistant' as const,
              content: '🎤 마이크 권한이 거부되었습니다. 권한을 허용한 후 다시 시도해주세요.',
              timestamp: new Date(),
            }]);
          } else {
            setMessages(prev => [...prev, {
              id: `${Date.now()}-system`,
              role: 'assistant' as const,
              content: '🎤 마이크 권한이 거부되었습니다. iPhone: 설정 → Safari → 마이크를 허용해주세요.',
              timestamp: new Date(),
            }]);
          }
        } else {
          // 재시작 중 not-allowed = iOS 오디오세션 타이밍 문제 → voice mode 유지, onSilenceEnd 재시도
          notAllowedRetryCountRef.current++;
          console.warn(`iOS not-allowed 재시도 ${notAllowedRetryCountRef.current}/3`);
          if (notAllowedRetryCountRef.current >= 3) {
            isVoiceModeRef.current = false;
            setIsVoiceMode(false);
            notAllowedRetryCountRef.current = 0;
            setMessages(prev => [...prev, {
              id: `${Date.now()}-system`,
              role: 'assistant' as const,
              content: '🎤 마이크가 비활성화되었습니다. 마이크 버튼을 다시 눌러주세요.',
              timestamp: new Date(),
            }]);
          }
        }
      } else if (error === 'audio-capture') {
        // 마이크 하드웨어 접근 실패 (다른 앱이 점유 중)
        isVoiceModeRef.current = false;
        setIsVoiceMode(false);
        setMessages(prev => [...prev, {
          id: `${Date.now()}-system`,
          role: 'assistant' as const,
          content: '🎤 마이크에 접근할 수 없습니다. 다른 앱이 마이크를 사용 중인지 확인해주세요.',
          timestamp: new Date(),
        }]);
      } else if (error === 'network' || error === 'service-not-available') {
        // 일시적 네트워크/서비스 오류 → voice mode 유지, onSilenceEnd가 재시도
        console.warn('STT 일시 오류 (재시도 예정):', error);
      }
    },
  });

  // speechRecognition을 ref에 저장 (콜백에서 접근용)
  useEffect(() => {
    speechRecognitionRef.current = speechRecognition;
  }, [speechRecognition]);
  // 주: hasEverStartedRef는 onStart 콜백에서 동기적으로 설정 (useEffect 타이밍 버그 제거)

  // 사운드 재생 헬퍼 함수 (PC/모바일 호환)
  const playSound = useCallback((soundPath: string, label: string) => {
    console.log(`🔊 ${label} 사운드 재생 시도:`, soundPath);
    
    // 이전 오디오 중단
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    try {
      const audio = new Audio(soundPath);
      audio.volume = 0.5;
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        console.log(`✔️ ${label} 사운드 재생 완료`);
        currentAudioRef.current = null;
      };
      
      // 모바일 대응: 즉시 play() 호출
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`✅ ${label} 사운드 재생 성공`);
          })
          .catch(err => {
            console.error(`❌ ${label} 사운드 재생 실패:`, err);
          });
      }
    } catch (err) {
      console.error(`❌ ${label} 사운드 로드 실패:`, err);
    }
  }, []);

  // 음성 모드 토글 (PC/모바일 호환)
  const toggleLiveVoice = useCallback(() => {
    console.log('🎤 음성 모드 토글 - 현재 상태:', isVoiceMode ? '켜짐' : '꺼짐');
    
    if (isVoiceMode) {
      // 음성 모드 종료
      console.log('🔴 음성 모드 종료 시작');
      isVoiceModeRef.current = false;
      speechRecognition.stopListening();
      try { window.speechSynthesis?.cancel(); } catch (_) { /* Android WebView 미지원 */ }
      setIsSpeaking(false);
      setIsVoiceMode(false);
      
      // 디바운스 타이머 및 누적 전사 초기화
      if (speechDebounceTimerRef.current) {
        clearTimeout(speechDebounceTimerRef.current);
        speechDebounceTimerRef.current = null;
      }
      accumulatedTranscriptRef.current = '';
      lastFinalTranscriptRef.current = '';
      lastProcessedTranscriptRef.current = '';
      isProcessingSpeechRef.current = false;
      
      // 종료 사운드 재생
      playSound('/sounds/end.wav', '종료');
    } else {
      // 음성 모드 시작
      console.log('🟢 음성 모드 시작 시도');

      // ⚠️ 모바일 대응: 사용자 제스처 컨텍스트 내에서 즉시 오디오 생성 및 재생
      // 이전 오디오 중단
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      
      const audio = new Audio('/sounds/start.wav');
      audio.volume = 0.5;
      currentAudioRef.current = audio;

      if (isRunningInApp()) {
        // 앱 환경: 사운드 대기·getUserMedia 스킵
        // - Android: 사운드 완료 대기 없이 즉시 시작 → 활성화 지연 해소
        // - iOS: getUserMedia 후 트랙 종료 시 오디오 세션이 해제되어 SpeechRecognition 실패하는 문제 방지
        audio.onended = () => { currentAudioRef.current = null; };
        audio.play()
          .then(() => console.log('✅ 시작 사운드 재생 성공'))
          .catch(err => console.error('❌ 시작 사운드 재생 실패:', err));

        setTimeout(() => {
          isVoiceModeRef.current = true;
          speechRecognition.startListening();
          setIsVoiceMode(true);
          console.log('✅ 음성 인식 시작됨 (앱)');
        }, 300);
      } else {
        // 브라우저 환경: gesture context 살아있는 동기 구간에서 STT 먼저 시작
        // Safari macOS는 await 이후 gesture context가 소멸되어 SpeechRecognition.start()가 not-allowed 에러 발생
        // → getUserMedia 제거, await 제거, STT를 동기적으로 즉시 시작
        // iOS: 재시작 추적 초기화
        hasEverStartedRef.current = false;
        notAllowedRetryCountRef.current = 0;

        // 원인#3: TTS 오디오세션이 playback 모드이면 STT 시작 즉시 실패
        try { window.speechSynthesis?.cancel(); } catch (_) {}

        // 원인#6: user gesture context 최우선 확보 → startListening()을 setState보다 먼저 호출
        // 원인#4: currentAudioRef 할당을 startListening() 이후로 이동 → 오디오 초기화가 STT 앞에 오는 것 방지
        isVoiceModeRef.current = true;
        speechRecognition.startListening();
        setIsVoiceMode(true);
        console.log('✅ 음성 인식 시작됨');

        // 오디오는 1500ms 후 재생 (iOS AVAudioSession: STT가 먼저 세션을 확보한 뒤 재생)
        currentAudioRef.current = audio;
        audio.onended = () => { currentAudioRef.current = null; };
        audio.onerror = () => { currentAudioRef.current = null; };
        setTimeout(() => { audio.play().catch(() => {}); }, 1500);
      }
    }
  }, [isVoiceMode, speechRecognition]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const assistantId = `${Date.now()}-assistant`;

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);
    setInputValue('');
    setIsTyping(true);

    (async () => {
      try {
        // history에는 기존 메시지만 포함하고, 이번에 보낸 메시지는 message 인자로만 한 번 전달
        const history: ChatHistoryItem[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        let firstChunkReceived = false;

        await generateResponse(trimmed, history, (partial, docs) => {
          if (!firstChunkReceived) {
            firstChunkReceived = true;
            setIsTyping(false);
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: partial,
                    searchResults: docs && docs.length > 0 ? docs : undefined,
                    timestamp: new Date(),
                  }
                : m
            )
          );
        });
      } finally {
        setIsTyping(false);
      }
    })();
  };

  const handleSendMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    console.log('메시지 전송:', inputValue);
    sendMessage(inputValue);
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <>
      {!isOpen && (
        <Button
          size="icon"
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: primaryColor }}
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1 rounded-lg" style={{ backgroundColor: `${primaryColor}20` }}>
                <MessageSquare className="h-4 w-4" style={{ color: primaryColor }} />
              </div>
              AI 챗봇
            </CardTitle>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsTall((prev) => !prev)}
                className="h-7 w-7 flex items-center justify-center rounded-md focus:outline-none p-0 border-0"
                style={{ backgroundColor: primaryColor }}
              >
                <img
                  src={isTall ? reduceIcon : expandIcon}
                  alt={isTall ? '축소' : '확장'}
                  className="h-5 w-5 block object-contain pointer-events-none"
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    // 음성 모드 종료 및 TTS 중단
                    if (isVoiceMode) {
                      isVoiceModeRef.current = false;
                      speechRecognition.stopListening();
                      setIsVoiceMode(false);
                      setIsSpeaking(false);
                      if (speechDebounceTimerRef.current) {
                        clearTimeout(speechDebounceTimerRef.current);
                        speechDebounceTimerRef.current = null;
                      }
                      accumulatedTranscriptRef.current = '';
                      lastFinalTranscriptRef.current = '';
                      lastProcessedTranscriptRef.current = '';
                      isProcessingSpeechRef.current = false;
                    }
                    window.speechSynthesis?.cancel();
                    if (currentAudioRef.current) {
                      currentAudioRef.current.pause();
                      currentAudioRef.current.currentTime = 0;
                      currentAudioRef.current = null;
                    }
                  } catch (e) {
                    console.error('챗봇 닫기 클린업 오류:', e);
                  }
                  setIsOpen(false);
                }}
                className="h-7 w-7 flex items-center justify-center rounded-md focus:outline-none p-0 border-0"
                style={{ backgroundColor: primaryColor }}
              >
                <img src={closeIcon} alt="닫기" className="h-5 w-5 block object-contain pointer-events-none" />
              </button>
            </div>
          </CardHeader>

          <CardContent
            className={`p-0 flex flex-col ${isTall ? 'h-[36rem]' : 'h-96'}`}
          >
            <ScrollArea className="flex-1 p-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-1 mb-3">
                  <div
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'text-white'
                          : 'text-slate-700'
                      }`}
                      style={
                        message.role === 'user'
                          ? { backgroundColor: primaryColor }
                          : { backgroundColor: '#f1f5f9' }
                      }
                    >
                      <div className="text-sm break-words whitespace-pre-line">
                        {message.role === 'assistant'
                          ? parseContentWithoutLinks(message.content)
                          : message.content
                        }
                      </div>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  {/* 텍스트 내 링크를 카드로 표시 */}
                  {message.role === 'assistant' && (() => {
                    const extractedLinks = extractLinksFromMessage(message.content);
                    if (extractedLinks.length > 0) {
                      return (
                        <div className="ml-2 space-y-2 mt-2">
                          {extractedLinks.map((link, idx) => (
                            <div
                              key={`link-card-${idx}`}
                              className="border border-slate-200 rounded-lg bg-white px-4 py-3 text-xs shadow-sm cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsOpen(false);
                                // 약간의 딜레이 후 네비게이션 (챗봇 닫힌 후)
                                setTimeout(() => {
                                  navigate(link.path);
                                }, 100);
                              }}
                            >
                              <div className="font-semibold text-slate-800 text-sm">
                                📄 {link.label}
                              </div>
                              <div className="text-slate-400 text-[10px] mt-1 truncate">
                                {link.path}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {/* searchResults 카드 표시 */}
                  {message.role === 'assistant' &&
                    message.searchResults &&
                    message.searchResults.length > 0 && (
                      <div className="ml-2 space-y-2 mt-2">
                        {message.searchResults.slice(0, 5).map((doc) => (
                          <div
                            key={doc.id}
                            className="border border-slate-200 rounded-lg bg-white px-4 py-3 text-xs shadow-sm cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
                            onClick={() => {
                              if (doc.parentCategoryId && doc.subcategoryId) {
                                const basePath = user?.role === 'admin' ? '/admin' : '/team';
                                navigate(`${basePath}/parent-category/${doc.parentCategoryId}/subcategory/${doc.subcategoryId}`);
                                setIsOpen(false);
                              }
                            }}
                          >
                            <div className="font-semibold text-slate-800 text-sm">
                              {doc.name}
                            </div>
                            <div className="text-slate-500 mt-1">
                              {doc.departmentName && <span>{doc.departmentName}</span>}
                              {doc.categoryName && (
                                <span>
                                  {doc.departmentName ? ' · ' : ''}
                                  {doc.categoryName}
                                </span>
                              )}
                            </div>
                            {doc.storageLocation && (
                              <div className="text-slate-500">
                                {doc.storageLocation}
                              </div>
                            )}
                            {doc.uploadDate && (
                              <div className="text-slate-400 text-[10px] mt-1">
                                {formatDateTimeSimple(doc.uploadDate)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="px-3 py-1 rounded-lg bg-transparent text-xs text-slate-600">
                    생각 중...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </ScrollArea>

            <div className="px-4 pb-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickQuestion('인사팀 문서는 어디에 있나요?')}
              >
                인사팀 문서는 어디에 있나요?
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickQuestion('전체 문서 수는?')}
              >
                전체 문서 수는?
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickQuestion('카테고리 목록 보여줘')}
              >
                카테고리 목록 보여줘
              </Button>
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isVoiceMode ? '🎤 음성 대화 중... 말씀하세요' : '질문하세요...'}
                  className="text-sm pr-10"
                  disabled={isVoiceMode}
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md focus:outline-none p-0 border-0"
                  style={{ backgroundColor: primaryColor }}
                  disabled={isVoiceMode}
                >
                  <img src={sendIcon} alt="전송" className="h-5 w-5 block object-contain pointer-events-none" />
                </button>
              </div>
              {/* 음성 대화 버튼 */}
              <button
                type="button"
                onClick={toggleLiveVoice}
                className="h-7 w-7 flex items-center justify-center rounded-md focus:outline-none p-0 border-0"
                style={{ backgroundColor: isVoiceMode ? '#ef4444' : primaryColor }}
                title={isVoiceMode ? '음성 대화 종료' : '음성 대화 시작'}
              >
                <img
                  src={isVoiceMode ? micOnIcon : micIcon}
                  alt={isVoiceMode ? '음성 대화 종료' : '음성 대화 시작'}
                  className="h-5 w-5 block object-contain pointer-events-none"
                />
              </button>
            </form>
            {isSpeaking && (
              <div className="text-xs text-green-600 animate-pulse text-center pb-2">🔊 AI가 답변 중...</div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
});
