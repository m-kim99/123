/* eslint-disable */
// Page 1 — 세부 스토리지 상세 (Subcategory Detail) in V1 style.
// Hero info card · 4 KPI tiles with sparklines · document table + activity timeline · QR + nfc card.

function P1Subcategory({ onNavigate }) {
  const sub = {
    id: 'sub-1', name: '채용 서류 보관함',
    department: '인사팀', deptCode: 'HR001', parent: '채용 문서',
    description: '신규 입사자 채용 관련 서류를 보관합니다. 이력서·자기소개서·근로계약서 등 채용 절차상 발생하는 모든 문서를 이 보관함에서 관리합니다.',
    location: 'A동 2층 캐비닛 3',
    managementNumber: 'MGT-2024-001',
    nfcTagId: 'NFC-011',
    nfcActive: true,
    labelColor: '#3b82f6',
  };

  const documents = [
    { id: 'd1', title: '2025_상반기_신입사원_채용_공고문.pdf', uploader: '김민지', uploadedAt: '2026-04-12', size: '342KB', confidential: false },
    { id: 'd2', title: '근로계약서_표준양식_v3.pdf',         uploader: '박서준', uploadedAt: '2026-03-28', size: '128KB', confidential: true },
    { id: 'd3', title: '경력직_채용_평가표.pdf',             uploader: '이수현', uploadedAt: '2026-03-19', size: '215KB', confidential: false },
    { id: 'd4', title: '면접_가이드라인_2026.pdf',           uploader: '최지원', uploadedAt: '2026-02-14', size: '486KB', confidential: false },
    { id: 'd5', title: '내부_레퍼런스_체크_항목.pdf',        uploader: '박서준', uploadedAt: '2026-02-02', size: ' 92KB', confidential: true },
  ];

  const activity = [
    { time: '11:24', who: '김민지', what: '채용_공고문_v3.pdf 업로드',    color: V1S.blue },
    { time: '10:52', who: '박서준', what: '근로계약서 3명에게 공유',     color: V1S.emerald },
    { time: '10:18', who: '오재훈', what: 'NFC 태그 스캔',                 color: V1S.violet },
    { time: '09:41', who: '이수현', what: '경력직 채용 평가표 미리보기',  color: V1S.muted },
    { time: '어제',  who: '최지원', what: '보관 만료일 30일 연장',         color: V1S.amber },
    { time: '어제',  who: '김민지', what: '면접 가이드라인 다운로드',     color: V1S.muted },
  ];

  return (
    <V1Shell currentPath="/admin/subcategory/sub-1" onNavigate={onNavigate}>
      <V1SPageHeader
        breadcrumb={[sub.department, sub.parent, sub.name]}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: sub.labelColor, border: '1px solid rgba(0,0,0,0.1)', flex: 'none' }}/>
            {sub.name}
          </span>
        }
        sub={sub.description}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <V1SOutlineButton icon="star">즐겨찾기</V1SOutlineButton>
            <V1SOutlineButton icon="share-2">공유</V1SOutlineButton>
            <V1SPrimaryButton icon="upload">문서 업로드</V1SPrimaryButton>
          </div>
        }
      />

      {/* Info row: status pills */}
      <div style={{ display: 'flex', gap: 8, marginTop: -16, marginBottom: 24, flexWrap: 'wrap' }}>
        <V1SChip variant="blue" icon="nfc">NFC 등록됨 · {sub.nfcTagId}</V1SChip>
        <V1SChip variant="neutral" icon="map-pin">{sub.location}</V1SChip>
        <V1SChip variant="neutral">관리번호 {sub.managementNumber}</V1SChip>
        <V1SChip variant="emerald">활성</V1SChip>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <V1SStatTile title="문서 수"        value={5}   delta="+1"   icon="file-text" color={V1S.blue}   data={[2,2,3,3,3,4,4,5]}/>
        <V1SStatTile title="누적 스캔"      value={86}  delta="+18%" icon="qr-code"   color={V1S.violet} data={[4,8,12,11,14,16,18,22]}/>
        <V1SStatTile title="이번 주 방문"   value={24}  delta="+6"   icon="users"     color={V1S.emerald} data={[3,5,4,6,7,8,9,12]}/>
        <V1SStatTile title="만료까지"       value={184} sub="일"     icon="clock"     color={V1S.amber}  data={[200,196,192,190,188,186,185,184]}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 24 }}>
        {/* Document table */}
        <section style={V1S.card}>
          <V1SCardHeader
            title="문서 목록"
            sub="이 세부 스토리지에 속한 문서입니다."
            icon="file-text"
            iconColor={V1S.blue}
            action={
              <div style={{ display: 'flex', gap: 8 }}>
                <V1SOutlineButton icon="search">검색</V1SOutlineButton>
                <V1SOutlineButton>정렬: 최신순</V1SOutlineButton>
              </div>
            }
          />
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px 80px 110px', gap: 12, padding: '10px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
              {['문서 제목','작성자','업로드일','크기','작업'].map((h, i) => (
                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: V1S.muted, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: i === 3 ? 'right' : i === 4 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            {documents.map((d, i) => (
              <div key={d.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 90px 100px 80px 110px',
                gap: 12, padding: '14px 24px', alignItems: 'center',
                borderBottom: i === documents.length - 1 ? 'none' : '1px solid #f8fafc',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: V1S.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <Icon name="file-text" size={15} color={V1S.blueInk}/>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 500, fontSize: 13.5, color: V1S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
                      {d.confidential && <V1SChip variant="neutral">기밀</V1SChip>}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: V1S.muted }}>{d.uploader}</div>
                <div style={{ fontSize: 12, color: V1S.muted, fontFamily: 'ui-monospace,monospace' }}>{d.uploadedAt}</div>
                <div style={{ fontSize: 12, color: V1S.muted, fontFamily: 'ui-monospace,monospace', textAlign: 'right' }}>{d.size}</div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button title="미리보기" style={ghostIconBtn}><Icon name="eye"      size={14} color={V1S.muted}/></button>
                  <button title="다운로드" style={ghostIconBtn}><Icon name="download" size={14} color={V1S.muted}/></button>
                  <button title="공유"     style={ghostIconBtn}><Icon name="share-2"  size={14} color={V1S.muted}/></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <P1QrCard sub={sub}/>
          <P1Activity items={activity}/>
        </div>
      </div>
    </V1Shell>
  );
}

const ghostIconBtn = {
  width: 28, height: 28, borderRadius: 6,
  background: 'transparent', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};

function P1QrCard({ sub }) {
  // tiny decorative QR (deterministic finder-pattern grid)
  const cells = [];
  for (let r = 0; r < 21; r++) for (let c = 0; c < 21; c++) {
    const isFinder = (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7);
    let on = ((r * 7 + c * 13 + r * c) % 5) < 2;
    if (isFinder) on = (r === 0 || r === 6 || c === 0 || c === 6 || (r === 14 && c > 13) || (r === 20 && c < 7) || (c === 14 && r < 7) || (c === 20 && r < 7) || (r >= 2 && r <= 4 && c >= 2 && c <= 4) || (r >= 2 && r <= 4 && c >= 16 && c <= 18) || (r >= 16 && r <= 18 && c >= 2 && c <= 4));
    cells.push(on);
  }
  return (
    <section style={V1S.card}>
      <V1SCardHeader title="QR · NFC 태그" icon="qr-code" iconColor={V1S.blue} sub={sub.nfcTagId + ' · ' + sub.location}/>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(21, 1fr)', width: 156, height: 156, padding: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
          {cells.map((on, i) => <div key={i} style={{ background: on ? V1S.ink : '#fff' }}/>)}
        </div>
        <div style={{ width: '100%', display: 'flex', gap: 8 }}>
          <V1SOutlineButton icon="download" style={{ flex: 1, justifyContent: 'center' }}>이미지로 저장</V1SOutlineButton>
          <V1SOutlineButton icon="nfc"      style={{ flex: 1, justifyContent: 'center' }}>NFC 재등록</V1SOutlineButton>
        </div>
      </div>
    </section>
  );
}

function P1Activity({ items }) {
  return (
    <section style={V1S.card}>
      <V1SCardHeader title="최근 활동" icon="clock" iconColor={V1S.blue} sub="이 보관함의 마지막 7일"/>
      <div style={{ padding: '12px 22px 14px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 22 + 38, top: 16, bottom: 16, width: 1, background: '#e5e7eb' }}/>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', position: 'relative' }}>
            <div style={{ width: 32, flex: 'none', fontSize: 11, color: V1S.faint, fontFamily: 'ui-monospace,monospace', paddingTop: 3, textAlign: 'right' }}>{it.time}</div>
            <div style={{ width: 8, height: 8, borderRadius: 9999, background: it.color, marginTop: 6, flex: 'none', boxShadow: '0 0 0 3px #fff' }}/>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, color: V1S.ink, lineHeight: 1.5 }}>
                <strong style={{ fontWeight: 600 }}>{it.who}</strong>님이 {it.what}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

window.P1Subcategory = P1Subcategory;
