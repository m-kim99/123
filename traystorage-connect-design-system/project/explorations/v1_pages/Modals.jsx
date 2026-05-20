/* eslint-disable */
// Modals.jsx — every popup/dialog rendered in V1 style.
// Upload · Add subcategory · Share · Preview · NFC register · Delete confirm · Notifications dropdown.
// Each is wrapped in <ModalOnPage page="..."/> demos so they render on top of a real page in the canvas.

function ModalOverlay({ children, width = 480, onClose }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(15, 23, 42, 0.50)',
      backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 32,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: width,
        maxHeight: '90%', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(15,23,42,0.35), 0 10px 15px -8px rgba(15,23,42,0.15)',
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ icon, iconColor = V1S.blue, title, sub, onClose }) {
  return (
    <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #f1f5f9' }}>
      {icon && (
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${iconColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name={icon} size={20} color={iconColor}/>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: V1S.ink, letterSpacing: '-0.01em' }}>{title}</h2>
        {sub && <p style={{ margin: '4px 0 0', fontSize: 13, color: V1S.muted }}>{sub}</p>}
      </div>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: V1S.faint, padding: 4, display: 'flex', borderRadius: 6 }}>
        <Icon name="x" size={20}/>
      </button>
    </div>
  );
}

function ModalFooter({ children }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
      {children}
    </div>
  );
}

// ============================================================
// M1 — 문서 업로드
// ============================================================
function M1UploadDialog() {
  return (
    <ModalOverlay width={560}>
      <ModalHeader icon="upload" title="문서 업로드" sub="새로운 문서를 시스템에 업로드합니다."/>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldGroup label="부서">
            <SelectField value="인사팀"/>
          </FieldGroup>
          <FieldGroup label="대분류">
            <SelectField value="채용 문서"/>
          </FieldGroup>
        </div>
        <FieldGroup label="세부 스토리지">
          <SelectField value="채용 서류 보관함 · A동 2층 캐비닛 3"/>
        </FieldGroup>

        {/* Dropzone */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: V1S.ink, marginBottom: 6, display: 'block' }}>파일 업로드</label>
          <div style={{
            border: `2px dashed ${V1S.blue}`,
            borderRadius: 12, padding: '28px 24px',
            background: V1S.blueSoft,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="upload" size={22} color={V1S.blue}/>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: V1S.ink }}>클릭하여 파일 선택 또는 드래그 앤 드롭</div>
              <div style={{ fontSize: 12, color: V1S.muted, marginTop: 4 }}>PDF · JPG · PNG · 여러 파일 선택 가능</div>
            </div>
          </div>
        </div>

        {/* Selected file with progress */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: V1S.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="file-text" size={16} color={V1S.blueInk}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: V1S.ink }}>2025_상반기_채용_공고문.pdf</span>
              <span style={{ fontSize: 11, color: V1S.muted, fontFamily: 'ui-monospace,monospace' }}>342KB · 68%</span>
            </div>
            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ width: '68%', height: '100%', background: V1S.blue, borderRadius: 9999 }}/>
            </div>
            <div style={{ fontSize: 11, color: V1S.muted, marginTop: 4 }}>OCR 추출 중…</div>
          </div>
        </div>

        <FieldGroup label="문서 제목">
          <input defaultValue="2025_상반기_신입사원_채용_공고문" style={inputStyle}/>
          <div style={{ fontSize: 11.5, color: V1S.muted, marginTop: 6 }}>원본 파일명을 기본 제목으로 사용합니다. 필요하면 수정하세요.</div>
        </FieldGroup>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
          <input type="checkbox" defaultChecked style={{ width: 15, height: 15, accentColor: V1S.blue, margin: 0 }}/>
          <span style={{ fontSize: 13, color: V1S.ink }}>이 문서는 <strong style={{ fontWeight: 600 }}>기밀</strong>입니다</span>
        </label>
      </div>
      <ModalFooter>
        <V1SOutlineButton>취소</V1SOutlineButton>
        <V1SPrimaryButton icon="upload">업로드</V1SPrimaryButton>
      </ModalFooter>
    </ModalOverlay>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  height: 38, padding: '0 12px',
  border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14,
  fontFamily: 'inherit', outline: 'none', background: '#fff',
};

