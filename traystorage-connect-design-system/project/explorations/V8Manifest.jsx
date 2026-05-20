/* eslint-disable */
// V8 — Storage Manifest / Dispatch.  Logistics aesthetic — looks like an
// airline departure board crossed with a shipping manifest. Hard right
// angles, status pills, monospace IDs, ETA bars showing days-to-expiry.

function V8Manifest() {
  return (
    <div style={V8.shell}>
      <V8Sidebar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <V8Header/>
        <main style={{ flex: 1, overflow: 'auto', padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <V8KpiStrip/>
          <V8Manifest_Table/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <V8Dispatch/>
            <V8Capacity/>
          </div>
        </main>
      </div>
    </div>
  );
}

const V8 = {
  shell: {
    display: 'flex', height: '100%',
    background: '#f5f5f4',  // stone-100
    fontFamily: "'Noto Sans KR','Noto Sans',sans-serif",
    color: '#1c1917',
  },
  card: { background: '#fff', border: '1px solid #d6d3d1', borderRadius: 4, boxShadow: '0 1px 0 rgba(28,25,23,0.04)' },
  ink: '#1c1917', muted: '#57534e', faint: '#a8a29e',
  amber: '#d97706', red: '#dc2626', green: '#16a34a',
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

function V8Sidebar() {
  const items = [
    ['MANIFEST', 'archive', true],
    ['DEPARTMENTS', 'building-2'],
    ['DOCUMENTS', 'file-text'],
    ['NFC TAGS', 'nfc'],
    ['DISPATCH', 'share-2'],
    ['EXPIRING', 'clock'],
    ['USERS', 'users'],
    ['REPORTS', 'bar-chart'],
  ];
  return (
    <aside style={{ width: 200, background: '#fff', borderRight: '1px solid #d6d3d1', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 16px', borderBottom: '1px solid #d6d3d1' }}>
        <img src="../assets/logo.png" alt="" style={{ height: 24 }}/>
        <div style={{ fontFamily: V8.mono, fontSize: 9, color: V8.faint, letterSpacing: '0.1em', marginTop: 6, fontWeight: 600 }}>
          OPS · FACILITY 001
        </div>
      </div>
      <div style={{ padding: 10, flex: 1 }}>
        {items.map(([label, icon, active]) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 0,
            fontFamily: V8.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
            background: active ? '#1c1917' : 'transparent',
            color: active ? '#fff' : V8.muted,
            marginBottom: 1,
          }}>
            <Icon name={icon} size={13} color={active ? '#fbbf24' : V8.faint}/>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: 14, borderTop: '1px solid #d6d3d1', fontFamily: V8.mono, fontSize: 10, color: V8.muted, lineHeight: 1.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>SHIFT</span><span style={{ color: V8.ink, fontWeight: 700 }}>DAY</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span>WAVE</span><span style={{ color: V8.ink, fontWeight: 700 }}>3 of 5</span>
        </div>
      </div>
    </aside>
  );
}

function V8Header() {
  return (
    <header style={{ background: '#1c1917', color: '#fff', padding: '0 28px', display: 'flex', alignItems: 'stretch', borderBottom: `3px solid ${V8.amber}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', flex: 1 }}>
        <div style={{ fontFamily: V8.mono, fontSize: 10, color: V8.amber, letterSpacing: '0.12em', fontWeight: 700 }}>
          STORAGE MANIFEST
        </div>
        <div style={{ width: 1, height: 16, background: '#44403c' }}/>
        <div style={{ fontFamily: V8.mono, fontSize: 11, color: '#d6d3d1', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span>FACILITY <strong style={{ color: '#fff' }}>F-001</strong></span>
          <span>WAVE <strong style={{ color: '#fff' }}>2026.05.20 / D-WAVE-03</strong></span>
          <span>OPERATOR <strong style={{ color: '#fff' }}>홍길동</strong></span>
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: V8.green, boxShadow: `0 0 6px ${V8.green}` }}/>
          <span style={{ fontFamily: V8.mono, fontSize: 10, color: V8.green, fontWeight: 700, letterSpacing: '0.06em' }}>OPS NOMINAL</span>
        </div>
        <div style={{ width: 1, height: 16, background: '#44403c' }}/>
        <div style={{ fontFamily: V8.mono, fontSize: 11, color: '#fbbf24' }}>11:24:03 KST</div>
      </div>
    </header>
  );
}

function V8KpiStrip() {
  const cells = [
    { label: 'IN MANIFEST',       val: 47,  unit: '', tone: V8.ink, sub: 'subcategories' },
    { label: 'DOCS ON HAND',      val: 128, unit: '', tone: V8.ink, sub: '+12 today' },
    { label: 'NFC TAGS ARMED',    val: '38', unit: '/47', tone: V8.green, sub: '80.9% coverage' },
    { label: 'EXPIRING (≤30d)',   val: 7,   unit: '', tone: V8.amber, sub: 'action required' },
    { label: 'DISPATCHED 24H',    val: 312, unit: '', tone: V8.ink, sub: '+18% vs prev' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
      {cells.map((c) => (
        <div key={c.label} style={{ ...V8.card, padding: '12px 16px', borderTop: `3px solid ${c.tone}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: V8.mono, fontSize: 9.5, color: V8.muted, fontWeight: 700, letterSpacing: '0.06em' }}>{c.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
            <span style={{ fontFamily: V8.mono, fontSize: 26, fontWeight: 600, color: c.tone, letterSpacing: '-0.02em', lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{c.val}</span>
            {c.unit && <span style={{ fontFamily: V8.mono, fontSize: 12, color: V8.faint }}>{c.unit}</span>}
          </div>
          <div style={{ fontSize: 10.5, color: V8.muted, marginTop: 4 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

function V8Manifest_Table() {
  const rows = [
    { id: 'STG-A2-014', tag: 'NFC-011', dept: 'HR001',  name: '채용 서류 보관함',   loc: 'A-2-CAB-03',  docs: 12, mgmt: '관리: 김민지', dte: 184, status: 'ARMED' },
    { id: 'STG-B1-022', tag: 'NFC-022', dept: 'FIN001', name: '월간 정산 보관함',   loc: 'B-1-CAB-07',  docs:  8, mgmt: '관리: 강민호', dte:   7, status: 'WARN' },
    { id: 'STG-C1-036', tag: 'NFC-036', dept: 'DEV001', name: 'API 명세 보관함',     loc: 'C-1-SHELF-01',docs: 23, mgmt: '관리: 오재훈', dte: 342, status: 'ARMED' },
    { id: 'STG-A1-009', tag: 'NFC-009', dept: 'HR001',  name: '면접 기록 보관함',   loc: 'A-1-CAB-12',  docs:  6, mgmt: '관리: 박서준', dte:  22, status: 'WARN' },
    { id: 'STG-B2-027', tag: 'NFC-027', dept: 'MKT001', name: '광고 캠페인 보관함', loc: 'B-2-CAB-04',  docs: 14, mgmt: '관리: 최지원', dte:  14, status: 'WARN' },
    { id: 'STG-C1-038', tag: 'NFC-038', dept: 'DEV001', name: '제품 명세서 보관함', loc: 'C-1-SHELF-04',docs: 11, mgmt: '관리: 오재훈', dte: 198, status: 'HOT' },
    { id: 'STG-B1-024', tag: '—',       dept: 'FIN001', name: '연간 감사 자료',     loc: 'B-1-CAB-09',  docs: 41, mgmt: '관리: 강민호', dte:  28, status: 'NO_TAG' },
  ];
  const statusStyle = {
    ARMED:  { bg: '#dcfce7', fg: '#14532d', dot: '#16a34a' },
    WARN:   { bg: '#fef3c7', fg: '#78350f', dot: '#d97706' },
    HOT:    { bg: '#1c1917', fg: '#fbbf24', dot: '#fbbf24' },
    NO_TAG: { bg: '#fee2e2', fg: '#7f1d1d', dot: '#dc2626' },
  };
  return (
    <section style={{ ...V8.card, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: '#fafaf9', borderBottom: '1px solid #d6d3d1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: V8.mono, fontSize: 11, color: V8.ink, fontWeight: 700, letterSpacing: '0.04em' }}>STORAGE MANIFEST · 7 of 47</span>
          <span style={{ fontFamily: V8.mono, fontSize: 10, color: V8.muted }}>(filtered)</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL','ARMED','WARN','HOT','NO_TAG'].map((f, i) => (
            <button key={f} style={{
              padding: '4px 10px', borderRadius: 4,
              border: '1px solid #d6d3d1',
              background: i === 0 ? '#1c1917' : '#fff',
              color: i === 0 ? '#fff' : V8.muted,
              fontFamily: V8.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              cursor: 'pointer',
            }}>{f}</button>
          ))}
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: V8.mono }}>
        <thead>
          <tr style={{ background: '#fafaf9' }}>
            {['MANIFEST ID', 'NFC', 'DEPT', 'NAME', 'LOCATION', 'DOCS', 'CUSTODIAN', 'DAYS TO EXPIRY', 'STATUS'].map((h, i) => (
              <th key={h} style={{
                textAlign: ['DOCS','DAYS TO EXPIRY'].includes(h) ? 'right' : 'left',
                padding: '8px 14px',
                fontSize: 9.5, fontWeight: 700, color: V8.muted, letterSpacing: '0.08em',
                borderBottom: '1px solid #d6d3d1',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const ss = statusStyle[r.status];
            const dteWidth = Math.min(100, (r.dte / 60) * 100);
            const dteColor = r.dte < 15 ? V8.red : r.dte < 30 ? V8.amber : V8.green;
            return (
              <tr key={r.id} style={{
                borderBottom: i === rows.length - 1 ? 'none' : '1px solid #e7e5e4',
                background: r.status === 'HOT' ? '#fffbeb' : 'transparent',
              }}>
                <td style={{ padding: '10px 14px', color: V8.ink, fontWeight: 700 }}>{r.id}</td>
                <td style={{ padding: '10px 14px', color: r.tag === '—' ? V8.faint : V8.muted }}>{r.tag}</td>
                <td style={{ padding: '10px 14px', color: V8.muted }}>{r.dept}</td>
                <td style={{ padding: '10px 14px', color: V8.ink, fontWeight: 600, fontFamily: "'Noto Sans KR','Noto Sans',sans-serif" }}>{r.name}</td>
                <td style={{ padding: '10px 14px', color: V8.muted }}>{r.loc}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: V8.ink, fontWeight: 600 }}>{r.docs}</td>
                <td style={{ padding: '10px 14px', color: V8.muted, fontFamily: "'Noto Sans KR','Noto Sans',sans-serif", fontSize: 11.5 }}>{r.mgmt}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', width: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <div style={{ width: 80, height: 4, background: '#e7e5e4', borderRadius: 0, position: 'relative' }}>
                      <div style={{ width: `${dteWidth}%`, height: '100%', background: dteColor }}/>
                    </div>
                    <span style={{ color: dteColor, fontWeight: 700, width: 38, textAlign: 'right', fontFeatureSettings: '"tnum"' }}>D−{r.dte}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 8px', borderRadius: 0,
                    background: ss.bg, color: ss.fg,
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: 9999, background: ss.dot }}/>
                    {r.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function V8Dispatch() {
  const items = [
    { dir: 'IN',  who: '김민지', what: '채용_공고문_v3.pdf', to: 'STG-A2-014', t: '11:24' },
    { dir: 'OUT', who: '박서준', what: '근로계약서_v3.pdf → 3명',   to: '—',            t: '11:23' },
    { dir: 'IN',  who: '오재훈', what: 'API_명세_2.4.1.pdf',     to: 'STG-C1-036', t: '10:58' },
    { dir: 'OUT', who: '강민호', what: '월간_정산_03월.pdf 다운로드', to: '—',         t: '10:42' },
    { dir: 'IN',  who: '최지원', what: '광고_브리프.pdf',          to: 'STG-B2-027', t: '10:18' },
  ];
  return (
    <section style={{ ...V8.card, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: '#fafaf9', borderBottom: '1px solid #d6d3d1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: V8.mono, fontSize: 11, color: V8.ink, fontWeight: 700, letterSpacing: '0.04em' }}>DISPATCH LOG · last 60min</span>
        <span style={{ fontFamily: V8.mono, fontSize: 10, color: V8.muted }}>14 events</span>
      </div>
      <div>
        {items.map((it, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '52px 36px 1fr auto auto',
            gap: 10, padding: '10px 16px',
            alignItems: 'center',
            borderBottom: i === items.length - 1 ? 'none' : '1px solid #e7e5e4',
          }}>
            <span style={{ fontFamily: V8.mono, fontSize: 10.5, color: V8.muted }}>{it.t}</span>
            <span style={{
              fontFamily: V8.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
              padding: '2px 6px',
              background: it.dir === 'IN' ? '#dcfce7' : '#e0e7ff',
              color: it.dir === 'IN' ? '#14532d' : '#1e3a8a',
              textAlign: 'center',
            }}>{it.dir}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: V8.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.what}</div>
              <div style={{ fontSize: 10.5, color: V8.muted, marginTop: 1 }}>{it.who}</div>
            </div>
            <span style={{ fontFamily: V8.mono, fontSize: 10, color: V8.muted }}>{it.to}</span>
            <Icon name="chevron-right" size={12} color={V8.faint}/>
          </div>
        ))}
      </div>
    </section>
  );
}

function V8Capacity() {
  const buildings = [
    { code: 'A', floors: [{ f: 3, used: 0, cap: 0 }, { f: 2, used: 21, cap: 25 }, { f: 1, used: 9, cap: 12 }] },
    { code: 'B', floors: [{ f: 3, used: 0, cap: 0 }, { f: 2, used: 14, cap: 20 }, { f: 1, used: 18, cap: 22 }] },
    { code: 'C', floors: [{ f: 3, used: 18, cap: 22 }, { f: 2, used: 12, cap: 18 }, { f: 1, used: 36, cap: 40 }] },
  ];
  return (
    <section style={{ ...V8.card, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: '#fafaf9', borderBottom: '1px solid #d6d3d1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: V8.mono, fontSize: 11, color: V8.ink, fontWeight: 700, letterSpacing: '0.04em' }}>FACILITY CAPACITY</span>
        <span style={{ fontFamily: V8.mono, fontSize: 10, color: V8.muted }}>128 / 159 occupied · 80.5%</span>
      </div>
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {buildings.map((b) => (
          <div key={b.code}>
            <div style={{ fontFamily: V8.mono, fontSize: 11, color: V8.ink, fontWeight: 700, marginBottom: 8, letterSpacing: '0.06em' }}>BLDG {b.code}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {b.floors.map((fl) => {
                const pct = fl.cap === 0 ? 0 : fl.used / fl.cap;
                const tone = pct === 0 ? V8.faint : pct > 0.9 ? V8.red : pct > 0.7 ? V8.amber : V8.green;
                return (
                  <div key={fl.f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: V8.mono, fontSize: 9.5, color: V8.muted, width: 18, fontWeight: 600 }}>F{fl.f}</span>
                    <div style={{ flex: 1, height: 12, background: '#e7e5e4', position: 'relative' }}>
                      <div style={{ width: `${pct * 100}%`, height: '100%', background: tone }}/>
                    </div>
                    <span style={{ fontFamily: V8.mono, fontSize: 9.5, color: V8.muted, width: 44, textAlign: 'right', fontFeatureSettings: '"tnum"' }}>{fl.used}/{fl.cap}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.V8Manifest = V8Manifest;
