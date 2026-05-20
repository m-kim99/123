/* eslint-disable */
// Chrome.jsx — DashboardLayout pieces: Sidebar + TopHeader + Avatar.

function Avatar({ name, size = 36, style }) {
  const ch = (name || '?').slice(0, 1);
  return (
    <div style={{
      width: size, height: size, borderRadius: 9999,
      background: 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: 'none', ...style,
    }}>{ch}</div>
  );
}

function RankAvatar({ n, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 9999,
      background: 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)',
      color: '#fff', fontWeight: 700, fontSize: size * 0.42,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: 'none',
    }}>{n}</div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 8,
        background: active ? '#2563eb' : (hover ? '#f1f5f9' : 'transparent'),
        color: active ? '#fff' : '#475569',
        border: 'none', width: '100%', textAlign: 'left',
        fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
        cursor: 'pointer', transition: 'background 150ms, color 150ms',
      }}
    >
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </button>
  );
}

function Sidebar({ role, currentPath, onNavigate, onLogout }) {
  const adminItems = [
    { icon: 'home',         label: '홈',                    path: '/admin' },
    { icon: 'building-2',   label: '부서 관리',             path: '/admin/departments' },
    { icon: 'folder-open',  label: '대분류 관리',           path: '/admin/parent-categories' },
    { icon: 'archive',      label: '세부 스토리지 관리',    path: '/admin/subcategories' },
    { icon: 'file-text',    label: '문서 관리',             path: '/admin/documents' },
    { icon: 'users',        label: '팀원 관리',             path: '/admin/users' },
    { icon: 'bar-chart',    label: '통계',                  path: '/admin/statistics' },
    { icon: 'megaphone',    label: '공지사항',              path: '/admin/announcements' },
    { icon: 'trash',        label: '휴지통',                path: '/admin/trash' },
  ];
  const teamItems = [
    { icon: 'home',         label: '홈',                    path: '/team' },
    { icon: 'building-2',   label: '부서 보기',             path: '/team/departments' },
    { icon: 'folder-open',  label: '대분류',                path: '/team/parent-categories' },
    { icon: 'archive',      label: '세부 스토리지',         path: '/team/subcategories' },
    { icon: 'file-text',    label: '문서 관리',             path: '/team/documents' },
    { icon: 'share-2',      label: '공유받은 문서함',       path: '/team/shared' },
    { icon: 'bar-chart',    label: '통계',                  path: '/team/statistics' },
    { icon: 'megaphone',    label: '공지사항',              path: '/team/announcements' },
  ];
  const items = role === 'admin' ? adminItems : teamItems;

  return (
    <aside style={{
      width: 240, flex: 'none',
      background: '#fff', borderRight: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <img src="../../assets/logo.png" alt="TrayStorage CONNECT" style={{ height: 32, display: 'block' }}/>
      </div>
      <div style={{ padding: 8, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => (
          <NavItem
            key={it.path}
            icon={it.icon}
            label={it.label}
            active={currentPath === it.path}
            onClick={() => onNavigate(it.path)}
          />
        ))}
      </div>
      <div style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8,
            background: 'transparent', color: '#475569', border: 'none',
            width: '100%', textAlign: 'left',
            fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <Icon name="logout" size={18} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}

function TopHeader({ user, onSearch, onBellClick, notificationCount = 0 }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 24px',
      background: '#fff', borderBottom: '1px solid #e5e7eb',
    }}>
      <div style={{ flex: 1, position: 'relative', maxWidth: 480 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          <Icon name="search" size={16} color="#94a3b8"/>
        </span>
        <input
          placeholder="문서 검색..."
          onChange={(e) => onSearch?.(e.target.value)}
          style={{
            width: '100%', height: 36, padding: '0 12px 0 34px',
            border: '1px solid #e5e7eb', borderRadius: 8,
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
            background: '#f8fafc',
          }}
        />
      </div>
      <div style={{ flex: 1 }} />
      <button
        onClick={onBellClick}
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#475569', background: '#fff', border: '1px solid #e5e7eb',
          cursor: 'pointer',
        }}
      >
        <Icon name="bell" size={18}/>
        {notificationCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 14, height: 14, padding: '0 3px',
            borderRadius: 9999, background: '#ef4444', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{notificationCount}</span>
        )}
      </button>
      <Avatar name={user?.name || '홍'} />
    </header>
  );
}

function DashboardLayout({ role, currentPath, onNavigate, onLogout, user, children, notificationCount }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8f9fa', overflow: 'hidden' }}>
      <Sidebar role={role} currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopHeader user={user} notificationCount={notificationCount}/>
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

// Toast container — simple stack, top-right.
function ToastHost({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.variant === 'destructive' ? '#fef2f2' : '#fff',
          border: `1px solid ${t.variant === 'destructive' ? '#fecaca' : '#e5e7eb'}`,
          borderRadius: 8,
          padding: '12px 14px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.05)',
          color: t.variant === 'destructive' ? '#991b1b' : '#0f172a',
          animation: 'slideIn 200ms ease-out',
        }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
          {t.description && <div style={{ fontSize: 13, marginTop: 2, color: t.variant === 'destructive' ? '#991b1b' : '#475569' }}>{t.description}</div>}
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const toast = React.useCallback((t) => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { id, ...t }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 3500);
  }, []);
  return { toasts, toast };
}

Object.assign(window, { Avatar, RankAvatar, Sidebar, TopHeader, DashboardLayout, ToastHost, useToasts });
