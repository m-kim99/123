/* eslint-disable */
// V7 — Live Ops Console. Dark NOC/SOC vibe — full-bleed dark canvas, instruments
// laid out like a flight deck. Per-department "consoles," a live activity ticker,
// terminal-style command palette as the primary input.

function V7Console() {
  return (
    <div style={V7.shell}>
      <V7Sidebar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <V7Header/>
        <main style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <V7CommandBar/>
          <V7StatusStrip/>
          <V7DeptConsoles/>
          <V7Ticker/>
        </main>
      </div>
    </div>
  );
}

const V7 = {
  shell: {
    display: 'flex', height: '100%',
    background: '#0b1220',
    fontFamily: "'Noto Sans KR','Noto Sans',sans-serif",
    color: '#cbd5e1',
  },
  panel: {
    background: '#0f1729',
    border: '1px solid #1e293b',
    borderRadius: 10,
  },
  accent: '#22d3ee',   // cyan-400 — terminal accent
  warn:   '#f59e0b',
  err:    '#f87171',
  ok:     '#34d399',
  muted:  '#64748b',
  ink:    '#e2e8f0',
  mono:   "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

function V7Sidebar() {
  const items = [
    ['OVERVIEW', 'map-pin', true],
    ['DEPARTMENTS', 'building-2'],
    ['NFC TAGS', 'nfc'],
    ['DOCUMENTS', 'file-text'],
    ['ALERTS', 'bell'],
    ['STATS', 'bar-chart'],
    ['USERS', 'users'],
  ];
  return (
    <aside style={{ width: 180, background: '#070b14', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 18px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="../assets/connect.png" alt="" style={{ height: 22, width: 22, filter: 'invert(1)' }}/>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontFamily: V7.mono, fontSize: 11, color: V7.accent, letterSpacing: '0.04em', fontWeight: 700 }}>TRAYOPS</div>
            <div style={{ fontFamily: V7.mono, fontSize: 9, color: V7.muted, letterSpacing: '0.1em', marginTop: 2 }}>v2.4.1</div>
          </div>
        </div>
      </div>
      <div style={{ padding: 8, flex: 1 }}>
        {items.map(([label, icon, active]) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 6,
            fontFamily: V7.mono, fontSize: 10.5, letterSpacing: '0.04em', fontWeight: 600,
            background: active ? 'rgba(34,211,238,0.1)' : 'transparent',
            color: active ? V7.accent : V7.muted,
            borderLeft: active ? `2px solid ${V7.accent}` : '2px solid transparent',
            paddingLeft: active ? 8 : 10,
            marginBottom: 1,
          }}>
            <Icon name={icon} size={13} color={active ? V7.accent : V7.muted}/>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: 14, borderTop: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: V7.ok, boxShadow: `0 0 6px ${V7.ok}` }}/>
          <span style={{ fontFamily: V7.mono, fontSize: 10, color: V7.ok }}>SYSTEM HEALTHY</span>
        </div>
        <div style={{ fontFamily: V7.mono, fontSize: 9, color: V7.muted, lineHeight: 1.5 }}>
          uptime · 27d 14h<br/>
          last sync · 11:24:03
        </div>
      </div>
    </aside>
  );
}

function V7Header() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 24px', background: '#070b14', borderBottom: '1px solid #1e293b', fontFamily: V7.mono }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: 9999, background: V7.err, boxShadow: `0 0 8px ${V7.err}` }}/>
        <span style={{ fontSize: 11, color: V7.err, fontWeight: 700, letterSpacing: '0.04em' }}>● REC</span>
      </div>
      <div style={{ fontSize: 11, color: V7.muted }}>2026-05-20 WED 11:24:03 KST</div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 10.5, color: V7.muted }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: 9999, background: V7.ok }}/>
          DB <span style={{ color: V7.ok, fontWeight: 700 }}>OK</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: 9999, background: V7.ok }}/>
          NFC <span style={{ color: V7.ok, fontWeight: 700 }}>38/47</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: 9999, background: V7.warn }}/>
          ALERTS <span style={{ color: V7.warn, fontWeight: 700 }}>3</span>
        </span>
      </div>
      <div style={{ width: 30, height: 30, borderRadius: 6, background: '#1e293b', border: `1px solid ${V7.accent}55`, color: V7.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: V7.mono, fontWeight: 700, fontSize: 11 }}>HK</div>
    </header>
  );
}

