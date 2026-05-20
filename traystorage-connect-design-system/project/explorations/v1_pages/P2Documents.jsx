/* eslint-disable */
// Page 2 — 문서 관리 (Document Management) in V1 style.
// 4 KPI tiles · filter bar · big paginated table · right rail: upload trend mini-chart + recent uploads.

function P2Documents({ onNavigate }) {
  const docs = [
    { id: 'd1', title: '2025_상반기_신입사원_채용_공고문.pdf',  dept: '인사팀',   parent: '채용 문서',     sub: '채용 서류 보관함',     uploader: '김민지', uploadedAt: '2026-04-12', size: '342KB', status: 'active' },
    { id: 'd2', title: '근로계약서_표준양식_v3.pdf',             dept: '인사팀',   parent: '근로계약',       sub: '계약서 보관함',         uploader: '박서준', uploadedAt: '2026-03-28', size: '128KB', status: 'confidential' },
    { id: 'd3', title: 'TrayStorage_v2_API_Spec.pdf',           dept: '개발팀',   parent: '기술 문서',       sub: 'API 명세 보관함',       uploader: '오재훈', uploadedAt: '2026-05-01', size: '1.2MB', status: 'active' },
    { id: 'd4', title: '2026_03월_정산보고서.pdf',               dept: '회계팀',   parent: '정산 문서',       sub: '월간 정산 보관함',      uploader: '강민호', uploadedAt: '2026-04-03', size: '512KB', status: 'expiring' },
    { id: 'd5', title: '경력직_채용_평가표.pdf',                 dept: '인사팀',   parent: '채용 문서',       sub: '채용 서류 보관함',      uploader: '이수현', uploadedAt: '2026-03-19', size: '215KB', status: 'active' },
    { id: 'd6', title: '2026_Q2_광고_브리프.pdf',                dept: '마케팅팀', parent: 'Q2 캠페인',       sub: '광고 캠페인 보관함',    uploader: '최지원', uploadedAt: '2026-04-21', size: '684KB', status: 'active' },
    { id: 'd7', title: '면접_가이드라인_2026.pdf',               dept: '인사팀',   parent: '채용 문서',       sub: '채용 서류 보관함',      uploader: '최지원', uploadedAt: '2026-02-14', size: '486KB', status: 'active' },
    { id: 'd8', title: '내부_레퍼런스_체크_항목.pdf',            dept: '인사팀',   parent: '근로계약',       sub: '계약서 보관함',         uploader: '박서준', uploadedAt: '2026-02-02', size: ' 92KB', status: 'confidential' },
    { id: 'd9', title: '2026_05월_월간_매출매입.pdf',            dept: '회계팀',   parent: '정산 문서',       sub: '월간 정산 보관함',      uploader: '강민호', uploadedAt: '2026-05-15', size: '498KB', status: 'expiring' },
  ];
  const recents = docs.slice(0, 5);

  return (
    <V1Shell currentPath="/admin/documents" onNavigate={onNavigate}>
      <V1SPageHeader
        title="문서 관리"
        sub="모든 부서의 문서를 검색·필터·업로드 합니다."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <V1SOutlineButton icon="download">CSV 내보내기</V1SOutlineButton>
            <V1SPrimaryButton icon="upload">문서 업로드</V1SPrimaryButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <V1SStatTile title="전체 문서"      value={128} delta="+12"  icon="file-text" color={V1S.blue}    data={[80,85,98,110,116,120,124,128]}/>
        <V1SStatTile title="이번 달 업로드" value={24}  delta="−2"   deltaTone="down" icon="upload"     color={V1S.violet}  data={[30,28,26,24,27,24,22,24]}/>
        <V1SStatTile title="검토 대기"      value={6}   delta="+3"   icon="clock"     color={V1S.emerald} data={[1,2,2,3,3,4,5,6]}/>
        <V1SStatTile title="만료 임박"      value={7}   delta="WARN" deltaTone="flat" icon="bell"        color={V1S.amber}   data={[3,4,5,5,6,6,7,7]}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24 }}>
        <section style={V1S.card}>
          <P2FilterBar/>
          <P2Table docs={docs}/>
          <P2Pagination/>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <P2UploadTrend/>
          <P2RecentUploads items={recents}/>
        </div>
      </div>
    </V1Shell>
  );
}

function P2FilterBar() {
  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 360 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          <Icon name="search" size={14} color={V1S.faint}/>
        </span>
        <input placeholder="파일명, 업로더, 카테고리로 검색…" style={{
          width: '100%', height: 36, padding: '0 12px 0 34px',
          border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13,
          background: '#f8fafc', outline: 'none', fontFamily: 'inherit',
        }}/>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <P2FilterChip label="부서" value="전체"/>
        <P2FilterChip label="대분류" value="전체"/>
        <P2FilterChip label="기간" value="지난 30일"/>
        <P2FilterChip label="정렬" value="최신순"/>
      </div>
      <div style={{ flex: 1 }}/>
      <span style={{ fontSize: 12, color: V1S.muted }}>총 <strong style={{ color: V1S.ink }}>128</strong>건</span>
    </div>
  );
}

