/* eslint-disable */
// V2 — Editorial dense.  Linear/Notion vibe.
// Compact header with breadcrumb tabs, bento grid of metric cards with mini
// charts, dense department table with sparklines, right rail with recent
// uploads. Mostly monochrome with one blue accent, tighter radii (8px).

function V2Editorial() {
  return (
    <div style={V2.shell}>
      <V2Sidebar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <V2TopChrome/>
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px 32px' }}>
          <V2PageHeader/>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, marginTop: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              <V2Bento/>
              <V2DeptTable/>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <V2RecentUploads/>
              <V2Expiring/>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const V2 = {
  shell: {
    display: 'flex', height: '100%',
    background: '#fafafa',
    fontFamily: "'Noto Sans KR','Noto Sans','Inter',sans-serif",
    color: '#18181b',
    fontFeatureSettings: '"ss01","cv01","tnum"',
  },
  panel: { background: '#fff', border: '1px solid #e4e4e7', borderRadius: 8 },
  divider: '1px solid #e4e4e7',
  muted: '#71717a',
  faint: '#a1a1aa',
  accent: '#2563eb',
};

function V2Sidebar() {
  const groups = [
    { label: '워크스페이스', items: [['홈', 'home', true], ['공지사항', 'megaphone'], ['통계', 'bar-chart']] },
    { label: '구성', items: [['부서', 'building-2'], ['대분류', 'folder-open'], ['세부 스토리지', 'archive']] },
    { label: '문서', items: [['전체 문서', 'file-text'], ['휴지통', 'trash']] },
    { label: '사람', items: [['팀원', 'users']] },
  ];
  return (
    <aside style={{ width: 220, background: '#fafafa', borderRight: V2.divider, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="../assets/logo.png" alt="" style={{ height: 22 }}/>
        <button style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: V2.muted }}>
          <Icon name="chevron-right" size={14}/>
        </button>
      </div>
      <div style={{ padding: '4px 8px 14px', flex: 1, overflow: 'auto' }}>
        {groups.map((g) => (
          <div key={g.label} style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10.5, color: V2.faint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px 6px' }}>{g.label}</div>
            {g.items.map(([label, icon, active]) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                borderRadius: 6, fontSize: 13,
                background: active ? '#fff' : 'transparent',
                color: active ? '#18181b' : '#52525b',
                fontWeight: active ? 500 : 400,
                boxShadow: active ? '0 0 0 1px #e4e4e7' : 'none',
                marginBottom: 1,
              }}>
                <Icon name={icon} size={14} color={active ? V2.accent : '#71717a'}/>
                <span>{label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ padding: 10, borderTop: V2.divider, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: 4, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>홍</div>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>홍길동</div>
        <Icon name="chevron-down" size={12} color={V2.muted}/>
      </div>
    </aside>
  );
}

function V2TopChrome() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 32px', borderBottom: V2.divider, background: '#fff', minHeight: 44 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: V2.muted }}>
        <span>워크스페이스</span>
        <Icon name="chevron-right" size={12}/>
        <span style={{ color: '#18181b', fontWeight: 500 }}>홈</span>
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          <Icon name="search" size={13} color={V2.faint}/>
        </span>
        <input placeholder="검색…" style={{
          width: 200, height: 28, padding: '0 8px 0 28px',
          border: `1px solid #e4e4e7`, borderRadius: 6, fontSize: 12,
          background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#18181b',
        }}/>
        <kbd style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: V2.faint, background: '#f4f4f5', padding: '2px 5px', borderRadius: 3, fontFamily: 'ui-monospace,monospace', border: '1px solid #e4e4e7' }}>⌘K</kbd>
      </div>
      <button style={{ height: 28, padding: '0 10px', borderRadius: 6, background: '#fff', border: `1px solid #e4e4e7`, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#18181b' }}>
        <Icon name="upload" size={13}/> 업로드
      </button>
      <button style={{ position: 'relative', width: 28, height: 28, borderRadius: 6, border: `1px solid #e4e4e7`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>
        <Icon name="bell" size={14}/>
        <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 14, height: 14, padding: '0 4px', borderRadius: 9999, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>3</span>
      </button>
    </header>
  );
}

function V2PageHeader() {
  const tabs = ['개요', '활동', '저장 공간', '활용률', '문서 흐름'];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>관리자 개요</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: V2.muted }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#22c55e' }}/>
          <span>실시간</span>
          <span style={{ color: V2.faint }}>· 마지막 동기화 11:24:03</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: V2.divider, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((t, i) => (
            <button key={t} style={{
              padding: '8px 12px', background: 'transparent', border: 'none',
              fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
              color: i === 0 ? '#18181b' : V2.muted,
              fontWeight: i === 0 ? 600 : 500,
              borderBottom: i === 0 ? '2px solid #18181b' : '2px solid transparent',
              marginBottom: -1,
            }}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
          <button style={{ height: 26, padding: '0 8px', borderRadius: 5, background: '#fff', border: V2.divider, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer', color: '#52525b', display: 'flex', alignItems: 'center', gap: 5 }}>
            전체 부서 <Icon name="chevron-down" size={11}/>
          </button>
          <button style={{ height: 26, padding: '0 8px', borderRadius: 5, background: '#fff', border: V2.divider, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer', color: '#52525b', display: 'flex', alignItems: 'center', gap: 5 }}>
            지난 30일 <Icon name="chevron-down" size={11}/>
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniBars({ data, color = V2.accent, height = 36 }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, width: '100%' }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, height: `${(v / max) * 100}%`,
          minHeight: 2,
          background: color,
          opacity: i === data.length - 1 ? 1 : 0.6 - (data.length - 1 - i) * 0.04,
          borderRadius: 1,
        }}/>
      ))}
    </div>
  );
}

function MiniLine({ data, color = V2.accent, height = 36, width = 140 }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

function V2Bento() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
      <div style={{ ...V2.panel, padding: 14, gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, color: V2.muted, fontWeight: 500 }}>총 문서</span>
          <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>↑ 12 (10.4%)</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, fontFeatureSettings: '"tnum"' }}>128</div>
        <div style={{ marginTop: 10 }}>
          <MiniBars data={[6,8,4,7,9,11,8,12,10,14,9,13]} height={28}/>
        </div>
      </div>
      <div style={{ ...V2.panel, padding: 14, gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, color: V2.muted, fontWeight: 500 }}>이번 달 업로드</span>
          <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>↓ 2</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>24</div>
        <div style={{ marginTop: 10, color: '#a1a1aa' }}>
          <MiniLine data={[30,28,26,24,27,24,22,24]} color="#52525b" height={28}/>
        </div>
      </div>
      <div style={{ ...V2.panel, padding: 14, gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, color: V2.muted, fontWeight: 500 }}>NFC 활성 / 전체 태그</span>
          <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>80.9%</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
          38 <span style={{ color: V2.faint, fontWeight: 400 }}>/ 47</span>
        </div>
        <div style={{ display: 'flex', height: 4, borderRadius: 9999, background: '#f4f4f5', overflow: 'hidden', marginTop: 12 }}>
          <div style={{ flex: 38, background: V2.accent }}/>
          <div style={{ flex: 9, background: '#e4e4e7' }}/>
        </div>
      </div>

      <div style={{ ...V2.panel, padding: 14, gridColumn: 'span 2' }}>
        <div style={{ fontSize: 11.5, color: V2.muted, fontWeight: 500, marginBottom: 8 }}>업로드 / NFC 스캔 추이</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 11, color: V2.muted }}>업로드</div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>24</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: V2.muted }}>스캔</div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>312</div>
          </div>
        </div>
        <div style={{ position: 'relative', height: 44, marginTop: 4 }}>
          <svg width="100%" height={44} viewBox="0 0 200 44" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
            <polyline fill="none" stroke={V2.accent} strokeWidth="1.5" points="0,30 16,28 32,24 48,28 64,20 80,22 96,16 112,18 128,14 144,11 160,15 176,8 192,12" strokeLinejoin="round"/>
            <polyline fill="none" stroke="#a1a1aa" strokeWidth="1.5" strokeDasharray="3 3" points="0,36 16,33 32,34 48,30 64,32 80,27 96,28 112,26 128,24 144,22 160,24 176,20 192,22" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <div style={{ ...V2.panel, padding: 14, gridColumn: 'span 2' }}>
        <div style={{ fontSize: 11.5, color: V2.muted, fontWeight: 500, marginBottom: 10 }}>저장 공간</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Donut value={0.62} size={56} color={V2.accent}/>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>6.2 <span style={{ fontSize: 12, fontWeight: 500, color: V2.muted }}>/ 10 GB</span></div>
            <div style={{ fontSize: 11, color: V2.muted, marginTop: 2 }}>증가 +480 MB / 주</div>
          </div>
        </div>
      </div>

      <div style={{ ...V2.panel, padding: 14, gridColumn: 'span 2' }}>
        <div style={{ fontSize: 11.5, color: V2.muted, fontWeight: 500, marginBottom: 10 }}>만료 임박</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: '#b45309' }}>7</div>
          <div style={{ fontSize: 12, color: V2.muted }}>건 · 30일 이내</div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {Array.from({length: 30}).map((_, i) => {
            const isExpiring = [3,6,9,14,18,22,27].includes(i);
            return <div key={i} style={{ flex: 1, height: 16, background: isExpiring ? '#f59e0b' : '#f4f4f5', borderRadius: 1 }}/>;
          })}
        </div>
      </div>
    </div>
  );
}

