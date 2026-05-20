/* eslint-disable */
// V3 — Warehouse spatial.  Lean into the NFC + physical-storage metaphor.
// Hero: SVG floor plan of the facility with NFC tag status dots.
// KPIs reframed around physical activity (scans, occupancy, expiring).
// Live "최근 스캔" feed with location pings. Industrial slate + amber accent.

function V3Warehouse() {
  return (
    <div style={V3.shell}>
      <V3Sidebar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <V3Header/>
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px 32px' }}>
          <V3PageHeader/>
          <V3KPIRow/>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 20, marginTop: 20 }}>
            <V3FloorPlan/>
            <V3ScanFeed/>
          </div>
          <V3ExpiringStrip/>
        </main>
      </div>
    </div>
  );
}

const V3 = {
  shell: {
    display: 'flex', height: '100%',
    background: '#f1f5f9',
    fontFamily: "'Noto Sans KR','Noto Sans',sans-serif",
    color: '#0f172a',
  },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' },
  accent: '#0ea5e9',   // slightly cooler blue — feels industrial / signage-like
  warm:   '#d97706',   // amber 600 for warning/active
  muted:  '#64748b',
  ink:    '#0f172a',
};

function V3Sidebar() {
  const items = [
    ['시설 현황', 'map-pin', true],
    ['부서 관리', 'building-2'],
    ['대분류 관리', 'folder-open'],
    ['세부 스토리지 관리', 'archive'],
    ['문서 관리', 'file-text'],
    ['NFC 태그 관리', 'nfc'],
    ['팀원 관리', 'users'],
    ['통계', 'bar-chart'],
    ['공지사항', 'megaphone'],
  ];
  return (
    <aside style={{ width: 230, background: V3.ink, color: '#cbd5e1', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="../assets/connect.png" alt="" style={{ height: 28, width: 28, filter: 'invert(1)' }}/>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>TrayStorage</span>
          <span style={{ fontWeight: 700, fontSize: 11, color: '#64748b', letterSpacing: '0.1em' }}>CONNECT · OPS</span>
        </div>
      </div>
      <div style={{ padding: 10, flex: 1 }}>
        {items.map(([label, icon, active]) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
            borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: active ? 'rgba(14,165,233,0.15)' : 'transparent',
            color: active ? '#7dd3fc' : '#94a3b8',
            borderLeft: active ? `2px solid ${V3.accent}` : '2px solid transparent',
            paddingLeft: active ? 10 : 12,
            marginBottom: 1,
          }}>
            <Icon name={icon} size={16} color={active ? V3.accent : '#64748b'}/>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>시설 상태</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>
          <span>활성 NFC 태그</span>
          <span style={{ color: '#22c55e', fontWeight: 600 }}>38 / 47</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ width: '81%', height: '100%', background: '#22c55e' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8' }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }}/>
          모든 부서 정상
        </div>
      </div>
    </aside>
  );
}

function V3Header() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ flex: 1, position: 'relative', maxWidth: 360 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          <Icon name="search" size={15} color="#94a3b8"/>
        </span>
        <input placeholder="태그 ID, 보관 장소, 문서 검색…" style={{
          width: '100%', height: 36, padding: '0 12px 0 36px',
          border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13,
          background: '#f8fafc', outline: 'none', fontFamily: 'inherit',
        }}/>
      </div>
      <div style={{ flex: 1 }}/>
      <button style={{ height: 36, padding: '0 14px', borderRadius: 8, background: V3.ink, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
        <Icon name="nfc" size={15}/> NFC 태그 스캔
      </button>
      <div style={{ width: 1, height: 24, background: '#e2e8f0' }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#f0fdf4', borderRadius: 6, fontSize: 11, color: '#15803d', fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#22c55e' }}/>
          LIVE
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 9999, background: 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>홍</div>
      </div>
    </header>
  );
}

function V3PageHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: V3.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
          <Icon name="map-pin" size={11} color={V3.warm}/>
          본사 / 서울 강남
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.1 }}>시설 현황</h1>
        <p style={{ margin: '6px 0 0', color: V3.muted, fontSize: 13 }}>
          현재 활성 NFC 태그 <strong style={{ color: V3.ink }}>38개</strong> · 지난 24시간 스캔 <strong style={{ color: V3.ink }}>312회</strong> · 만료 임박 <strong style={{ color: V3.warm }}>7건</strong>
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ height: 34, padding: '0 12px', borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: V3.ink, fontFamily: 'inherit' }}>
          본사 <Icon name="chevron-down" size={12}/>
        </button>
        <button style={{ height: 34, padding: '0 12px', borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: V3.ink, fontFamily: 'inherit' }}>
          지난 24시간 <Icon name="chevron-down" size={12}/>
        </button>
      </div>
    </div>
  );
}

