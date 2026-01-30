import React, { useState, useRef, useEffect, FormEvent, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAuthStore } from '@/store/authStore';
import expandIcon from '@/assets/expand.png';
import closeIcon from '@/assets/close.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateResponse, type ChatSearchResult, type ChatHistoryItem } from '@/lib/chatbot';
import { formatDateTimeSimple } from '@/lib/utils';

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
      label = '세부 카테고리로 이동';
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

export const AIChatbot = React.memo(function AIChatbot({ primaryColor }: AIChatbotProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '안녕하세요! 저는 TrayStorage의 AI 어시스턴트 트로이입니다. 😊 문서 검색과 관리를 도와드릴게요!',
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTall, setIsTall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);


  // Gemini Live 모드 (TTS용)
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const isVoiceModeRef = useRef(false);
  const speechRecognitionRef = useRef<{ startListening: () => void; stopListening: () => void; isListening: boolean } | null>(null);
  
  // TTS 재생 완료 시 STT 재시작 (에코 방지)
  const handlePlaybackComplete = useCallback(() => {
    console.log('🔊 TTS 재생 완료, STT 재시작');
    // 음성 모드가 활성화되어 있으면 STT 재시작 (약간의 딜레이로 에코 방지)
    if (isVoiceModeRef.current && speechRecognitionRef.current) {
      setTimeout(() => {
        if (isVoiceModeRef.current) {
          speechRecognitionRef.current?.startListening();
        }
      }, 300);
    }
  }, []);
  
  const audioPlayer = useAudioPlayer({ onPlaybackComplete: handlePlaybackComplete });
  const geminiLiveRef = useRef<{ sendText: (text: string) => void; isConnected: boolean } | null>(null);

  // 음성 중복 처리 방지용 ref
  const lastProcessedTranscriptRef = useRef<string>('');
  const isProcessingSpeechRef = useRef<boolean>(false);

  // Live 모드용 시스템 프롬프트 - TTS 역할만 수행
  const liveSystemPrompt = `당신은 한국어 음성 안내 도우미입니다. 반드시 모든 내용을 한국어로만 읽어주세요.

중요 규칙:
1. 모든 숫자는 반드시 한국어로 읽으세요. 절대 영어로 읽지 마세요.
   - 연도: "2025"는 "이천이십오년", "2024"는 "이천이십사년"
   - 일반 숫자: "123"은 "백이십삼", "45"는 "사십오"
   - 날짜: "12월 25일"은 "십이월 이십오일"
2. 마크다운 기호(**, -, →, 등)는 자연스럽게 생략하거나 말로 바꿔서 읽어주세요.
3. 영어 단어가 있어도 한국어 발음으로 읽어주세요.
4. 추가 설명이나 해석을 덧붙이지 말고, 전달받은 내용만 친절하게 읽어주세요.`;

  // 사용자 음성 전사 처리 - generateResponse 호출 후 음성으로 읽어줌
  const handleUserSpeech = useCallback(async (transcript: string) => {
    const trimmed = transcript.trim();
    if (!trimmed) return;

    // 중복 처리 방지: 동일 transcript거나 이미 처리 중이면 무시
    if (trimmed === lastProcessedTranscriptRef.current || isProcessingSpeechRef.current) {
      console.log('🎤 중복 전사 무시:', trimmed);
      return;
    }

    lastProcessedTranscriptRef.current = trimmed;
    isProcessingSpeechRef.current = true;
    
    console.log('🎤 사용자 전사:', trimmed);
    
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
    
    // 2. generateResponse 호출 (콜백으로 스트리밍 + docs 업데이트)
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
      
      // 3. 최종 응답을 Gemini Live로 음성 출력
      if (finalText && geminiLiveRef.current?.isConnected) {
        geminiLiveRef.current.sendText(finalText);
      }
    } catch (error) {
      console.error('응답 생성 오류:', error);
    } finally {
      setIsTyping(false);
      isProcessingSpeechRef.current = false;
    }
  }, [messages]);

  // Web Speech API로 음성 인식 (STT)
  const speechRecognition = useSpeechRecognition({
    language: 'ko-KR',
    onResult: (transcript, isFinal) => {
      if (isFinal) {
        handleUserSpeech(transcript);
      }
    },
    onError: (error) => {
      console.error('음성 인식 오류:', error);
    },
  });

  // Gemini Live API (TTS용)
  const geminiLive = useGeminiLive({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    systemPrompt: liveSystemPrompt,
    onTranscript: () => {
      // Gemini가 읽어주는 내용은 이미 채팅에 표시되었으므로 무시
    },
    onAudioData: (audioData) => {
      // TTS 재생 중에는 STT 일시정지 (되먹임 방지)
      if (speechRecognitionRef.current?.isListening) {
        speechRecognitionRef.current.stopListening();
      }
      audioPlayer.play(audioData);
    },
    onError: (error) => {
      console.error('Live API 오류:', error);
    },
  });

  // speechRecognition을 ref에 저장 (콜백에서 접근용)
  useEffect(() => {
    speechRecognitionRef.current = speechRecognition;
  }, [speechRecognition]);

  // geminiLive를 ref에 저장
  useEffect(() => {
    geminiLiveRef.current = {
      sendText: geminiLive.sendText,
      isConnected: geminiLive.isConnected,
    };
  }, [geminiLive.sendText, geminiLive.isConnected]);

  // 음성 모드 토글
  const toggleLiveVoice = useCallback(async () => {
    if (isVoiceMode) {
      // 음성 모드 종료
      isVoiceModeRef.current = false;
      speechRecognition.stopListening();
      geminiLive.disconnect();
      audioPlayer.stop();
      setIsVoiceMode(false);
    } else {
      // 음성 모드 시작: Gemini Live 연결 (TTS용) + 음성 인식 시작 (STT용)
      isVoiceModeRef.current = true;
      await geminiLive.connect();
      speechRecognition.startListening();
      setIsVoiceMode(true);
    }
  }, [isVoiceMode, speechRecognition, geminiLive, audioPlayer]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

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

  const ui = (
    <>
      {!isOpen && (
        <Button
          size="icon"
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-[9999] pointer-events-auto transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: primaryColor }}
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 shadow-2xl z-[10000] pointer-events-auto animate-in slide-in-from-bottom duration-300">
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
                <img src={expandIcon} alt="확장" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-md focus:outline-none p-0 border-0"
                style={{ backgroundColor: primaryColor }}
              >
                <img src={closeIcon} alt="닫기" className="h-4 w-4" />
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
              className="p-4 border-t flex gap-2"
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
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-white border border-transparent hover:border-black focus:outline-none"
                  style={{ backgroundColor: primaryColor }}
                  disabled={isVoiceMode}
                >
                  ↵
                </button>
              </div>
              {/* 음성 대화 버튼 */}
              <button
                type="button"
                onClick={toggleLiveVoice}
                className={`h-10 w-10 flex items-center justify-center rounded-md focus:outline-none transition-all text-xl ${
                  isVoiceMode 
                    ? 'bg-red-500 animate-pulse' 
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={isVoiceMode ? '음성 대화 종료' : '음성 대화 시작'}
              >
                {isVoiceMode ? '⏹️' : '🎤'}
              </button>
            </form>
            {audioPlayer.isPlaying && (
              <div className="text-xs text-green-600 animate-pulse text-center pb-2">🔊 AI가 답변 중...</div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );

  if (!isPortalReady || typeof document === 'undefined') {
    return null;
  }

  return createPortal(ui, document.body);
});