function Donut({ value, size = 56, color = '#2563eb', track = '#f4f4f5' }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${c * value} ${c}`}
        strokeDashoffset={c * 0.25}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  );
}

function V2DeptTable() {
  const rows = [
    { dept: '인사팀',    code: 'HR001',  docs: 32, scans: 86, growth: 0.18, sparkColor: '#22c55e', data:[5,7,6,8,9,12,11,14,13,16,15,18] },
    { dept: '개발팀',    code: 'DEV001', docs: 45, scans: 124, growth: 0.34, sparkColor: '#22c55e', data:[10,12,14,13,16,18,21,24,28,32,38,45] },
    { dept: '마케팅팀',  code: 'MKT001', docs: 28, scans: 52, growth: 0.04, sparkColor: '#71717a', data:[24,25,26,25,26,27,27,28,27,28,28,28] },
    { dept: '회계팀',    code: 'FIN001', docs: 23, scans: 41, growth: -0.08, sparkColor: '#ef4444', data:[25,26,25,24,24,23,24,23,23,22,23,23] },
  ];
  return (
    <section style={{ ...V2.panel, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: V2.divider, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>부서</h3>
          <span style={{ fontSize: 11, color: V2.muted, background: '#f4f4f5', padding: '1px 6px', borderRadius: 9999 }}>4</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ height: 24, padding: '0 8px', borderRadius: 4, background: '#fff', border: V2.divider, fontSize: 11, cursor: 'pointer', color: V2.muted, fontFamily: 'inherit' }}>정렬: 문서 수</button>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: '#fafafa', borderBottom: V2.divider }}>
            {['부서', '코드', '문서', 'NFC 스캔 30일', '증감', '추이'].map((h) => (
              <th key={h} style={{ textAlign: h === '부서' || h === '코드' ? 'left' : 'right', padding: '8px 16px', fontSize: 10.5, fontWeight: 600, color: V2.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.dept} style={{ borderBottom: i === rows.length - 1 ? 'none' : V2.divider }}>
              <td style={{ padding: '11px 16px', fontWeight: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 9999, background: r.sparkColor }}/>
                  {r.dept}
                </div>
              </td>
              <td style={{ padding: '11px 16px', color: V2.muted, fontFamily: 'ui-monospace,monospace', fontSize: 11.5 }}>{r.code}</td>
              <td style={{ padding: '11px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{r.docs}</td>
              <td style={{ padding: '11px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: V2.muted }}>{r.scans}</td>
              <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: r.growth >= 0 ? '#15803d' : '#b91c1c',
                }}>
                  {r.growth >= 0 ? '↑' : '↓'} {Math.abs(r.growth * 100).toFixed(1)}%
                </span>
              </td>
              <td style={{ padding: '11px 16px', width: 100 }}>
                <MiniLine data={r.data} color={r.sparkColor} height={20} width={84}/>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function V2RecentUploads() {
  const items = [
    { who: '김민지', file: '2025_상반기_신입사원_채용_공고문.pdf', dept: '인사팀', time: '11:24' },
    { who: '박서준', file: '근로계약서_표준양식_v3.pdf', dept: '인사팀', time: '10:52' },
    { who: '오재훈', file: 'TrayStorage_v2_API_Spec.pdf', dept: '개발팀', time: '10:18' },
    { who: '강민호', file: '2026_03월_정산보고서.pdf', dept: '회계팀', time: '09:02' },
    { who: '이수현', file: '경력직_채용_평가표.pdf', dept: '인사팀', time: '어제' },
  ];
  return (
    <section style={V2.panel}>
      <div style={{ padding: '12px 16px', borderBottom: V2.divider, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>최근 업로드</h3>
        <Icon name="chevron-right" size={14} color={V2.muted}/>
      </div>
      <div>
        {items.map((it, i) => (
          <div key={i} style={{
            padding: '10px 16px',
            borderBottom: i === items.length - 1 ? 'none' : V2.divider,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 2 }}>
              <Icon name="file-text" size={12} color={V2.muted}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.file}</div>
              <div style={{ fontSize: 11, color: V2.muted, marginTop: 2 }}>
                {it.who} · {it.dept} · <span style={{ color: V2.faint }}>{it.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function V2Expiring() {
  const items = [
    { name: '월간 정산 보관함',   days: 7,  color: '#ef4444' },
    { name: '광고 캠페인 보관함', days: 14, color: '#f59e0b' },
    { name: '면접 기록 보관함',   days: 22, color: '#f59e0b' },
    { name: '연간 감사 자료',     days: 28, color: '#eab308' },
  ];
  return (
    <section style={V2.panel}>
      <div style={{ padding: '12px 16px', borderBottom: V2.divider, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>만료 임박</h3>
        <span style={{ fontSize: 11, color: V2.muted, background: '#fef3c7', padding: '1px 6px', borderRadius: 9999, color: '#92400e', fontWeight: 600 }}>7</span>
      </div>
      <div>
        {items.map((it, i) => (
          <div key={i} style={{
            padding: '10px 16px',
            borderBottom: i === items.length - 1 ? 'none' : V2.divider,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 4, height: 24, borderRadius: 2, background: it.color, flex: 'none' }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{it.name}</div>
              <div style={{ fontSize: 11, color: V2.muted, marginTop: 1 }}>{it.days}일 후 만료</div>
            </div>
            <button style={{ background: 'transparent', border: 'none', color: V2.accent, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>연장</button>
          </div>
        ))}
      </div>
    </section>
  );
}

window.V2Editorial = V2Editorial;
