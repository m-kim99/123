/* eslint-disable */
// Page 4 — 통계 (Statistics) in V1 style.
// 4 KPIs · big monthly trend area chart · department distribution donut ·
// top categories leaderboard · NFC scan vs upload comparison.

function P4Statistics({ onNavigate }) {
  return (
    <V1Shell currentPath="/admin/statistics" onNavigate={onNavigate}>
      <V1SPageHeader
        eyebrow="2026년 1월 1일 — 5월 20일"
        title="통계"
        sub="문서·세부 스토리지·NFC 활동을 분석합니다."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <V1SOutlineButton icon="download">PDF 보고서</V1SOutlineButton>
            <V1SOutlineButton>지난 30일</V1SOutlineButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <V1SStatTile title="총 문서"          value={128}   delta="+12"   icon="file-text"   color={V1S.blue}    data={[62,68,71,80,85,98,110,128]}/>
        <V1SStatTile title="누적 NFC 스캔"    value="4,127" delta="+18%" icon="nfc"          color={V1S.violet}  data={[2400,2600,2900,3100,3400,3700,3950,4127]}/>
        <V1SStatTile title="활성 사용자"      value={42}    delta="+5"   icon="users"        color={V1S.emerald} data={[28,30,33,35,36,38,40,42]}/>
        <V1SStatTile title="이번 달 만료 임박" value={7}    delta="WARN" deltaTone="flat" icon="clock"     color={V1S.amber}   data={[3,3,4,4,5,6,6,7]}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 24, marginBottom: 24 }}>
        <P4Trend/>
        <P4DeptDonut/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <P4TopParents/>
        <P4MonthlyBars/>
      </div>
    </V1Shell>
  );
}

function P4Trend() {
  // Two series: uploads + scans over 12 months.
  const months = ['6월','7월','8월','9월','10월','11월','12월','1월','2월','3월','4월','5월'];
  const uploads = [22, 28, 32, 36, 41, 44, 38, 45, 52, 58, 62, 24];
  const scans   = [180, 210, 240, 268, 290, 312, 280, 340, 380, 420, 460, 312];

  // We'll plot uploads (filled area) and scans (line, scaled to share Y).
  const W = 540, H = 200, PAD_L = 36, PAD_R = 10, PAD_T = 14, PAD_B = 26;
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;
  const maxU = Math.max(...uploads), maxS = Math.max(...scans);
  const uPts = uploads.map((v, i) => [PAD_L + (i / (uploads.length - 1)) * plotW, PAD_T + plotH - (v / maxU) * plotH]);
  const sPts = scans.map((v, i)   => [PAD_L + (i / (scans.length - 1))   * plotW, PAD_T + plotH - (v / maxS) * plotH]);

  return (
    <section style={V1S.card}>
      <V1SCardHeader
        title="월별 업로드 · NFC 스캔"
        icon="trending-up"
        iconColor={V1S.blue}
        sub="지난 12개월"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5, color: V1S.muted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: V1S.blue }}/>업로드
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 2, background: V1S.violet }}/>NFC 스캔
            </span>
          </div>
        }
      />
      <div style={{ padding: '18px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: V1S.muted, fontWeight: 500, marginBottom: 2 }}>이번 달 업로드</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>24</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#b91c1c', background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>−2</span>
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: '#e5e7eb' }}/>
          <div>
            <div style={{ fontSize: 11, color: V1S.muted, fontWeight: 500, marginBottom: 2 }}>이번 달 NFC 스캔</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>312</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>+18%</span>
            </div>
          </div>
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', height: 200 }}>
          <defs>
            <linearGradient id="p4-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={V1S.blue} stopOpacity="0.22"/>
              <stop offset="100%" stopColor={V1S.blue} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {/* horizontal grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1={PAD_L} x2={W - PAD_R} y1={PAD_T + plotH * p} y2={PAD_T + plotH * p} stroke="#f1f5f9" strokeWidth="1"/>
          ))}
          {/* y-axis labels (uploads scale) */}
          {[0, 0.5, 1].map((p) => (
            <text key={p} x={PAD_L - 6} y={PAD_T + plotH * (1 - p) + 4} fontSize="9" fill={V1S.faint} textAnchor="end" fontFamily="ui-monospace,monospace">{Math.round(maxU * p)}</text>
          ))}
          {/* uploads filled area */}
          <polygon
            fill="url(#p4-area)"
            points={`${PAD_L},${PAD_T + plotH} ${uPts.map((p) => p.join(',')).join(' ')} ${W - PAD_R},${PAD_T + plotH}`}
          />
          {/* uploads line */}
          <polyline
            fill="none" stroke={V1S.blue} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
            points={uPts.map((p) => p.join(',')).join(' ')}
          />
          {/* uploads dots */}
          {uPts.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={i === uPts.length - 1 ? 3.5 : 2.5} fill="#fff" stroke={V1S.blue} strokeWidth="1.5"/>
          ))}
          {/* scans dashed line */}
          <polyline
            fill="none" stroke={V1S.violet} strokeWidth="1.5" strokeDasharray="4 4" strokeLinejoin="round"
            points={sPts.map((p) => p.join(',')).join(' ')}
          />
          {/* x labels */}
          {months.map((m, i) => (
            <text key={i} x={PAD_L + (i / (months.length - 1)) * plotW} y={H - 6} fontSize="9.5" fill={V1S.faint} textAnchor="middle" fontFamily="ui-monospace,monospace">{m}</text>
          ))}
          {/* highlight last point */}
          <line x1={uPts[uPts.length - 1][0]} y1={PAD_T} x2={uPts[uPts.length - 1][0]} y2={PAD_T + plotH} stroke={V1S.blue} strokeWidth="1" strokeDasharray="2 3" opacity="0.4"/>
        </svg>
      </div>
    </section>
  );
}

