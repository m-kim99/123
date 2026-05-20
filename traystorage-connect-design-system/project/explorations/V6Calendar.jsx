/* eslint-disable */
// V6 — Calendar Heatmap.  Activity over time as the primary visual.
// 52-week × 7-day grid showing NFC scan intensity. Like GitHub contributions
// but tuned for a Korean B2B audience — slate steps, no green.

function V6Calendar() {
  return (
    <div style={V6.shell}>
      <V6Sidebar/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <V6Header/>
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px 32px' }}>
          <V6PageHeader/>
          <V6Heatmap/>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, marginTop: 24 }}>
            <V6DailyDetail/>
            <V6TopTags/>
          </div>
        </main>
      </div>
    </div>
  );
}

const V6 = {
  shell: { display: 'flex', height: '100%', background: '#fafafa', fontFamily: "'Noto Sans KR','Noto Sans',sans-serif", color: '#0f172a' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' },
  ink: '#0f172a', muted: '#64748b', faint: '#94a3b8',
};

const HEAT_STEPS = ['#f1f5f9', '#cbd5e1', '#94a3b8', '#475569', '#1e293b', '#0f172a'];

function V6Sidebar() {
  const items = [['활동','clock',true],['부서 관리','building-2'],['대분류','folder-open'],['세부 스토리지','archive'],['문서 관리','file-text'],['NFC 태그','nfc'],['팀원','users'],['통계','bar-chart']];
  return (
    <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 18px', borderBottom: '1px solid #e5e7eb' }}>
        <img src="../assets/logo.png" alt="" style={{ height: 26 }}/>
      </div>
      <div style={{ padding: 10, flex: 1 }}>
        {items.map(([label, icon, active]) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: active ? '#f1f5f9' : 'transparent',
            color: active ? V6.ink : '#475569',
            marginBottom: 1,
          }}>
            <Icon name={icon} size={15} color={active ? V6.ink : '#94a3b8'}/>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function V6Header() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 12.5, color: V6.muted }}>대시보드 / <strong style={{ color: V6.ink, fontWeight: 600 }}>활동</strong></div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', gap: 4, padding: 3, background: '#f1f5f9', borderRadius: 8 }}>
        {['지난 1년','24개월','전체'].map((p, i) => (
          <button key={p} style={{
            padding: '6px 12px', borderRadius: 5, border: 'none',
            background: i === 0 ? '#fff' : 'transparent',
            color: i === 0 ? V6.ink : V6.muted, fontWeight: 500, fontSize: 12,
            fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>{p}</button>
        ))}
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 9999, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>홍</div>
    </header>
  );
}

function V6PageHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.015em' }}>
          지난 1년간 <span style={{ color: V6.ink, fontFeatureSettings: '"tnum"' }}>4,127</span>회의 NFC 스캔
        </h1>
        <p style={{ margin: '6px 0 0', color: V6.muted, fontSize: 13 }}>
          가장 활발했던 날은 <strong style={{ color: V6.ink }}>2026년 3월 14일 (목)</strong> · 38회 스캔
        </p>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <Metric label="이번 주 스캔"   value="312" delta="+18%" />
        <div style={{ width: 1, height: 36, background: '#e5e7eb' }}/>
        <Metric label="연속 활동 일수"  value="47" sub="일" />
        <div style={{ width: 1, height: 36, background: '#e5e7eb' }}/>
        <Metric label="활성 태그"       value="38" sub="/ 47" />
      </div>
    </div>
  );
}

function Metric({ label, value, sub, delta }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: V6.muted, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: V6.ink, letterSpacing: '-0.02em', lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{value}</span>
        {sub && <span style={{ fontSize: 12, color: V6.faint }}>{sub}</span>}
        {delta && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>{delta}</span>}
      </div>
    </div>
  );
}