function V3KPIRow() {
  const kpis = [
    { label: '활성 NFC 태그',    value: 38, sub: '/ 47 전체',        icon: 'nfc',       accent: '#22c55e' },
    { label: '24시간 스캔',      value: 312, sub: '+18% 어제 대비',  icon: 'qr-code',   accent: V3.accent },
    { label: '보관 점유율',      value: '81%', sub: '용량 82 / 100', icon: 'archive',   accent: V3.accent },
    { label: '만료 임박',        value: 7,   sub: '30일 이내',       icon: 'clock',     accent: V3.warm },
    { label: '오프라인 태그',    value: 2,   sub: '점검 필요',       icon: 'x',         accent: '#ef4444' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
      {kpis.map((k) => (
        <div key={k.label} style={{ ...V3.card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: V3.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Icon name={k.icon} size={13} color={k.accent}/>
              {k.label}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: V3.ink }}>{k.value}</div>
            <div style={{ fontSize: 11, color: V3.muted, marginTop: 6 }}>{k.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function V3FloorPlan() {
  // Each zone: row, col, w, h grid units; label; building; activeCount; totalCount; status
  const ZONES = [
    { id: 'A1', name: 'A동 1층 · 인사팀', x: 20, y: 30, w: 260, h: 110, active: 8, total: 9, hot: true },
    { id: 'A2', name: 'A동 2층 · 인사팀', x: 20, y: 150, w: 260, h: 110, active: 9, total: 12, hot: true },
    { id: 'B1', name: 'B동 1층 · 회계팀', x: 300, y: 30, w: 280, h: 110, active: 6, total: 8 },
    { id: 'B2', name: 'B동 2층 · 마케팅팀', x: 300, y: 150, w: 280, h: 110, active: 5, total: 7 },
    { id: 'C1', name: 'C동 1층 · 개발팀',  x: 600, y: 30,  w: 220, h: 230, active: 10, total: 11, hot: true },
  ];
  return (
    <section style={V3.card}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>본사 · 보관 시설 평면도</h2>
          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: V3.muted }}>NFC 태그가 등록된 보관 공간. 점의 크기는 24시간 스캔 빈도를 나타냅니다.</p>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: V3.muted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 9999, background: '#22c55e' }}/>
            활성
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 9999, background: V3.warm }}/>
            만료 임박
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 9999, background: '#cbd5e1' }}/>
            비활성
          </span>
        </div>
      </div>
      <div style={{ padding: 18 }}>
        <div style={{
          position: 'relative', width: '100%', height: 320,
          background: '#f8fafc',
          borderRadius: 10,
          backgroundImage: 'linear-gradient(rgba(100,116,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.07) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          {/* outer building outline */}
          <svg width="100%" height="100%" viewBox="0 0 840 290" style={{ position: 'absolute', inset: 0 }}>
            <rect x="10" y="20" width="820" height="250" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" rx="4"/>
          </svg>

          {ZONES.map((z) => (
            <div key={z.id} style={{
              position: 'absolute',
              left: `${(z.x / 840) * 100}%`, top: `${(z.y / 290) * 100}%`,
              width: `${(z.w / 840) * 100}%`, height: `${(z.h / 290) * 100}%`,
              background: '#fff', border: `1px solid ${z.hot ? V3.warm : '#cbd5e1'}`,
              borderRadius: 6, padding: 10, overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 9.5, color: V3.muted, fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>ZONE {z.id}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: V3.ink, marginTop: 1 }}>{z.name}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: z.hot ? V3.warm : V3.muted, background: z.hot ? '#fffbeb' : '#f1f5f9', padding: '1px 6px', borderRadius: 9999 }}>
                  {z.active}/{z.total}
                </div>
              </div>
              {/* tag pings */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {Array.from({ length: z.total }).map((_, i) => {
                  const active = i < z.active;
                  const isHot = active && z.hot && i < 2;
                  const size = active ? (isHot ? 11 : 8) : 6;
                  const color = isHot ? V3.warm : active ? '#22c55e' : '#cbd5e1';
                  return (
                    <div key={i} style={{
                      width: size, height: size, borderRadius: 9999, background: color,
                      boxShadow: isHot ? `0 0 0 3px ${V3.warm}33` : (active ? `0 0 0 2px ${color}22` : 'none'),
                    }}/>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function V3ScanFeed() {
  const scans = [
    { zone: 'C1', tag: 'NFC-038', who: '오재훈', what: '제품 명세서 보관함', time: '방금 전', status: 'open' },
    { zone: 'A1', tag: 'NFC-011', who: '김민지', what: '채용 서류 보관함',   time: '2분 전',  status: 'open' },
    { zone: 'A1', tag: 'NFC-011', who: '박서준', what: '채용 서류 보관함',   time: '8분 전',  status: 'upload' },
    { zone: 'B1', tag: 'NFC-022', who: '강민호', what: '월간 정산 보관함',   time: '14분 전', status: 'open' },
    { zone: 'C1', tag: 'NFC-036', who: '오재훈', what: 'API 명세 보관함',    time: '21분 전', status: 'open' },
    { zone: 'B2', tag: 'NFC-027', who: '최지원', what: '광고 캠페인 보관함', time: '34분 전', status: 'open' },
    { zone: 'A2', tag: 'NFC-014', who: '이수현', what: '면접 기록 보관함',   time: '48분 전', status: 'fail' },
  ];
  const statusColor = (s) => s === 'fail' ? '#ef4444' : s === 'upload' ? V3.warm : '#22c55e';
  return (
    <section style={V3.card}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 9999, background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }}/>
            최근 NFC 스캔
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: V3.muted }}>실시간 · 자동 갱신</p>
        </div>
        <button style={{ background: 'transparent', border: 'none', color: V3.accent, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: 4 }}>
          전체 보기 →
        </button>
      </div>
      <div style={{ maxHeight: 360, overflow: 'auto' }}>
        {scans.map((s, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: 'auto auto 1fr auto',
            gap: 10, padding: '11px 18px',
            borderBottom: i === scans.length - 1 ? 'none' : '1px solid #f1f5f9',
            alignItems: 'center',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontFamily: 'ui-monospace,monospace', fontWeight: 700 }}>
              <span style={{ color: '#7dd3fc', fontSize: 8 }}>ZONE</span>
              <span>{s.zone}</span>
            </div>
            <div style={{ width: 7, height: 7, borderRadius: 9999, background: statusColor(s.status) }}/>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: V3.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.what}</div>
              <div style={{ fontSize: 10.5, color: V3.muted, marginTop: 1, fontFamily: 'ui-monospace,monospace' }}>
                {s.tag} · {s.who}
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: V3.muted, fontFamily: 'ui-monospace,monospace', textAlign: 'right' }}>{s.time}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function V3ExpiringStrip() {
  const items = [
    { name: '월간 정산 보관함',   loc: 'B동 1층', days: 7,  count: 14 },
    { name: '광고 캠페인 보관함', loc: 'B동 2층', days: 14, count: 8 },
    { name: '면접 기록 보관함',   loc: 'A동 2층', days: 22, count: 23 },
    { name: '연간 감사 자료',     loc: 'B동 1층', days: 28, count: 41 },
  ];
  return (
    <section style={{ ...V3.card, marginTop: 20, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="clock" size={16} color={V3.warm}/>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>30일 내 만료 예정</h2>
          <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999 }}>7</span>
        </div>
        <button style={{ background: V3.warm, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          일괄 연장
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {items.map((it) => (
          <div key={it.name} style={{ padding: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#92400e', fontWeight: 600, fontFamily: 'ui-monospace,monospace' }}>
                <Icon name="map-pin" size={11}/>
                {it.loc}
              </div>
              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 9999, padding: '2px 8px', fontSize: 10.5, color: '#b45309', fontWeight: 700 }}>
                D−{it.days}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: V3.ink, marginBottom: 4 }}>{it.name}</div>
            <div style={{ fontSize: 11, color: V3.muted }}>문서 {it.count}건</div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.V3Warehouse = V3Warehouse;
