/* eslint-disable */
// AuthPages.jsx — P11 로그인 · P12 회원가입 · P13 온보딩.
// No V1Shell — these are pre-auth pages. But they use the same primitives
// (Input, Button, Card-style, slate palette) so they read as one system.

function V1Input({ label, placeholder, value, type = 'text', hint, error, suffix }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: V1S.ink }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input type={type} defaultValue={value} placeholder={placeholder} style={{
          width: '100%', boxSizing: 'border-box',
          height: 40, padding: suffix ? '0 96px 0 12px' : '0 12px',
          border: `1px solid ${error ? V1S.red : '#e5e7eb'}`,
          borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none',
          background: '#fff',
        }}/>
        {suffix && (
          <div style={{ position: 'absolute', right: 6, top: 4, height: 32 }}>{suffix}</div>
        )}
      </div>
      {error && <div style={{ fontSize: 11.5, color: V1S.red }}>⚠ {error}</div>}
      {hint && !error && <div style={{ fontSize: 11.5, color: V1S.muted }}>{hint}</div>}
    </div>
  );
}

function AuthShell({ children, hero }) {
  return (
    <div style={{
      display: 'flex', height: '100%',
      background: '#fff',
      fontFamily: "'Noto Sans KR','Noto Sans',sans-serif", color: V1S.ink,
    }}>
      {/* Left brand panel */}
      <div style={{
        flex: '0 0 44%',
        background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '48px 48px 40px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        color: '#fff',
      }}>
        <div>
          <img src="../../assets/logo.png" alt="" style={{ height: 32, filter: 'brightness(0) invert(1)' }}/>
        </div>

        {/* decorative grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}/>

        {/* hero content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {hero}
        </div>

        <div style={{ position: 'relative', zIndex: 1, fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          COPYRIGHT © TRAYSTORAGE CONNECT. ALL RIGHTS RESERVED.<br/>
          (주의) 본 솔루션에 사용된 모든 기술은 등록특허로 보호받고 있습니다.
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, overflow: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// P11 — 로그인 (Login)
// ============================================================
function P11Login() {
  const SocialBtn = ({ provider, label }) => (
    <button type="button" style={{
      width: '100%', height: 42, padding: '0 14px',
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      fontFamily: 'inherit', fontSize: 13.5, color: V1S.ink, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <span style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <img src={`../../assets/${provider}.png`} alt="" style={{ height: 18, width: 18, objectFit: 'contain' }}/>
      </span>
      <span style={{ flex: 1, textAlign: 'center', marginRight: 22 }}>{label}</span>
    </button>
  );

  return (
    <AuthShell
      hero={
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.12em', marginBottom: 14 }}>
            FACILITY OPERATIONS · v2.4
          </div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            문서를 둔 곳을<br/>
            태그 한 번으로.
          </h1>
          <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65, maxWidth: 340 }}>
            클라우드 문서와 실물 NFC 보관함을 하나로. 어디에 무엇이 있는지, 누가 마지막으로 손댔는지, TrayStorage CONNECT가 기록합니다.
          </p>
        </div>
      }
    >
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.015em' }}>로그인</h1>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: V1S.blueInk, background: V1S.blueSoft, padding: '3px 7px', borderRadius: 4 }}>BETA</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: V1S.muted }}>TrayStorage CONNECT에 오신 것을 환영합니다.</p>
      </div>

      {/* role tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: '#f1f5f9', borderRadius: 10, marginBottom: 22 }}>
        {[['관리자', true], ['팀원', false]].map(([label, active], i) => (
          <button key={i} style={{
            padding: '8px 12px', borderRadius: 6, border: 'none',
            background: active ? '#fff' : 'transparent',
            color: active ? V1S.ink : V1S.muted,
            fontWeight: 500, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <V1Input label="이메일" type="email" placeholder="example@company.com" value="admin@company.com"/>
        <V1Input label="비밀번호" type="password" placeholder="••••••••" value="********"/>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ width: 15, height: 15, accentColor: V1S.blue, margin: 0 }}/>
            <span style={{ fontSize: 12.5, color: V1S.muted }}>이메일 저장</span>
          </label>
          <button type="button" style={{ background: 'transparent', border: 'none', color: V1S.blue, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
            비밀번호를 잊으셨나요?
          </button>
        </div>

        <button type="submit" style={{
          marginTop: 10, height: 44, borderRadius: 10,
          background: V1S.blue, color: '#fff', border: 'none',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
        }}>관리자 로그인</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }}/>
          <span style={{ fontSize: 11, color: V1S.faint, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }}/>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SocialBtn provider="google" label="Google 계정으로 계속하기"/>
          <SocialBtn provider="apple"  label="Apple 계정으로 계속하기"/>
          <SocialBtn provider="kakao"  label="Kakao 계정으로 계속하기"/>
          <SocialBtn provider="naver"  label="Naver 계정으로 계속하기"/>
        </div>

        <p style={{ fontSize: 12, color: V1S.muted, textAlign: 'center', margin: '14px 0 0' }}>
          계정이 없으신가요?{' '}
          <button type="button" style={{ background: 'transparent', border: 'none', color: V1S.blue, fontFamily: 'inherit', fontSize: 12, padding: 0, cursor: 'pointer', fontWeight: 600 }}>
            회원가입 →
          </button>
        </p>
      </form>
    </AuthShell>
  );
}

// ============================================================
// P12 — 회원가입 (Signup)
// ============================================================
function P12Signup() {
  return (
    <AuthShell
      hero={
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.12em', marginBottom: 14 }}>
            관리자 회원가입
          </div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            우리 회사의<br/>
            보관 시설을 등록하세요.
          </h1>
          <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65, maxWidth: 360 }}>
            회사 코드와 사업자 정보를 등록하면 팀원들이 같은 코드로 합류할 수 있습니다. 휴대폰 인증으로 본인 확인이 필요합니다.
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
            {['회사 정보', '본인 인증', '약관 동의'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 9999,
                  background: i <= 1 ? '#fff' : 'rgba(255,255,255,0.18)',
                  color: i <= 1 ? V1S.blueInk : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>{i + 1}</div>
                <span style={{ fontSize: 12, color: i <= 1 ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.015em' }}>회원가입</h1>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, color: V1S.muted }}>새 계정을 생성합니다.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: '#f1f5f9', borderRadius: 10, marginBottom: 18 }}>
        {[['관리자', true], ['팀원', false]].map(([label, active], i) => (
          <button key={i} style={{
            padding: '7px 12px', borderRadius: 6, border: 'none',
            background: active ? '#fff' : 'transparent',
            color: active ? V1S.ink : V1S.muted,
            fontWeight: 500, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      <form style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <V1Input label="회사명"     placeholder="예: 삼성전자" value="크리에이티브 산업"/>
        <V1Input label="회사 코드 (사업자 등록번호)" placeholder="예: 1234567890" value="123-45-67890"
                 suffix={<button style={{ height: 32, padding: '0 12px', borderRadius: 6, background: V1S.emerald, color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={12}/>인증 완료</button>}/>
        <V1Input label="이름"       placeholder="홍길동" value=""/>
        <V1Input label="이메일"     type="email" placeholder="example@company.com" value=""/>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: V1S.ink, marginBottom: 6, display: 'block' }}>휴대폰 인증</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input placeholder="01012345678" style={{ flex: 1, height: 40, padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}/>
            <button type="button" style={{ height: 40, padding: '0 12px', borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500, color: V1S.ink, flex: 'none' }}>인증번호 전송</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="인증번호 6자리" style={{ flex: 1, height: 40, padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}/>
            <button type="button" style={{ height: 40, padding: '0 12px', borderRadius: 8, background: V1S.emerald, color: '#fff', border: 'none', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600, flex: 'none', display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={12}/> 인증 완료</button>
          </div>
          <div style={{ fontSize: 11.5, color: V1S.emerald, marginTop: 6, fontWeight: 500 }}>✓ 휴대폰 인증이 완료되었습니다.</div>
        </div>

        <V1Input label="비밀번호" type="password" placeholder="8자 이상, 대/소문자, 숫자, 특수문자 포함" value=""/>
        <V1Input label="비밀번호 확인" type="password" placeholder="비밀번호 재입력" value=""/>

        <div style={{ marginTop: 10, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
            <input type="checkbox" defaultChecked style={{ width: 15, height: 15, accentColor: V1S.blue, margin: 0 }}/>
            <span style={{ fontSize: 13, fontWeight: 600, color: V1S.ink }}>모두 동의합니다</span>
          </label>
          <div style={{ paddingTop: 8, borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              '[필수] 만 14세 이상입니다',
              '[필수] 서비스 이용약관에 동의합니다',
              '[필수] 개인정보 처리방침에 동의합니다',
            ].map((t) => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: 14, height: 14, accentColor: V1S.blue, margin: 0 }}/>
                <span style={{ fontSize: 12, color: V1S.muted }}>{t.split('] ')[0]}]<span style={{ color: V1S.ink }}> {t.split('] ')[1]}</span></span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" style={{
          marginTop: 8, height: 44, borderRadius: 10,
          background: V1S.blue, color: '#fff', border: 'none',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
        }}>회원가입</button>
      </form>
    </AuthShell>
  );
}

// ============================================================
// P13 — 온보딩 (Onboarding — company code entry after first signup)
// ============================================================
function P13Onboarding() {
  return (
    <div style={{
      display: 'flex', height: '100%',
      background: '#f8f9fa',
      fontFamily: "'Noto Sans KR','Noto Sans',sans-serif", color: V1S.ink,
      alignItems: 'center', justifyContent: 'center', padding: 32,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* progress bar */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <img src="../../assets/logo.png" alt="" style={{ height: 26 }}/>
            <button style={{ background: 'transparent', border: 'none', color: V1S.muted, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>로그아웃</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[1, 2, 3].map((n, i) => (
              <React.Fragment key={n}>
                <div style={{
                  width: 26, height: 26, borderRadius: 9999,
                  background: i <= 1 ? V1S.blue : '#e5e7eb',
                  color: i <= 1 ? '#fff' : V1S.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flex: 'none',
                }}>{i < 1 ? <Icon name="check" size={13} color="#fff"/> : n}</div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: i < 1 ? V1S.blue : '#e5e7eb', borderRadius: 9999 }}/>}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {['계정 생성', '회사 정보', '부서 설정'].map((t, i) => (
              <span key={t} style={{ fontSize: 11.5, color: i <= 1 ? V1S.ink : V1S.muted, fontWeight: i === 1 ? 600 : 400, textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right' }}>{t}</span>
            ))}
          </div>
        </div>

        <div style={{ ...V1S.card, padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: V1S.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="building-2" size={28} color={V1S.blue}/>
            </div>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.015em', textAlign: 'center' }}>
            회사 정보를 알려주세요
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: V1S.muted, textAlign: 'center' }}>
            서비스를 이용하려면 회사 코드와 회사명을 등록해야 합니다.
          </p>

          <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <V1Input
              label="회사 코드 (사업자 등록번호)"
              placeholder="예: 1234567890"
              value="123-45-67890"
              hint="기존 회사에 합류하려면 관리자에게 받은 코드를 입력하세요."
            />
            <V1Input
              label="회사명"
              placeholder="예: 삼성전자"
              value="크리에이티브 산업"
            />

            <div style={{ marginTop: 6, padding: 14, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 9999, background: V1S.emerald, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name="check" size={14}/>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>인증 완료</div>
                <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>회사 정보가 인증되었습니다. 새로운 회사로 등록됩니다.</div>
              </div>
            </div>

            <button type="submit" style={{
              marginTop: 8, height: 44, borderRadius: 10,
              background: V1S.blue, color: '#fff', border: 'none',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
            }}>
              다음 단계 →
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <p style={{ fontSize: 11.5, color: V1S.faint, margin: 0 }}>
            잘못된 회사로 들어왔다면 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { P11Login, P12Signup, P13Onboarding, AuthShell, V1Input });
