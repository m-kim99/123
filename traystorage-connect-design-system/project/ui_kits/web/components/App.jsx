/* eslint-disable */
// App.jsx — root orchestrator that wires the screens into a click-through prototype.

function App() {
  const [route, setRoute] = React.useState('login');   // 'login' | dashboard path
  const [role, setRole] = React.useState(null);        // 'admin' | 'team'
  const [openSubId, setOpenSubId] = React.useState(null);
  const [previewDoc, setPreviewDoc] = React.useState(null);
  const [qrFor, setQrFor] = React.useState(null);
  const [favs, setFavs] = React.useState(new Set(['sub-1', 'sub-2', 'sub-3']));
  const { toasts, toast } = useToasts();

  const user = { name: '홍길동', email: 'hong@company.com' };

  // Subcategory data (single sample we deep-link into)
  const SUBCATEGORIES = {
    'sub-1': {
      id: 'sub-1', name: '채용 서류 보관함',
      department: '인사팀', parent: '채용 문서',
      description: '신규 입사자 채용 관련 서류를 보관합니다. 이력서·자기소개서·근로계약서 등 채용 절차상 발생하는 모든 문서를 이 보관함에서 관리합니다.',
      location: 'A동 2층 캐비닛 3',
      managementNumber: 'MGT-2024-001',
      nfcActive: true,
      labelColor: '#3b82f6',
      expiresIn: null,
      documents: [
        { id: 'd1', title: '2025_상반기_신입사원_채용_공고문.pdf', uploader: '김민지', uploadedAt: '2026-04-12', size: '342KB', confidential: false },
        { id: 'd2', title: '근로계약서_표준양식_v3.pdf', uploader: '박서준', uploadedAt: '2026-03-28', size: '128KB', confidential: true },
        { id: 'd3', title: '경력직_채용_평가표.pdf', uploader: '이수현', uploadedAt: '2026-03-19', size: '215KB', confidential: false },
        { id: 'd4', title: '면접_가이드라인_2026.pdf', uploader: '최지원', uploadedAt: '2026-02-14', size: '486KB', confidential: false },
        { id: 'd5', title: '내부_레퍼런스_체크_항목.pdf', uploader: '박서준', uploadedAt: '2026-02-02', size: '92KB', confidential: true },
      ],
    },
    'sub-2': {
      id: 'sub-2', name: '월간 정산 보관함',
      department: '회계팀', parent: '정산 문서',
      description: '월별 매출·매입 정산 자료 및 결산 보고서를 보관합니다.',
      location: 'B동 1층 캐비닛 7',
      managementNumber: 'MGT-2024-014',
      nfcActive: true, labelColor: '#22c55e', expiresIn: 30,
      documents: [
        { id: 'd1', title: '2026_03월_정산보고서.pdf', uploader: '강민호', uploadedAt: '2026-04-03', size: '512KB', confidential: false },
        { id: 'd2', title: '2026_02월_매출매입.pdf', uploader: '강민호', uploadedAt: '2026-03-04', size: '498KB', confidential: false },
      ],
    },
    'sub-3': {
      id: 'sub-3', name: '제품 명세서 보관함',
      department: '개발팀', parent: '기술 문서',
      description: 'API 명세, 기술 사양서, 설계 문서를 모아 둡니다.',
      location: 'C동 3층 책장 1',
      managementNumber: 'MGT-2024-022',
      nfcActive: false, labelColor: '#a855f7', expiresIn: null,
      documents: [
        { id: 'd1', title: 'TrayStorage_v2_API_Spec.pdf', uploader: '오재훈', uploadedAt: '2026-05-01', size: '1.2MB', confidential: false },
      ],
    },
    'sub-4': {
      id: 'sub-4', name: '광고 캠페인 보관함',
      department: '마케팅팀', parent: 'Q2 캠페인',
      description: 'Q2 광고 캠페인 기획·결과 보고서를 보관합니다.',
      location: 'A동 1층 캐비닛 5',
      managementNumber: 'MGT-2024-031',
      nfcActive: true, labelColor: '#f97316', expiresIn: null,
      documents: [],
    },
  };

  const navigate = (path) => {
    setOpenSubId(null);
    setRoute(path);
  };

  const onLogin = (whichTab) => {
    setRole(whichTab);
    setRoute(whichTab === 'admin' ? '/admin' : '/team');
    toast({ title: '로그인 성공', description: '환영합니다.' });
  };

  const onLogout = () => {
    setRole(null);
    setOpenSubId(null);
    setRoute('login');
  };

  const openSubcategory = (id) => {
    setOpenSubId(id);
  };

  const toggleFav = (id) => {
    setFavs((cur) => {
      const n = new Set(cur);
      if (n.has(id)) {
        n.delete(id);
        toast({ title: '즐겨찾기 해제', description: '즐겨찾기에서 제거되었습니다.' });
      } else {
        n.add(id);
        toast({ title: '즐겨찾기 추가', description: '즐겨찾기에 추가되었습니다.' });
      }
      return n;
    });
  };

  // -- render --
  if (route === 'login') {
    return (
      <>
        <LoginScreen onLogin={onLogin}/>
        <ToastHost toasts={toasts}/>
      </>
    );
  }

  // Inside the dashboard shell
  const showingSub = openSubId && SUBCATEGORIES[openSubId];

  return (
    <>
      <DashboardLayout
        role={role}
        currentPath={route}
        onNavigate={navigate}
        onLogout={onLogout}
        user={user}
        notificationCount={3}
      >
        {showingSub ? (
          <SubcategoryScreen
            subcategory={showingSub}
            onBack={() => setOpenSubId(null)}
            onPreview={setPreviewDoc}
            isFavorite={favs.has(showingSub.id)}
            onToggleFavorite={() => toggleFav(showingSub.id)}
            onNfcRegister={() => toast({ title: 'NFC 태그 등록', description: '태그를 기기에 가까이 가져다 대세요…' })}
            onShowQr={() => setQrFor(showingSub)}
            toast={toast}
          />
        ) : (route === '/admin' || route === '/team') ? (
          <DashboardScreen
            role={role}
            onOpenSubcategory={openSubcategory}
            onOpenDept={() => navigate(role === 'admin' ? '/admin/departments' : '/team/departments')}
            onNavigate={navigate}
          />
        ) : (
          <ComingSoon path={route}/>
        )}
      </DashboardLayout>
      <Chatbot/>
      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)}/>
      <QrModal subcategory={qrFor} onClose={() => setQrFor(null)}/>
      <ToastHost toasts={toasts}/>
    </>
  );
}

