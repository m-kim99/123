/* eslint-disable */
// V5 — Building Cross-Section.  Architectural elevation of the facility:
// floors stack vertically, departments occupy zones on each floor, NFC tags
// pulse as dots on the cabinets. Blueprint-paper texture, slate ink lines.

function V5Section() {
  return (
    <div style={V5.shell}>
      <V5Sidebar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <V5Header/>
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px 32px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20 }}>
          <V5Elevation/>
          <V5RightRail/>
        </main>
      </div>
    </div>
  );
}

const V5 = {
  shell: { display: 'flex', height: '100%', background: '#f1f5f9', fontFamily: "'Noto Sans KR','Noto Sans',sans-serif", color: '#0f172a' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' },
  ink: '#0f172a', muted: '#64748b', faint: '#94a3b8', line: '#1e293b',
};

function V5Sidebar() {
  const items = [['시설 현황','map-pin',true],['부서 관리','building-2'],['대분류','folder-open'],['세부 스토리지','archive'],['문서 관리','file-text'],['NFC 태그','nfc'],['팀원','users'],['통계','bar-chart']];
  return (
    <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 18px', borderBottom: '1px solid #e2e8f0' }}>
        <img src="../assets/logo.png" alt="" style={{ height: 26 }}/>
      </div>
      <div style={{ padding: 10, flex: 1 }}>
        {items.map(([label, icon, active]) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: active ? '#0f172a' : 'transparent',
            color: active ? '#fff' : '#475569',
            marginBottom: 1,
          }}>
            <Icon name={icon} size={15} color={active ? '#fff' : '#94a3b8'}/>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function V5Header() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 28px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: V5.muted, fontFamily: 'ui-monospace,monospace' }}>
        <span>FACILITY-001</span>
        <span style={{ color: V5.faint }}>·</span>
        <span>서울 강남 본사</span>
      </div>
      <div style={{ flex: 1 }}/>
      <button style={{ height: 32, padding: '0 12px', borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: V5.ink, fontFamily: 'inherit' }}>
        평면도 보기 <Icon name="chevron-right" size={12}/>
      </button>
      <button style={{ height: 32, padding: '0 12px', borderRadius: 8, background: V5.ink, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit' }}>
        <Icon name="nfc" size={14}/> 태그 스캔
      </button>
      <div style={{ width: 36, height: 36, borderRadius: 9999, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>홍</div>
    </header>
  );
}

function V5Elevation() {
  // Three floors. Each floor's zones are positioned within.
  // Tags: x position (% of zone width), status ('active' | 'hot' | 'inactive').
  const FLOORS = [
    {
      label: 'F3', name: '3층',
      zones: [{
        dept: '개발팀', code: 'DEV001', color: '#1e293b',
        x: 6, w: 88, docs: 45,
        cabinets: [
          { x: 0, w: 26, tags: [{ x: 22, s: 'hot' }, { x: 48, s: 'active' }, { x: 75, s: 'active' }] },
          { x: 30, w: 30, tags: [{ x: 18, s: 'active' }, { x: 50, s: 'active' }, { x: 80, s: 'hot' }] },
          { x: 64, w: 30, tags: [{ x: 20, s: 'active' }, { x: 55, s: 'inactive' }, { x: 82, s: 'active' }] },
        ],
      }],
    },
    {
      label: 'F2', name: '2층',
      zones: [{
        dept: '인사팀', code: 'HR001', color: '#1e293b',
        x: 6, w: 50, docs: 32,
        cabinets: [
          { x: 0, w: 44, tags: [{ x: 15, s: 'hot' }, { x: 40, s: 'active' }, { x: 70, s: 'active' }] },
          { x: 50, w: 46, tags: [{ x: 18, s: 'active' }, { x: 50, s: 'active' }, { x: 82, s: 'hot' }] },
        ],
      },
      {
        dept: '회계팀', code: 'FIN001', color: '#1e293b',
        x: 60, w: 34, docs: 23,
        cabinets: [
          { x: 0, w: 42, tags: [{ x: 22, s: 'active' }, { x: 65, s: 'inactive' }] },
          { x: 50, w: 44, tags: [{ x: 30, s: 'active' }, { x: 70, s: 'active' }] },
        ],
      }],
    },
    {
      label: 'F1', name: '1층',
      zones: [{
        dept: '마케팅팀', code: 'MKT001', color: '#1e293b',
        x: 6, w: 88, docs: 28,
        cabinets: [
          { x: 0, w: 28, tags: [{ x: 25, s: 'active' }, { x: 65, s: 'active' }] },
          { x: 32, w: 28, tags: [{ x: 25, s: 'inactive' }, { x: 70, s: 'active' }] },
          { x: 64, w: 30, tags: [{ x: 20, s: 'active' }, { x: 55, s: 'active' }, { x: 85, s: 'hot' }] },
        ],
      }],
    },
  ];
  const FLOOR_H = 130;
  const tagColor = (s) => s === 'hot' ? '#f59e0b' : s === 'active' ? '#22c55e' : '#cbd5e1';
  return (
    <section style={V5.card}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: V5.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>SECTION VIEW · ELEVATION</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.015em' }}>본사 단면도</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: V5.muted }}>활성 NFC 태그 <strong style={{ color: V5.ink }}>38</strong> / 47 · 캐비닛 16개</p>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: V5.muted }}>
          {[
            ['#f59e0b','만료 임박'],
            ['#22c55e','활성'],
            ['#cbd5e1','비활성'],
          ].map(([c, l]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: c }}/>{l}
            </span>
          ))}
        </div>
      </div>
      <div style={{
        padding: 24,
        backgroundImage: 'linear-gradient(rgba(30,41,59,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,59,0.05) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}>
        <div style={{ position: 'relative', background: '#fafbfc', border: `1.5px solid ${V5.line}`, borderRadius: 4 }}>
          {/* roof line */}
          <div style={{ height: 24, borderBottom: `1.5px solid ${V5.line}`, background: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(30,41,59,0.05) 6px, rgba(30,41,59,0.05) 8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <span style={{ fontSize: 10, color: V5.muted, fontFamily: 'ui-monospace,monospace', letterSpacing: '0.08em' }}>ROOF · 옥상</span>
            <span style={{ position: 'absolute', right: 10, top: 6, fontSize: 9, color: V5.faint, fontFamily: 'ui-monospace,monospace' }}>+15.0m</span>
          </div>

          {FLOORS.map((floor, fi) => (
            <div key={floor.label} style={{ position: 'relative', height: FLOOR_H, borderTop: fi === 0 ? 'none' : `1px solid ${V5.line}` }}>
              {/* floor label */}
              <div style={{ position: 'absolute', left: 8, top: 8, fontFamily: 'ui-monospace,monospace', fontSize: 11, color: V5.muted, letterSpacing: '0.08em', fontWeight: 600 }}>
                {floor.label} · {floor.name}
              </div>
              <div style={{ position: 'absolute', right: 10, top: 8, fontFamily: 'ui-monospace,monospace', fontSize: 9, color: V5.faint }}>
                {fi === 0 ? '+11.0m' : fi === 1 ? '+7.0m' : '+3.5m'}
              </div>

              {/* zones */}
              {floor.zones.map((z, zi) => (
                <div key={zi} style={{
                  position: 'absolute',
                  left: `${z.x}%`, width: `${z.w}%`,
                  top: 30, bottom: 12,
                  background: '#fff',
                  border: `1.5px solid ${z.color}`,
                  borderRadius: 4,
                  padding: '8px 10px',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: V5.ink, letterSpacing: '-0.01em' }}>{z.dept}</span>
                      <span style={{ fontSize: 9.5, color: V5.muted, fontFamily: 'ui-monospace,monospace' }}>{z.code}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: V5.ink, fontFeatureSettings: '"tnum"' }}>
                      {z.docs} <span style={{ fontSize: 9, color: V5.muted, fontWeight: 400 }}>docs</span>
                    </span>
                  </div>
                  {/* cabinets */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    {z.cabinets.map((cab, ci) => (
                      <div key={ci} style={{
                        position: 'absolute',
                        left: `${cab.x}%`, width: `${cab.w}%`,
                        top: 6, bottom: 0,
                        background: '#f8fafc',
                        border: `1px solid ${V5.line}`,
                        borderRadius: 2,
                      }}>
                        {/* shelf lines */}
                        {[0.33, 0.66].map((p) => (
                          <div key={p} style={{ position: 'absolute', left: 4, right: 4, top: `${p * 100}%`, height: 1, background: '#cbd5e1' }}/>
                        ))}
                        {/* nfc tags pinned to shelves */}
                        {cab.tags.map((t, ti) => (
                          <div key={ti} style={{
                            position: 'absolute',
                            left: `${t.x}%`, top: `${(ti % 3) * 33 + 12}%`,
                            transform: 'translate(-50%, -50%)',
                            width: t.s === 'hot' ? 9 : 7, height: t.s === 'hot' ? 9 : 7,
                            borderRadius: 9999, background: tagColor(t.s),
                            boxShadow: t.s === 'hot' ? `0 0 0 3px ${tagColor(t.s)}33` : `0 0 0 2px ${tagColor(t.s)}22`,
                          }}/>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* ground line */}
          <div style={{ borderTop: `2.5px solid ${V5.line}`, position: 'relative', padding: '4px 10px', background: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(30,41,59,0.08) 6px, rgba(30,41,59,0.08) 8px)' }}>
            <span style={{ fontSize: 10, color: V5.muted, fontFamily: 'ui-monospace,monospace', letterSpacing: '0.08em' }}>GROUND · 지면</span>
            <span style={{ position: 'absolute', right: 10, top: 4, fontSize: 9, color: V5.muted, fontFamily: 'ui-monospace,monospace' }}>±0.0m</span>
          </div>
        </div>

        {/* dimension annotations below */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '0 4px', fontSize: 10, color: V5.faint, fontFamily: 'ui-monospace,monospace' }}>
          <span>← 28m →</span>
          <span>실시간 동기화 · 11:24:03</span>
        </div>
      </div>
    </section>
  );
}

function V5RightRail() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[
        { label: '활성 태그', val: 38, sub: '/ 47', tone: '#22c55e' },
        { label: '24시간 스캔', val: 312, sub: '+18%', tone: '#0f172a' },
        { label: '만료 임박', val: 7, sub: '30일 이내', tone: '#f59e0b' },
      ].map((s) => (
        <div key={s.label} style={{ ...V5.card, padding: 16 }}>
          <div style={{ fontSize: 11, color: V5.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: s.tone, letterSpacing: '-0.02em', lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{s.val}</span>
            <span style={{ fontSize: 12, color: V5.muted }}>{s.sub}</span>
          </div>
        </div>
      ))}
      <div style={{ ...V5.card, padding: 16 }}>
        <div style={{ fontSize: 11, color: V5.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>24시간 스캔 분포</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 64 }}>
          {[3,5,2,1,1,2,4,8,14,18,22,28,32,30,26,20,16,18,22,24,16,12,8,5].map((v, i) => (
            <div key={i} style={{ flex: 1, height: `${(v / 32) * 100}%`, background: i >= 8 && i <= 18 ? '#0f172a' : '#cbd5e1', borderRadius: 1, minHeight: 2 }}/>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: V5.faint, fontFamily: 'ui-monospace,monospace', marginTop: 6 }}>
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
        </div>
      </div>
      <div style={{ ...V5.card, padding: 16 }}>
        <div style={{ fontSize: 11, color: V5.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>점검 필요</div>
        {[['NFC-024', 'B동 1층', '24시간 응답 없음'], ['NFC-009', 'A동 2층', '7일 이상 비활성']].map(([id, loc, why]) => (
          <div key={id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: id !== 'NFC-024' ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ width: 6, height: 6, borderRadius: 9999, background: '#ef4444', marginTop: 6 }}/>
            <div>
              <div style={{ fontSize: 11.5, fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>{id}</div>
              <div style={{ fontSize: 11, color: V5.muted, marginTop: 1 }}>{loc} · {why}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.V5Section = V5Section;
