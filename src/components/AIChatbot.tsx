import React, { useState, useRef, useEffect, FormEvent, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
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

// 링크 파싱 함수: "→ /path/..." 형식을 클릭 가능한 Link로 변환 + **bold** 처리
function parseLinksInMessage(content: string, navigate: (path: string) => void, onClose: () => void): ReactNode[] {
  const linkRegex = /→\s+(\/[^\s\n]+)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = linkRegex.exec(content)) !== null) {
    // 링크 앞의 텍스트 추가 (bold 처리 포함)
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      parts.push(...parseBoldText(textBefore, `pre-${keyIndex}`));
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

  // 남은 텍스트 추가 (bold 처리 포함)
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    parts.push(...parseBoldText(remaining, 'end'));
  }

  return parts.length > 0 ? parts : parseBoldText(content, 'full');
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


  // Gemini Live 모드
  const audioPlayer = useAudioPlayer();

  const geminiLive = useGeminiLive({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        setMessages(prev => [
          ...prev,
          {
            id: `${Date.now()}-assistant`,
            role: 'assistant',
            content: text,
            timestamp: new Date(),
          },
        ]);
      }
    },
    onUserTranscript: (text) => {
      // 사용자가 말한 내용을 사용자 말풍선으로 추가
      if (text.trim()) {
        setMessages(prev => [
          ...prev,
          {
            id: `${Date.now()}-user`,
            role: 'user',
            content: text,
            timestamp: new Date(),
          },
        ]);
      }
    },
    onAudioData: (audioData) => {
      audioPlayer.play(audioData);
    },
    onError: (error) => {
      console.error('Live API 오류:', error);
      alert('실시간 대화 중 오류가 발생했습니다.');
    },
  });

  // Live 음성 대화 토글 (한 번 클릭으로 시작/중단)
  const toggleLiveVoice = useCallback(async () => {
    if (geminiLive.isStreaming) {
      // 스트리밍 중이면 중단
      geminiLive.stopStreaming();
      geminiLive.disconnect();
      audioPlayer.stop();
    } else {
      // 스트리밍 시작
      await geminiLive.connect();
      geminiLive.startStreaming();
    }
  }, [geminiLive, audioPlayer]);

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
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
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
                  placeholder={geminiLive.isStreaming ? '🎤 실시간 대화 중...' : '질문하세요...'}
                  className="text-sm pr-10"
                  disabled={geminiLive.isStreaming}
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-white border border-transparent hover:border-black focus:outline-none"
                  style={{ backgroundColor: primaryColor }}
                  disabled={geminiLive.isStreaming}
                >
                  ↵
                </button>
              </div>
              {/* Live 음성 버튼 */}
              <button
                type="button"
                onClick={toggleLiveVoice}
                className={`h-10 w-10 flex items-center justify-center rounded-md focus:outline-none transition-all text-xl ${
                  geminiLive.isStreaming 
                    ? 'bg-red-500 animate-pulse' 
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={geminiLive.isStreaming ? '음성 대화 종료' : '음성 대화 시작'}
              >
                {geminiLive.isStreaming ? '⏹️' : '🎤'}
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
});
