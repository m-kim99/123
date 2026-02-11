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

export const AIChatbot = React.memo(function AIChatbot({ primaryColor }: AIChatbotProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
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


  // 음성 모드 상태
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const isVoiceModeRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRecognitionRef = useRef<{ startListening: () => void; stopListening: () => void; isListening: boolean } | null>(null);

  // 음성 중복 처리 방지용 ref
  const lastProcessedTranscriptRef = useRef<string>('');
  const isProcessingSpeechRef = useRef<boolean>(false);

  // 브라우저 TTS로 텍스트 읽기 (읽는 동안 STT 정지)
  const speakText = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return;

    // 마크다운 기호 정리
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/→\s*\/[^\s\n]+/g, '')
      .replace(/문서:\s*\/[^\s\n]+/g, '')
      .replace(/[-·•]/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, '. ')
      .trim();

    if (!cleanText) return;

    // TTS 시작 전 STT 정지
    if (speechRecognitionRef.current?.isListening) {
      speechRecognitionRef.current.stopListening();
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      // TTS 완료 후 음성모드면 STT 재시작
      if (isVoiceModeRef.current && speechRecognitionRef.current) {
        setTimeout(() => {
          if (isVoiceModeRef.current) {
            speechRecognitionRef.current?.startListening();
          }
        }, 300);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      if (isVoiceModeRef.current && speechRecognitionRef.current) {
        speechRecognitionRef.current?.startListening();
      }
    };

    window.speechSynthesis.speak(utterance);
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
        // TTS 할 내용이 없으면 바로 STT 재시작
        speechRecognitionRef.current.startListening();
      }
    } catch (error) {
      console.error('응답 생성 오류:', error);
      // 에러 시에도 음성모드면 STT 재시작
      if (isVoiceModeRef.current && speechRecognitionRef.current) {
        speechRecognitionRef.current.startListening();
      }
    } finally {
      setIsTyping(false);
      isProcessingSpeechRef.current = false;
    }
  }, [messages, speakText]);

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
      if (error === 'not-allowed') {
        isVoiceModeRef.current = false;
        setIsVoiceMode(false);
        setMessages(prev => [...prev, {
          id: `${Date.now()}-system`,
          role: 'assistant' as const,
          content: '🎤 마이크 권한이 거부되었습니다. 브라우저 주소창 왼쪽의 자물쇠 아이콘을 클릭하여 마이크 권한을 허용해주세요.',
          timestamp: new Date(),
        }]);
      }
    },
  });

  // speechRecognition을 ref에 저장 (콜백에서 접근용)
  useEffect(() => {
    speechRecognitionRef.current = speechRecognition;
  }, [speechRecognition]);

  // 음성 모드 토글
  const toggleLiveVoice = useCallback(async () => {
    if (isVoiceMode) {
      // 음성 모드 종료
      isVoiceModeRef.current = false;
      speechRecognition.stopListening();
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsVoiceMode(false);
    } else {
      // 마이크 권한 확인 후 음성 모드 시작
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        isVoiceModeRef.current = true;
        speechRecognition.startListening();
        setIsVoiceMode(true);
      } catch {
        setMessages(prev => [...prev, {
          id: `${Date.now()}-system`,
          role: 'assistant' as const,
          content: '🎤 마이크 권한이 필요합니다. 브라우저 주소창 왼쪽의 자물쇠 아이콘을 클릭하여 마이크 권한을 허용해주세요.',
          timestamp: new Date(),
        }]);
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
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-40 transition-all duration-300 hover:scale-110"
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
                  className="h-5 w-5 block object-contain"
                />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-md focus:outline-none p-0 border-0"
                style={{ backgroundColor: primaryColor }}
              >
                <img src={closeIcon} alt="닫기" className="h-5 w-5 block object-contain" />
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
                  <img src={sendIcon} alt="전송" className="h-5 w-5 block object-contain" />
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
                  className="h-5 w-5 block object-contain"
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