// Stub for sidebar entries not implemented in the prototype.
function ComingSoon({ path }) {
  const labels = {
    '/admin/departments': '부서 관리',
    '/admin/parent-categories': '대분류 관리',
    '/admin/subcategories': '세부 스토리지 관리',
    '/admin/documents': '문서 관리',
    '/admin/users': '팀원 관리',
    '/admin/statistics': '통계',
    '/admin/announcements': '공지사항',
    '/admin/trash': '휴지통',
    '/team/departments': '부서 보기',
    '/team/parent-categories': '대분류',
    '/team/subcategories': '세부 스토리지',
    '/team/documents': '문서 관리',
    '/team/shared': '공유받은 문서함',
    '/team/statistics': '통계',
    '/team/announcements': '공지사항',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          {labels[path] || path}
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          이 화면은 UI 키트에 포함되지 않은 영역입니다.
        </p>
      </div>
      <Card>
        <CardContent style={{ paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 80 }}>
          <Icon name="folder-open" size={48} color="#94a3b8"/>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 360 }}>
            홈으로 돌아가서 즐겨찾기 또는 최근 방문에서 세부 스토리지를 열어보세요. 이 화면은 프로덕션 코드(src/pages/{labels[path] ? labels[path] : 'Unknown'}.tsx)에서 구현됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

window.App = App;
