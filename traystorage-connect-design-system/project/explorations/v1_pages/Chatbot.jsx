/* eslint-disable */
// V1Chatbot — floating AI chatbot widget redrawn in V1 style.
// Cleaner header (no gradient banner), V1 blue avatar, message bubbles use
// V1 palette. Bot's name is 트로이 (Troy) — straight from chatbot.defaultMessage.

function V1Chatbot({ initialOpen = true }) {
  const [open, setOpen] = React.useState(initialOpen);
  const messages = [
    { role: 'bot',  text: '안녕하세요! 저는 TrayStorage Connect의 AI 어시스턴트 트로이입니다. 😊 문서 검색과 관리를 도와드릴게요!', when: '11:20' },
    { role: 'user', text: '인사팀의 채용 서류 보관함이 어디에 있나요?',  when: '11:21' },
    { role: 'bot',  text: '인사팀 · 채용 문서 · 채용 서류 보관함을 찾았습니다.',  when: '11:21', cardRef: { name: '채용 서류 보관함', loc: 'A동 2층 캐비닛 3', docs: 12, nfc: 'NFC-011' } },
    { role: 'user', text: '오늘 추가된 문서가 있어?', when: '11:22' },
    { role: 'bot',  text: '오늘 인사팀에 1건의 문서가 추가되었습니다.\n• 2025_상반기_신입사원_채용_공고문.pdf (김민지님, 11:24)\n• 채용 서류 보관함에 저장됨', when: '11:24' },
  ];
  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'absolute', bottom: 24, right: 24, zIndex: 40,
          width: 56, height: 56, borderRadius: 9999,
          background: V1S.blue, color: '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 28px -8px rgba(37, 99, 235, 0.55), 0 4px 6px -4px rgba(37,99,235,0.4)',
        }}
      >
        <Icon name={open ? 'x' : 'message-circle'} size={24}/>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 96, right: 24, zIndex: 40,
          width: 380, height: 520,
          background: '#fff', borderRadius: 16,
          border: '1px solid #e5e7eb',
          boxShadow: '0 20px 35px -10px rgba(0,0,0,0.18), 0 10px 15px -6px rgba(0,0,0,0.05)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header — clean white, no gradient */}
          <div style={{
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid #e5e7eb',
            background: '#fff',
          }}>
            <div style={{
              position: 'relative',
              width: 36, height: 36, borderRadius: 9999,
              background: V1S.blueSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="message-circle" size={18} color={V1S.blueInk}/>
              <span style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 12, height: 12, borderRadius: 9999,
                background: V1S.emerald, border: '2px solid #fff',
              }}/>
            </div>
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: V1S.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
                트로이 <span style={{ fontSize: 10, fontWeight: 600, color: V1S.blueInk, background: V1S.blueSoft, padding: '1px 6px', borderRadius: 4 }}>AI</span>
              </div>
              <div style={{ fontSize: 11.5, color: V1S.emerald, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <span style={{ width: 5, height: 5, borderRadius: 9999, background: V1S.emerald }}/>
                온라인 · 문서 검색·관리 도우미
              </div>
            </div>
            <button style={{ background: 'transparent', border: 'none', color: V1S.muted, cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 6 }}>
              <Icon name="x" size={18}/>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '16px 16px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: '#fafbfc' }}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 4 }}>
                  <div style={{
                    maxWidth: '82%',
                    padding: '9px 13px', borderRadius: 14,
                    fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-line',
                    background: isUser ? V1S.blue : '#fff',
                    color: isUser ? '#fff' : V1S.ink,
                    border: isUser ? 'none' : '1px solid #e5e7eb',
                    borderBottomRightRadius: isUser ? 4 : 14,
                    borderBottomLeftRadius:  isUser ? 14 : 4,
                    boxShadow: isUser ? 'none' : '0 1px 2px rgba(15,23,42,0.04)',
                  }}>
                    {m.text}
                  </div>
                  {m.cardRef && (
                    <button style={{
                      maxWidth: '82%', textAlign: 'left',
                      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                      padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: V1S.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          <Icon name="archive" size={14} color={V1S.blueInk}/>
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: V1S.ink }}>{m.cardRef.name}</div>
                          <div style={{ fontSize: 11, color: V1S.muted, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="map-pin" size={10} color={V1S.muted}/>{m.cardRef.loc}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                        <V1SChip variant="blue" icon="nfc">{m.cardRef.nfc}</V1SChip>
                        <span style={{ fontSize: 11, color: V1S.muted }}>문서 {m.cardRef.docs}건</span>
                        <span style={{ flex: 1 }}/>
                        <span style={{ fontSize: 11, color: V1S.blueInk, fontWeight: 600 }}>열기 →</span>
                      </div>
                    </button>
                  )}
                  <span style={{ fontSize: 10, color: V1S.faint, fontFamily: 'ui-monospace,monospace', marginTop: 1 }}>{m.when}</span>
                </div>
              );
            })}
          </div>

          {/* Quick replies */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', gap: 6, overflow: 'auto' }}>
            {['전체 문서 수는?', '오늘 업로드 보여줘', '만료 임박 문서', 'NFC 미등록 보관함'].map((q) => (
              <button key={q} style={{
                whiteSpace: 'nowrap', padding: '5px 10px', borderRadius: 9999,
                background: '#fff', border: '1px solid #e5e7eb',
                fontSize: 11.5, color: V1S.muted, fontFamily: 'inherit', cursor: 'pointer',
                flex: 'none',
              }}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', background: '#fff', display: 'flex', gap: 6, alignItems: 'center' }}>
            <button style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: V1S.muted, flex: 'none' }}>
              <img src="../../assets/mic.svg" style={{ width: 16, height: 16 }} alt=""/>
            </button>
            <input
              placeholder="질문하세요…"
              style={{
                flex: 1, height: 36, padding: '0 12px',
                border: '1px solid #e5e7eb', borderRadius: 8,
                fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
                background: '#fff',
              }}
            />
            <button style={{
              width: 36, height: 36, borderRadius: 8,
              background: V1S.blue, color: '#fff', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none',
              boxShadow: '0 1px 2px rgba(37,99,235,0.3)',
            }}>
              <Icon name="upload" size={14} style={{ transform: 'rotate(45deg) translate(1px,-1px)' }}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// A "page with chatbot on top of it" demo wrapper used in the canvas.
function ChatbotOnDashboard() {
  // Render the existing P1 page as the backdrop, then float the chatbot.
  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <P1Subcategory onNavigate={() => {}}/>
      <V1Chatbot initialOpen={true}/>
    </div>
  );
}

Object.assign(window, { V1Chatbot, ChatbotOnDashboard });
