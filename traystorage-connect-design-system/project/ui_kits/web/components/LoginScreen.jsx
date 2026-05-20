/* eslint-disable */
// LoginScreen.jsx — the public login page.
// Mirrors LoginPage.tsx structure: admin/team tabs, email+password,
// remember-email + forgot-password row, social-login stack.
// Background uses the dark overlay treatment (no video file shipped).

function TabsBar({ value, onChange, tabs }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
      gap: 4, padding: 4,
      background: '#f1f5f9', borderRadius: 8,
      marginBottom: 24,
    }}>
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            style={{
              padding: '8px 12px', borderRadius: 6, border: 'none',
              background: active ? '#2563eb' : '#fff',
              color: active ? '#fff' : '#0f172a',
              fontWeight: 500, fontSize: 14, fontFamily: 'inherit',
              cursor: 'pointer', transition: 'all 150ms',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >{t.label}</button>
        );
      })}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [tab, setTab] = React.useState('admin');
  const [email, setEmail] = React.useState('admin@company.com');
  const [password, setPassword] = React.useState('demo');
  const [remember, setRemember] = React.useState(true);

  const submit = (e) => {
    e?.preventDefault();
    onLogin(tab);
  };

  const SocialBtn = ({ provider, label }) => (
    <button type="button" style={{
      width: '100%', height: 40, padding: '0 16px',
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
      fontFamily: 'inherit', fontSize: 14, color: '#0f172a',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
    }}>
      <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <img src={`../../assets/${provider}.png`} alt="" style={{ height: 20, width: 20, objectFit: 'contain' }}/>
      </span>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
    </button>
  );

  return (
    <div style={{
      position: 'relative', minHeight: '100vh', width: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, overflow: 'hidden',
      // Stock-warehouse stand-in for /login-bg.mp4 — solid slate with the overlay treatment.
      background: 'radial-gradient(ellipse at center, #475569 0%, #1e293b 80%)',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        <Card style={{ borderRadius: 12 }}>
          <CardHeader style={{ textAlign: 'center', alignItems: 'center', paddingBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <img src="../../assets/logo.png" alt="TrayStorage CONNECT" style={{ height: 56 }}/>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#1d4ed8',
                background: '#dbeafe', padding: '3px 8px', borderRadius: 4,
                transform: 'translateY(8px)',
              }}>BETA</span>
            </div>
          </CardHeader>
          <CardContent style={{ paddingTop: 24 }}>
            <TabsBar
              value={tab}
              onChange={setTab}
              tabs={[{ value: 'admin', label: '관리자' }, { value: 'team', label: '팀원' }]}
            />
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="pw">비밀번호</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}/>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2563eb' }}/>
                  <span style={{ fontSize: 13, color: '#475569' }}>이메일 저장</span>
                </label>
                <button type="button" style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>
                  비밀번호를 잊으셨나요?
                </button>
              </div>
              <Button type="submit" style={{ width: '100%', height: 40 }}>
                {tab === 'admin' ? '관리자 로그인' : '팀원 로그인'}
              </Button>
              <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: 0 }}>
                계정이 없으신가요?{' '}
                <button type="button" style={{ background: 'transparent', border: 'none', color: '#2563eb', fontFamily: 'inherit', fontSize: 12, padding: '0 4px', cursor: 'pointer', fontWeight: 500 }}>
                  회원가입
                </button>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SocialBtn provider="google" label="Google 계정으로 계속하기"/>
                <SocialBtn provider="apple"  label="Apple 계정으로 계속하기"/>
                <SocialBtn provider="kakao"  label="Kakao 계정으로 계속하기"/>
                <SocialBtn provider="naver"  label="Naver 계정으로 계속하기"/>
              </div>
            </form>
          </CardContent>
        </Card>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#fff', margin: 0, opacity: 0.85 }}>
            COPYRIGHT © TRAYSTORAGE CONNECT. ALL RIGHTS RESERVED.
          </p>
          <p style={{ fontSize: 11, color: '#fff', margin: '4px 0 0', opacity: 0.7 }}>
            (주의) 본 솔루션에 사용된 모든 기술은 등록특허로 보호받고 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