function FieldGroup({ label, optional, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: V1S.ink }}>
        {label}
        {optional && <span style={{ color: V1S.muted, fontWeight: 400, marginLeft: 4 }}>(선택)</span>}
      </label>
      {children}
    </div>
  );
}

function SelectField({ value }) {
  return (
    <button style={{
      height: 38, padding: '0 12px', borderRadius: 8,
      border: '1px solid #e5e7eb', background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', color: V1S.ink,
      width: '100%', boxSizing: 'border-box',
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      <Icon name="chevron-down" size={14} color={V1S.muted}/>
    </button>
  );
}

// ============================================================
// M2 — 세부 스토리지 추가
// ============================================================
function M2AddSubcategoryDialog() {
  const LABELS = ['#ffffff','#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#a855f7','#92400e','#94a3b8','#111827'];
  return (
    <ModalOverlay width={560}>
      <ModalHeader icon="archive" title="새 세부 스토리지 추가" sub="부서와 대분류를 선택해서 새 보관함을 만듭니다."/>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldGroup label="부서"><SelectField value="인사팀"/></FieldGroup>
          <FieldGroup label="대분류"><SelectField value="채용 문서"/></FieldGroup>
        </div>
        <FieldGroup label="세부 스토리지 이름">
          <input defaultValue="채용 서류 보관함" style={inputStyle}/>
        </FieldGroup>
        <FieldGroup label="설명" optional>
          <textarea defaultValue="신규 입사자 채용 관련 서류를 보관합니다." style={{ ...inputStyle, height: 64, padding: 10, resize: 'vertical' }}/>
        </FieldGroup>
        <FieldGroup label="컬러라벨" optional>
          <div style={{ display: 'flex', gap: 8 }}>
            {LABELS.map((c, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: 9999, background: c,
                border: i === 5 ? `2px solid ${V1S.blue}` : '1px solid rgba(0,0,0,0.1)',
                boxShadow: i === 5 ? `0 0 0 3px ${V1S.blue}33` : 'none',
                cursor: 'pointer',
              }}/>
            ))}
          </div>
        </FieldGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldGroup label="보관 장소" optional>
            <input defaultValue="A동 2층 캐비닛 3" style={inputStyle}/>
          </FieldGroup>
          <FieldGroup label="관리번호" optional>
            <input defaultValue="MGT-2024-001" style={{ ...inputStyle, fontFamily: 'ui-monospace,monospace' }}/>
          </FieldGroup>
        </div>
        <FieldGroup label="기본 보관 만료일" optional>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['3개월','1년','3년','5년','7년','10년','직접 선택'].map((opt, i) => (
              <button key={opt} style={{
                padding: '7px 12px', borderRadius: 8,
                border: i === 2 ? `1px solid ${V1S.blue}` : '1px solid #e5e7eb',
                background: i === 2 ? V1S.blueSoft : '#fff',
                color: i === 2 ? V1S.blueInk : V1S.ink,
                fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              }}>{opt}</button>
            ))}
          </div>
        </FieldGroup>
      </div>
      <ModalFooter>
        <V1SOutlineButton>취소</V1SOutlineButton>
        <V1SOutlineButton icon="archive">스토리지만 추가</V1SOutlineButton>
        <V1SPrimaryButton icon="nfc">NFC 등록하며 추가</V1SPrimaryButton>
      </ModalFooter>
    </ModalOverlay>
  );
}

