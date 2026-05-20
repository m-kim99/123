/* eslint-disable */
// V1 Shell — sidebar + header + shared primitives used across the 4 pages.
// Lifts the visual vocabulary from V1Refined.jsx so all four pages render
// in the same shell: 240px white sidebar with #eff6ff active state, a 40px
// search header, 14px corner radius cards, sparkline + delta badge pattern.

const V1S = {
  bg: '#f8f9fa',
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' },
  ink: '#0f172a', muted: '#64748b', faint: '#94a3b8',
  blue: '#2563eb', blueSoft: '#eff6ff', blueInk: '#1d4ed8',
  violet: '#8b5cf6', emerald: '#10b981', amber: '#f59e0b',
  red: '#ef4444', yellow: '#eab308',
};

function V1Shell({ currentPath, onNavigate, children }) {
  return (
    <div style={{
      display: 'flex', height: '100%', background: V1S.bg,
      fontFamily: "'Noto Sans KR','Noto Sans',sans-serif", color: V1S.ink,
    }}>
      <V1SSidebar currentPath={currentPath} onNavigate={onNavigate}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <V1SHeader/>
        <main style={{ flex: 1, overflow: 'auto', padding: '28px 36px 36px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function V1SSidebar({ currentPath, onNavigate }) {
  const items = [
    ['홈',                    'home',         '/admin'],
    ['부서 관리',             'building-2',   '/admin/departments'],
    ['대분류 관리',           'folder-open',  '/admin/parent-category/p-1'],
    ['세부 스토리지 관리',    'archive',      '/admin/subcategory/sub-1'],
    ['문서 관리',             'file-text',    '/admin/documents'],
    ['팀원 관리',             'users',        '/admin/users'],
    ['통계',                  'bar-chart',    '/admin/statistics'],
    ['공지사항',              'megaphone',    '/admin/announcements'],
    ['휴지통',                'trash',        '/admin/trash'],
  ];
  return (
    <aside style={{ width: 240, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #e5e7eb' }}>
        <img src="../../assets/logo.png" alt="" style={{ height: 28 }}/>
      </div>
      <div style={{ padding: 10, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(([label, icon, path]) => {
          const active = currentPath === path;
          return (
            <button key={path} onClick={() => onNavigate?.(path)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
              background: active ? V1S.blueSoft : 'transparent',
              color: active ? V1S.blueInk : '#475569',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <Icon name={icon} size={18} color={active ? V1S.blue : '#64748b'}/>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function V1SHeader() {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '16px 36px', background: '#fff', borderBottom: '1px solid #e5e7eb',
    }}>
      <div style={{ flex: 1, position: 'relative', maxWidth: 480 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          <Icon name="search" size={16} color={V1S.faint}/>
        </span>
        <input placeholder="문서, 부서, 세부 스토리지 검색..." style={{
          width: '100%', height: 40, padding: '0 14px 0 38px',
          border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14,
          background: '#f8fafc', outline: 'none', fontFamily: 'inherit',
        }}/>
      </div>
      <div style={{ flex: 1 }}/>
      <button style={{ height: 40, padding: '0 14px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#475569', fontFamily: 'inherit' }}>
        <Icon name="plus" size={16}/> 빠른 업로드
      </button>
      <button style={{ position: 'relative', width: 40, height: 40, borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
        <Icon name="bell" size={18}/>
        <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 9999, background: V1S.red }}/>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9999, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>홍</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>홍길동</div>
          <div style={{ fontSize: 11, color: V1S.muted }}>관리자</div>
        </div>
      </div>
    </header>
  );
}

// ----- shared primitives -----

function V1SPageHeader({ breadcrumb, title, sub, eyebrow, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, gap: 24 }}>
      <div style={{ minWidth: 0 }}>
        {breadcrumb && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: V1S.muted, marginBottom: 8 }}>
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Icon name="chevron-right" size={12} color={V1S.faint}/>}
                <span style={{ color: i === breadcrumb.length - 1 ? V1S.ink : V1S.muted, fontWeight: i === breadcrumb.length - 1 ? 500 : 400 }}>{b}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        {eyebrow && <div style={{ fontSize: 12, color: V1S.muted, fontWeight: 500, marginBottom: 6 }}>{eyebrow}</div>}
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{title}</h1>
        {sub && <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 14 }}>{sub}</p>}
      </div>
      {right && <div style={{ flex: 'none' }}>{right}</div>}
    </div>
  );
}

function V1SSparkline({ data, color = V1S.blue, height = 32, width = 92 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const id = `sp-${color.replace('#','')}-${data.length}-${data[0]}`;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon fill={`url(#${id})`} points={`0,${height} ${pts} ${width},${height}`}/>
      <polyline fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" points={pts}/>
    </svg>
  );
}

function V1SStatTile({ title, value, sub, delta, deltaTone, icon, color, data }) {
  return (
    <div style={V1S.card}>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon name={icon} size={15} color={color}/>
            </div>
            <div style={{ fontSize: 12, color: V1S.muted, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          </div>
          {delta && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, flex: 'none',
              color: deltaTone === 'down' ? '#b91c1c' : deltaTone === 'flat' ? V1S.muted : '#15803d',
              background: deltaTone === 'down' ? '#fee2e2' : deltaTone === 'flat' ? '#f1f5f9' : '#dcfce7',
            }}>{delta}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: V1S.faint, marginTop: 6 }}>{sub}</div>}
          </div>
          {data && <V1SSparkline data={data} color={color}/>}
        </div>
      </div>
    </div>
  );
}

function V1SCardHeader({ title, sub, action, icon, iconColor }) {
  return (
    <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <Icon name={icon} size={18} color={iconColor || V1S.ink}/>}
          {title}
        </h2>
        {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: V1S.muted }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function V1SChip({ children, variant = 'neutral', icon }) {
  const v = {
    neutral: { bg: '#f1f5f9', fg: '#475569' },
    blue:    { bg: V1S.blueSoft, fg: V1S.blueInk },
    emerald: { bg: '#dcfce7', fg: '#15803d' },
    amber:   { bg: '#fef3c7', fg: '#92400e' },
    red:     { bg: '#fee2e2', fg: '#991b1b' },
    violet:  { bg: '#ede9fe', fg: '#6d28d9' },
  }[variant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 9999,
      background: v.bg, color: v.fg,
      fontSize: 11, fontWeight: 600,
    }}>
      {icon && <Icon name={icon} size={11}/>}
      {children}
    </span>
  );
}

function V1SOutlineButton({ children, icon, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      height: 36, padding: '0 14px', borderRadius: 10,
      background: '#fff', border: '1px solid #e5e7eb',
      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
      fontSize: 13, fontWeight: 500, color: '#475569', fontFamily: 'inherit',
      ...style,
    }}>
      {icon && <Icon name={icon} size={14}/>}
      {children}
    </button>
  );
}

function V1SPrimaryButton({ children, icon, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      height: 36, padding: '0 14px', borderRadius: 10,
      background: V1S.blue, border: 'none', color: '#fff',
      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
      fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
      boxShadow: '0 1px 2px rgba(37,99,235,0.18)',
      ...style,
    }}>
      {icon && <Icon name={icon} size={14}/>}
      {children}
    </button>
  );
}

Object.assign(window, { V1S, V1Shell, V1SPageHeader, V1SSparkline, V1SStatTile, V1SCardHeader, V1SChip, V1SOutlineButton, V1SPrimaryButton });