function V7CommandBar() {
  return (
    <div style={{ ...V7.panel, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, fontFamily: V7.mono }}>
      <span style={{ color: V7.accent, fontWeight: 700, fontSize: 13 }}>›</span>
      <span style={{ color: V7.ink, fontSize: 13 }}>
        scan <span style={{ color: V7.muted }}>--tag</span> NFC-038
      </span>
      <span style={{ background: V7.accent, width: 2, height: 14, animation: 'cursor 1s infinite' }}/>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', gap: 6 }}>
        {['scan', 'extend', 'share', 'archive'].map((cmd) => (
          <span key={cmd} style={{
            padding: '3px 8px', border: '1px solid #334155', borderRadius: 4,
            fontSize: 10, color: V7.muted, fontWeight: 600,
          }}>
            <span style={{ color: V7.accent }}>/</span>{cmd}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 10, color: V7.muted }}>
        <kbd style={{ background: '#1e293b', padding: '2px 5px', borderRadius: 3, border: '1px solid #334155', color: V7.ink }}>⌘K</kbd>
      </span>
    </div>
  );
}

function V7StatusStrip() {
  const cells = [
    { label: 'DOCS_TOTAL',      val: 128, delta: '+12',  color: V7.accent },
    { label: 'NFC_ACTIVE',      val: 38,  delta: '/47',  color: V7.ok },
    { label: 'SCANS_24H',       val: 312, delta: '+18%', color: V7.accent },
    { label: 'EXPIRING_30D',    val: 7,   delta: 'WARN', color: V7.warn },
    { label: 'OFFLINE_TAGS',    val: 2,   delta: 'CHECK',color: V7.err },
    { label: 'UPLOADS_TODAY',   val: 3,   delta: 'OK',   color: V7.muted },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
      {cells.map((c) => (
        <div key={c.label} style={{ ...V7.panel, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: V7.mono, fontSize: 9.5, color: V7.muted, letterSpacing: '0.06em', fontWeight: 600 }}>{c.label}</span>
            <span style={{ fontFamily: V7.mono, fontSize: 9, color: c.color, fontWeight: 700 }}>{c.delta}</span>
          </div>
          <div style={{ fontFamily: V7.mono, fontSize: 26, fontWeight: 600, color: V7.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {c.val}
          </div>
        </div>
      ))}
    </div>
  );
}

function V7DeptConsoles() {
  const DEPTS = [
    { code: 'HR001',  name: '인사팀',    color: V7.accent, scans: 86,  docs: 32, tagsActive: 8, tagsTotal: 9,  trend: [3,5,4,6,7,8,9,8,10,9,12,11], lastEvent: { who: '김민지', what: '채용 서류 업로드', t: '2m' } },
    { code: 'DEV001', name: '개발팀',    color: V7.ok,     scans: 124, docs: 45, tagsActive: 10, tagsTotal: 11, trend: [4,5,6,8,9,11,12,14,13,15,17,18], lastEvent: { who: '오재훈', what: 'API 명세 스캔',     t: '14s' } },
    { code: 'MKT001', name: '마케팅팀',  color: V7.warn,   scans: 52,  docs: 28, tagsActive: 5, tagsTotal: 7,  trend: [4,5,5,4,5,6,5,5,6,6,7,7], lastEvent: { who: '최지원', what: '캠페인 보관함 열람', t: '8m' } },
    { code: 'FIN001', name: '회계팀',    color: V7.err,    scans: 41,  docs: 23, tagsActive: 6, tagsTotal: 8,  trend: [6,7,7,8,6,5,5,4,4,3,4,4], lastEvent: { who: '강민호', what: '월간 정산 만료 연장', t: '22m' } },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {DEPTS.map((d) => <V7DeptCard key={d.code} dept={d}/>)}
    </div>
  );
}

function V7DeptCard({ dept: d }) {
  const max = Math.max(...d.trend);
  return (
    <div style={{ ...V7.panel, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #1e293b', background: '#0a101e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 9999, background: d.color, boxShadow: `0 0 6px ${d.color}88` }}/>
          <span style={{ fontFamily: V7.mono, fontSize: 10, color: d.color, fontWeight: 700, letterSpacing: '0.04em' }}>{d.code}</span>
        </div>
        <span style={{ fontFamily: V7.mono, fontSize: 9, color: V7.muted }}>● LIVE</span>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: V7.ink, marginBottom: 10, letterSpacing: '-0.01em' }}>{d.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <V7Gauge label="DOCS"  val={d.docs}  mono color={d.color}/>
          <V7Gauge label="SCANS" val={d.scans} mono color={d.color}/>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontFamily: V7.mono, fontSize: 9, color: V7.muted, fontWeight: 600, letterSpacing: '0.06em' }}>NFC ACTIVE</span>
            <span style={{ fontFamily: V7.mono, fontSize: 11, color: V7.ink, fontWeight: 700 }}>{d.tagsActive}/{d.tagsTotal}</span>
          </div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
            {Array.from({ length: d.tagsTotal }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 6, background: i < d.tagsActive ? d.color : '#1e293b', borderRadius: 1 }}/>
            ))}
          </div>
          <div style={{ position: 'relative', height: 32, marginBottom: 10 }}>
            <svg width="100%" height={32} viewBox="0 0 100 32" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
              <polyline
                fill="none" stroke={d.color} strokeWidth="1.5"
                points={d.trend.map((v, i) => `${(i / (d.trend.length - 1)) * 100},${32 - (v / max) * 28 - 2}`).join(' ')}
              />
            </svg>
          </div>
        </div>
        <div style={{ paddingTop: 10, borderTop: '1px solid #1e293b' }}>
          <div style={{ fontFamily: V7.mono, fontSize: 9, color: V7.muted, marginBottom: 4 }}>LAST EVENT · {d.lastEvent.t}</div>
          <div style={{ fontSize: 11.5, color: V7.ink, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600 }}>{d.lastEvent.who}</span>
            <span style={{ color: V7.muted }}> · {d.lastEvent.what}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function V7Gauge({ label, val, color }) {
  return (
    <div style={{ border: '1px solid #1e293b', borderRadius: 6, padding: '6px 8px', background: '#0a101e' }}>
      <div style={{ fontFamily: V7.mono, fontSize: 8.5, color: V7.muted, fontWeight: 600, letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontFamily: V7.mono, fontSize: 20, fontWeight: 600, color, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 2 }}>{val}</div>
    </div>
  );
}

function V7Ticker() {
  const events = [
    { t: '11:24:03', dept: 'DEV001', tag: 'NFC-038', who: '오재훈', what: 'SCAN', target: '제품 명세서 보관함', level: 'INFO' },
    { t: '11:23:41', dept: 'HR001',  tag: 'NFC-011', who: '김민지', what: 'UPLOAD', target: '채용_공고문_v3.pdf', level: 'OK' },
    { t: '11:22:17', dept: 'HR001',  tag: 'NFC-014', who: '박서준', what: 'SHARE', target: '근로계약서_v3 → 3명', level: 'OK' },
    { t: '11:20:08', dept: 'FIN001', tag: 'NFC-022', who: '강민호', what: 'EXTEND', target: '월간 정산 +30d', level: 'INFO' },
    { t: '11:18:53', dept: 'MKT001', tag: 'NFC-027', who: '최지원', what: 'OPEN', target: '광고 캠페인 보관함', level: 'INFO' },
    { t: '11:14:02', dept: 'HR001',  tag: 'NFC-009', who: 'SYSTEM', what: 'WARN', target: '7일 비활성 태그', level: 'WARN' },
    { t: '10:58:11', dept: 'DEV001', tag: 'NFC-036', who: '오재훈', what: 'SCAN', target: 'API 명세 보관함', level: 'INFO' },
  ];
  const levelColor = (lv) => lv === 'WARN' ? V7.warn : lv === 'OK' ? V7.ok : V7.muted;
  return (
    <div style={{ ...V7.panel, fontFamily: V7.mono, fontSize: 11.5 }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: V7.ok, boxShadow: `0 0 6px ${V7.ok}` }}/>
          <span style={{ color: V7.ink, fontWeight: 700, letterSpacing: '0.04em' }}>EVENT.LOG</span>
          <span style={{ color: V7.muted }}>· streaming</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: V7.muted }}>
          <span>FILTER · ALL</span>
          <span style={{ color: V7.accent }}>PAUSE [SPACE]</span>
        </div>
      </div>
      <div style={{ padding: '4px 0' }}>
        {events.map((e, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '90px 70px 80px 90px 70px 1fr auto',
            gap: 14, padding: '5px 16px',
            color: V7.ink,
            background: i === 0 ? 'rgba(34,211,238,0.04)' : 'transparent',
          }}>
            <span style={{ color: V7.muted }}>{e.t}</span>
            <span style={{ color: V7.accent }}>{e.dept}</span>
            <span style={{ color: V7.muted }}>{e.tag}</span>
            <span>{e.who}</span>
            <span style={{ color: levelColor(e.level), fontWeight: 700 }}>{e.what}</span>
            <span style={{ color: V7.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Noto Sans KR','Noto Sans',sans-serif" }}>{e.target}</span>
            <span style={{ color: levelColor(e.level), fontSize: 10, fontWeight: 700 }}>[{e.level}]</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.V7Console = V7Console;