// ============================================================
// M3 — 문서 공유
// ============================================================
function M3ShareDialog() {
  const candidates = [
    { name: '김민지', email: 'minji@company.com',     team: '인사팀', selected: true,  color: V1S.violet },
    { name: '박서준', email: 'sj.park@company.com',   team: '인사팀', selected: true,  color: V1S.emerald },
    { name: '이수현', email: 'shlee@company.com',     team: '인사팀', selected: false, color: V1S.amber },
    { name: '오재훈', email: 'jh.oh@company.com',     team: '개발팀', selected: true,  color: V1S.blue },
    { name: '강민호', email: 'mh.kang@company.com',   team: '회계팀', selected: false, color: V1S.blue },
  ];
  return (
    <ModalOverlay width={560}>
      <ModalHeader icon="share-2" title="문서 공유" sub="2025_상반기_신입사원_채용_공고문.pdf"/>
      <div style={{ padding: '8px 24px 0', display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
        {[['새로운 공유', true], ['공유 현황 (3명)', false]].map(([label, active], i) => (
          <button key={i} style={{
            padding: '10px 14px', background: 'transparent', border: 'none',
            fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
            color: active ? V1S.ink : V1S.muted,
            fontWeight: active ? 600 : 500,
            borderBottom: active ? `2px solid ${V1S.blue}` : '2px solid transparent',
            marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
            <Icon name="search" size={14} color={V1S.faint}/>
          </span>
          <input placeholder="이름·이메일로 사용자 검색" style={{ ...inputStyle, paddingLeft: 34 }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: V1S.muted }}>
          <span>총 5명 중 <strong style={{ color: V1S.ink }}>3명</strong> 선택됨</span>
          <button style={{ background: 'transparent', border: 'none', color: V1S.blue, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>전체 선택</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflow: 'auto', border: '1px solid #f1f5f9', borderRadius: 10, padding: 4 }}>
          {candidates.map((c, i) => (
            <label key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 8, cursor: 'pointer',
              background: c.selected ? V1S.blueSoft : 'transparent',
            }}>
              <input type="checkbox" defaultChecked={c.selected} style={{ width: 15, height: 15, accentColor: V1S.blue, margin: 0 }}/>
              <div style={{ width: 30, height: 30, borderRadius: 9999, background: c.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{c.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: V1S.ink }}>{c.name} <span style={{ fontSize: 11, color: V1S.muted, fontWeight: 400 }}>· {c.team}</span></div>
                <div style={{ fontSize: 11, color: V1S.muted, fontFamily: 'ui-monospace,monospace' }}>{c.email}</div>
              </div>
            </label>
          ))}
        </div>
        <FieldGroup label="메모" optional>
          <textarea defaultValue="신입 채용 일정 확정안 검토 부탁드립니다." style={{ ...inputStyle, height: 60, padding: 10, resize: 'vertical' }}/>
        </FieldGroup>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" defaultChecked style={{ width: 15, height: 15, accentColor: V1S.blue, margin: 0 }}/>
          <span style={{ fontSize: 13, color: V1S.ink }}>이메일 알림도 함께 보내기</span>
        </label>
      </div>
      <ModalFooter>
        <V1SOutlineButton>취소</V1SOutlineButton>
        <V1SPrimaryButton icon="share-2">3명에게 공유</V1SPrimaryButton>
      </ModalFooter>
    </ModalOverlay>
  );
}

// ============================================================
// M4 — 문서 미리보기
// ============================================================
function M4PreviewDialog() {
  return (
    <ModalOverlay width={840}>
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: V1S.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name="file-text" size={16} color={V1S.blueInk}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: V1S.ink }}>2025_상반기_신입사원_채용_공고문.pdf</div>
          <div style={{ fontSize: 11.5, color: V1S.muted, fontFamily: 'ui-monospace,monospace' }}>김민지 · 인사팀 · 2026-04-12 · 342KB</div>
        </div>
        <V1SChip variant="neutral">기밀</V1SChip>
        <V1SOutlineButton icon="download" style={{ height: 32, padding: '0 10px', fontSize: 12 }}>다운로드</V1SOutlineButton>
        <V1SOutlineButton icon="share-2"  style={{ height: 32, padding: '0 10px', fontSize: 12 }}>공유</V1SOutlineButton>
        <button style={{ background: 'transparent', border: 'none', color: V1S.faint, cursor: 'pointer', padding: 6, display: 'flex', borderRadius: 6 }}>
          <Icon name="x" size={20}/>
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* page viewer */}
        <div style={{ flex: 1, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, position: 'relative' }}>
          {/* fake page */}
          <div style={{
            width: 380, height: 480, background: '#fff', borderRadius: 4,
            boxShadow: '0 20px 40px -12px rgba(0,0,0,0.25)',
            padding: 36, display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 11, color: V1S.muted, fontFamily: 'ui-monospace,monospace' }}>CRT-2026-001</div>
              <img src="../../assets/logo1.png" alt="" style={{ height: 18, opacity: 0.6 }}/>
            </div>
            <h1 style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 700, color: V1S.ink, lineHeight: 1.35 }}>
              2025년 상반기 신입사원<br/>채용 공고
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {[100, 85, 92, 70, 88, 95, 60, 90, 78].map((w, i) => (
                <div key={i} style={{ height: 6, background: '#e5e7eb', borderRadius: 2, width: `${w}%` }}/>
              ))}
            </div>
            <div style={{ marginTop: 18, fontSize: 11, color: V1S.faint }}>1 / 4</div>
          </div>
          {/* page controls */}
          <button style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: 9999, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Icon name="chevron-right" size={16} color={V1S.muted} style={{ transform: 'rotate(180deg)' }}/>
          </button>
          <button style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: 9999, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Icon name="chevron-right" size={16} color={V1S.muted}/>
          </button>
        </div>
        {/* sidebar: OCR text + meta */}
        <div style={{ width: 280, borderLeft: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, color: V1S.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>OCR 추출 텍스트 · 412자</div>
            <div style={{ fontSize: 11.5, color: V1S.muted, lineHeight: 1.55, maxHeight: 200, overflow: 'auto' }}>
              주식회사 크리에이티브 산업에서는 2025년 상반기 신입사원을 다음과 같이 모집합니다. 모집 부문 인사팀 1명 개발팀 3명 마케팅팀 2명 응시 자격…
            </div>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, color: V1S.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>문서 정보</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <Row k="보관 위치" v="채용 서류 보관함"/>
              <Row k="NFC 태그" v="NFC-011" mono/>
              <Row k="물리 위치" v="A동 2층 캐비닛 3"/>
              <Row k="기밀 등급" v="기밀"/>
            </div>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

function Row({ k, v, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: V1S.muted }}>{k}</span>
      <span style={{ color: V1S.ink, fontWeight: 500, fontFamily: mono ? 'ui-monospace,monospace' : 'inherit' }}>{v}</span>
    </div>
  );
}

// ============================================================
// M5 — NFC 태그 등록
// ============================================================
function M5NfcDialog() {
  return (
    <ModalOverlay width={440}>
      <ModalHeader icon="nfc" iconColor={V1S.blue} title="NFC 태그 등록" sub="채용 서류 보관함"/>
      <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        {/* pulse */}
        <div style={{ position: 'relative', width: 144, height: 144, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 16, borderRadius: 9999, background: `${V1S.blue}10`, animation: 'pulse1 2s ease-out infinite' }}/>
          <div style={{ position: 'absolute', inset: 32, borderRadius: 9999, background: `${V1S.blue}20`, animation: 'pulse1 2s ease-out infinite 0.5s' }}/>
          <div style={{ width: 80, height: 80, borderRadius: 9999, background: V1S.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px -5px rgba(37,99,235,0.45)' }}>
            <Icon name="nfc" size={36} color="#fff"/>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: V1S.ink }}>NFC 태그 대기 중</h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: V1S.muted, lineHeight: 1.55 }}>
            태그를 기기에 가까이 가져다 대세요.<br/>
            자동으로 UID를 읽어 보관함과 연결합니다.
          </p>
        </div>
        <div style={{ width: '100%', padding: 14, background: '#f8fafc', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
          <Row k="카테고리 코드" v="HR-CHA-014" mono/>
          <Row k="카테고리 이름" v="채용 서류 보관함"/>
          <Row k="보관 장소"    v="A동 2층 캐비닛 3"/>
          <Row k="문서 개수"    v="12건"/>
        </div>
      </div>
      <ModalFooter>
        <V1SOutlineButton>나중에</V1SOutlineButton>
        <V1SOutlineButton style={{ flex: 1, justifyContent: 'center', color: V1S.muted }}>스캔 중지</V1SOutlineButton>
      </ModalFooter>
    </ModalOverlay>
  );
}

// ============================================================
// M6 — 삭제 확인 (대분류)
// ============================================================
function M6DeleteConfirmDialog() {
  return (
    <ModalOverlay width={460}>
      <ModalHeader icon="trash" iconColor={V1S.red} title="대분류 삭제" sub="이 작업은 되돌릴 수 없습니다."/>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 600, marginBottom: 8 }}>"채용 문서" 대분류를 정말 삭제하시겠습니까?</div>
          <div style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.6 }}>
            • 이 대분류에 속한 <strong>세부 스토리지 6개</strong>가 삭제됩니다.<br/>
            • <strong>문서 23건</strong>도 함께 삭제됩니다.<br/>
            • 삭제된 데이터는 30일 후 영구 삭제됩니다.
          </div>
        </div>
        <FieldGroup label={<span>정말 삭제하려면 아래에 <strong style={{ color: V1S.red }}>삭제하겠습니다</strong>를 입력하세요.</span>}>
          <input placeholder="삭제하겠습니다" style={{ ...inputStyle, fontFamily: 'inherit' }}/>
        </FieldGroup>
      </div>
      <ModalFooter>
        <V1SOutlineButton>취소</V1SOutlineButton>
        <button style={{
          height: 36, padding: '0 14px', borderRadius: 10,
          background: '#fecaca', color: '#991b1b', border: 'none',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'not-allowed',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="trash" size={14}/> 영구 삭제
        </button>
      </ModalFooter>
    </ModalOverlay>
  );
}

