/* eslint-disable */
// ListPages.jsx — P5 부서 관리 · P6 부서 상세 · P7 팀원 관리.
// All wrapped in V1Shell, all share the V1 visual vocabulary
// (KPI tiles, card headers, chips, outline / primary buttons).

// ============================================================
// P5 — 부서 관리 (Department list)
// ============================================================
function P5Departments({ onNavigate }) {
  const depts = [
    { id: 'd1', name: '인사팀',    code: 'HR001',  docs: 32, parents: 4, members:  8, util: 0.78, color: V1S.blue,    spark: [22,24,26,28,30,31,32,32] },
    { id: 'd2', name: '개발팀',    code: 'DEV001', docs: 45, parents: 5, members: 12, util: 0.94, color: V1S.violet,  spark: [30,33,36,38,40,42,44,45] },
    { id: 'd3', name: '마케팅팀',  code: 'MKT001', docs: 28, parents: 3, members:  6, util: 0.62, color: V1S.emerald, spark: [22,23,24,25,26,27,27,28] },
    { id: 'd4', name: '회계팀',    code: 'FIN001', docs: 23, parents: 4, members:  5, util: 0.51, color: V1S.amber,   spark: [25,24,24,23,23,22,23,23] },
  ];
  return (
    <V1Shell currentPath="/admin/departments" onNavigate={onNavigate}>
      <V1SPageHeader
        title="부서 관리"
        sub="전체 부서 현황을 한눈에 파악하고 관리합니다."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <V1SOutlineButton icon="download">CSV 내보내기</V1SOutlineButton>
            <V1SPrimaryButton icon="plus">부서 추가</V1SPrimaryButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <V1SStatTile title="총 부서"     value={4}   delta="+0"   icon="building-2" color={V1S.blue}    data={[3,3,4,4,4,4,4,4]}/>
        <V1SStatTile title="총 문서"     value={128} delta="+12"  icon="file-text"  color={V1S.violet}  data={[85,98,110,116,120,124,126,128]}/>
        <V1SStatTile title="활성 팀원"   value={42}  delta="+5"   icon="users"      color={V1S.emerald} data={[28,30,33,35,36,38,40,42]}/>
        <V1SStatTile title="평균 활용률" value="71%" delta="+4%"  icon="bar-chart"  color={V1S.amber}   data={[62,64,66,67,68,69,70,71]}/>
      </div>

      <section style={V1S.card}>
        <V1SCardHeader
          title="부서 목록"
          icon="building-2"
          iconColor={V1S.blue}
          sub="문서 수·활용률 기준으로 정렬"
          action={
            <div style={{ display: 'flex', gap: 6 }}>
              <V1SOutlineButton icon="search">검색</V1SOutlineButton>
              <V1SOutlineButton>정렬: 문서 수</V1SOutlineButton>
            </div>
          }
        />
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px 110px 70px 60px 80px 80px', gap: 12, padding: '10px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
            {['부서','코드','활용률','추이 (8주)','문서','대분류','팀원','작업'].map((h, i) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: V1S.muted, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: ['문서','대분류','팀원','작업'].includes(h) ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {depts.map((d, i) => (
            <div key={d.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 90px 120px 110px 70px 60px 80px 80px',
              gap: 12, padding: '14px 24px', alignItems: 'center',
              borderBottom: i === depts.length - 1 ? 'none' : '1px solid #f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${d.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="building-2" size={18} color={d.color}/>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: V1S.ink }}>{d.name}</div>
                  <div style={{ fontSize: 11.5, color: V1S.faint, fontFamily: 'ui-monospace,monospace', marginTop: 2 }}>{d.code}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: V1S.muted, fontFamily: 'ui-monospace,monospace' }}>{d.code}</div>
              <div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ width: `${d.util * 100}%`, height: '100%', background: d.util > 0.85 ? V1S.amber : V1S.blue, borderRadius: 9999 }}/>
                </div>
                <div style={{ fontSize: 11, color: V1S.muted, marginTop: 4, fontFeatureSettings: '"tnum"' }}>{Math.round(d.util * 100)}%</div>
              </div>
              <V1SSparkline data={d.spark} color={d.color} width={90} height={28}/>
              <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: V1S.ink, fontFeatureSettings: '"tnum"' }}>{d.docs}</div>
              <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: V1S.ink, fontFeatureSettings: '"tnum"' }}>{d.parents}</div>
              <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, color: V1S.ink, fontFeatureSettings: '"tnum"' }}>{d.members}</div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button style={ghostIconBtn3} title="수정"><Icon name="pencil" size={14} color={V1S.muted}/></button>
                <button style={ghostIconBtn3} title="삭제"><Icon name="trash"  size={14} color={V1S.muted}/></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </V1Shell>
  );
}

const ghostIconBtn3 = { width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };

// ============================================================
// P6 — 부서 상세 (Department detail)
// ============================================================
function P6DepartmentDetail({ onNavigate }) {
  const parents = [
    { id: 'p1', name: '채용 문서',     subs: 6, docs: 23, label: V1S.blue,    custodian: '김민지' },
    { id: 'p2', name: '근로계약',       subs: 4, docs: 12, label: V1S.violet,  custodian: '박서준' },
    { id: 'p3', name: '교육 자료',     subs: 5, docs:  9, label: V1S.emerald, custodian: '이수현' },
    { id: 'p4', name: '복지 제도',     subs: 2, docs:  4, label: V1S.amber,   custodian: '최지원' },
  ];
  const members = [
    { name: '김민지', role: '매니저', docs: 23, color: V1S.blue },
    { name: '박서준', role: '편집자', docs: 19, color: V1S.violet },
    { name: '이수현', role: '편집자', docs: 14, color: V1S.emerald },
    { name: '최지원', role: '뷰어',   docs:  7, color: V1S.amber },
  ];
  return (
    <V1Shell currentPath="/admin/departments" onNavigate={onNavigate}>
      <V1SPageHeader
        breadcrumb={['부서 관리', '인사팀']}
        eyebrow="HR001"
        title="인사팀"
        sub="채용 · 근로계약 · 교육 · 복지 등 인사 업무 전반의 문서를 관리합니다."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <V1SOutlineButton icon="pencil">정보 수정</V1SOutlineButton>
            <V1SPrimaryButton icon="plus">대분류 추가</V1SPrimaryButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <V1SStatTile title="대분류"     value={4}  delta="+1"  icon="folder-open" color={V1S.blue}    data={[2,2,3,3,3,4,4,4]}/>
        <V1SStatTile title="세부 스토리지" value={17} delta="+2"  icon="archive"   color={V1S.violet}  data={[12,13,14,15,15,16,16,17]}/>
        <V1SStatTile title="문서"       value={48} delta="+6"  icon="file-text" color={V1S.emerald} data={[32,35,38,40,42,44,46,48]}/>
        <V1SStatTile title="팀원"       value={8}  delta="+0"  icon="users"     color={V1S.amber}   data={[6,6,7,7,8,8,8,8]}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24 }}>
        <section style={V1S.card}>
          <V1SCardHeader
            title="대분류 목록"
            icon="folder-open"
            iconColor={V1S.blue}
            sub="이 부서에 속한 4개의 대분류"
            action={<V1SOutlineButton icon="search">검색</V1SOutlineButton>}
          />
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {parents.map((p) => (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${p.label}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="folder-open" size={18} color={p.label}/>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: V1S.ink }}>{p.name}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: V1S.ink, lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{p.docs}</div>
                    <div style={{ fontSize: 11, color: V1S.faint, marginTop: 3 }}>문서 · 세부 {p.subs}개</div>
                  </div>
                  <span style={{ fontSize: 11, color: V1S.muted }}>관리: {p.custodian}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section style={V1S.card}>
            <V1SCardHeader title="팀원" icon="users" iconColor={V1S.blue} sub={`${members.length}명`}/>
            <div style={{ padding: '14px 22px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {members.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9999, background: m.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{m.name[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: V1S.ink }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: V1S.muted }}>{m.role}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: V1S.ink, fontFeatureSettings: '"tnum"' }}>{m.docs}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={V1S.card}>
            <V1SCardHeader title="최근 활동" icon="clock" iconColor={V1S.blue}/>
            <div style={{ padding: '12px 22px 14px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 22 + 38, top: 16, bottom: 16, width: 1, background: '#e5e7eb' }}/>
              {[
                ['11:24', '김민지', '채용 서류 보관함에 1건 업로드', V1S.blue],
                ['10:52', '박서준', '근로계약서 v3 공유',             V1S.emerald],
                ['09:41', '이수현', '교육 자료 보관함 만료 연장',     V1S.amber],
                ['어제',  '최지원', '복지 제도 대분류 추가',           V1S.violet],
              ].map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', position: 'relative' }}>
                  <div style={{ width: 32, flex: 'none', fontSize: 11, color: V1S.faint, fontFamily: 'ui-monospace,monospace', paddingTop: 3, textAlign: 'right' }}>{it[0]}</div>
                  <div style={{ width: 8, height: 8, borderRadius: 9999, background: it[3], marginTop: 6, flex: 'none', boxShadow: '0 0 0 3px #fff' }}/>
                  <div style={{ flex: 1, fontSize: 12.5, color: V1S.ink, lineHeight: 1.5 }}>
                    <strong style={{ fontWeight: 600 }}>{it[1]}</strong>님이 {it[2]}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </V1Shell>
  );
}

// ============================================================
// P7 — 팀원 관리 (User Management)
// ============================================================
function P7Users({ onNavigate }) {
  const users = [
    { name: '홍길동',  email: 'hong@company.com', team: '경영지원', role: 'admin',   active: '방금 전',    docs:  0, color: V1S.blue,    init: '홍' },
    { name: '김민지',  email: 'minji@company.com', team: '인사팀',   role: 'manager', active: '5분 전',     docs: 23, color: V1S.violet,  init: '김' },
    { name: '박서준',  email: 'sj.park@company.com', team: '인사팀', role: 'editor',  active: '12분 전',    docs: 19, color: V1S.emerald, init: '박' },
    { name: '이수현',  email: 'shlee@company.com', team: '인사팀',   role: 'editor',  active: '34분 전',    docs: 14, color: V1S.amber,   init: '이' },
    { name: '오재훈',  email: 'jh.oh@company.com', team: '개발팀',   role: 'manager', active: '1시간 전',   docs: 31, color: V1S.blue,    init: '오' },
    { name: '강민호',  email: 'mh.kang@company.com', team: '회계팀', role: 'manager', active: '오늘',       docs: 16, color: V1S.violet,  init: '강' },
    { name: '최지원',  email: 'jw.choi@company.com', team: '인사팀', role: 'viewer',  active: '어제',       docs:  7, color: V1S.emerald, init: '최' },
    { name: '윤서영',  email: 'sy.yoon@company.com', team: '마케팅팀',role: 'editor', active: '2일 전',     docs:  9, color: V1S.amber,   init: '윤' },
  ];
  const roleChip = (r) => {
    const map = { admin: ['blue', '관리자'], manager: ['violet', '매니저'], editor: ['emerald', '편집자'], viewer: ['neutral', '뷰어'] };
    return <V1SChip variant={map[r][0]}>{map[r][1]}</V1SChip>;
  };
  return (
    <V1Shell currentPath="/admin/users" onNavigate={onNavigate}>
      <V1SPageHeader
        title="팀원 관리"
        sub="회사에 속한 팀원과 권한을 관리합니다."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <V1SOutlineButton icon="download">CSV 내보내기</V1SOutlineButton>
            <V1SPrimaryButton icon="plus">팀원 초대</V1SPrimaryButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <V1SStatTile title="총 팀원"        value={42} delta="+5"   icon="users"      color={V1S.blue}    data={[28,30,33,35,36,38,40,42]}/>
        <V1SStatTile title="이번 주 활동"  value={28} delta="+3"   icon="clock"      color={V1S.violet}  data={[18,20,22,24,25,26,27,28]}/>
        <V1SStatTile title="관리자"        value={3}  delta="+0"   icon="building-2" color={V1S.emerald} data={[3,3,3,3,3,3,3,3]}/>
        <V1SStatTile title="비활성 (30일+)" value={4}  delta="−1" deltaTone="down" icon="bell"       color={V1S.amber}   data={[6,6,5,5,5,4,4,4]}/>
      </div>

      <section style={V1S.card}>
        <V1SCardHeader
          title="팀원 목록"
          icon="users"
          iconColor={V1S.blue}
          action={
            <div style={{ display: 'flex', gap: 6 }}>
              <V1SOutlineButton icon="search">검색</V1SOutlineButton>
              <V1SOutlineButton>부서: 전체</V1SOutlineButton>
              <V1SOutlineButton>권한: 전체</V1SOutlineButton>
            </div>
          }
        />
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1.5fr 1.6fr 1fr 0.9fr 80px 100px 60px', gap: 12, padding: '10px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
            <div></div>
            {['이름','이메일','부서','권한','문서','마지막 활동','작업'].map((h, i) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: V1S.muted, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: ['문서'].includes(h) ? 'right' : ['작업'].includes(h) ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {users.map((u, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '36px 1.5fr 1.6fr 1fr 0.9fr 80px 100px 60px',
              gap: 12, padding: '12px 24px', alignItems: 'center',
              borderBottom: i === users.length - 1 ? 'none' : '1px solid #f8fafc',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 9999, background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{u.init}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: V1S.ink }}>{u.name}</div>
              <div style={{ fontSize: 12.5, color: V1S.muted, fontFamily: 'ui-monospace,monospace' }}>{u.email}</div>
              <div style={{ fontSize: 13, color: V1S.muted }}>{u.team}</div>
              <div>{roleChip(u.role)}</div>
              <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: V1S.ink, fontFeatureSettings: '"tnum"' }}>{u.docs}</div>
              <div style={{ fontSize: 11.5, color: V1S.faint }}>{u.active}</div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button style={ghostIconBtn3} title="권한 편집"><Icon name="pencil" size={14} color={V1S.muted}/></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </V1Shell>
  );
}

Object.assign(window, { P5Departments, P6DepartmentDetail, P7Users });
