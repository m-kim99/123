/* eslint-disable */
// Chatbot.jsx — floating AI chatbot widget. Signature feature in the source app.
// Brand: TrayStorage Connect calls its bot "트로이" (Troy). Greeting copy
// is lifted verbatim from chatbot.defaultMessage in src/locales/ko.json.

function Chatbot() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState([
    { role: 'bot', text: '안녕하세요! 저는 TrayStorage Connect의 AI 어시스턴트 트로이입니다. 😊 문서 검색과 관리를 도와드릴게요!', when: '방금 전' },
  ]);
  const send = () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input.trim(), when: '방금 전' };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTimeout(() => {
      setMessages((m) => [...m, {
        role: 'bot',
        text: '관련 문서 3건을 찾았습니다. 인사팀 > 채용 문서 > 채용 서류 보관함을 확인해보세요.',
        when: '방금 전',
      }]);
    }, 700);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 40,
          width: 56, height: 56, borderRadius: 9999,
          background: '#2563eb', color: '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.5), 0 4px 6px -4px rgba(37, 99, 235, 0.5)',
          transition: 'transform 200ms',
        }}
      >
        <Icon name={open ? 'x' : 'message-circle'} size={24}/>
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24, zIndex: 40,
          width: 360, height: 480,
          background: '#fff', borderRadius: 12,
          border: '1px solid #e5e7eb',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.05)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: '#fff',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 9999, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="message-circle" size={18} color="#fff"/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>AI 챗봇 · 트로이</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>온라인</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <Icon name="x" size={18}/>
            </button>
          </div>
          <div style={{ flex: 1, padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: 12,
                  fontSize: 13, lineHeight: 1.5,
                  background: m.role === 'user' ? '#2563eb' : '#fff',
                  color: m.role === 'user' ? '#fff' : '#0f172a',
                  border: m.role === 'user' ? 'none' : '1px solid #e5e7eb',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius:  m.role === 'user' ? 12 : 4,
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 8, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 6 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="질문하세요..."
              style={{
                flex: 1, height: 36, padding: '0 12px',
                border: '1px solid #e5e7eb', borderRadius: 8,
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <Button size="icon" onClick={send} style={{ width: 36, height: 36 }}>
              <Icon name="upload" size={16} style={{ transform: 'rotate(45deg) translate(2px, -2px)' }}/>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

window.Chatbot = Chatbot;
