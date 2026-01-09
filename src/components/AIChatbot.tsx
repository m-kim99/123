import React, { useState, useRef, useEffect, FormEvent, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Mic, Volume2, VolumeX, Square } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import expandIcon from '@/assets/expand.png';
import closeIcon from '@/assets/close.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateResponse, type ChatSearchResult, type ChatHistoryItem } from '@/lib/chatbot';
import { formatDateTimeSimple } from '@/lib/utils';

// 링크 파싱 함수: "→ /path/..." 형식을 클릭 가능한 Link로 변환
function parseLinksInMessage(content: string, navigate: (path: string) => void, onClose: () => void): ReactNode[] {
  const linkRegex = /→\s+(\/[^\s\n]+)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = linkRegex.exec(content)) !== null) {
    // 링크 앞의 텍스트 추가
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const path = match[1];
    parts.push(
      <span key={`link-${keyIndex++}`}>
        →{' '}
        <button
          type="button"
          onClick={() => {
            navigate(path);
            onClose();
          }}
          className="text-blue-600 underline hover:text-blue-800 cursor-pointer bg-transparent border-none p-0 font-inherit"
        >
          {path}
        </button>
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // 남은 텍스트 추가
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
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

  // 음성 관련 상태
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 음성 합성 함수
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      console.error('음성 합성을 지원하지 않는 브라우저입니다.');
      return;
    }

    // 기존 재생 중단
    window.speechSynthesis.cancel();

    // 링크 텍스트 제거 (음성으로 읽지 않음)
    const textOnly = text.replace(/→\s+\/[^\s\n]+/g, '').trim();
    if (!textOnly) return;

    const utterance = new SpeechSynthesisUtterance(textOnly);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // 한국어 음성 선택
    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find(voice =>
      voice.lang === 'ko-KR' || voice.lang.startsWith('ko')
    );
    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // 음성 목록 로드 (초기화)
  useEffect(() => {
    if (window.speechSynthesis) {
      // Chrome에서는 voices가 비동기로 로드됨
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Gemini API를 통한 음성→텍스트 변환
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase 설정이 없습니다.');
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${supabaseUrl}/functions/v1/speech-to-text`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '음성 인식 실패');
    }

    const result = await response.json();
    return result.transcript || '';
  }, []);

  // 음성 입력 핸들러 (MediaRecorder 사용 - 모든 브라우저 지원)
  const handleVoiceInput = useCallback(async () => {
    if (isListening) {
      // 녹음 중단
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // MediaRecorder 설정
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/wav';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);

        if (audioChunksRef.current.length === 0) {
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        try {
          setInputValue('음성 인식 중...');
          const transcript = await transcribeAudio(audioBlob);
          
          if (transcript) {
            setInputValue(transcript);
            // 약간의 딜레이 후 자동 전송
            setTimeout(() => {
              sendMessageWithVoice(transcript);
            }, 300);
          } else {
            setInputValue('');
            alert('음성을 인식하지 못했습니다. 다시 시도해주세요.');
          }
        } catch (error) {
          console.error('음성 인식 오류:', error);
          setInputValue('');
          alert('음성 인식 중 오류가 발생했습니다.');
        }
      };

      mediaRecorder.onerror = () => {
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
        alert('녹음 중 오류가 발생했습니다.');
      };

      // 녹음 시작
      mediaRecorder.start();
      setIsListening(true);

    } catch (error) {
      console.error('마이크 접근 오류:', error);
      alert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
    }
  }, [isListening, transcribeAudio]);

  // 음성 입력 후 자동 전송 (음성 출력 포함)
  const sendMessageWithVoice = (text: string) => {
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
        const history: ChatHistoryItem[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        let firstChunkReceived = false;
        let fullResponse = '';

        await generateResponse(trimmed, history, (partial, docs) => {
          if (!firstChunkReceived) {
            firstChunkReceived = true;
            setIsTyping(false);
          }

          fullResponse = partial;

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

        // 답변 완료 후 음성 재생
        if (autoPlayVoice && fullResponse) {
          speakText(fullResponse);
        }
      } finally {
        setIsTyping(false);
      }
    })();
  };

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
              {/* 음성 자동 재생 토글 */}
              <button
                type="button"
                onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                className="h-7 w-7 flex items-center justify-center rounded-md focus:outline-none p-0 border-0"
                style={{ backgroundColor: autoPlayVoice ? primaryColor : '#e2e8f0' }}
                title={autoPlayVoice ? '음성 자동 재생 켜짐' : '음성 자동 재생 꺼짐'}
              >
                {autoPlayVoice ? (
                  <Volume2 className="h-4 w-4 text-white" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-600" />
                )}
              </button>
              {/* 음성 재생 중단 버튼 */}
              {isSpeaking && (
                <button
                  type="button"
                  onClick={() => window.speechSynthesis.cancel()}
                  className="h-7 w-7 flex items-center justify-center rounded-md focus:outline-none p-0 border-0 bg-red-500"
                  title="음성 중단"
                >
                  <Square className="h-3 w-3 text-white" />
                </button>
              )}
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
                          ? parseLinksInMessage(message.content, navigate, () => setIsOpen(false))
                          : message.content
                        }
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {message.role === 'assistant' && message.content && (
                          <button
                            type="button"
                            onClick={() => speakText(message.content)}
                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                            title="다시 듣기"
                          >
                            🔊
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {message.role === 'assistant' &&
                    message.searchResults &&
                    message.searchResults.length > 0 && (
                      <div className="ml-2 space-y-2">
                        {message.searchResults.slice(0, 5).map((doc) => (
                          <div
                            key={doc.id}
                            className="border border-slate-200 rounded-md bg-white px-3 py-2 text-xs shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => {
                              if (doc.parentCategoryId && doc.subcategoryId) {
                                const basePath = user?.role === 'admin' ? '/admin' : '/team';
                                navigate(`${basePath}/parent-category/${doc.parentCategoryId}/subcategory/${doc.subcategoryId}`);
                                setIsOpen(false);
                              }
                            }}
                          >
                            <div className="font-semibold text-slate-800">
                              {doc.name}
                            </div>
                            <div className="text-slate-500">
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
                                보관 위치: {doc.storageLocation}
                              </div>
                            )}
                            <div className="text-slate-400 text-[10px]">
                              업로드: {formatDateTimeSimple(doc.uploadDate)}
                            </div>
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
                  placeholder={isListening ? '말씀하세요...' : '질문하세요...'}
                  className="text-sm pr-10"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-white border border-transparent hover:border-black focus:outline-none"
                  style={{ backgroundColor: primaryColor }}
                >
                  ↵
                </button>
              </div>
              {/* 음성 입력 버튼 */}
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`h-10 w-10 flex items-center justify-center rounded-md focus:outline-none transition-all ${
                  isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={isListening ? '녹음 중단' : '음성으로 질문하기'}
              >
                <span className="flex items-center gap-1">
                  <span className="text-base leading-none">
                    {isListening ? '⏹️' : '🎤'}
                  </span>
                  <Mic className={`h-4 w-4 ${isListening ? 'text-white' : 'text-slate-600'}`} />
                </span>
              </button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
});