function P4DeptDonut() {
  const data = [
    { name: '개발팀',   value: 45, color: V1S.blue },
    { name: '인사팀',   value: 32, color: V1S.violet },
    { name: '마케팅팀', value: 28, color: V1S.emerald },
    { name: '회계팀',   value: 23, color: V1S.amber },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 56, cx = 76, cy = 76, stroke = 16;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <section style={V1S.card}>
      <V1SCardHeader title="부서별 문서 분포" icon="building-2" iconColor={V1S.blue}/>
      <div style={{ padding: '18px 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="152" height="152" style={{ flex: 'none' }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke}/>
            {data.map((d, i) => {
              const len = (d.value / total) * circumference;
              const arc = (
                <circle key={i}
                  cx={cx} cy={cy} r={r}
                  fill="none" stroke={d.color} strokeWidth={stroke}
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return arc;
            })}
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="26" fontWeight="700" fill={V1S.ink} fontFamily="inherit" style={{ letterSpacing: '-0.03em' }}>{total}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill={V1S.muted} fontFamily="inherit">총 문서</text>
          </svg>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.map((d) => {
              const pct = ((d.value / total) * 100).toFixed(1);
              return (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flex: 'none' }}/>
                  <span style={{ fontSize: 12.5, color: V1S.ink, fontWeight: 500, flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: V1S.ink, fontFeatureSettings: '"tnum"', width: 28, textAlign: 'right' }}>{d.value}</span>
                  <span style={{ fontSize: 11, color: V1S.faint, fontFeatureSettings: '"tnum"', width: 38, textAlign: 'right' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function P4TopParents() {
  const data = [
    { name: '채용 문서',     dept: '인사팀',   docs: 23, color: V1S.blue },
    { name: '기술 문서',     dept: '개발팀',   docs: 19, color: V1S.violet },
    { name: '정산 문서',     dept: '회계팀',   docs: 16, color: V1S.emerald },
    { name: 'Q2 캠페인',     dept: '마케팅팀', docs: 14, color: V1S.amber },
    { name: '근로계약',       dept: '인사팀',   docs: 12, color: V1S.blue },
    { name: '교육 자료',     dept: '인사팀',   docs:  9, color: V1S.blue },
  ];
  const max = Math.max(...data.map((d) => d.docs));
  return (
    <section style={V1S.card}>
      <V1SCardHeader title="상위 대분류" icon="folder-open" iconColor={V1S.blue} sub="문서 수 기준"/>
      <div style={{ padding: '14px 24px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 36px', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: V1S.faint, fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: V1S.ink }}>{d.name}</span>
                <span style={{ fontSize: 11, color: V1S.muted }}>{d.dept}</span>
              </div>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ width: `${(d.docs / max) * 100}%`, height: '100%', background: d.color, borderRadius: 9999 }}/>
              </div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: V1S.ink, textAlign: 'right', fontFeatureSettings: '"tnum"' }}>{d.docs}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function P4MonthlyBars() {
  // Side-by-side bars: this month vs last month per department.
  const data = [
    { dept: '개발팀',   thisM: 18, lastM: 12 },
    { dept: '인사팀',   thisM: 12, lastM: 14 },
    { dept: '마케팅팀', thisM:  8, lastM:  6 },
    { dept: '회계팀',   thisM:  6, lastM:  9 },
  ];
  const max = Math.max(...data.flatMap((d) => [d.thisM, d.lastM]));
  return (
    <section style={V1S.card}>
      <V1SCardHeader
        title="부서별 월간 업로드"
        icon="bar-chart"
        iconColor={V1S.blue}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11.5, color: V1S.muted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: V1S.blue }}/>이번 달</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#cbd5e1' }}/>지난 달</span>
          </div>
        }
      />
      <div style={{ padding: '18px 24px 22px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.map((d) => (
            <div key={d.dept} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: V1S.ink }}>{d.dept}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ height: 10, position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${(d.thisM / max) * 100}%`, background: V1S.blue, borderRadius: 3 }}/>
                </div>
                <div style={{ height: 10, position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${(d.lastM / max) * 100}%`, background: '#cbd5e1', borderRadius: 3 }}/>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: V1S.ink, fontFeatureSettings: '"tnum"' }}>{d.thisM}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: d.thisM >= d.lastM ? '#15803d' : '#b91c1c',
                }}>
                  {d.thisM >= d.lastM ? '↑' : '↓'} {Math.abs(d.thisM - d.lastM)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

window.P4Statistics = P4Statistics;