function V6Heatmap() {
  // Generate 52 weeks × 7 days with deterministic pseudo-random intensity.
  const weeks = [];
  for (let w = 0; w < 52; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const seed = w * 7 + d;
      // weekend: low; mid-week: bursty; ramp toward today
      let v = ((seed * 17 + d * 23 + w * 11) % 7);
      if (d === 0 || d === 6) v = Math.max(0, v - 4);
      if (w > 40) v += 1;
      if (w > 48) v += 1;
      if (w === 51 && d > 3) v = 0; // future
      v = Math.max(0, Math.min(5, v));
      days.push(v);
    }
    weeks.push(days);
  }
  // Month labels: position roughly at weeks 0, 4, 8...
  const months = ['6월','7월','8월','9월','10월','11월','12월','1월','2월','3월','4월','5월'];
  return (
    <section style={{ ...V6.card, padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 18, fontSize: 12, color: V6.muted }}>
          <span><strong style={{ color: V6.ink, fontWeight: 600 }}>4,127</strong> 스캔</span>
          <span><strong style={{ color: V6.ink, fontWeight: 600 }}>284</strong> 활동일</span>
          <span><strong style={{ color: V6.ink, fontWeight: 600 }}>47일</strong> 연속</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: V6.muted }}>
          <span>적음</span>
          {HEAT_STEPS.map((c) => (
            <span key={c} style={{ width: 11, height: 11, background: c, borderRadius: 2 }}/>
          ))}
          <span>많음</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* month labels */}
        <div style={{ display: 'grid', gridTemplateColumns: `28px repeat(52, 1fr)`, gap: 3, fontSize: 10, color: V6.muted, fontFamily: 'ui-monospace,monospace', height: 14 }}>
          <div/>
          {Array.from({ length: 52 }).map((_, i) => {
            const showAt = Math.floor(i / 4.33);
            const isFirstOfMonth = i % 4 === 0;
            return <div key={i}>{isFirstOfMonth && months[showAt] ? months[showAt] : ''}</div>;
          })}
        </div>

        {/* day rows */}
        {['월','화','수','목','금','토','일'].map((d, di) => (
          <div key={di} style={{ display: 'grid', gridTemplateColumns: `28px repeat(52, 1fr)`, gap: 3, alignItems: 'center', height: 13 }}>
            <div style={{ fontSize: 10, color: V6.muted, fontFamily: 'ui-monospace,monospace' }}>
              {di % 2 === 0 ? d : ''}
            </div>
            {weeks.map((week, wi) => {
              const intensity = week[di];
              return (
                <div key={wi} style={{
                  height: 11, background: HEAT_STEPS[intensity], borderRadius: 2,
                  border: intensity === 0 ? '1px solid rgba(15,23,42,0.04)' : 'none',
                }}/>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
        <DeptScanRow dept="개발팀"   total={1284} dist={[0,1,2,2,3,4,5,4,3,4,3,5]}/>
        <DeptScanRow dept="인사팀"   total={1182} dist={[1,1,2,3,3,3,4,3,3,2,3,4]}/>
        <DeptScanRow dept="마케팅팀" total={ 942} dist={[1,2,2,2,3,3,3,2,2,2,3,3]}/>
        <DeptScanRow dept="회계팀"   total={ 719} dist={[0,1,1,2,2,2,3,2,2,2,2,3]}/>
      </div>
    </section>
  );
}

function DeptScanRow({ dept, total, dist }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: V6.ink }}>{dept}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: V6.ink, fontFeatureSettings: '"tnum"', letterSpacing: '-0.01em' }}>{total.toLocaleString()}</span>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {dist.map((v, i) => (
          <div key={i} style={{ flex: 1, height: 6, background: HEAT_STEPS[v], borderRadius: 1 }}/>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: V6.faint, marginTop: 3, fontFamily: 'ui-monospace,monospace' }}>
        <span>6월</span><span>5월</span>
      </div>
    </div>
  );
}

function V6DailyDetail() {
  // Hours 0-23 with deterministic activity, peaks around 10-12 and 14-17
  const hours = Array.from({ length: 24 }).map((_, h) => {
    if (h < 7 || h > 21) return 0;
    if (h >= 10 && h <= 12) return 24 + (h % 3) * 4;
    if (h >= 14 && h <= 17) return 18 + (h % 3) * 5;
    return 4 + h % 4;
  });
  const maxH = Math.max(...hours);
  const top = [
    { who: '오재훈', tag: 'NFC-038', what: '제품 명세서 보관함', count: 8 },
    { who: '김민지', tag: 'NFC-011', what: '채용 서류 보관함',   count: 6 },
    { who: '박서준', tag: 'NFC-014', what: '근로계약 보관함',     count: 5 },
    { who: '강민호', tag: 'NFC-022', what: '월간 정산 보관함',   count: 4 },
  ];
  return (
    <section style={V6.card}>
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>2026년 5월 20일 (수)</h3>
          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: V6.muted }}>오늘의 시간대별 스캔 분포</p>
        </div>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: V6.ink, fontFeatureSettings: '"tnum"' }}>312</span>
      </div>
      <div style={{ padding: 22 }}>
        <div style={{ position: 'relative', height: 80, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
          {hours.map((v, h) => (
            <div key={h} style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%',
                height: `${(v / maxH) * 100}%`,
                background: h >= 9 && h <= 18 ? V6.ink : '#cbd5e1',
                borderRadius: 1,
                minHeight: v > 0 ? 2 : 0,
              }}/>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: V6.faint, fontFamily: 'ui-monospace,monospace', marginTop: 6 }}>
          <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
        </div>

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 11, color: V6.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>오늘의 인기 태그</div>
          {top.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #f8fafc' }}>
              <span style={{ fontSize: 10.5, color: V6.muted, fontFamily: 'ui-monospace,monospace', fontWeight: 600, width: 56 }}>{it.tag}</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.what}</div>
                <div style={{ fontSize: 11, color: V6.muted, marginTop: 1 }}>{it.who}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 60, height: 4, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ width: `${(it.count / 8) * 100}%`, height: '100%', background: V6.ink, borderRadius: 9999 }}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, fontFeatureSettings: '"tnum"', width: 20, textAlign: 'right' }}>{it.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function V6TopTags() {
  const rec = [
    { name: '채용 서류 보관함', dept: '인사팀', loc: 'A동 2층', total: 1284 },
    { name: '제품 명세서 보관함', dept: '개발팀', loc: 'C동 1층', total: 982 },
    { name: '월간 정산 보관함', dept: '회계팀', loc: 'B동 1층', total: 743 },
  ];
  return (
    <section style={V6.card}>
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>최다 스캔 보관함</h3>
        <p style={{ margin: '3px 0 0', fontSize: 11.5, color: V6.muted }}>지난 30일</p>
      </div>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {rec.map((r, i) => (
          <div key={r.name}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 11, color: V6.muted, fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>#{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: V6.ink, fontFeatureSettings: '"tnum"' }}>{r.total.toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 11, color: V6.muted, marginBottom: 8 }}>
              {r.dept} · <Icon name="map-pin" size={10} color={V6.muted}/> {r.loc}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {Array.from({ length: 30 }).map((_, j) => {
                const v = ((j * 13 + i * 7) % 6);
                return <div key={j} style={{ flex: 1, height: 16, background: HEAT_STEPS[v], borderRadius: 2 }}/>;
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.V6Calendar = V6Calendar;
