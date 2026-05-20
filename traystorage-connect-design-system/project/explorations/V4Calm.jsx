/* eslint-disable */
// V4 — Calm minimal.  Lots of breath, huge numbers, almost no chrome.
// Single big metric hero · weekly chart · department list as horizontal
// progress rows · simple text actions instead of buttons. Almost Stripe-like.

function V4Calm() {
  return (
    <div style={V4.shell}>
      <V4Sidebar/>
      <main style={{ flex: 1, overflow: 'auto' }}>
        <V4TopBar/>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '64px 56px 80px' }}>
          <V4Hero/>
          <V4WeeklyChart/>
          <V4Depts/>
          <V4Recent/>
        </div>
      </main>
    </div>
  );
}

const V4 = {
  shell: {
    display: 'flex', height: '100%', background: '#fafaf8',
    fontFamily: "'Noto Sans KR','Noto Sans',sans-serif",
    color: '#1c1917',
  },
  ink:    '#1c1917',
  muted:  '#78716c',
  faint:  '#a8a29e',
  rule:   '#e7e5e4',
  accent: '#1c1917',     // monochrome — the design itself is the accent
  blue:   '#2563eb',
};

function V4Sidebar() {
  const items = [
    ['홈', 'home', true],
    ['부서', 'building-2'],
    ['보관 공간', 'archive'],
    ['문서', 'file-text'],
    ['팀원', 'users'],
    ['통계', 'bar-chart'],
  ];
  return (
    <aside style={{ width: 200, background: 'transparent', borderRight: `1px solid ${V4.rule}`, display: 'flex', flexDirection: 'column', padding: '32px 0' }}>
      <div style={{ padding: '0 24px 28px' }}>
        <img src="../assets/logo.png" alt="" style={{ height: 22, opacity: 0.85 }}/>
      </div>
      <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map(([label, icon, active]) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
            borderRadius: 6, fontSize: 13.5,
            color: active ? V4.ink : V4.muted,
            fontWeight: active ? 500 : 400,
            background: active ? '#fff' : 'transparent',
            boxShadow: active ? `0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px ${V4.rule}` : 'none',
          }}>
            <Icon name={icon} size={15} color={active ? V4.ink : V4.faint}/>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '20px 24px', borderTop: `1px solid ${V4.rule}` }}>
        <div style={{ fontSize: 12, color: V4.muted }}>홍길동</div>
        <div style={{ fontSize: 11, color: V4.faint, marginTop: 2 }}>관리자 · 본사</div>
      </div>
    </aside>
  );
}

function V4TopBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 56px', maxWidth: 1032, margin: '0 auto', width: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: 12, color: V4.muted, fontFamily: 'ui-monospace,monospace', letterSpacing: '0.04em' }}>
        WED · 2026.05.20 · 11:24 KST
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 12.5, color: V4.muted }}>
        <button style={{ background: 'transparent', border: 'none', color: V4.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}>검색</button>
        <button style={{ background: 'transparent', border: 'none', color: V4.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0, position: 'relative' }}>
          알림 <span style={{ position: 'absolute', top: -2, right: -10, width: 5, height: 5, borderRadius: 9999, background: V4.blue }}/>
        </button>
        <button style={{ background: 'transparent', border: 'none', color: V4.ink, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0, fontWeight: 500 }}>
          문서 업로드 →
        </button>
      </div>
    </div>
  );
}

function V4Hero() {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ fontSize: 11.5, color: V4.faint, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
        2026년 · 5월 현황
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <div style={{
              fontSize: 120, fontWeight: 300, letterSpacing: '-0.05em', lineHeight: 0.85,
              color: V4.ink,
              fontFeatureSettings: '"tnum"',
              fontFamily: "'Noto Sans KR','Noto Sans',sans-serif",
            }}>128</div>
            <div style={{ paddingBottom: 8 }}>
              <div style={{ fontSize: 12, color: V4.muted, fontWeight: 500 }}>총 문서</div>
              <div style={{ fontSize: 11.5, color: '#15803d', fontWeight: 500, marginTop: 4 }}>
                지난달 대비 +12
              </div>
            </div>
          </div>
        </div>
        <div style={{ borderLeft: `1px solid ${V4.rule}`, paddingLeft: 40, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px 0', alignContent: 'end' }}>
          <Stat label="총 부서"          value="4"/>
          <Stat label="총 세부 스토리지" value="47"/>
          <Stat label="활성 NFC 태그"    value="38" sub="/ 47"/>
          <Stat label="이번 달 업로드"   value="24"/>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: V4.muted, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, color: V4.ink, fontFeatureSettings: '"tnum"' }}>
        {value}{sub && <span style={{ fontSize: 14, color: V4.faint, marginLeft: 4 }}>{sub}</span>}
      </div>
    </div>
  );
}