// ============================================================
// M7 — 알림 드롭다운 (header bell popover, not a full-screen modal)
// ============================================================
function M7NotificationDropdown() {
  const items = [
    { tone: V1S.blue,    icon: 'file-text', text: '김민지님이 채용_공고문_v3.pdf를 업로드했습니다.',     when: '방금 전', unread: true },
    { tone: V1S.emerald, icon: 'share-2',   text: '박서준님이 근로계약서 v3를 공유했습니다.',           when: '12분 전', unread: true },
    { tone: V1S.amber,   icon: 'clock',     text: '월간 정산 보관함이 7일 후 만료됩니다.',              when: '1시간 전', unread: true },
    { tone: V1S.violet,  icon: 'nfc',       text: 'NFC-038 태그가 새로 등록되었습니다.',                 when: '오늘',     unread: false },
    { tone: V1S.muted,   icon: 'megaphone', text: '"문서 보관 정책 v2.4 업데이트" 공지가 등록되었습니다.', when: '어제',    unread: false },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'transparent', pointerEvents: 'none' }}>
      {/* Bell anchor — simulated in the page header position */}
      <div style={{
        position: 'absolute', top: 70, right: 130,
        width: 360,
        background: '#fff', borderRadius: 14,
        border: '1px solid #e5e7eb',
        boxShadow: '0 20px 35px -10px rgba(0,0,0,0.18), 0 10px 15px -6px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="bell" size={16} color={V1S.blue}/>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>알림</h3>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: V1S.red, padding: '1px 6px', borderRadius: 9999 }}>3</span>
          </div>
          <button style={{ background: 'transparent', border: 'none', color: V1S.blue, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            모두 읽음
          </button>
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {items.map((it, i) => (
            <div key={i} style={{
              padding: '12px 18px',
              borderBottom: i === items.length - 1 ? 'none' : '1px solid #f1f5f9',
              display: 'flex', gap: 10,
              background: it.unread ? V1S.blueSoft : 'transparent',
              cursor: 'pointer',
              position: 'relative',
            }}>
              {it.unread && <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 5, height: 5, borderRadius: 9999, background: V1S.blue }}/>}
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${it.tone}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name={it.icon} size={14} color={it.tone}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: V1S.ink, lineHeight: 1.5 }}>{it.text}</div>
                <div style={{ fontSize: 11, color: V1S.faint, marginTop: 2 }}>{it.when}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: 10, borderTop: '1px solid #f1f5f9', textAlign: 'center', background: '#fafbfc' }}>
          <button style={{ background: 'transparent', border: 'none', color: V1S.blue, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            전체 알림 보기 →
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ModalOnPage — composes a backing page with a modal/widget on top.
// ============================================================
function ModalOnPage({ page, modal }) {
  const Page = {
    P1: P1Subcategory,
    P2: P2Documents,
    P3: P3ParentCategory,
  }[page] || P1Subcategory;
  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <Page onNavigate={() => {}}/>
      {modal}
    </div>
  );
}

Object.assign(window, { M1UploadDialog, M2AddSubcategoryDialog, M3ShareDialog, M4PreviewDialog, M5NfcDialog, M6DeleteConfirmDialog, M7NotificationDropdown, ModalOnPage });
