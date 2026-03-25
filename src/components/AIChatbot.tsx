import React, { useState, useRef, useEffect, FormEvent, ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { isRunningInApp, requestNativeMicrophonePermission, startNativeSTT, submitNativeSTT, stopNativeSTT, stopNativeSTTSilent } from '@/lib/appBridge';

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
function parseContentWithoutLinks(content: string, below?: string, belowDoc?: string): ReactNode[] {
  const belowText = below || '아래';
  const belowDocText = belowDoc || '아래 문서';
  const cleanedContent = content
    .replace(/→\s*\/[^\s\n]+/g, belowText)
    .replace(/문서:\s*\/[^\s\n]+/g, belowDocText)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return parseBoldText(cleanedContent, 'content');
}

// 메시지에서 링크 추출 및 경로 수정
function extractLinksFromMessage(content: string, labels?: { viewDoc: string; goDept: string; goSub: string; goParent: string; shared: string }): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const linkRegex = /(?:→\s*|문서:\s*)(\/[^\s\n]+)/g;
  let match;
  const l = labels || { viewDoc: '문서 보기', goDept: '부서 페이지로 이동', goSub: '세부 스토리지로 이동', goParent: '대분류로 이동', shared: '공유 문서함' };
  
  while ((match = linkRegex.exec(content)) !== null) {
    let path = match[1];
    let label = l.viewDoc;
    
    // 경로 수정: /department/ → /departments/ (라우트와 일치시키기)
    if (path.includes('/department/') && !path.includes('/departments/')) {
      path = path.replace('/department/', '/departments/');
    }
    
    // 레이블 설정
    if (path.includes('/departments/')) {
      label = l.goDept;
    } else if (path.includes('/parent-category/') && path.includes('/subcategory/')) {
      label = l.goSub;
    } else if (path.includes('/parent-category/')) {
      label = l.goParent;
    } else if (path.includes('/documents')) {
      label = l.viewDoc;
    } else if (path.includes('/shared')) {
      label = l.shared;
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

function getChatStorageKey(userId: string | undefined) {
  return userId ? `${CHAT_STORAGE_KEY}_${userId}` : CHAT_STORAGE_KEY;
}

function getChatOpenKey(userId: string | undefined) {
  return userId ? `${CHAT_OPEN_KEY}_${userId}` : CHAT_OPEN_KEY;
}

function loadMessages(defaultMsg: ChatMessage, userId: string | undefined): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(getChatStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
  } catch { /* ignore */ }
  return [defaultMsg];
}

export const AIChatbot = React.memo(function AIChatbot({ primaryColor }: AIChatbotProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const defaultMessage: ChatMessage = {
    id: '1',
    role: 'assistant',
    content: t('chatbot.defaultMessage'),
    timestamp: new Date(Date.now() - 60000),
  };

  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem(getChatOpenKey(user?.id)) === 'true');
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages(defaultMessage, user?.id));
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTall, setIsTall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 사용자 전환 감지: user.id가 바뀌면 메시지·열림상태 초기화 (방어적 리셋)
  const prevUserIdRef = useRef<string | undefined>(user?.id);
  useEffect(() => {
    if (prevUserIdRef.current !== user?.id) {
      prevUserIdRef.current = user?.id;
      setMessages(loadMessages(defaultMessage, user?.id));
      setIsOpen(false);
    }
  // defaultMessage는 매 렌더마다 새 객체이므로 의존성에서 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 대화 내용을 sessionStorage에 저장 (페이지 이동 시 유지, 사용자별 스코프)
  useEffect(() => {
    sessionStorage.setItem(getChatStorageKey(user?.id), JSON.stringify(messages));
  }, [messages, user?.id]);

  useEffect(() => {
    sessionStorage.setItem(getChatOpenKey(user?.id), String(isOpen));
  }, [isOpen, user?.id]);

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
  // 30초 슬라이딩 윈도우 기반 not-allowed 추적 (단순 카운터는 연속 대화 시 너무 쉽게 한도 도달)
  const notAllowedTimestampsRef = useRef<number[]>([]);
  // 더블탭 방지 (500ms 쿨다운)
  const isTogglingVoiceRef = useRef(false);
  // 한국어 TTS 음성 프리로드 ref (Android 첫 TTS 무음 / iOS 발음 오류 방지)
  const koreanVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // speakText([] deps)의 빈 closure에서 최신 handleUserSpeech를 참조하기 위한 ref
  const handleUserSpeechRef = useRef<((transcript: string) => void) | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsKeepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // iOS 앱 네이티브 STT 무한 대기 방지용 워치독 타이머
  const nativeSTTWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // 한국어 TTS 음성 명시적 지정 (Android 첫 TTS 무음 / iOS 발음 오류 방지)
    if (koreanVoiceRef.current) {
      utterance.voice = koreanVoiceRef.current;
    }

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
        // 음성모드 OFF 또는 TTS 종료 시 인터벌 자체 정리
        if (window.speechSynthesis.speaking && isVoiceModeRef.current) {
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
      // TTS 완료 후 음성모드면 STT 재시작 (iOS TTS 오디오세션 해제 대기 600ms)
      if (isVoiceModeRef.current) {
        setTimeout(() => {
          if (!isVoiceModeRef.current) return;
          if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
            // iOS 앱: 네이티브 STT 재시작 (voice mode ON 상태일 때만 — 연속 음성 요청 시)
            console.log('[VoiceMode] TTS 완료 → 네이티브 STT 재시작');
            startNativeSTTWithWatchdog();
          } else {
            // 브라우저 또는 Android 앱 폴백
            speechRecognitionRef.current?.startListening();
          }
        }, 600);
      }
    };

    utterance.onerror = (e: any) => {
      console.error('🔊 TTS 오류:', e?.error || e);
      cleanupTts();
      setIsSpeaking(false);
      if (isVoiceModeRef.current) {
        setTimeout(() => {
          if (!isVoiceModeRef.current) return;
          if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
            console.log('[VoiceMode] TTS 오류 → 네이티브 STT 재시작');
            startNativeSTTWithWatchdog();
          } else {
            speechRecognitionRef.current?.startListening();
          }
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
      }, i18n.language);
      
      // 3. 최종 응답을 브라우저 TTS로 읽기
      if (finalText && isVoiceModeRef.current) {
        speakText(finalText);
      } else if (isVoiceModeRef.current) {
        // TTS 할 내용이 없으면 STT 재시작 (await 이후 async context → 800ms 딜레이)
        setTimeout(() => {
          if (!isVoiceModeRef.current) return;
          if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
            console.log('[VoiceMode] TTS 내용 없음 → 네이티브 STT 재시작');
            startNativeSTTWithWatchdog();
          } else {
            speechRecognitionRef.current?.startListening();
          }
        }, 800);
      }
    } catch (error) {
      console.error('응답 생성 오류:', error);
      // 에러 시에도 음성모드면 STT 재시작 (800ms 딜레이)
      if (isVoiceModeRef.current) {
        setTimeout(() => {
          if (!isVoiceModeRef.current) return;
          if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
            console.log('[VoiceMode] 응답 오류 → 네이티브 STT 재시작');
            startNativeSTTWithWatchdog();
          } else {
            speechRecognitionRef.current?.startListening();
          }
        }, 800);
      }
    } finally {
      setIsTyping(false);
      isProcessingSpeechRef.current = false;
      lastProcessedTranscriptRef.current = '';
    }
  }, [messages, speakText]);

  // speakText([] deps) closure에서 항상 최신 handleUserSpeech를 참조하도록 매 렌더마다 갱신
  handleUserSpeechRef.current = handleUserSpeech;

  // iOS 앱 네이티브 STT 시작 + 30초 워치독 (침묵으로 onNativeSTTResult 미호출 시 음성모드 자동 종료)
  // 모든 startNativeSTT 콜백이 동일 패턴이므로 단일 헬퍼로 통합
  const startNativeSTTWithWatchdog = useCallback(() => {
    console.log('[VoiceMode] startNativeSTTWithWatchdog 호출');
    // 이전 워치독 해제 (중복 호출 방어)
    if (nativeSTTWatchdogRef.current) {
      clearTimeout(nativeSTTWatchdogRef.current);
      nativeSTTWatchdogRef.current = null;
    }
    // 이전 네이티브 STT 세션 정리 (sttstop 선행 전송)
    // 네이티브가 연속 sttstart를 지원하지 않을 수 있으므로 깨끗한 상태에서 재시작
    stopNativeSTTSilent();
    startNativeSTT((text) => {
      console.log('[VoiceMode] STT 결과 수신:', text);
      // 결과 수신 → 워치독 해제
      if (nativeSTTWatchdogRef.current) {
        clearTimeout(nativeSTTWatchdogRef.current);
        nativeSTTWatchdogRef.current = null;
      }
      handleUserSpeechRef.current?.(text);
    });
    // 30초 이내 결과 없으면 음성모드 자동 종료
    nativeSTTWatchdogRef.current = setTimeout(() => {
      nativeSTTWatchdogRef.current = null;
      if (isVoiceModeRef.current) {
        console.warn('⏱ 네이티브 STT 타임아웃 (30초) — 음성 모드 종료');
        isVoiceModeRef.current = false;
        setIsVoiceMode(false);
        setMessages(prev => [...prev, {
          id: `${Date.now()}-system`,
          role: 'assistant' as const,
          content: t('chatbot.voiceTimeout'),
          timestamp: new Date(),
        }]);
      }
    }, 30000);
  }, []);

  // Web Speech API로 음성 인식 (STT)
  const speechRecognition = useSpeechRecognition({
    language: 'ko-KR',
    onStart: () => {
      // SYNCHRONOUS: onstart 핸들러 내부에서 바로 호출 → useEffect 타이밍 버그 없음
      hasEverStartedRef.current = true;
      notAllowedTimestampsRef.current = []; // STT 성공 시 타임스탬프 초기화
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
        if (transcript === lastFinalTranscriptRef.current) return;
        const prevTranscript = lastFinalTranscriptRef.current;
        lastFinalTranscriptRef.current = transcript;

        // Android Chrome continuous=true: isFinal이 누적형으로 발생 가능
        // 예) "안녕" → "안녕 트로이" — 이전 것이 새 것의 접두사면 교체, 아니면 누적
        if (prevTranscript && transcript.startsWith(prevTranscript)) {
          const accumulated = accumulatedTranscriptRef.current;
          if (accumulated.endsWith(prevTranscript)) {
            accumulatedTranscriptRef.current =
              (accumulated.slice(0, -prevTranscript.length).trim() + ' ' + transcript).trim();
          } else {
            accumulatedTranscriptRef.current = transcript;
          }
        } else {
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
              content: t('chatbot.micDeniedApp'),
              timestamp: new Date(),
            }]);
          } else {
            setMessages(prev => [...prev, {
              id: `${Date.now()}-system`,
              role: 'assistant' as const,
              content: t('chatbot.micDeniedBrowser'),
              timestamp: new Date(),
            }]);
          }
        } else {
          // 재시작 중 not-allowed = iOS 오디오세션 타이밍 문제 → 30초 슬라이딩 윈도우 내 3회 초과 시 비활성화
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
              content: t('chatbot.micDeactivated'),
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
          content: t('chatbot.micUnavailable'),
          timestamp: new Date(),
        }]);
      } else if (error === 'network' || error === 'service-not-available') {
        // 일시적 네트워크/서비스 오류 → voice mode 유지, onSilenceEnd가 재시도
        console.warn('STT 일시 오류 (재시도 예정):', error);
      } else {
        // catch-all: 미지원 브라우저(Firefox 등) 또는 알 수 없는 오류
        // 참고: toggleLiveVoice의 isSupported 조기 차단으로 Firefox는 여기 도달하지 않아야 함
        // 그러나 혹시 도달하더라도 음성모드를 확실히 OFF로
        console.error('처리되지 않은 STT 오류, 음성모드 종료:', error);
        isVoiceModeRef.current = false;
        setIsVoiceMode(false);
        setMessages(prev => [...prev, {
          id: `${Date.now()}-system`,
          role: 'assistant' as const,
          content: t('chatbot.browserNotSupported'),
          timestamp: new Date(),
        }]);
      }
    },
  });

  // speechRecognition을 ref에 저장 (콜백에서 접근용)
  useEffect(() => {
    speechRecognitionRef.current = speechRecognition;
  }, [speechRecognition]);
  // 주: hasEverStartedRef는 onStart 콜백에서 동기적으로 설정 (useEffect 타이밍 버그 제거)

  // 컴포넌트 언마운트 시 음성 리소스 전체 정리
  // 음성 모드 ON 상태에서 라우트 변경 시 타이머·TTS·STT 누수 방지
  useEffect(() => {
    return () => {
      // 음성 모드 플래그 즉시 해제 (진행 중인 콜백이 새 작업을 시작하지 않도록)
      isVoiceModeRef.current = false;

      // TTS keep-alive setInterval 정리
      if (ttsKeepAliveRef.current) {
        clearInterval(ttsKeepAliveRef.current);
        ttsKeepAliveRef.current = null;
      }

      // 네이티브 STT 워치독 setTimeout 정리
      if (nativeSTTWatchdogRef.current) {
        clearTimeout(nativeSTTWatchdogRef.current);
        nativeSTTWatchdogRef.current = null;
      }

      // 음성 인식 디바운스 setTimeout 정리
      if (speechDebounceTimerRef.current) {
        clearTimeout(speechDebounceTimerRef.current);
        speechDebounceTimerRef.current = null;
      }

      // 브라우저 TTS 중단
      try { window.speechSynthesis?.cancel(); } catch (_) {}
      currentUtteranceRef.current = null;

      // 재생 중인 오디오 중단
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // STT 중단
      try { speechRecognitionRef.current?.stopListening(); } catch (_) {}

      // 네이티브 STT 중단
      try {
        if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
          stopNativeSTT();
        }
      } catch (_) {}
    };
  }, []); // 의존성 없음: 모든 상태는 ref로 접근

  // 한국어 TTS 음성 프리로드 (Android 첫 TTS 무음 / iOS 발음 오류 방지)
  // voiceschanged 이벤트 후에야 음성 목록이 채워지는 브라우저 대응
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      koreanVoiceRef.current = voices.find(v => v.lang.startsWith('ko')) || null;
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // 배경 전환 후 포그라운드 복귀 시 STT 자동 복구
  // iOS Safari/앱: 배경 전환 시 SpeechRecognition이 자동 종료되므로 복귀 후 재시작
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isVoiceModeRef.current && !isProcessingSpeechRef.current) {
        console.log('📱 포그라운드 복귀 - STT 재시작 시도');
        setTimeout(() => {
          if (!isVoiceModeRef.current || isProcessingSpeechRef.current) return;
          if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
            startNativeSTTWithWatchdog();
          } else {
            speechRecognitionRef.current?.startListening();
          }
        }, 500); // iOS 오디오세션 재활성화 대기
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []); // deps 없음: 모든 상태는 ref로 접근 → 불필요한 재등록 없음

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
            currentAudioRef.current = null; // 실패한 Audio 객체 참조 해제
          });
      }
    } catch (err) {
      console.error(`❌ ${label} 사운드 로드 실패:`, err);
    }
  }, []);

  // 음성 모드 토글 (PC/모바일 호환)
  const toggleLiveVoice = useCallback(() => {
    // 더블탭 방지 (500ms 쿨다운)
    if (isTogglingVoiceRef.current) return;
    isTogglingVoiceRef.current = true;
    setTimeout(() => { isTogglingVoiceRef.current = false; }, 500);

    console.log('🎤 음성 모드 토글 - 현재 상태:', isVoiceMode ? '켜짐' : '꺼짐');

    if (isVoiceMode) {
      // 음성 모드 종료
      console.log('🔴 음성 모드 종료 시작');
      isVoiceModeRef.current = false;
      // 네이티브 STT 워치독 즉시 해제
      if (nativeSTTWatchdogRef.current) {
        clearTimeout(nativeSTTWatchdogRef.current);
        nativeSTTWatchdogRef.current = null;
      }
      // Android 앱은 window.webkit 없음 → stopNativeSTT() no-op → speechRecognition.stopListening() 필요
      if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
        stopNativeSTT();
      } else {
        speechRecognition.stopListening();
      }
      // TTS keep-alive 인터벌 즉시 정리 (cancel() 이후 onend 미발화 케이스 대응)
      if (ttsKeepAliveRef.current) {
        clearInterval(ttsKeepAliveRef.current);
        ttsKeepAliveRef.current = null;
      }
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

      // 재생 중인 종료음 등 이전 오디오 중단
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }

      // 네이티브 브릿지 존재 여부로 iOS 앱 vs 브라우저/Android 앱 분기
      const hasNativeBridge = isRunningInApp() && !!window.webkit?.messageHandlers?.cordova_iab;

      if (hasNativeBridge) {
        // iOS 앱: 네이티브 STT 사용 (앱케이크 WKWebView 브릿지)
        startNativeSTTWithWatchdog();
        isVoiceModeRef.current = true;
        setIsVoiceMode(true);
        console.log('✅ 네이티브 STT 시작됨 (iOS 앱)');
      } else {
        // 브라우저 또는 Android 앱 폴백: Web Speech API 사용

        // Firefox 등 미지원 브라우저 조기 차단
        // (onError catch-all만으로는 React 배칭으로 인해 setIsVoiceMode(true)가 덮어씀)
        if (!speechRecognition.isSupported) {
          isTogglingVoiceRef.current = false;
          setMessages(prev => [...prev, {
            id: `${Date.now()}-system`,
            role: 'assistant' as const,
            content: t('chatbot.browserNotSupported'),
            timestamp: new Date(),
          }]);
          return;
        }

        // iOS: 재시작 추적 초기화
        hasEverStartedRef.current = false;
        notAllowedTimestampsRef.current = [];

        // TTS 오디오세션이 playback 모드이면 STT 시작 즉시 실패 방지
        try { window.speechSynthesis?.cancel(); } catch (_) {}

        // user gesture context 최우선 확보 → startListening()을 setState보다 먼저 호출
        isVoiceModeRef.current = true;
        speechRecognition.startListening();
        setIsVoiceMode(true);
        console.log('✅ 음성 인식 시작됨');
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
        }, i18n.language);
      } finally {
        setIsTyping(false);
      }
    })();
  };

  const handleSendMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // iOS 앱(네이티브 STT) 음성모드 중 전송: sttenter 전송 → 음성모드 종료 → 입력 텍스트 전송
    // Android 앱은 Web Speech API 사용(hasNativeBridge=false) → 일반 전송 경로로 fall-through
    const hasNativeBridge = isRunningInApp() && !!window.webkit?.messageHandlers?.cordova_iab;
    if (hasNativeBridge && isVoiceMode) {
      const savedInput = inputValue.trim();
      let callbackReceived = false;

      // 기존 콜백을 교체: sttenter 응답으로 텍스트가 오면 전송 처리
      window.onNativeSTTResult = (text: string) => {
        console.log('[VoiceSend] onNativeSTTResult 콜백 수신, text=', text);
        callbackReceived = true;
        window.onNativeSTTResult = null;
        if (text?.trim()) {
          sendMessage(text.trim());
        }
      };
      // sttenter 전송 (앱이 텍스트 확정 후 위 콜백 호출)
      submitNativeSTT();

      // 콜백이 500ms 내에 안 오면 inputValue로 폴백 (앱이 콜백 미호출 시 대비)
      setTimeout(() => {
        if (!callbackReceived) {
          console.warn('[VoiceSend] 콜백 미수신 (500ms) — inputValue 폴백:', savedInput);
          window.onNativeSTTResult = null;
          if (savedInput) {
            sendMessage(savedInput);
          }
        }
      }, 500);

      // 음성모드 종료 및 상태 초기화
      isVoiceModeRef.current = false;
      setIsVoiceMode(false);
      // 워치독 타이머 해제
      if (nativeSTTWatchdogRef.current) {
        clearTimeout(nativeSTTWatchdogRef.current);
        nativeSTTWatchdogRef.current = null;
      }
      if (speechDebounceTimerRef.current) {
        clearTimeout(speechDebounceTimerRef.current);
        speechDebounceTimerRef.current = null;
      }
      accumulatedTranscriptRef.current = '';
      lastFinalTranscriptRef.current = '';
      lastProcessedTranscriptRef.current = '';
      isProcessingSpeechRef.current = false;
      return;
    }

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
              {t('chatbot.title')}
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
                  alt={isTall ? t('pdfViewer.zoomOut') : t('pdfViewer.zoomIn')}
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
                      // 네이티브 STT 워치독 해제
                      if (nativeSTTWatchdogRef.current) {
                        clearTimeout(nativeSTTWatchdogRef.current);
                        nativeSTTWatchdogRef.current = null;
                      }
                      if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
                        stopNativeSTT();
                      } else {
                        speechRecognition.stopListening();
                      }
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
                    // TTS keep-alive 인터벌 정리 (음성모드 OFF 여부와 무관하게 클린업)
                    if (ttsKeepAliveRef.current) {
                      clearInterval(ttsKeepAliveRef.current);
                      ttsKeepAliveRef.current = null;
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
                <img src={closeIcon} alt={t('common.close')} className="h-5 w-5 block object-contain pointer-events-none" />
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
                          ? parseContentWithoutLinks(message.content, t('chatbot.below'), t('chatbot.belowDoc'))
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
                    const extractedLinks = extractLinksFromMessage(message.content, {
                      viewDoc: t('chatbot.viewDocument'),
                      goDept: t('chatbot.goToDepartment'),
                      goSub: t('chatbot.goToSubcategory'),
                      goParent: t('chatbot.goToParentCategory'),
                      shared: t('chatbot.sharedDocuments'),
                    });
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
                    {t('chatbot.thinking')}
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
                onClick={() => handleQuickQuestion(t('chatbot.quickQ1'))}
              >
                {t('chatbot.quickQ1')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickQuestion(t('chatbot.quickQ2'))}
              >
                {t('chatbot.quickQ2')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickQuestion(t('chatbot.quickQ3'))}
              >
                {t('chatbot.quickQ3')}
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
                  placeholder={isVoiceMode ? t('chatbot.voicePlaceholder') : t('chatbot.inputPlaceholder')}
                  className="text-sm pr-10"
                  disabled={isVoiceMode && !isRunningInApp()}
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md focus:outline-none p-0 border-0"
                  style={{ backgroundColor: primaryColor }}
                  disabled={isVoiceMode && !isRunningInApp()}
                >
                  <img src={sendIcon} alt={t('chatbot.send')} className="h-5 w-5 block object-contain pointer-events-none" />
                </button>
              </div>
              {/* 음성 대화 버튼 (숨김 처리 — 기능은 유지) */}
              <button
                type="button"
                onClick={toggleLiveVoice}
                className="h-7 w-7 flex items-center justify-center rounded-md focus:outline-none p-0 border-0"
                style={{ backgroundColor: isVoiceMode ? '#ef4444' : primaryColor, display: 'none' }}
                title={isVoiceMode ? t('chatbot.voiceStop') : t('chatbot.voiceStart')}
              >
                <img
                  src={isVoiceMode ? micOnIcon : micIcon}
                  alt={isVoiceMode ? t('chatbot.voiceStop') : t('chatbot.voiceStart')}
                  className="h-5 w-5 block object-contain pointer-events-none"
                />
              </button>
            </form>
            {isSpeaking && (
              <div className="text-xs text-green-600 animate-pulse text-center pb-2">{t('chatbot.aiSpeaking')}</div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
});
