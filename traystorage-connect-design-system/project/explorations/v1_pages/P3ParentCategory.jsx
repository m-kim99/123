/* eslint-disable */
// Page 3 — 대분류 상세 (Parent Category Detail) in V1 style.
// Browse subcategories under a parent. Hero · 4 KPIs · grid of subcategory cards · right rail.

function P3ParentCategory({ onNavigate }) {
  const parent = {
    id: 'p-1', name: '채용 문서',
    department: '인사팀', deptCode: 'HR001',
    description: '신입·경력 채용 절차에 발생하는 모든 문서. 공고문, 이력서, 평가표, 근로계약서 등.',
  };

  const subcategories = [
    { id: 'sub-1',  name: '채용 서류 보관함',     loc: 'A동 2층 캐비닛 3',  docs: 12, nfc: true,  expiryIn: null, label: '#3b82f6', custodian: '김민지' },
    { id: 'sub-2',  name: '근로계약 보관함',       loc: 'A동 2층 캐비닛 4',  docs:  8, nfc: true,  expiryIn: null, label: '#22c55e', custodian: '박서준' },
    { id: 'sub-3',  name: '면접 기록 보관함',     loc: 'A동 1층 캐비닛 12', docs:  6, nfc: true,  expiryIn: 22,   label: '#a855f7', custodian: '박서준' },
    { id: 'sub-4',  name: '경력직 평가 자료',     loc: 'A동 2층 캐비닛 5',  docs: 14, nfc: false, expiryIn: null, label: '#94a3b8', custodian: '이수현' },
    { id: 'sub-5',  name: '레퍼런스 체크',         loc: 'A동 2층 캐비닛 6',  docs:  5, nfc: true,  expiryIn: 184,  label: '#94a3b8', custodian: '박서준' },
    { id: 'sub-6',  name: '입사 서류 보관함',     loc: 'A동 2층 캐비닛 7',  docs: 18, nfc: true,  expiryIn: null, label: '#f59e0b', custodian: '김민지' },
  ];

  const topContributors = [
    { name: '김민지', team: '인사팀', docs: 23, color: V1S.blue },
    { name: '박서준', team: '인사팀', docs: 19, color: V1S.violet },
    { name: '이수현', team: '인사팀', docs: 14, color: V1S.emerald },
    { name: '최지원', team: '인사팀', docs:  7, color: V1S.amber },
  ];

  return (
    <V1Shell currentPath="/admin/parent-category/p-1" onNavigate={onNavigate}>
      <V1SPageHeader
        breadcrumb={[parent.department, parent.name]}
        eyebrow={parent.department + ' · ' + parent.deptCode}
        title={parent.name}
        sub={parent.description}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <V1SOutlineButton icon="pencil">정보 수정</V1SOutlineButton>
            <V1SPrimaryButton icon="plus">세부 스토리지 추가</V1SPrimaryButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <V1SStatTile title="세부 스토리지" value={6}     delta="+1"   icon="archive"  color={V1S.blue}    data={[3,4,4,5,5,5,6,6]}/>
        <V1SStatTile title="총 문서"        value={63}    delta="+8"   icon="file-text" color={V1S.violet}  data={[40,44,48,52,55,58,60,63]}/>
        <V1SStatTile title="NFC 등록률"     value="83%"  sub="5/6"     icon="nfc"       color={V1S.emerald} data={[50,55,60,65,70,75,80,83]}/>
        <V1SStatTile title="만료 임박"      value={1}    delta="22d"  deltaTone="flat" icon="clock"     color={V1S.amber}   data={[0,0,0,1,1,1,1,1]}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24 }}>
        <section style={V1S.card}>
          <V1SCardHeader
            title="세부 스토리지 목록"
            sub="이 대분류에 속한 보관함들. NFC 태그를 등록하면 모바일에서 바로 접근할 수 있습니다."
            icon="archive"
            iconColor={V1S.blue}
            action={
              <div style={{ display: 'flex', gap: 6 }}>
                <V1SOutlineButton icon="search">검색</V1SOutlineButton>
                <V1SOutlineButton>정렬: 이름순</V1SOutlineButton>
              </div>
            }
          />
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {subcategories.map((s) => <P3SubcatCard key={s.id} s={s}/>)}
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <P3Contributors items={topContributors}/>
          <P3RecentActivity/>
        </div>
      </div>
    </V1Shell>
  );
}

function P3SubcatCard({ s }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: 16, cursor: 'pointer',
        boxShadow: hover ? '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.05)' : '0 1px 2px rgba(15,23,42,0.04)',
        transition: 'box-shadow 150ms',
        display: 'flex', flexDirection: 'column', gap: 12, minHeight: 132,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: s.label, border: '1px solid rgba(0,0,0,0.1)' }}/>
          <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.005em', color: V1S.ink }}>{s.name}</h3>
        </div>
        {s.nfc ? <V1SChip variant="blue" icon="nfc">NFC</V1SChip> : <V1SChip variant="neutral">미등록</V1SChip>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: V1S.muted }}>
        <Icon name="map-pin" size={12} color={V1S.muted}/>
        {s.loc}
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: V1S.ink, lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{s.docs}</div>
          <div style={{ fontSize: 11, color: V1S.faint, marginTop: 3 }}>문서</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: V1S.muted }}>관리: {s.custodian}</div>
          {s.expiryIn != null && (
            <div style={{ fontSize: 11, fontWeight: 600, color: s.expiryIn < 30 ? '#b91c1c' : '#92400e', marginTop: 4 }}>
              만료 {s.expiryIn}일 전
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function P3Contributors({ items }) {
  const max = Math.max(...items.map((i) => i.docs));
  return (
    <section style={V1S.card}>
      <V1SCardHeader title="기여자 순위" icon="users" iconColor={V1S.blue} sub="지난 90일"/>
      <div style={{ padding: '14px 22px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 28px', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: 9999, background: it.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{it.name[0]}</div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: V1S.ink }}>{it.name}</span>
                <span style={{ fontSize: 11, color: V1S.muted }}>{it.team}</span>
              </div>
              <div style={{ height: 4, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ width: `${(it.docs / max) * 100}%`, height: '100%', background: it.color, borderRadius: 9999 }}/>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: V1S.ink, textAlign: 'right', fontFeatureSettings: '"tnum"' }}>{it.docs}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function P3RecentActivity() {
  const items = [
    { time: '11:24', who: '김민지', what: '채용 서류 보관함에 1건 업로드', color: V1S.blue },
    { time: '10:52', who: '박서준', what: '근로계약서 v3 공유',           color: V1S.emerald },
    { time: '09:41', who: '이수현', what: '경력직 평가표 다운로드',         color: V1S.muted },
    { time: '어제',  who: '최지원', what: '입사 서류 보관함 만료 연장',    color: V1S.amber },
  ];
  return (
    <section style={V1S.card}>
      <V1SCardHeader title="최근 활동" icon="clock" iconColor={V1S.blue} sub="이 대분류"/>
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

window.P3ParentCategory = P3ParentCategory;
