/* eslint-disable */
// SubcategoryScreen.jsx — the NFC-taggable storage detail page.
// Big info card on top (name, location, status), action toolbar (favorite / NFC / QR / share),
// then a document list. This is the heart of the product.

function InfoStat({ label, value, color = '#0f172a' }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color }}>{value}</div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, variant = 'outline' }) {
  return (
    <Button variant={variant} size="default" onClick={onClick} style={{ gap: 6 }}>
      <Icon name={icon} size={16}/>
      <span>{label}</span>
    </Button>
  );
}

function DocumentRow({ doc, onPreview }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        background: hover ? '#f8fafc' : '#fff',
        transition: 'background 150ms',
      }}
    >
      <div style={{ padding: 8, borderRadius: 6, background: '#dbeafe', display: 'flex' }}>
        <Icon name="file-text" size={18} color="#1d4ed8"/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: 14, color: '#0f172a' }}>{doc.title}</span>
          {doc.confidential && <Pill variant="neutral">기밀</Pill>}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          작성자 {doc.uploader} · {doc.uploadedAt} · {doc.size}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onPreview(doc)} style={{ gap: 4 }}>
        <Icon name="eye" size={14}/>
        <span>미리보기</span>
      </Button>
      <Button variant="ghost" size="sm" style={{ gap: 4 }}>
        <Icon name="download" size={14}/>
        <span>다운로드</span>
      </Button>
    </div>
  );
}

function SubcategoryScreen({ subcategory, onBack, onPreview, onToggleFavorite, isFavorite, onNfcRegister, onShowQr, toast }) {
  const sub = subcategory;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button variant="ghost" size="icon" onClick={onBack} style={{ width: 32, height: 32 }}>
          <Icon name="arrow-left" size={18}/>
        </Button>
        <div style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{sub.department}</span>
          <Icon name="chevron-right" size={14}/>
          <span>{sub.parent}</span>
          <Icon name="chevron-right" size={14}/>
          <span style={{ color: '#0f172a', fontWeight: 500 }}>{sub.name}</span>
        </div>
      </div>

      <Card>
        <CardContent style={{ paddingTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: sub.labelColor, border: '1px solid rgba(0,0,0,0.1)' }}/>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a' }}>{sub.name}</h2>
                {sub.nfcActive && <Pill variant="soft">NFC 등록됨</Pill>}
                {sub.expiresIn && <Pill variant="warning">만료 {sub.expiresIn}일 전</Pill>}
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.55 }}>{sub.description}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
              <ActionBtn icon="star" label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'} onClick={onToggleFavorite}/>
              <ActionBtn icon="nfc" label="NFC 재등록" onClick={onNfcRegister}/>
              <ActionBtn icon="qr-code" label="QR코드 보기" onClick={onShowQr}/>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
            <InfoStat label="문서 수"    value={sub.documents.length}/>
            <InfoStat label="NFC 상태"   value={sub.nfcActive ? '활성' : '비활성'} color={sub.nfcActive ? '#10b981' : '#94a3b8'}/>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>보관 장소</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 6, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="map-pin" size={14} color="#64748b"/>
                {sub.location}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>관리번호</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 6, color: '#0f172a', fontFamily: 'ui-monospace, SF Mono, Menlo, monospace' }}>
                {sub.managementNumber}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <CardTitle>문서 목록</CardTitle>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>이 세부 스토리지에 속한 문서입니다.</p>
            </div>
            <Button onClick={() => toast({ title: '업로드 준비', description: '문서 업로드 화면을 여는 중입니다…' })} style={{ gap: 6 }}>
              <Icon name="upload" size={14}/>
              <span>문서 업로드</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sub.documents.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '24px 0', margin: 0 }}>
              이 세부 스토리지에 문서가 없습니다.
            </p>
          ) : sub.documents.map((d) => (
            <DocumentRow key={d.id} doc={d} onPreview={onPreview}/>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// -- modals --

function PreviewModal({ doc, onClose }) {
  if (!doc) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.40)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, maxWidth: 720, width: '100%', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>문서 미리보기</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{doc.title}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} style={{ width: 32, height: 32 }}>
            <Icon name="x" size={18}/>
          </Button>
        </div>
        <div style={{ flex: 1, background: '#f8fafc', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{
            width: 360, height: 480, background: '#fff', borderRadius: 4,
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.25)',
            padding: 32, display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{doc.title}</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{doc.title}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[1,2,3,4,5,6,7,8].map((i) => (
                <div key={i} style={{ height: 6, background: '#e5e7eb', borderRadius: 2, width: `${(i % 3) === 0 ? 60 : (i % 2) === 0 ? 85 : 95}%` }}/>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: '#94a3b8' }}>1 / 4</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
          <Button variant="outline" size="sm" style={{ gap: 6 }}><Icon name="download" size={14}/>다운로드</Button>
          <Button variant="outline" size="sm" style={{ gap: 6 }}><Icon name="share-2" size={14}/>공유</Button>
        </div>
      </div>
    </div>
  );
}

function QrModal({ subcategory, onClose }) {
  if (!subcategory) return null;
  // Decorative QR — a deterministic 21×21 grid that looks like a QR code.
  const cells = [];
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      const isFinder = (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7);
      const isFinderInner = (isFinder && r >= 2 && r <= 4 && (c >= 2 && c <= 4) && (r < 7 && c < 7))
        || (isFinder && r >= 2 && r <= 4 && (c >= 16 && c <= 18) && (r < 7 && c > 13))
        || (isFinder && r >= 16 && r <= 18 && (c >= 2 && c <= 4));
      const isFinderRing = isFinder && !isFinderInner && (r === 0 || r === 6 || c === 0 || c === 6 || (r === 14 && c > 13) || (r === 20 && c < 7) || (c === 14 && r < 7) || (c === 20 && r < 7) || (r === 16 && c > 13 && c < 19) || (c === 16 && r > 13 && r < 19));
      let on;
      if (isFinder) on = isFinderInner || (r === 0 || r === 6 || c === 0 || c === 6) || (r === 14 && c > 13) || (r === 20 && c < 7) || (c === 14 && r < 7) || (c === 20 && r < 7);
      else on = ((r * 7 + c * 13 + r * c) % 5) < 2;
      cells.push(on);
    }
  }
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.40)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, maxWidth: 420, width: '100%',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 0' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>QR 코드</h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>이 QR 코드로 세부 스토리지에 바로 접근할 수 있습니다.</p>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(21, 1fr)',
            width: 220, height: 220, padding: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
          }}>
            {cells.map((on, i) => (
              <div key={i} style={{ background: on ? '#0f172a' : '#fff' }}/>
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{subcategory.name}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>{subcategory.managementNumber}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid #e5e7eb' }}>
          <Button variant="outline" size="sm" style={{ gap: 6 }}><Icon name="download" size={14}/>이미지로 저장</Button>
          <Button size="sm" onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SubcategoryScreen, PreviewModal, QrModal });
