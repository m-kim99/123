export const PrivacyPolicyContent = () => (
  <>
    <p className="text-xs text-slate-500">제정 2026.02.09. 시행 2026.02.09.</p>

    <p>주식회사 인포크리에이티브(이하 "회사")는 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」(이하 "정보통신망법") 등 관련 법령에 따라 이용자의 개인정보를 보호하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>

    <h3 className="font-semibold text-slate-900">제1조 (개인정보의 수집 항목 및 수집 방법)</h3>
    <p>① 회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">구분</th><th className="border border-slate-300 p-2 text-left">수집 항목</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">필수 항목</td><td className="border border-slate-300 p-2">이름, 이메일 주소, 비밀번호, 휴대전화번호, 소속 회사명, 부서명</td></tr>
        <tr><td className="border border-slate-300 p-2">선택 항목</td><td className="border border-slate-300 p-2">프로필 이미지</td></tr>
        <tr><td className="border border-slate-300 p-2">자동 수집 항목</td><td className="border border-slate-300 p-2">IP 주소, 기기 정보, 접속 로그, 서비스 이용 기록, 쿠키</td></tr>
        <tr><td className="border border-slate-300 p-2">서비스 이용 과정에서 수집</td><td className="border border-slate-300 p-2">업로드된 문서 파일 및 이미지, AI OCR 처리 결과, 문서 검색 기록, AI 질의응답 내역</td></tr>
      </tbody>
    </table>
    <p>② 개인정보 수집 방법</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>회원가입 시 이용자의 직접 입력</li>
      <li>서비스 이용 과정에서 자동 생성·수집</li>
      <li>고객센터 문의 과정에서 수집</li>
    </ul>

    <h3 className="font-semibold text-slate-900">제2조 (개인정보의 수집 및 이용 목적)</h3>
    <p>회사는 수집한 개인정보를 다음의 목적을 위해 이용합니다.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">이용 목적</th><th className="border border-slate-300 p-2 text-left">세부 내용</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">회원 관리</td><td className="border border-slate-300 p-2">회원가입 및 본인확인, 회원자격 유지·관리, 서비스 부정이용 방지, 고지사항 전달</td></tr>
        <tr><td className="border border-slate-300 p-2">서비스 제공</td><td className="border border-slate-300 p-2">문서 저장·관리, AI OCR 처리, AI 기반 검색·분석·질의응답 기능 제공, NFC 연동 서비스 제공</td></tr>
        <tr><td className="border border-slate-300 p-2">서비스 개선</td><td className="border border-slate-300 p-2">서비스 품질 향상, 신규 기능 개발, 통계 분석</td></tr>
        <tr><td className="border border-slate-300 p-2">고객 지원</td><td className="border border-slate-300 p-2">문의사항 처리, 불만 접수 및 처리, 공지사항 전달</td></tr>
        <tr><td className="border border-slate-300 p-2">마케팅 및 광고</td><td className="border border-slate-300 p-2">신규 서비스 안내, 이벤트 정보 제공(동의 시에만)</td></tr>
      </tbody>
    </table>

    <h3 className="font-semibold text-slate-900">제3조 (개인정보의 보유 및 이용 기간)</h3>
    <p>① 회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 다만, 관련 법령에 따라 보존할 필요가 있는 경우에는 아래와 같이 보관합니다.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">보존 항목</th><th className="border border-slate-300 p-2 text-left">보존 기간</th><th className="border border-slate-300 p-2 text-left">보존 근거</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">계약 또는 청약철회 등에 관한 기록</td><td className="border border-slate-300 p-2">5년</td><td className="border border-slate-300 p-2">전자상거래법</td></tr>
        <tr><td className="border border-slate-300 p-2">대금결제 및 재화 등의 공급에 관한 기록</td><td className="border border-slate-300 p-2">5년</td><td className="border border-slate-300 p-2">전자상거래법</td></tr>
        <tr><td className="border border-slate-300 p-2">소비자의 불만 또는 분쟁처리에 관한 기록</td><td className="border border-slate-300 p-2">3년</td><td className="border border-slate-300 p-2">전자상거래법</td></tr>
        <tr><td className="border border-slate-300 p-2">서비스 이용 기록, 접속 로그</td><td className="border border-slate-300 p-2">3개월</td><td className="border border-slate-300 p-2">통신비밀보호법</td></tr>
        <tr><td className="border border-slate-300 p-2">백업 데이터</td><td className="border border-slate-300 p-2">1년</td><td className="border border-slate-300 p-2">내부 정책</td></tr>
        <tr><td className="border border-slate-300 p-2">AI 처리 로그</td><td className="border border-slate-300 p-2">1년</td><td className="border border-slate-300 p-2">내부 정책</td></tr>
      </tbody>
    </table>
    <p>② 휴면회원 전환 시 개인정보는 별도 분리하여 보관하며, 휴면 전환 후 3년이 경과하면 완전히 삭제됩니다.</p>

    <h3 className="font-semibold text-slate-900">제4조 (개인정보의 제3자 제공)</h3>
    <p>① 회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>이용자가 사전에 동의한 경우</li>
      <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
    </ul>
    <p>② 현재 회사는 이용자의 개인정보를 제3자에게 제공하고 있지 않습니다.</p>

    <h3 className="font-semibold text-slate-900">제5조 (개인정보의 처리 위탁)</h3>
    <p>① 회사는 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">수탁업체</th><th className="border border-slate-300 p-2 text-left">위탁 업무 내용</th><th className="border border-slate-300 p-2 text-left">보유 및 이용 기간</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Supabase Inc.</td><td className="border border-slate-300 p-2">클라우드 서버 호스팅 및 데이터 저장</td><td className="border border-slate-300 p-2">회원 탈퇴 시까지 또는 위탁 계약 종료 시</td></tr>
        <tr><td className="border border-slate-300 p-2">Google LLC</td><td className="border border-slate-300 p-2">AI 서비스(Gemini) 제공</td><td className="border border-slate-300 p-2">서비스 이용 기간</td></tr>
        <tr><td className="border border-slate-300 p-2">네이버 주식회사</td><td className="border border-slate-300 p-2">AI OCR(클로바 OCR) 서비스 제공</td><td className="border border-slate-300 p-2">서비스 이용 기간</td></tr>
      </tbody>
    </table>
    <p>② 회사는 위탁계약 체결 시 「개인정보 보호법」에 따라 위탁업무 수행 목적 외 개인정보 처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제6조 (개인정보의 국외 이전)</h3>
    <p>① 회사는 서비스 제공을 위해 이용자의 개인정보를 국외로 이전하고 있습니다.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">항목</th><th className="border border-slate-300 p-2 text-left">내용</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">이전받는 자</td><td className="border border-slate-300 p-2">Supabase Inc., Google LLC</td></tr>
        <tr><td className="border border-slate-300 p-2">이전되는 국가</td><td className="border border-slate-300 p-2">미국 등 클라우드 서버 소재지(구체적 위치는 변경될 수 있음)</td></tr>
        <tr><td className="border border-slate-300 p-2">이전 일시 및 방법</td><td className="border border-slate-300 p-2">서비스 이용 시 네트워크를 통한 전송</td></tr>
        <tr><td className="border border-slate-300 p-2">이전되는 개인정보 항목</td><td className="border border-slate-300 p-2">회원정보, 업로드 문서, AI 처리 데이터</td></tr>
        <tr><td className="border border-slate-300 p-2">이전 목적</td><td className="border border-slate-300 p-2">클라우드 기반 서비스 제공, AI 서비스 제공</td></tr>
        <tr><td className="border border-slate-300 p-2">보유 및 이용 기간</td><td className="border border-slate-300 p-2">회원 탈퇴 시까지 또는 위탁 계약 종료 시</td></tr>
      </tbody>
    </table>
    <p>② 이용자는 개인정보의 국외 이전을 거부할 수 있으며, 거부 시 서비스 이용이 제한될 수 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제7조 (AI 서비스에서의 개인정보 처리)</h3>
    <p>① 회사는 AI 서비스 제공을 위해 이용자가 업로드한 문서에서 텍스트를 추출하고 분석합니다.</p>
    <p>② AI 서비스에서 처리되는 개인정보 항목</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>업로드된 문서 파일 및 이미지</li>
      <li>AI OCR로 추출된 텍스트 데이터</li>
      <li>AI 질의응답 내역</li>
      <li>문서 검색 기록</li>
    </ul>
    <p>③ AI 처리 과정</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>이용자가 문서를 업로드하면 AI OCR(네이버 클로바 OCR)을 통해 텍스트가 추출됩니다.</li>
      <li>추출된 텍스트는 Supabase 서버에 저장됩니다.</li>
      <li>이용자의 질의에 대해 Google Gemini API를 통해 응답이 생성됩니다.</li>
    </ul>
    <p>④ 회사는 현재 이용자의 개인정보를 AI 모델 학습에 활용하지 않습니다. 향후 AI 학습 목적으로 활용하고자 하는 경우, 이용자의 명시적 동의를 받습니다.</p>

    <h3 className="font-semibold text-slate-900">제8조 (개인정보의 파기)</h3>
    <p>① 회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
    <p>② 파기 절차</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정 기간 저장된 후 혹은 즉시 파기됩니다.</li>
      <li>이 때, 별도의 DB로 옮겨진 개인정보는 법률에 의한 경우가 아니고서는 다른 목적으로 이용되지 않습니다.</li>
    </ul>
    <p>③ 파기 방법</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>전자적 파일 형태의 정보: 복구가 불가능한 방법으로 영구 삭제</li>
      <li>종이에 기록된 개인정보: 분쇄기로 분쇄하거나 소각</li>
    </ul>

    <h3 className="font-semibold text-slate-900">제9조 (이용자의 권리·의무 및 행사방법)</h3>
    <p>① 이용자는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>개인정보 열람 요구</li>
      <li>오류 등이 있을 경우 정정 요구</li>
      <li>삭제 요구</li>
      <li>처리정지 요구</li>
    </ul>
    <p>② 제1항에 따른 권리 행사는 회사에 대해 서면, 전자우편, 고객센터를 통하여 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.</p>
    <p>③ 제1항에 따른 권리 행사는 이용자의 법정대리인이나 위임을 받은 자 등 대리인을 통하여 하실 수도 있습니다. 이 경우 「개인정보 처리 방법에 관한 고시」 별지 제11호 서식에 따른 위임장을 제출하셔야 합니다.</p>
    <p>④ 개인정보 열람 및 처리정지 요구는 「개인정보 보호법」 제35조 제4항, 제37조 제2항에 의하여 이용자의 권리가 제한될 수 있습니다.</p>
    <p>⑤ 개인정보의 정정 및 삭제 요구는 다른 법령에서 그 개인정보가 수집 대상으로 명시되어 있는 경우에는 그 삭제를 요구할 수 없습니다.</p>
    <p>⑥ 회사는 이용자 권리에 따른 열람의 요구, 정정·삭제의 요구, 처리정지의 요구 시 열람 등 요구를 한 자가 본인이거나 정당한 대리인인지를 확인합니다.</p>

    <h3 className="font-semibold text-slate-900">제10조 (AI 처리에 관한 이용자의 권리)</h3>
    <p>① 이용자는 AI 서비스가 제공한 결과에 대하여 다음의 권리를 행사할 수 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>설명 요청권: AI 처리 결과에 대한 설명을 요청할 권리</li>
      <li>이의제기권: 명백한 오류 또는 부적절한 결과에 대하여 이의를 제기할 권리</li>
      <li>인적 개입 요청권: 자동화된 처리에 대한 인적 검토를 요청할 권리</li>
    </ul>
    <p>② 제1항의 권리는 고객센터(support@traystorage.net, 02-333-7334)를 통해 행사할 수 있습니다.</p>
    <p>③ 회사는 기술적으로 가능한 범위 내에서 이용자의 요청을 검토하고 필요한 조치를 취합니다.</p>

    <h3 className="font-semibold text-slate-900">제11조 (개인정보의 안전성 확보 조치)</h3>
    <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>관리적 조치:</strong> 내부관리계획 수립·시행, 개인정보 취급 직원의 최소화 및 교육</li>
      <li><strong>기술적 조치:</strong> 개인정보처리시스템 접근 제한, 암호화 기술 적용, 보안프로그램 설치 및 갱신</li>
      <li><strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근 통제</li>
      <li><strong>데이터 암호화:</strong> 비밀번호는 암호화 저장, 전송 데이터는 SSL/TLS 암호화</li>
      <li><strong>접근 권한 관리:</strong> 개인정보에 접근할 수 있는 담당자를 최소화하고, 접근 권한을 차등 부여</li>
    </ul>

    <h3 className="font-semibold text-slate-900">제12조 (쿠키의 설치·운영 및 거부)</h3>
    <p>① 회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.</p>
    <p>② 쿠키의 사용 목적</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>이용자의 접속 빈도나 방문 시간 등을 분석하여 서비스 이용에 대한 통계 수집</li>
      <li>이용자의 관심 분야 파악 및 맞춤형 서비스 제공</li>
      <li>로그인 상태 유지</li>
    </ul>
    <p>③ 쿠키 설치·운영 및 거부: 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹 브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 모든 쿠키의 저장을 거부할 수 있습니다.</p>
    <p>④ 쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제13조 (개인정보 보호책임자)</h3>
    <p>① 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <tbody>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">성명</td><td className="border border-slate-300 p-2">정도천</td></tr>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">직책</td><td className="border border-slate-300 p-2">대표이사</td></tr>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">연락처</td><td className="border border-slate-300 p-2">02-333-7334 / support@traystorage.net</td></tr>
      </tbody>
    </table>
    <p>② 이용자는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제14조 (권익침해 구제방법)</h3>
    <p>이용자는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
      <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
      <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
      <li>경찰청: (국번없이) 182 (ecrm.cyber.go.kr)</li>
    </ul>

    <h3 className="font-semibold text-slate-900">제15조 (개인정보 처리방침의 변경)</h3>
    <p>① 이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
    <p>② 이용자에게 불리한 중요한 내용의 변경이 있는 경우에는 최소 30일 전에 공지하고 전자우편 등으로 개별 통지합니다.</p>

    <h3 className="font-semibold text-slate-900">부칙</h3>
    <p><strong>제1조 (시행일)</strong> 이 개인정보 처리방침은 2026년 2월 9일부터 시행합니다.</p>

    <h3 className="font-semibold text-slate-900">[회사 정보]</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>상호: 주식회사 인포크리에이티브</li>
      <li>대표자: 정도천</li>
      <li>주소: 서울시 금천구 가산디지털2로 43-14 가산한화비즈메트로2차 708호, 709호</li>
      <li>사업자등록번호: 841-86-03004</li>
      <li>고객센터: 02-333-7334</li>
      <li>이메일: support@traystorage.net</li>
    </ul>
  </>
);

export default PrivacyPolicyContent;