function V4WeeklyChart() {
  const data = [
    { d: '월', upload: 4, scan: 38 }, { d: '화', upload: 7, scan: 52 },
    { d: '수', upload: 3, scan: 41 }, { d: '목', upload: 9, scan: 58 },
    { d: '금', upload: 6, scan: 64 }, { d: '토', upload: 1, scan: 12 },
    { d: '일', upload: 0, scan: 8  },
  ];
  const maxScan = Math.max(...data.map((d) => d.scan));
  return (
    <section style={{ borderTop: `1px solid ${V4.rule}`, paddingTop: 36, marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11.5, color: V4.faint, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            이번 주 활동
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
            <div style={{ fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}>30</div>
            <div style={{ fontSize: 12, color: V4.muted }}>건 업로드</div>
            <div style={{ fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, color: V4.muted, marginLeft: 32 }}>273</div>
            <div style={{ fontSize: 12, color: V4.muted }}>회 스캔</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 11.5, color: V4.muted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 2, background: V4.ink }}/> 업로드
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 2, background: V4.faint }}/> 스캔
          </span>
        </div>
      </div>
      <div style={{ position: 'relative', height: 160, display: 'flex', alignItems: 'flex-end', gap: 24, paddingBottom: 24, borderBottom: `1px solid ${V4.rule}` }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', maxWidth: 18, height: `${(d.scan / maxScan) * 100}%`, background: '#e7e5e4', borderRadius: 2 }}/>
            <div style={{ position: 'absolute', bottom: `${(d.scan / maxScan) * 100}%`, width: '100%', maxWidth: 18, height: 2, background: V4.ink, borderRadius: 1, transform: `translateY(-${(d.upload / maxScan) * 160}px)` }}/>
            <div style={{ position: 'absolute', bottom: -22, fontSize: 11, color: V4.faint, fontWeight: 500 }}>{d.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function V4Depts() {
  const rows = [
    { name: '개발팀',    code: 'DEV001', docs: 45, total: 50, growth: '+18%' },
    { name: '인사팀',    code: 'HR001',  docs: 32, total: 40, growth: '+12%' },
    { name: '마케팅팀',  code: 'MKT001', docs: 28, total: 40, growth:  '+4%' },
    { name: '회계팀',    code: 'FIN001', docs: 23, total: 45, growth:  '−2%' },
  ];
  return (
    <section style={{ borderTop: `1px solid ${V4.rule}`, paddingTop: 36, marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontSize: 11.5, color: V4.faint, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          부서
        </div>
        <button style={{ background: 'transparent', border: 'none', fontSize: 12.5, color: V4.muted, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          전체 보기 →
        </button>
      </div>
      <div>
        {rows.map((r, i) => {
          const pct = r.docs / r.total;
          const negative = r.growth.startsWith('−');
          return (
            <div key={r.name} style={{
              padding: '18px 0',
              borderTop: i === 0 ? 'none' : `1px solid ${V4.rule}`,
              display: 'grid', gridTemplateColumns: '180px 1fr auto auto', gap: 32, alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: V4.ink }}>{r.name}</div>
                <div style={{ fontSize: 11, color: V4.faint, fontFamily: 'ui-monospace,monospace', marginTop: 3 }}>{r.code}</div>
              </div>
              <div>
                <div style={{ height: 2, background: V4.rule, position: 'relative', borderRadius: 1 }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${pct * 100}%`, background: V4.ink, borderRadius: 1 }}/>
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 400, letterSpacing: '-0.01em', color: V4.ink, fontFeatureSettings: '"tnum"' }}>
                {r.docs} <span style={{ color: V4.faint, fontSize: 13 }}>/ {r.total}</span>
              </div>
              <div style={{ fontSize: 12, color: negative ? '#b91c1c' : '#15803d', fontWeight: 500, width: 48, textAlign: 'right' }}>
                {r.growth}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function V4Recent() {
  const items = [
    { time: '11:24', who: '김민지', what: '채용 서류 보관함에 1건 업로드',     dept: '인사팀' },
    { time: '10:52', who: '박서준', what: '근로계약서 표준양식 v3 공유',       dept: '인사팀' },
    { time: '10:18', who: '오재훈', what: 'NFC 태그 등록 · 제품 명세서 보관함', dept: '개발팀' },
    { time: '09:02', who: '강민호', what: '월간 정산 보관함 만료 30일 연장',   dept: '회계팀' },
  ];
  return (
    <section style={{ borderTop: `1px solid ${V4.rule}`, paddingTop: 36 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, color: V4.faint, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          오늘의 활동
        </div>
      </div>
      <div>
        {items.map((it, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '52px 1fr auto',
            padding: '14px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${V4.rule}`,
            alignItems: 'baseline', gap: 18,
          }}>
            <div style={{ fontSize: 12, color: V4.faint, fontFamily: 'ui-monospace,monospace' }}>{it.time}</div>
            <div style={{ fontSize: 14, color: V4.ink, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 500 }}>{it.who}</span>
              <span style={{ color: V4.muted }}>님이 {it.what}</span>
            </div>
            <div style={{ fontSize: 11.5, color: V4.faint }}>{it.dept}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.V4Calm = V4Calm;
