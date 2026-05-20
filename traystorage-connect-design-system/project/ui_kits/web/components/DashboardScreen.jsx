/* eslint-disable */
// DashboardScreen.jsx — admin & team dashboard.
// Mirrors AdminDashboard.tsx / TeamDashboard.tsx layout: page title, 4-up stat tiles,
// 3-up favorites/recents/top-X widgets, then dept/parent-category list.

function StatTile({ title, value, icon, color }) {
  return (
    <Card>
      <div style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 12, background: `${color}20`, display: 'flex' }}>
          <Icon name={icon} size={22} color={color}/>
        </div>
      </div>
    </Card>
  );
}

function ListRow({ title, sub, meta, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', textAlign: 'left',
        padding: 12, borderRadius: 8,
        border: '1px solid #e5e7eb',
        background: hover ? '#f8fafc' : '#fff',
        cursor: 'pointer', transition: 'background 150ms',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ fontWeight: 500, fontSize: 14, color: '#0f172a' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
        {meta && <span style={{ fontSize: 12, color: '#94a3b8', flex: 'none', marginLeft: 8 }}>{meta}</span>}
      </div>
    </button>
  );
}

function RankRow({ n, title, sub, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', textAlign: 'left',
        padding: 10, borderRadius: 8,
        border: '1px solid #e5e7eb',
        background: hover ? '#f8fafc' : '#fff',
        cursor: 'pointer', transition: 'background 150ms',
        fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <RankAvatar n={n} size={32}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13, color: '#0f172a' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>
      </div>
    </button>
  );
}

function DeptListItem({ name, code, count, onClick }) {
  return (
    <Card hoverable onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#2563eb', padding: 8, borderRadius: 8, display: 'flex' }}>
            <Icon name="building-2" size={20} color="#fff"/>
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14, color: '#0f172a' }}>{name}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{code}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{count}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>문서</div>
        </div>
      </div>
    </Card>
  );
}

function DashboardScreen({ role, onOpenSubcategory, onOpenDept, onNavigate }) {
  const isAdmin = role === 'admin';
  const stats = isAdmin
    ? [
        { title: '총 부서',            value: 4,   icon: 'building-2', color: '#2563eb' },
        { title: '총 문서',            value: 128, icon: 'file-text',  color: '#3b82f6' },
        { title: '총 대분류',          value: 16,  icon: 'folder-open',color: '#3b82f6' },
        { title: '총 세부 스토리지',   value: 47,  icon: 'archive',    color: '#8b5cf6' },
      ]
    : [
        { title: '접근 가능한 문서',          value: 42, icon: 'file-text',   color: '#2563eb' },
        { title: '접근 가능한 대분류',        value: 6,  icon: 'folder-open', color: '#3b82f6' },
        { title: '접근 가능한 세부 스토리지', value: 14, icon: 'archive',     color: '#8b5cf6' },
        { title: '내 부서 팀원',              value: 8,  icon: 'users',       color: '#10b981' },
      ];

  const favorites = [
    { id: 'sub-1', name: '채용 서류 보관함', sub: '인사팀 · 채용 문서' },
    { id: 'sub-2', name: '월간 정산 보관함', sub: '회계팀 · 정산 문서' },
    { id: 'sub-3', name: '제품 명세서 보관함', sub: '개발팀 · 기술 문서' },
  ];
  const recents = [
    { id: 'sub-1', name: '채용 서류 보관함', sub: '인사팀 · 채용 문서', when: '3분 전' },
    { id: 'sub-4', name: '광고 캠페인 보관함', sub: '마케팅팀 · Q2 캠페인', when: '1시간 전' },
    { id: 'sub-2', name: '월간 정산 보관함', sub: '회계팀 · 정산 문서', when: '어제' },
  ];
  const topRanks = isAdmin
    ? [
        { name: '인사팀',    sub: '방문 24회' },
        { name: '개발팀',    sub: '방문 18회' },
        { name: '마케팅팀',  sub: '방문 11회' },
      ]
    : [
        { name: '채용 문서',        sub: '방문 14회' },
        { name: '교육 자료',        sub: '방문  9회' },
        { name: '인사 평가 자료',   sub: '방문  6회' },
      ];

  const departments = isAdmin
    ? [
        { id: 'd1', name: '인사팀',    code: 'HR001',  count: 32 },
        { id: 'd2', name: '개발팀',    code: 'DEV001', count: 45 },
        { id: 'd3', name: '마케팅팀',  code: 'MKT001', count: 28 },
        { id: 'd4', name: '회계팀',    code: 'FIN001', count: 23 },
      ]
    : [
        { id: 'd1', name: '인사팀',    code: 'HR001',  count: 32 },
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          {isAdmin ? '대시보드' : '인사팀 대시보드'}
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          {isAdmin ? '시스템 현황을 한눈에 확인하세요' : '부서 코드: HR001'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {stats.map((s) => <StatTile key={s.title} {...s}/>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <Card>
          <CardHeader>
            <CardTitle>
              <Icon name="star" size={20} color="#eab308"/>
              즐겨찾기
            </CardTitle>
          </CardHeader>
          <CardContent style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {favorites.map((f) => (
              <ListRow key={f.id} title={f.name} sub={f.sub} onClick={() => onOpenSubcategory(f.id)}/>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Icon name="clock" size={20} color="#3b82f6"/>
              최근 방문
            </CardTitle>
          </CardHeader>
          <CardContent style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recents.map((r, i) => (
              <ListRow key={i} title={r.name} sub={r.sub} meta={r.when} onClick={() => onOpenSubcategory(r.id)}/>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Icon name={isAdmin ? 'building-2' : 'trending-up'} size={20} color={isAdmin ? '#3b82f6' : '#10b981'}/>
              {isAdmin ? '많이 사용하는 부서' : '많이 사용하는 대분류'}
            </CardTitle>
          </CardHeader>
          <CardContent style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topRanks.map((r, i) => (
              <RankRow key={i} n={i + 1} title={r.name} sub={r.sub} onClick={() => {}}/>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle>{isAdmin ? '부서별 문서 현황' : '대분류별 문서 현황'}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => onNavigate(isAdmin ? '/admin/departments' : '/team/parent-categories')}>
              전체 보기
            </Button>
          </div>
        </CardHeader>
        <CardContent style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {departments.map((d) => (
            <DeptListItem key={d.id} {...d} onClick={() => onOpenDept(d.id)}/>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
