import { useState, useRef, useEffect, FormEvent } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateResponse, searchDocuments, type ChatSearchResult, type ChatHistoryItem } from '@/lib/chatbot';

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

export function AIChatbot({ primaryColor }: AIChatbotProps) {
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    (async () => {
      try {
        const history: ChatHistoryItem[] = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const [reply, searchResults] = await Promise.all([
          generateResponse(trimmed, history),
          Promise.resolve(searchDocuments(trimmed)),
        ]);

        const assistantMessage: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
          searchResults: searchResults.length > 0 ? searchResults : undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);
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
        <Card className="fixed bottom-4 right-4 w-96 shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1 rounded-lg" style={{ backgroundColor: `${primaryColor}20` }}>
                <MessageSquare className="h-4 w-4" style={{ color: primaryColor }} />
              </div>
              AI 챗봇
            </CardTitle>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 flex items-center justify-center rounded-full text-white focus:outline-none border border-transparent hover:border-black"
              style={{ backgroundColor: primaryColor }}
            >
              X
            </button>
          </CardHeader>

          <CardContent className="p-0 flex flex-col h-96">
            <ScrollArea className="flex-1 p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-1">
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
                      <p className="text-sm break-words">{message.content}</p>
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
                            className="border border-slate-200 rounded-md bg-white px-3 py-2 text-xs shadow-sm"
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
                              업로드: {doc.uploadDate}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="ml-2 px-3 py-1 rounded-lg bg-slate-100 text-xs text-slate-600">
                    AI가 답변을 작성 중입니다...
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
                  placeholder="질문하세요..."
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
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