function P2FilterChip({ label, value }) {
  return (
    <button style={{
      height: 32, padding: '0 10px', borderRadius: 8,
      border: '1px solid #e5e7eb', background: '#fff',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', color: V1S.ink,
    }}>
      <span style={{ color: V1S.muted }}>{label}:</span>
      <strong style={{ fontWeight: 600 }}>{value}</strong>
      <Icon name="chevron-down" size={12} color={V1S.muted}/>
    </button>
  );
}

function P2Table({ docs }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 0.7fr 0.8fr 0.8fr 0.8fr 0.7fr 0.6fr 80px', gap: 12, padding: '10px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
        {['문서 제목','부서','대분류','세부 스토리지','작성자','업로드일','크기','작업'].map((h, i) => (
          <div key={h} style={{ fontSize: 11, fontWeight: 600, color: V1S.muted, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: i === 7 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>
      {docs.map((d, i) => (
        <div key={d.id} style={{
          display: 'grid', gridTemplateColumns: '1.7fr 0.7fr 0.8fr 0.8fr 0.8fr 0.7fr 0.6fr 80px',
          gap: 12, padding: '12px 24px', alignItems: 'center',
          borderBottom: i === docs.length - 1 ? 'none' : '1px solid #f8fafc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: V1S.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon name="file-text" size={13} color={V1S.blueInk}/>
            </div>
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 500, fontSize: 13, color: V1S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
              {d.status === 'confidential' && <V1SChip variant="neutral">기밀</V1SChip>}
              {d.status === 'expiring'     && <V1SChip variant="amber">만료 임박</V1SChip>}
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: V1S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.dept}</div>
          <div style={{ fontSize: 12.5, color: V1S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.parent}</div>
          <div style={{ fontSize: 12.5, color: V1S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.sub}</div>
          <div style={{ fontSize: 12.5, color: V1S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.uploader}</div>
          <div style={{ fontSize: 11.5, color: V1S.faint, fontFamily: 'ui-monospace,monospace' }}>{d.uploadedAt}</div>
          <div style={{ fontSize: 11.5, color: V1S.faint, fontFamily: 'ui-monospace,monospace' }}>{d.size}</div>
          <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <button style={ghostIconBtn2}><Icon name="eye"      size={14} color={V1S.muted}/></button>
            <button style={ghostIconBtn2}><Icon name="download" size={14} color={V1S.muted}/></button>
          </div>
        </div>
      ))}
    </div>
  );
}

const ghostIconBtn2 = { width: 26, height: 26, borderRadius: 6, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };

function P2Pagination() {
  return (
    <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: V1S.muted }}>1 ~ 9 / 128건</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {['‹','1','2','3','4','…','15','›'].map((p, i) => (
          <button key={i} style={{
            minWidth: 28, height: 28, padding: '0 8px', borderRadius: 6,
            border: '1px solid #e5e7eb',
            background: p === '1' ? V1S.blue : '#fff',
            color: p === '1' ? '#fff' : V1S.ink,
            fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500,
          }}>{p}</button>
        ))}
      </div>
    </div>
  );
}

function P2UploadTrend() {
  const data = [4,6,5,8,9,11,8,14,10,16,12,15,18,12,16,21,18,24,19,22,26,20,24,28,22,26,29,24,22,24];
  const max = Math.max(...data);
  return (
    <section style={V1S.card}>
      <V1SCardHeader title="업로드 추이" icon="trending-up" iconColor={V1S.blue} sub="지난 30일"/>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>574</span>
          <span style={{ fontSize: 12, color: V1S.muted }}>건 업로드</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>+14%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 64 }}>
          {data.map((v, i) => (
            <div key={i} style={{
              flex: 1, height: `${(v / max) * 100}%`,
              background: i >= data.length - 7 ? V1S.blue : '#cbd5e1',
              borderRadius: 1, minHeight: 2,
            }}/>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: V1S.faint, marginTop: 6, fontFamily: 'ui-monospace,monospace' }}>
          <span>30일 전</span><span>오늘</span>
        </div>
      </div>
    </section>
  );
}

function P2RecentUploads({ items }) {
  return (
    <section style={V1S.card}>
      <V1SCardHeader title="최근 업로드" icon="upload" iconColor={V1S.blue}/>
      <div>
        {items.map((it, i) => (
          <div key={it.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 22px',
            borderTop: i === 0 ? 'none' : '1px solid #f8fafc',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: V1S.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 1 }}>
              <Icon name="file-text" size={13} color={V1S.blueInk}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: V1S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
              <div style={{ fontSize: 11, color: V1S.muted, marginTop: 2 }}>{it.uploader} · {it.dept} · {it.uploadedAt}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.P2Documents = P2Documents;
