/* eslint-disable */
// ContentPages.jsx — P8 공지사항 · P9 휴지통 · P10 공유받은 문서함.

// ============================================================
// P8 — 공지사항 (Announcements)
// ============================================================
function P8Announcements({ onNavigate }) {
  const items = [
    { id: 'a1', title: '2026년 상반기 채용 공고 발표 안내',     author: '홍길동', date: '2026-05-19', comments: 12, pinned: true,  excerpt: '인사팀에서 2026년 상반기 신입사원 채용 공고를 5월 22일에 발표할 예정입니다. 채용 절차 및 일정에 대한 자세한 사항은…' },
    { id: 'a2', title: '문서 보관 정책 v2.4 업데이트 알림',     author: '홍길동', date: '2026-05-12', comments:  6, pinned: false, excerpt: '문서 보관 기간 정책이 일부 변경되었습니다. 회계 관련 문서의 기본 보관 기간이 5년에서 7년으로 연장됩니다.' },
    { id: 'a3', title: 'NFC 태그 추가 발주 완료',                author: '오재훈', date: '2026-05-08', comments:  3, pinned: false, excerpt: 'C동 1층 보관함용 NFC 태그 50개가 추가 발주되었으며 5월 14일 입고 예정입니다.' },
    { id: 'a4', title: '5월 셋째 주 정기 시스템 점검 안내',      author: '오재훈', date: '2026-05-05', comments:  1, pinned: false, excerpt: '5월 15일(수) 02:00 ~ 04:00 동안 정기 시스템 점검이 진행됩니다. 점검 시간에는 일시적으로 서비스 이용이 제한될 수 있습니다.' },
  ];
  return (
    <V1Shell currentPath="/admin/announcements" onNavigate={onNavigate}>
      <V1SPageHeader
        title="공지사항"
        sub="회사 전체에 공지할 내용을 작성하고 관리합니다."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <V1SOutlineButton icon="search">검색</V1SOutlineButton>
            <V1SPrimaryButton icon="plus">새 공지 작성</V1SPrimaryButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24 }}>
        <section style={V1S.card}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="megaphone" size={18} color={V1S.blue}/>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>전체 공지</h2>
              <span style={{ fontSize: 12, color: V1S.muted, background: V1S.blueSoft, color: V1S.blueInk, padding: '2px 8px', borderRadius: 9999, fontWeight: 600 }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <V1SOutlineButton>최신순</V1SOutlineButton>
            </div>
          </div>
          <div>
            {items.map((it, i) => (
              <article key={it.id} style={{
                padding: '20px 24px',
                borderBottom: i === items.length - 1 ? 'none' : '1px solid #f1f5f9',
                display: 'flex', flexDirection: 'column', gap: 8,
                background: it.pinned ? '#fffbeb' : 'transparent',
                position: 'relative',
              }}>
                {it.pinned && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: V1S.amber }}/>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {it.pinned && <V1SChip variant="amber">📌 고정</V1SChip>}
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: V1S.ink, letterSpacing: '-0.01em' }}>{it.title}</h3>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: V1S.muted, lineHeight: 1.55 }}>{it.excerpt}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: V1S.faint, marginTop: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 9999, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9 }}>{it.author[0]}</div>
                    {it.author}
                  </span>
                  <span style={{ fontFamily: 'ui-monospace,monospace' }}>{it.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="message-circle" size={12} color={V1S.faint}/>
                    {it.comments}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section style={V1S.card}>
            <V1SCardHeader title="이번 달 통계" icon="bar-chart" iconColor={V1S.blue}/>
            <div style={{ padding: '14px 22px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['작성된 공지',  4,  V1S.blue],
                ['댓글',         22, V1S.violet],
                ['읽음 / 발송',  '38 / 42', V1S.emerald],
              ].map(([k, v, c], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12.5, color: V1S.muted }}>{k}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: c, fontFeatureSettings: '"tnum"' }}>{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={V1S.card}>
            <V1SCardHeader title="최근 댓글" icon="message-circle" iconColor={V1S.blue}/>
            <div>
              {[
                ['김민지', '채용 일정 관련 문의드립니다.',     '12분 전'],
                ['박서준', '7년 보관 정책 적용 시점이 언제…',  '34분 전'],
                ['오재훈', '점검 시 NFC 태그도 미동작…',         '1시간 전'],
              ].map(([who, text, when], i) => (
                <div key={i} style={{ padding: '12px 22px', borderTop: i === 0 ? 'none' : '1px solid #f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: V1S.ink }}>{who}</span>
                    <span style={{ fontSize: 11, color: V1S.faint }}>{when}</span>
                  </div>
                  <div style={{ fontSize: 12, color: V1S.muted, lineHeight: 1.5 }}>{text}</div>
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
// P9 — 휴지통 (Trash)
// ============================================================
function P9Trash({ onNavigate }) {
  const items = [
    { id: 't1', title: '구_채용_공고_2024년.pdf',          dept: '인사팀',   parent: '채용 문서',    sub: '채용 서류 보관함', deletedBy: '김민지', deletedAt: '2026-05-19 14:32', daysLeft: 27 },
    { id: 't2', title: '폐기_매출보고서_2023.pdf',          dept: '회계팀',   parent: '정산 문서',    sub: '월간 정산 보관함', deletedBy: '강민호', deletedAt: '2026-05-18 09:11', daysLeft: 26 },
    { id: 't3', title: '구_API_명세서_v1.0.pdf',            dept: '개발팀',   parent: '기술 문서',    sub: 'API 명세 보관함',  deletedBy: '오재훈', deletedAt: '2026-05-15 16:48', daysLeft: 23 },
    { id: 't4', title: '폐기_레퍼런스_체크_v1.pdf',         dept: '인사팀',   parent: '근로계약',    sub: '레퍼런스 체크',     deletedBy: '박서준', deletedAt: '2026-05-10 11:22', daysLeft: 18 },
    { id: 't5', title: '구_광고_브리프_2024_Q4.pdf',        dept: '마케팅팀', parent: 'Q4 캠페인',   sub: '광고 캠페인 보관함', deletedBy: '최지원', deletedAt: '2026-05-04 13:09', daysLeft: 12 },
    { id: 't6', title: '폐기_정산보고서_2024_12.pdf',       dept: '회계팀',   parent: '정산 문서',    sub: '월간 정산 보관함', deletedBy: '강민호', deletedAt: '2026-04-28 10:20', daysLeft:  6 },
  ];
  return (
    <V1Shell currentPath="/admin/trash" onNavigate={onNavigate}>
      <V1SPageHeader
        title="휴지통"
        sub="삭제된 문서는 30일 후 영구 삭제됩니다. 그 전에 복구할 수 있습니다."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <V1SOutlineButton icon="search">검색</V1SOutlineButton>
            <V1SOutlineButton icon="trash" style={{ color: V1S.red, borderColor: '#fecaca' }}>휴지통 비우기</V1SOutlineButton>
          </div>
        }
      />

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: V1S.amber + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name="bell" size={16} color={V1S.amber}/>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>1건의 문서가 7일 이내 영구 삭제 예정입니다.</div>
          <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>복구가 필요한 문서가 있다면 지금 복구해주세요.</div>
        </div>
      </div>

      <section style={V1S.card}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="trash" size={18} color={V1S.blue}/>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>삭제된 문서</h2>
            <span style={{ fontSize: 12, color: V1S.blueInk, background: V1S.blueSoft, padding: '2px 8px', borderRadius: 9999, fontWeight: 600 }}>총 {items.length}건</span>
          </div>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.9fr 0.9fr 1fr 90px 140px', gap: 12, padding: '10px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
            {['문서 제목','부서','대분류','세부 스토리지','삭제자','삭제 일시','잔여 / 작업'].map((h, i) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: V1S.muted, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: i === 6 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {items.map((it, i) => (
            <div key={it.id} style={{
              display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.9fr 0.9fr 1fr 90px 140px',
              gap: 12, padding: '12px 24px', alignItems: 'center',
              borderBottom: i === items.length - 1 ? 'none' : '1px solid #f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Icon name="file-text" size={13} color={V1S.faint}/>
                </div>
                <span style={{ fontSize: 13, color: V1S.muted, textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
              </div>
              <div style={{ fontSize: 12.5, color: V1S.muted }}>{it.dept}</div>
              <div style={{ fontSize: 12.5, color: V1S.muted }}>{it.parent}</div>
              <div style={{ fontSize: 12.5, color: V1S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.sub}</div>
              <div style={{ fontSize: 12.5, color: V1S.muted }}>{it.deletedBy}</div>
              <div style={{ fontSize: 11, color: V1S.faint, fontFamily: 'ui-monospace,monospace' }}>{it.deletedAt}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace,monospace',
                  color: it.daysLeft < 10 ? '#b91c1c' : V1S.muted,
                }}>D−{it.daysLeft}</span>
                <button style={{ ...ghostIconBtn3, color: V1S.blue }} title="복구"><Icon name="upload" size={14} color={V1S.blue} style={{ transform: 'rotate(180deg)' }}/></button>
                <button style={ghostIconBtn3} title="영구 삭제"><Icon name="x" size={14} color={V1S.red}/></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </V1Shell>
  );
}

// ============================================================
// P10 — 공유받은 문서함 (Shared Documents)
// ============================================================
function P10Shared({ onNavigate }) {
  const items = [
    { id: 's1', title: '2025_상반기_신입사원_채용_공고문.pdf',  sharedBy: '김민지', dept: '인사팀', sharedAt: '2026-05-19', memo: '신입 채용 일정 확정안 검토 부탁드립니다.',     unread: true },
    { id: 's2', title: '근로계약서_표준양식_v3.pdf',             sharedBy: '박서준', dept: '인사팀', sharedAt: '2026-05-18', memo: '계약서 최종 검토 부탁드려요.',                  unread: true },
    { id: 's3', title: 'TrayStorage_v2_API_Spec.pdf',           sharedBy: '오재훈', dept: '개발팀', sharedAt: '2026-05-17', memo: 'v2.4 출시 전 API 명세 리뷰',                    unread: false },
    { id: 's4', title: '2026_03월_정산보고서.pdf',               sharedBy: '강민호', dept: '회계팀', sharedAt: '2026-05-15', memo: '3월 정산 결과 확인 바랍니다.',                  unread: false },
    { id: 's5', title: '경력직_채용_평가표.pdf',                 sharedBy: '이수현', dept: '인사팀', sharedAt: '2026-05-12', memo: '평가표 양식 합의 후 다음 주부터 적용 예정',     unread: false },
  ];
  return (
    <V1Shell currentPath="/admin/shared" onNavigate={onNavigate}>
      <V1SPageHeader
        title="공유받은 문서함"
        sub="다른 팀원이 나에게 공유한 문서입니다."
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <V1SOutlineButton icon="search">검색</V1SOutlineButton>
            <V1SOutlineButton>읽지 않음만 보기</V1SOutlineButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <V1SStatTile title="받은 문서"    value={5}  delta="+2"  icon="share-2"   color={V1S.blue}    data={[1,1,2,3,3,4,5,5]}/>
        <V1SStatTile title="읽지 않음"    value={2}  delta="+2"  icon="bell"      color={V1S.violet}  data={[0,0,0,1,1,2,2,2]}/>
        <V1SStatTile title="공유자"       value={5}  delta="+1"  icon="users"     color={V1S.emerald} data={[3,3,4,4,4,5,5,5]}/>
        <V1SStatTile title="이번 주"      value={3}  delta="+3"  icon="clock"     color={V1S.amber}   data={[0,0,1,1,2,2,3,3]}/>
      </div>

      <section style={V1S.card}>
        <V1SCardHeader
          title="공유 문서 목록"
          icon="share-2"
          iconColor={V1S.blue}
          sub={`총 ${items.length}건이 공유되었습니다.`}
          action={<V1SOutlineButton>정렬: 최신순</V1SOutlineButton>}
        />
        <div>
          {items.map((it, i) => (
            <div key={it.id} style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr 110px 110px',
              gap: 16, padding: '16px 24px', alignItems: 'center',
              borderBottom: i === items.length - 1 ? 'none' : '1px solid #f1f5f9',
              background: it.unread ? V1S.blueSoft : 'transparent',
              position: 'relative',
            }}>
              {it.unread && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: V1S.blue }}/>}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: V1S.blueSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name="file-text" size={18} color={V1S.blueInk}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: V1S.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                  {it.unread && <V1SChip variant="blue">NEW</V1SChip>}
                </div>
                <div style={{ fontSize: 12, color: V1S.muted, marginBottom: 4 }}>
                  <strong style={{ fontWeight: 600, color: V1S.ink }}>{it.sharedBy}</strong> ({it.dept})님이 공유 · <span style={{ fontFamily: 'ui-monospace,monospace' }}>{it.sharedAt}</span>
                </div>
                <div style={{ fontSize: 12, color: V1S.muted, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="message-circle" size={11} color={V1S.faint}/>
                  "{it.memo}"
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <V1SOutlineButton icon="eye" style={{ height: 32, padding: '0 10px', fontSize: 12 }}>미리보기</V1SOutlineButton>
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <V1SOutlineButton icon="download" style={{ height: 32, padding: '0 10px', fontSize: 12 }}>다운로드</V1SOutlineButton>
              </div>
            </div>
          ))}
        </div>
      </section>
    </V1Shell>
  );
}

Object.assign(window, { P8Announcements, P9Trash, P10Shared });
