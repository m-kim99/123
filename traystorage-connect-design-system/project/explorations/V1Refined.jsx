/* eslint-disable */
// V1 — Refined.  Same blue/slate vocabulary, sharpened hierarchy.
// Greeting hero · KPI tiles with sparkline + delta · activity timeline column ·
// department leaderboard with progress bars.

function V1Refined() {
  return (
    <div style={V1.shell}>
      <V1Sidebar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <V1Header/>
        <main style={{ flex: 1, overflow: 'auto', padding: '32px 40px 40px' }}>
          <V1Greeting/>
          <V1Stats/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, marginTop: 32 }}>
            <V1Leaderboard/>
            <V1Activity/>
          </div>
        </main>
      </div>
    </div>
  );
}

const V1 = {
  shell: { display: 'flex', height: '100%', background: '#f8f9fa', fontFamily: "'Noto Sans KR','Noto Sans',sans-serif", color: '#0f172a' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' },
};

function V1Sidebar() {
  const items = [
    ['홈', 'home', true], ['부서 관리', 'building-2'], ['대분류 관리', 'folder-open'],
    ['세부 스토리지 관리', 'archive'], ['문서 관리', 'file-text'], ['팀원 관리', 'users'],
    ['통계', 'bar-chart'], ['공지사항', 'megaphone'], ['휴지통', 'trash'],
  ];
  return (
    <aside style={{ width: 240, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <img src="../assets/logo.png" alt="" style={{ height: 28 }}/>
      </div>
      <div style={{ padding: 10, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(([label, icon, active]) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
            borderRadius: 8, fontSize: 14, fontWeight: 500,
            background: active ? '#eff6ff' : 'transparent',
            color: active ? '#1d4ed8' : '#475569',
          }}>
            <Icon name={icon} size={18} color={active ? '#2563eb' : '#64748b'}/>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function V1Header() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 40px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ flex: 1, position: 'relative', maxWidth: 480 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          <Icon name="search" size={16} color="#94a3b8"/>
        </span>
        <input placeholder="문서, 부서, 세부 스토리지 검색..." style={{
          width: '100%', height: 40, padding: '0 14px 0 38px',
          border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14,
          background: '#f8fafc', outline: 'none', fontFamily: 'inherit',
        }}/>
      </div>
      <div style={{ flex: 1 }}/>
      <button style={{ height: 40, padding: '0 14px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#475569' }}>
        <Icon name="plus" size={16}/> 빠른 업로드
      </button>
      <button style={{ position: 'relative', width: 40, height: 40, borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
        <Icon name="bell" size={18}/>
        <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 9999, background: '#ef4444' }}/>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9999, background: 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>홍</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>홍길동</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>관리자</div>
        </div>
      </div>
    </header>
  );
}

function V1Greeting() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>2026년 5월 20일 수요일</div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          안녕하세요, 홍길동님 <span style={{ display: 'inline-block', transform: 'translateY(-2px)' }}>👋</span>
        </h1>
        <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 14 }}>
          오늘 <strong style={{ color: '#0f172a' }}>3건</strong>의 새 문서가 업로드되었고, NFC 태그 <strong style={{ color: '#0f172a' }}>12회</strong> 스캔되었습니다.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
        {['오늘', '이번 주', '이번 달', '연간'].map((p, i) => (
          <button key={p} style={{
            padding: '7px 14px', borderRadius: 6, border: 'none',
            background: i === 1 ? '#0f172a' : 'transparent',
            color: i === 1 ? '#fff' : '#475569',
            fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
          }}>{p}</button>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ data, color = '#2563eb', height = 32, width = 100 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sp-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon fill={`url(#sp-${color})`} points={`0,${height} ${pts} ${width},${height}`}/>
      <polyline fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" points={pts}/>
    </svg>
  );
}

function V1Stats() {
  const stats = [
    { title: '총 문서',         value: 128, delta: '+12',  data: [62,68,71,80,85,98,110,128], icon: 'file-text', color: '#2563eb', tone: 'up' },
    { title: '총 세부 스토리지', value: 47,  delta: '+3',   data: [40,41,42,42,44,45,46,47],   icon: 'archive',   color: '#8b5cf6', tone: 'up' },
    { title: 'NFC 활성 태그',    value: 38,  delta: '+5',   data: [25,28,29,30,32,34,36,38],   icon: 'nfc',       color: '#10b981', tone: 'up' },
    { title: '이번 달 업로드',   value: 24,  delta: '-2',   data: [30,28,26,22,24,20,25,24],   icon: 'upload',    color: '#f59e0b', tone: 'down' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {stats.map((s) => (
        <div key={s.title} style={V1.card}>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s.icon} size={15} color={s.color}/>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{s.title}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: s.tone === 'up' ? '#15803d' : '#b91c1c',
                background: s.tone === 'up' ? '#dcfce7' : '#fee2e2',
                padding: '2px 6px', borderRadius: 4,
              }}>{s.delta}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <Sparkline data={s.data} color={s.color} width={92} height={32}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function V1Leaderboard() {
  const rows = [
    { name: '인사팀',    code: 'HR001',  docs: 32, util: 0.78, parent: 4, fav: 6 },
    { name: '개발팀',    code: 'DEV001', docs: 45, util: 0.94, parent: 5, fav: 9 },
    { name: '마케팅팀',  code: 'MKT001', docs: 28, util: 0.62, parent: 3, fav: 4 },
    { name: '회계팀',    code: 'FIN001', docs: 23, util: 0.51, parent: 4, fav: 3 },
  ];
  return (
    <section style={V1.card}>
      <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>부서별 문서 현황</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>활용률 = 등록된 문서 ÷ 보관 가능 슬롯</p>
        </div>
        <button style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#475569', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>전체 보기</button>
      </div>
      <div style={{ padding: '8px 0' }}>
        {rows.map((r) => (
          <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 60px 60px', gap: 20, padding: '14px 24px', alignItems: 'center', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="building-2" size={18} color="#2563eb"/>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'ui-monospace,monospace', marginTop: 2 }}>{r.code}</div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>활용률</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{Math.round(r.util * 100)}%</span>
              </div>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ width: `${r.util * 100}%`, height: '100%', background: r.util > 0.85 ? '#f59e0b' : '#2563eb', borderRadius: 9999 }}/>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{r.docs}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>문서</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{r.parent}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>대분류</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function V1Activity() {
  const items = [
    { time: '11:24', who: '김민지', what: '채용 서류 보관함에 문서 1건 업로드', dept: '인사팀', color: '#2563eb' },
    { time: '10:52', who: '박서준', what: '근로계약서_표준양식_v3.pdf 공유', dept: '인사팀', color: '#10b981' },
    { time: '10:18', who: '오재훈', what: 'NFC 태그 등록: 제품 명세서 보관함', dept: '개발팀', color: '#8b5cf6' },
    { time: '09:41', who: '이수현', what: '경력직 채용 평가표 미리보기', dept: '인사팀', color: '#64748b' },
    { time: '09:02', who: '강민호', what: '월간 정산 보관함 만료일 30일 연장', dept: '회계팀', color: '#f59e0b' },
    { time: '어제',  who: '최지원', what: '대분류 "복지 제도" 추가',           dept: '인사팀', color: '#64748b' },
  ];
  return (
    <section style={V1.card}>
      <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>오늘의 활동</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>실시간 업데이트</p>
      </div>
      <div style={{ padding: '8px 22px 14px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 36, top: 16, bottom: 16, width: 1, background: '#e5e7eb' }}/>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', position: 'relative' }}>
            <div style={{ width: 38, flex: 'none', fontSize: 11, color: '#94a3b8', fontFamily: 'ui-monospace,monospace', paddingTop: 3, textAlign: 'right' }}>{it.time}</div>
            <div style={{ width: 8, height: 8, borderRadius: 9999, background: it.color, marginTop: 6, flex: 'none', boxShadow: '0 0 0 3px #fff' }}/>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, color: '#0f172a', lineHeight: 1.5 }}>
                <strong style={{ fontWeight: 600 }}>{it.who}</strong>님이 {it.what}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{it.dept}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.V1Refined = V1Refined;
