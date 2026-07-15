import { useTranslation } from 'react-i18next';

const PrivacyKo = () => (
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
        <tr><td className="border border-slate-300 p-2">유료 결제 시 수집</td><td className="border border-slate-300 p-2">결제 정보(결제 수단, 카드사명, 결제 승인 정보, 결제 일시 등)</td></tr>
      </tbody>
    </table>
    <p>② 개인정보 수집 방법</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>회원가입 시 이용자의 직접 입력</li>
      <li>서비스 이용 과정에서 자동 생성·수집</li>
      <li>고객센터 문의 과정에서 수집</li>
    </ul>
    <p>③ 회사는 결제 정보를 직접 저장하지 않으며, 결제대행사인 이노페이(주식회사 이노페이)를 통하여 안전하게 처리합니다.</p>

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
        <tr><td className="border border-slate-300 p-2">OpenAI, L.L.C.</td><td className="border border-slate-300 p-2">AI 서비스(GPT) 제공</td><td className="border border-slate-300 p-2">서비스 이용 기간</td></tr>
        <tr><td className="border border-slate-300 p-2">네이버 주식회사</td><td className="border border-slate-300 p-2">AI OCR(클로바 OCR) 서비스 제공</td><td className="border border-slate-300 p-2">서비스 이용 기간</td></tr>
        <tr><td className="border border-slate-300 p-2">주식회사 이노페이(이노페이)</td><td className="border border-slate-300 p-2">신용카드 결제, 계좌이체, 가상계좌 등 결제 처리 및 결제 도용 방지</td><td className="border border-slate-300 p-2">관련 법령에 따른 보존기간 또는 위탁 계약 종료 시</td></tr>
      </tbody>
    </table>
    <p>② 회사는 위탁계약 체결 시 「개인정보 보호법」에 따라 위탁업무 수행 목적 외 개인정보 처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제6조 (개인정보의 국외 이전)</h3>
    <p>① 회사는 서비스 제공을 위해 이용자의 개인정보를 국외로 이전하고 있습니다.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">항목</th><th className="border border-slate-300 p-2 text-left">내용</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">이전받는 자</td><td className="border border-slate-300 p-2">Supabase Inc., OpenAI, L.L.C.</td></tr>
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
      <li>이용자의 질의에 대해 OpenAI GPT API를 통해 응답이 생성됩니다.</li>
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

const PrivacyEn = () => (
  <>
    <p className="text-xs text-slate-500">Enacted: February 9, 2026 | Effective: February 9, 2026</p>

    <p>InfoCreative Co., Ltd. (hereinafter "Company") operates this Privacy Policy in accordance with Article 30 of the Personal Information Protection Act to protect the personal information of users (hereinafter "Data Subjects") who use Tray Storage Connect, the Company's service, and to promptly and smoothly address related grievances.</p>

    <h3 className="font-semibold text-slate-900">Article 1 (Purposes of Collection and Use of Personal Information)</h3>
    <p>① The Company collects the minimum personal information necessary for service provision and collects personal information with the Data Subject's consent for the following purposes. Personal information collected shall not be used for purposes other than the following, and if the purpose of use changes, the Company shall take necessary measures such as obtaining separate consent from the Data Subject in accordance with Article 18 of the Personal Information Protection Act.</p>
    <p>② For the provision of AI OCR and AI-based document search services, the Company may process documents registered by Members, voice command data, and usage records, which shall be used only within the scope of service provision purposes. The Company does not use Members' documents as general training data for AI models; however, it may collect and use usage patterns and feedback data, excluding sensitive information within documents, for the purpose of AI model improvement to enhance service quality.</p>
    <p>③ The Company collects and uses personal information for the following purposes:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Purpose</th><th className="border border-slate-300 p-2 text-left">Details</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">1. Membership registration and management</td><td className="border border-slate-300 p-2">Identity verification and authentication for membership services; prevention of duplicate and fraudulent registration; maintenance and restriction of membership; various notifications and announcements; restriction of membership for children under 14 years of age</td></tr>
        <tr><td className="border border-slate-300 p-2">2. Service provision and use</td><td className="border border-slate-300 p-2">Document registration and management; AI OCR processing; document search and information provision via AI chatbot; voice command processing; NFC tag-based document management; department-level access permission management; provision of document statistics</td></tr>
        <tr><td className="border border-slate-300 p-2">3. Payment and settlement</td><td className="border border-slate-300 p-2">Payment processing for paid services; invoice issuance; payment history management</td></tr>
        <tr><td className="border border-slate-300 p-2">4. Grievance handling</td><td className="border border-slate-300 p-2">Verification of Member grievances; identity confirmation; notification of processing results and follow-up</td></tr>
        <tr><td className="border border-slate-300 p-2">5. Marketing and promotions</td><td className="border border-slate-300 p-2">Provision of event and promotional information and participation opportunities (upon optional consent)</td></tr>
      </tbody>
    </table>
    <p>④ Notwithstanding Paragraph 1, the Company may collect and use personal information without the Data Subject's consent where specifically provided for by law, or where personal information is inevitably generated in the course of the Data Subject's use of the Service.</p>

    <h3 className="font-semibold text-slate-900">Article 2 (Items of Personal Information Collected and Used)</h3>
    <p>① The items of personal information collected and used by the Company are as follows:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Collection Purpose</th><th className="border border-slate-300 p-2 text-left">Details</th><th className="border border-slate-300 p-2 text-left">Items Collected</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2" rowSpan={5}>1. Membership registration and management</td><td className="border border-slate-300 p-2">Web registration – Administrator</td><td className="border border-slate-300 p-2">Company name, name, email, mobile phone number (identity verification), password</td></tr>
        <tr><td className="border border-slate-300 p-2">Web registration – Team Member</td><td className="border border-slate-300 p-2">Company name, department name, name, email, mobile phone number (identity verification), password</td></tr>
        <tr><td className="border border-slate-300 p-2">Registration via Kakao account</td><td className="border border-slate-300 p-2">Required: Kakao account (ID), password</td></tr>
        <tr><td className="border border-slate-300 p-2">Registration via Google account</td><td className="border border-slate-300 p-2">Required: Name, email address</td></tr>
        <tr><td className="border border-slate-300 p-2">Registration via Naver / Apple account</td><td className="border border-slate-300 p-2">Required: ID, password</td></tr>
        <tr><td className="border border-slate-300 p-2" rowSpan={2}>2. Service provision</td><td className="border border-slate-300 p-2">AI Service use</td><td className="border border-slate-300 p-2">Uploaded documents (images, PDFs, etc.); voice command data; document search history; AI chatbot conversation logs; NFC tag information; document storage location info</td></tr>
        <tr><td className="border border-slate-300 p-2">Use of supplementary features</td><td className="border border-slate-300 p-2">Optional: Additional input when using supplementary features</td></tr>
        <tr><td className="border border-slate-300 p-2">3. Payment</td><td className="border border-slate-300 p-2">Paid service payment</td><td className="border border-slate-300 p-2">Credit card information (card number, expiration date, first 2 digits of PIN); bank account information; payment history</td></tr>
        <tr><td className="border border-slate-300 p-2">4. Grievance and complaint handling</td><td className="border border-slate-300 p-2">1:1 inquiries, etc.</td><td className="border border-slate-300 p-2">Required: Name, email address, contact information, inquiry details</td></tr>
        <tr><td className="border border-slate-300 p-2">5. Marketing (optional consent)</td><td className="border border-slate-300 p-2">Events and promotions</td><td className="border border-slate-300 p-2">Email address; mobile phone number (upon SMS consent)</td></tr>
        <tr><td className="border border-slate-300 p-2">6. Automatically collected information</td><td className="border border-slate-300 p-2">Automatically generated during Service use</td><td className="border border-slate-300 p-2">Access logs, usage records, device information, IP address, cookies</td></tr>
      </tbody>
    </table>
    <p>② The Company does not accept membership registration from children under the age of 14.</p>
    <p>③ The Company does not directly store payment information and processes such information securely through the payment service provider, Innopay Co., Ltd. (Innopay).</p>

    <h3 className="font-semibold text-slate-900">Article 3 (Retention and Use Period of Personal Information)</h3>
    <p>① The Company processes personal information within the retention and use period consented to at the time of collection, or within the retention and use period prescribed by applicable laws.</p>
    <p>② The retention and use periods for personal information processed by the Company are as follows:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Category</th><th className="border border-slate-300 p-2 text-left">Items</th><th className="border border-slate-300 p-2 text-left">Period</th><th className="border border-slate-300 p-2 text-left">Exceptions</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Membership registration and management</td><td className="border border-slate-300 p-2">Items collected at registration</td><td className="border border-slate-300 p-2">Until membership withdrawal or cancellation</td><td className="border border-slate-300 p-2">Retained for 2 years after withdrawal to verify re-registration or prevent fraudulent registration</td></tr>
        <tr><td className="border border-slate-300 p-2" rowSpan={3}>Service use</td><td className="border border-slate-300 p-2">Uploaded documents and related data</td><td className="border border-slate-300 p-2">Until membership withdrawal or cancellation</td><td className="border border-slate-300 p-2">—</td></tr>
        <tr><td className="border border-slate-300 p-2">Voice command data</td><td className="border border-slate-300 p-2">1 year from date of collection</td><td className="border border-slate-300 p-2">For AI service quality improvement purposes</td></tr>
        <tr><td className="border border-slate-300 p-2">Feedback data for AI model improvement</td><td className="border border-slate-300 p-2">1 year from date of collection</td><td className="border border-slate-300 p-2">Excluding sensitive information; anonymized</td></tr>
        <tr><td className="border border-slate-300 p-2">Payment information</td><td className="border border-slate-300 p-2">Payment-related records</td><td className="border border-slate-300 p-2">5 years after membership withdrawal</td><td className="border border-slate-300 p-2">Preserved pursuant to the Act on Consumer Protection in Electronic Commerce, Etc.</td></tr>
        <tr><td className="border border-slate-300 p-2">Grievance handling</td><td className="border border-slate-300 p-2">Information collected at time of grievance</td><td className="border border-slate-300 p-2">Until the grievance or dispute is resolved</td><td className="border border-slate-300 p-2">Records of processing and results retained for a minimum of 3 years</td></tr>
        <tr><td className="border border-slate-300 p-2">Information and communications records</td><td className="border border-slate-300 p-2">Service access and usage logs, search records</td><td className="border border-slate-300 p-2">Until membership withdrawal or cancellation</td><td className="border border-slate-300 p-2">Retained for a minimum of 3 months pursuant to the Protection of Communications Secrets Act</td></tr>
      </tbody>
    </table>

    <h3 className="font-semibold text-slate-900">Article 4 (Provision of Personal Information to Third Parties)</h3>
    <p>① As a general rule, the Company does not provide the Data Subject's personal information to third parties. When the Company provides personal information to a third party, it shall inform the Data Subject of the recipient, the purpose of use by the recipient, the items of personal information provided, the retention and use period, and obtain consent.</p>
    <p>② Notwithstanding Paragraph 1, personal information may be provided to third parties without the Data Subject's consent in the following cases:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Where specifically provided for by law;</li>
      <li>Where government agencies, public institutions, investigative agencies, or courts request the provision of information based on applicable laws;</li>
      <li>Where pseudonymized information is provided for statistical compilation, scientific research, or public interest record preservation;</li>
      <li>In the event of emergencies such as disasters, infectious diseases, incidents or accidents posing imminent danger to life or bodily safety, or imminent property loss.</li>
    </ul>

    <h3 className="font-semibold text-slate-900">Article 5 (Entrustment of Personal Information Processing)</h3>
    <p>① The Company entrusts the processing of personal information to the following external service providers for smooth service provision:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Entrusted Company</th><th className="border border-slate-300 p-2 text-left">Entrusted Tasks</th><th className="border border-slate-300 p-2 text-left">Retention and Use Period</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Supabase, Inc.</td><td className="border border-slate-300 p-2">Cloud server provision and data storage</td><td className="border border-slate-300 p-2">Until termination of entrustment contract or membership withdrawal</td></tr>
        <tr><td className="border border-slate-300 p-2">OpenAI, L.L.C.</td><td className="border border-slate-300 p-2">AI-based document analysis service; AI voice recognition service</td><td className="border border-slate-300 p-2">Until termination of entrustment contract or membership withdrawal (voice data: 1 year from collection)</td></tr>
        <tr><td className="border border-slate-300 p-2">Naver Cloud Platform</td><td className="border border-slate-300 p-2">AI OCR service</td><td className="border border-slate-300 p-2">Until termination of entrustment contract or membership withdrawal</td></tr>
        <tr><td className="border border-slate-300 p-2">Kakao Corporation</td><td className="border border-slate-300 p-2">Sending notification messages (KakaoTalk alerts, SMS, etc.)</td><td className="border border-slate-300 p-2">Until message delivery is completed</td></tr>
        <tr><td className="border border-slate-300 p-2">Innopay Co., Ltd. (Innopay)</td><td className="border border-slate-300 p-2">Payment processing and payment information handling</td><td className="border border-slate-300 p-2">Until termination of entrustment contract or retention period under applicable laws</td></tr>
      </tbody>
    </table>
    <p>② When entering into entrustment contracts, the Company specifies in the contract the prohibition of processing personal information beyond the scope of the entrusted task, technical and managerial safeguards, restrictions on sub-entrustment, supervision of the entrusted party, and liability including damages, in accordance with Article 26 of the Personal Information Protection Act.</p>
    <p>③ If the content of the entrusted tasks or the entrusted party changes, the Company shall promptly disclose such changes through this Privacy Policy.</p>

    <h3 className="font-semibold text-slate-900">Article 6 (Cross-Border Transfer of Personal Information)</h3>
    <p>① The Company transfers Data Subjects' personal information overseas for the purpose of providing the Service.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Item</th><th className="border border-slate-300 p-2 text-left">Details</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Recipient</td><td className="border border-slate-300 p-2">Supabase, Inc.; OpenAI, L.L.C.</td></tr>
        <tr><td className="border border-slate-300 p-2">Recipient country</td><td className="border border-slate-300 p-2">United States, among other locations where cloud servers are located (specific locations may change)</td></tr>
        <tr><td className="border border-slate-300 p-2">Date and method of transfer</td><td className="border border-slate-300 p-2">Transmitted over the network at the time the Service is used</td></tr>
        <tr><td className="border border-slate-300 p-2">Items transferred</td><td className="border border-slate-300 p-2">Member information, uploaded documents, AI processing data</td></tr>
        <tr><td className="border border-slate-300 p-2">Purpose of transfer</td><td className="border border-slate-300 p-2">Provision of cloud-based service; provision of AI services</td></tr>
        <tr><td className="border border-slate-300 p-2">Retention and use period</td><td className="border border-slate-300 p-2">Until membership withdrawal or termination of the entrustment agreement</td></tr>
      </tbody>
    </table>
    <p>② Data Subjects may refuse the overseas transfer of their personal information; however, use of the Service may be restricted in the event of such refusal.</p>

    <h3 className="font-semibold text-slate-900">Article 7 (Rights of Data Subjects and Methods of Exercise)</h3>
    <p>① Data Subjects may exercise the following rights at any time with respect to their personal information processed by the Company:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Right to access personal information:</strong> Data Subjects may request access to their personal information held by the Company pursuant to Article 35 of the Personal Information Protection Act. Access may be restricted where prohibited by law or where there is a risk of harm to another person's interests.</li>
      <li><strong>Right to correction and deletion:</strong> Data Subjects may request correction or deletion of their personal information pursuant to Article 36 of the Personal Information Protection Act. However, deletion may not be requested where the personal information is designated as a collection item under applicable laws.</li>
      <li><strong>Right to suspend processing and withdraw consent:</strong> Data Subjects may request suspension of processing of their personal information or withdraw consent pursuant to Article 37 of the Personal Information Protection Act.</li>
    </ul>
    <p>② Data Subjects may exercise the rights under Paragraph 1 by contacting the Chief Privacy Officer (Phone: +82-2-333-7334) or by sending an email to support@traystorage.net, and the Company shall process such requests without delay.</p>
    <p>③ Where a Data Subject requests correction or deletion of erroneous personal information, the Company shall not use or provide such personal information until the correction or deletion is completed.</p>
    <p>④ A legal representative of the Data Subject, or a person delegated by the Data Subject, may exercise such rights on behalf of the Data Subject by submitting a written power of attorney to the Company.</p>
    <p>⑤ <strong>Rights concerning AI-based processing of personal information:</strong> With respect to results provided by AI services, Data Subjects may exercise the following rights:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Right to request explanation:</strong> the right to request an explanation of the purpose and method of AI processing, the impact of the AI processing results on the Data Subject, and the key criteria underlying the AI processing results;</li>
      <li><strong>Right to object:</strong> the right to raise an objection to a clear error or an inappropriate AI processing result;</li>
      <li><strong>Right to request human intervention:</strong> the right to request human review of an automated processing result.</li>
    </ul>
    <p>⑥ The rights under Paragraph 5 may be exercised by written correspondence, email (support@traystorage.net), or by contacting the Chief Privacy Officer by phone (+82-2-333-7334). The Company shall review the request within the technically feasible scope, take necessary measures, and respond within one (1) month of receiving the request.</p>

    <h3 className="font-semibold text-slate-900">Article 8 (Destruction of Personal Information)</h3>
    <p>① The Company shall promptly destroy personal information when it is no longer needed, such as upon achievement of the processing purpose, expiration of the retention and use period, or termination of business.</p>
    <p>② Notwithstanding Paragraph 1, where personal information must continue to be retained under applicable laws, such personal information shall be stored and managed separately from other personal information.</p>
    <p>③ Where the Company is required to retain personal information for a certain period under applicable laws, the Company shall securely retain such information for the applicable period before destruction.</p>
    <p>④ The procedures and methods for destruction of personal information are as follows:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Destruction procedure:</strong> Personal information subject to destruction is selected, and upon approval by the Chief Privacy Officer, the personal information is destroyed.</li>
      <li><strong>Destruction methods:</strong> Personal information recorded and stored in electronic file format is permanently deleted using methods that prevent recovery. Personal information recorded on paper documents is destroyed by shredding, incineration, or masking/perforation of the relevant portions.</li>
    </ul>

    <h3 className="font-semibold text-slate-900">Article 9 (Measures to Ensure the Security of Personal Information)</h3>
    <p>The Company takes the following measures to prevent loss, theft, leakage, falsification, alteration, or damage to Data Subjects' personal information:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Administrative measures:</strong> Establishment and implementation of an internal management plan for personal information protection, regular employee training;</li>
      <li><strong>Technical measures:</strong> Access control and restriction of access rights to personal information processing systems, encryption of unique identification information, installation and periodic updates of security programs;</li>
      <li><strong>Physical measures:</strong> Provision of secure storage facilities or installation of locking devices and access controls for the safe storage of personal information;</li>
      <li><strong>Intrusion prevention:</strong> Establishment of security systems and operation of intrusion prevention systems to prevent personal information breaches caused by hacking or computer viruses;</li>
      <li><strong>Access management:</strong> Minimization of personnel handling personal information and regular training; installation of locking devices and access restrictions for documents and auxiliary storage media.</li>
    </ul>

    <h3 className="font-semibold text-slate-900">Article 10 (Installation, Operation, and Rejection of Automatic Personal Information Collection Devices)</h3>
    <p>① The Company uses "cookies" to store and retrieve usage information in order to provide individually customized services to Data Subjects. Cookies are small pieces of information sent by the server operating the website to the Data Subject's computer browser, and may be stored on the hard disk of the Data Subject's computer.</p>
    <p>② The purposes and details of cookie use are as follows:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Purpose of cookie use:</strong> To provide optimized and customized information to Data Subjects by analyzing visit records, usage patterns, and other data;</li>
      <li><strong>Methods to reject cookie settings:</strong>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Internet Explorer: Tools &gt; Internet Options &gt; Privacy</li>
          <li>Google Chrome: Settings &gt; Advanced Settings &gt; Privacy</li>
          <li>Microsoft Edge: Settings &gt; Cookies and Site Permissions</li>
          <li>Safari: Preferences &gt; Privacy &gt; Cookies and Website Data</li>
        </ul>
      </li>
      <li>Refusing to store cookies may result in difficulties using customized services.</li>
    </ul>

    <h3 className="font-semibold text-slate-900">Article 11 (Notice Regarding AI Service Use and Personal Information Processing)</h3>
    <p>① The Company utilizes artificial intelligence (AI) technology for service quality improvement and provides the following AI services:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Automatic document text extraction via AI OCR (Optical Character Recognition);</li>
      <li>Document search and information provision via AI chatbot;</li>
      <li>AI-based document search via voice commands.</li>
    </ul>
    <p>② In accordance with the Framework Act on Artificial Intelligence, the Company provides the following notices when Data Subjects use AI services: AI technology is applied to the services used by the Data Subject; documents and voice data registered by the Data Subject may be processed during the AI processing; AI processing results are generated by automated algorithms and may contain errors.</p>
    <p>③ The Company does not use documents registered by Members as general training data for AI models. However, the Company may collect and use the following data for service quality improvement: service usage patterns and feedback data; usage records excluding sensitive information within documents (resident registration numbers, bank account information, medical information, etc.). The above data is anonymized or pseudonymized before use and processed so as to prevent identification of specific individuals.</p>
    <p>④ The Company plans to add a feature for automatic masking of sensitive information in the course of future AI model improvement.</p>
    <p>⑤ The AI service providers to whom the Company entrusts AI service provision are as follows: OpenAI, L.L.C. (AI document analysis service, voice recognition service); Naver Cloud Platform (AI OCR).</p>

    <h3 className="font-semibold text-slate-900">Article 12 (Chief Privacy Officer)</h3>
    <p>① The Company has designated the following Chief Privacy Officer, who oversees personal information processing operations and is responsible for handling complaints, remedying damages, and facilitating the exercise of rights by Data Subjects:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <tbody>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">Name</td><td className="border border-slate-300 p-2">Jeong Do-cheon</td></tr>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">Title</td><td className="border border-slate-300 p-2">Chief Executive Officer</td></tr>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">Contact</td><td className="border border-slate-300 p-2">+82-2-333-7334 / support@traystorage.net</td></tr>
      </tbody>
    </table>
    <p>② Data Subjects may direct all inquiries, complaints, damage remedies, and other matters related to personal information protection arising from the use of the Company's services to the Chief Privacy Officer. The Company shall respond to and process Data Subject inquiries without delay.</p>

    <h3 className="font-semibold text-slate-900">Article 13 (Remedies for Infringement of Data Subject Rights)</h3>
    <p>① Data Subjects may contact the following organizations for consultations, damage relief, and other inquiries regarding personal information infringement:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Organization</th><th className="border border-slate-300 p-2 text-left">Contact</th><th className="border border-slate-300 p-2 text-left">Website</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Personal Information Infringement Report Center (operated by KISA)</td><td className="border border-slate-300 p-2">(No area code) 118</td><td className="border border-slate-300 p-2">privacy.kisa.or.kr</td></tr>
        <tr><td className="border border-slate-300 p-2">Personal Information Dispute Mediation Committee</td><td className="border border-slate-300 p-2">(No area code) 1833-6972</td><td className="border border-slate-300 p-2">www.kopico.go.kr</td></tr>
        <tr><td className="border border-slate-300 p-2">Supreme Prosecutors' Office, Cyber Investigation Division</td><td className="border border-slate-300 p-2">(No area code) 1301</td><td className="border border-slate-300 p-2">www.spo.go.kr</td></tr>
        <tr><td className="border border-slate-300 p-2">National Police Agency Cyber Crime Report System (ECRM)</td><td className="border border-slate-300 p-2">(No area code) 182</td><td className="border border-slate-300 p-2">ecrm.cyber.go.kr</td></tr>
      </tbody>
    </table>
    <p>② The Company strives to provide consultations and damage relief for personal information infringement of Data Subjects. If you need consultations, please contact us:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Person in charge: Jeong Do-cheon</li>
      <li>Phone: +82-2-333-7334</li>
      <li>Email: support@traystorage.net</li>
    </ul>

    <h3 className="font-semibold text-slate-900">Article 14 (Amendments to and Enforcement of the Privacy Policy)</h3>
    <p>① When the Company amends this Privacy Policy, it shall post a comparison of the contents before and after the amendment through a notice on the Service website at least seven (7) days prior to the effective date of the amendment so that Data Subjects may be informed. However, in the event of material changes affecting the rights of Data Subjects, notice shall be posted at least thirty (30) days in advance, and the Company shall obtain renewed consent from Data Subjects if necessary.</p>
    <p>② This Privacy Policy shall take effect on February 9, 2026.</p>

    <h3 className="font-semibold text-slate-900">Supplementary Provisions</h3>
    <p>This Privacy Policy shall apply from February 9, 2026.</p>

    <h3 className="font-semibold text-slate-900">[Company Information]</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>Company Name: InfoCreative Co., Ltd.</li>
      <li>Representative: Jeong Do-cheon</li>
      <li>Address: Rooms 708 &amp; 709, Gasan Hanwha Biz Metro 2nd, 43-14 Gasan Digital 2-ro, Geumcheon-gu, Seoul, Republic of Korea</li>
      <li>Business Registration Number: 841-86-03004</li>
      <li>Customer Center: +82-2-333-7334</li>
      <li>Email: support@traystorage.net</li>
    </ul>
  </>
);

const PrivacyJa = () => (
  <>
    <p className="text-xs text-slate-500">制定 2026.02.09. 施行 2026.02.09.</p>

    <p>株式会社インフォクリエイティブ（以下「当社」）は、「個人情報保護法」、「情報通信網利用促進及び情報保護等に関する法律」（以下「情報通信網法」）等の関連法令に従って利用者の個人情報を保護し、これに関する苦情を迅速かつ円滑に処理できるよう、次のとおり個人情報処理方針を策定・公開します。</p>

    <h3 className="font-semibold text-slate-900">第1条 (個人情報の収集項目及び収集方法)</h3>
    <p>① 当社は、本サービスの提供のため、次の個人情報を収集します。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">区分</th><th className="border border-slate-300 p-2 text-left">収集項目</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">必須項目</td><td className="border border-slate-300 p-2">氏名、メールアドレス、パスワード、携帯電話番号、所属会社名、部署名</td></tr>
        <tr><td className="border border-slate-300 p-2">選択項目</td><td className="border border-slate-300 p-2">プロフィール画像</td></tr>
        <tr><td className="border border-slate-300 p-2">自動収集項目</td><td className="border border-slate-300 p-2">IPアドレス、端末情報、アクセスログ、サービス利用記録、クッキー</td></tr>
        <tr><td className="border border-slate-300 p-2">サービス利用過程で収集</td><td className="border border-slate-300 p-2">アップロードされた文書ファイル及び画像、AI OCR処理結果、文書検索記録、AI質疑応答内訳</td></tr>
        <tr><td className="border border-slate-300 p-2">有料決済時に収集</td><td className="border border-slate-300 p-2">決済情報（決済手段、カード会社名、決済承認情報、決済日時等）</td></tr>
      </tbody>
    </table>
    <p>② 個人情報の収集方法</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>会員登録時の利用者の直接入力</li>
      <li>サービス利用過程での自動生成・収集</li>
      <li>カスタマーセンターへのお問い合わせ過程での収集</li>
    </ul>
    <p>③ 当社は決済情報を直接保存せず、決済代行会社であるイノペイ（株式会社イノペイ）を通じて安全に処理します。</p>

    <h3 className="font-semibold text-slate-900">第2条 (個人情報の収集及び利用目的)</h3>
    <p>当社は、収集した個人情報を次の目的のために利用します。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">利用目的</th><th className="border border-slate-300 p-2 text-left">詳細内容</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">会員管理</td><td className="border border-slate-300 p-2">会員登録及び本人確認、会員資格の維持・管理、サービスの不正利用防止、告知事項の伝達</td></tr>
        <tr><td className="border border-slate-300 p-2">サービス提供</td><td className="border border-slate-300 p-2">文書の保存・管理、AI OCR処理、AIベースの検索・分析・質疑応答機能の提供、NFC連動サービスの提供</td></tr>
        <tr><td className="border border-slate-300 p-2">サービス改善</td><td className="border border-slate-300 p-2">サービス品質の向上、新規機能の開発、統計分析</td></tr>
        <tr><td className="border border-slate-300 p-2">顧客サポート</td><td className="border border-slate-300 p-2">お問い合わせ事項の処理、不満の受付及び処理、お知らせの伝達</td></tr>
        <tr><td className="border border-slate-300 p-2">マーケティング及び広告</td><td className="border border-slate-300 p-2">新規サービスの案内、イベント情報の提供（同意時のみ）</td></tr>
      </tbody>
    </table>

    <h3 className="font-semibold text-slate-900">第3条 (個人情報の保有及び利用期間)</h3>
    <p>① 当社は、個人情報の収集及び利用目的が達成された後には、当該情報を遅滞なく破棄します。ただし、関連法令により保存する必要がある場合には、以下のとおり保管します。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">保存項目</th><th className="border border-slate-300 p-2 text-left">保存期間</th><th className="border border-slate-300 p-2 text-left">保存根拠</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">契約又は申込み撤回等に関する記録</td><td className="border border-slate-300 p-2">5年</td><td className="border border-slate-300 p-2">電子商取引法</td></tr>
        <tr><td className="border border-slate-300 p-2">代金決済及び財貨等の供給に関する記録</td><td className="border border-slate-300 p-2">5年</td><td className="border border-slate-300 p-2">電子商取引法</td></tr>
        <tr><td className="border border-slate-300 p-2">消費者の不満又は紛争処理に関する記録</td><td className="border border-slate-300 p-2">3年</td><td className="border border-slate-300 p-2">電子商取引法</td></tr>
        <tr><td className="border border-slate-300 p-2">サービス利用記録、アクセスログ</td><td className="border border-slate-300 p-2">3か月</td><td className="border border-slate-300 p-2">通信秘密保護法</td></tr>
        <tr><td className="border border-slate-300 p-2">バックアップデータ</td><td className="border border-slate-300 p-2">1年</td><td className="border border-slate-300 p-2">内部方針</td></tr>
        <tr><td className="border border-slate-300 p-2">AI処理ログ</td><td className="border border-slate-300 p-2">1年</td><td className="border border-slate-300 p-2">内部方針</td></tr>
      </tbody>
    </table>
    <p>② 休眠会員への転換時、個人情報は別途分離して保管され、休眠転換後3年が経過すると完全に削除されます。</p>

    <h3 className="font-semibold text-slate-900">第4条 (個人情報の第三者提供)</h3>
    <p>① 当社は、原則として利用者の個人情報を第三者に提供しません。ただし、次の場合には例外とします。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>利用者が事前に同意した場合</li>
      <li>法令の規定に基づくか、又は捜査目的で法令に定められた手続き及び方法により捜査機関の要求がある場合</li>
    </ul>
    <p>② 現在、当社は利用者の個人情報を第三者に提供していません。</p>

    <h3 className="font-semibold text-slate-900">第5条 (個人情報の処理委託)</h3>
    <p>① 当社は、本サービスの提供のため、次のとおり個人情報処理業務を委託しています。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">受託業者</th><th className="border border-slate-300 p-2 text-left">委託業務の内容</th><th className="border border-slate-300 p-2 text-left">保有及び利用期間</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Supabase Inc.</td><td className="border border-slate-300 p-2">クラウドサーバーのホスティング及びデータ保存</td><td className="border border-slate-300 p-2">会員退会時まで又は委託契約終了時</td></tr>
        <tr><td className="border border-slate-300 p-2">OpenAI, L.L.C.</td><td className="border border-slate-300 p-2">AIサービス（GPT）の提供</td><td className="border border-slate-300 p-2">サービス利用期間</td></tr>
        <tr><td className="border border-slate-300 p-2">NAVER株式会社</td><td className="border border-slate-300 p-2">AI OCR（クローバOCR）サービスの提供</td><td className="border border-slate-300 p-2">サービス利用期間</td></tr>
        <tr><td className="border border-slate-300 p-2">株式会社イノペイ（イノペイ）</td><td className="border border-slate-300 p-2">クレジットカード決済、口座振替、仮想口座等の決済処理及び決済盗用防止</td><td className="border border-slate-300 p-2">関連法令による保存期間又は委託契約終了時</td></tr>
      </tbody>
    </table>
    <p>② 当社は、委託契約締結時に「個人情報保護法」により、委託業務遂行目的外の個人情報処理の禁止、技術的・管理的保護措置、再委託の制限、受託者に対する管理・監督、損害賠償等の責任に関する事項を契約書等の文書に明示し、受託者が個人情報を安全に処理しているかを監督しています。</p>

    <h3 className="font-semibold text-slate-900">第6条 (個人情報の国外移転)</h3>
    <p>① 当社は、本サービスの提供のため、利用者の個人情報を国外に移転しています。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">項目</th><th className="border border-slate-300 p-2 text-left">内容</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">移転を受ける者</td><td className="border border-slate-300 p-2">Supabase Inc., OpenAI, L.L.C.</td></tr>
        <tr><td className="border border-slate-300 p-2">移転される国</td><td className="border border-slate-300 p-2">米国等クラウドサーバー所在地（具体的な位置は変更される場合があります）</td></tr>
        <tr><td className="border border-slate-300 p-2">移転日時及び方法</td><td className="border border-slate-300 p-2">サービス利用時のネットワークを通じた送信</td></tr>
        <tr><td className="border border-slate-300 p-2">移転される個人情報の項目</td><td className="border border-slate-300 p-2">会員情報、アップロード文書、AI処理データ</td></tr>
        <tr><td className="border border-slate-300 p-2">移転目的</td><td className="border border-slate-300 p-2">クラウドベースのサービス提供、AIサービスの提供</td></tr>
        <tr><td className="border border-slate-300 p-2">保有及び利用期間</td><td className="border border-slate-300 p-2">会員退会時まで又は委託契約終了時</td></tr>
      </tbody>
    </table>
    <p>② 利用者は個人情報の国外移転を拒否することができ、拒否時にはサービス利用が制限される場合があります。</p>

    <h3 className="font-semibold text-slate-900">第7条 (AIサービスにおける個人情報の処理)</h3>
    <p>① 当社は、AIサービスの提供のため、利用者がアップロードした文書からテキストを抽出し分析します。</p>
    <p>② AIサービスで処理される個人情報の項目</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>アップロードされた文書ファイル及び画像</li>
      <li>AI OCRで抽出されたテキストデータ</li>
      <li>AI質疑応答内訳</li>
      <li>文書検索記録</li>
    </ul>
    <p>③ AI処理過程</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>利用者が文書をアップロードすると、AI OCR（NAVERクローバOCR）を通じてテキストが抽出されます。</li>
      <li>抽出されたテキストはSupabaseサーバーに保存されます。</li>
      <li>利用者の質疑に対してOpenAI GPT APIを通じて応答が生成されます。</li>
    </ul>
    <p>④ 当社は、現在、利用者の個人情報をAIモデルの学習に活用しません。今後、AI学習の目的で活用しようとする場合、利用者の明示的同意を得ます。</p>

    <h3 className="font-semibold text-slate-900">第8条 (個人情報の破棄)</h3>
    <p>① 当社は、個人情報の保有期間の経過、処理目的の達成等、個人情報が不要となった場合には、遅滞なく当該個人情報を破棄します。</p>
    <p>② 破棄の手続き</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>利用者が入力した情報は、目的達成後に別途のDBに移され、内部方針及びその他の関連法令により一定期間保存された後、又は直ちに破棄されます。</li>
      <li>この際、別途のDBに移された個人情報は、法律による場合を除き、他の目的で利用されません。</li>
    </ul>
    <p>③ 破棄の方法</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>電子的ファイル形態の情報：復旧が不可能な方法で永久削除</li>
      <li>紙に記録された個人情報：シュレッダーで裁断するか焼却</li>
    </ul>

    <h3 className="font-semibold text-slate-900">第9条 (利用者の権利・義務及び行使方法)</h3>
    <p>① 利用者は、当社に対していつでも次の各号の個人情報保護関連の権利を行使することができます。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>個人情報の閲覧要求</li>
      <li>誤り等がある場合の訂正要求</li>
      <li>削除要求</li>
      <li>処理停止要求</li>
    </ul>
    <p>② 第1項による権利の行使は、当社に対して書面、電子メール、カスタマーセンターを通じて行うことができ、当社はこれに対して遅滞なく措置いたします。</p>
    <p>③ 第1項による権利の行使は、利用者の法定代理人又は委任を受けた者等の代理人を通じて行うこともできます。この場合、「個人情報の処理方法に関する告示」別紙第11号書式による委任状を提出しなければなりません。</p>
    <p>④ 個人情報の閲覧及び処理停止の要求は、「個人情報保護法」第35条第4項、第37条第2項により利用者の権利が制限される場合があります。</p>
    <p>⑤ 個人情報の訂正及び削除の要求は、他の法令でその個人情報が収集対象として明示されている場合には、その削除を要求することができません。</p>
    <p>⑥ 当社は、利用者の権利による閲覧の要求、訂正・削除の要求、処理停止の要求時に、閲覧等の要求をした者が本人又は正当な代理人であるかを確認します。</p>

    <h3 className="font-semibold text-slate-900">第10条 (AI処理に関する利用者の権利)</h3>
    <p>① 利用者は、AIサービスが提供した結果に対して次の権利を行使することができます。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>説明要請権：AI処理結果に対する説明を要請する権利</li>
      <li>異議申立権：明白な誤り又は不適切な結果について異議を申し立てる権利</li>
      <li>人的介入要請権：自動化された処理に対する人的検討を要請する権利</li>
    </ul>
    <p>② 第1項の権利は、カスタマーセンター（support@traystorage.net、02-333-7334）を通じて行使することができます。</p>
    <p>③ 当社は、技術的に可能な範囲内で利用者の要請を検討し、必要な措置を取ります。</p>

    <h3 className="font-semibold text-slate-900">第11条 (個人情報の安全性確保措置)</h3>
    <p>当社は、個人情報の安全性確保のため、次のような措置を取っています。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>管理的措置：</strong>内部管理計画の策定・施行、個人情報取扱職員の最小化及び教育</li>
      <li><strong>技術的措置：</strong>個人情報処理システムへのアクセス制限、暗号化技術の適用、セキュリティプログラムの設置及び更新</li>
      <li><strong>物理的措置：</strong>電算室、資料保管室等へのアクセス統制</li>
      <li><strong>データ暗号化：</strong>パスワードは暗号化して保存、送信データはSSL/TLS暗号化</li>
      <li><strong>アクセス権限管理：</strong>個人情報にアクセスできる担当者を最小化し、アクセス権限を差等付与</li>
    </ul>

    <h3 className="font-semibold text-slate-900">第12条 (クッキーの設置・運営及び拒否)</h3>
    <p>① 当社は、利用者に個別のカスタマイズサービスを提供するため、利用情報を保存し随時呼び出す「クッキー（cookie）」を使用します。</p>
    <p>② クッキーの使用目的</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>利用者のアクセス頻度や訪問時間等を分析してサービス利用に関する統計を収集</li>
      <li>利用者の関心分野の把握及びカスタマイズサービスの提供</li>
      <li>ログイン状態の維持</li>
    </ul>
    <p>③ クッキーの設置・運営及び拒否：利用者はクッキーの設置について選択権を有しています。ウェブブラウザでオプションを設定することにより、すべてのクッキーを許可するか、クッキーが保存されるたびに確認を経るか、すべてのクッキーの保存を拒否することができます。</p>
    <p>④ クッキーの保存を拒否する場合、カスタマイズサービスの利用に困難が生じる場合があります。</p>

    <h3 className="font-semibold text-slate-900">第13条 (個人情報保護責任者)</h3>
    <p>① 当社は、個人情報の処理に関する業務を総括して責任を負い、個人情報の処理に関連する利用者の苦情処理及び被害救済等のため、以下のとおり個人情報保護責任者を指定しています。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <tbody>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">氏名</td><td className="border border-slate-300 p-2">チョン・ドチョン</td></tr>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">役職</td><td className="border border-slate-300 p-2">代表理事</td></tr>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">連絡先</td><td className="border border-slate-300 p-2">02-333-7334 / support@traystorage.net</td></tr>
      </tbody>
    </table>
    <p>② 利用者は、当社のサービスを利用する中で発生したすべての個人情報保護関連のお問い合わせ、苦情処理、被害救済等に関する事項を、個人情報保護責任者にお問い合わせいただけます。</p>

    <h3 className="font-semibold text-slate-900">第14条 (権益侵害の救済方法)</h3>
    <p>利用者は、個人情報の侵害による救済を受けるため、個人情報紛争調停委員会、韓国インターネット振興院個人情報侵害申告センター等に紛争解決や相談等を申請することができます。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>個人情報紛争調停委員会：（局番なし）1833-6972 (www.kopico.go.kr)</li>
      <li>個人情報侵害申告センター：（局番なし）118 (privacy.kisa.or.kr)</li>
      <li>大検察庁：（局番なし）1301 (www.spo.go.kr)</li>
      <li>警察庁：（局番なし）182 (ecrm.cyber.go.kr)</li>
    </ul>

    <h3 className="font-semibold text-slate-900">第15条 (個人情報処理方針の変更)</h3>
    <p>① この個人情報処理方針は施行日から適用され、法令及び方針による変更内容の追加、削除及び訂正がある場合には、変更事項の施行7日前からお知らせを通じて告知いたします。</p>
    <p>② 利用者に不利な重要な内容の変更がある場合には、最低30日前に告知し、電子メール等で個別に通知します。</p>

    <h3 className="font-semibold text-slate-900">附則</h3>
    <p><strong>第1条 (施行日)</strong> この個人情報処理方針は2026年2月9日から施行します。</p>

    <h3 className="font-semibold text-slate-900">[会社情報]</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>商号：株式会社インフォクリエイティブ</li>
      <li>代表者：チョン・ドチョン</li>
      <li>住所：ソウル特別市衿川区加山デジタル2路43-14 加山ハンファビズメトロ2次708号、709号</li>
      <li>事業者登録番号：841-86-03004</li>
      <li>カスタマーセンター：02-333-7334</li>
      <li>メール：support@traystorage.net</li>
    </ul>
  </>
);

const PrivacyDe = () => (
  <>
    <p className="text-xs text-slate-500">Erlassen: 09.02.2026 | Inkrafttreten: 09.02.2026</p>

    <p>Die InfoCreative Co., Ltd. (im Folgenden „Unternehmen") betreibt diese Datenschutzerklärung gemäß Artikel 30 des koreanischen Gesetzes zum Schutz personenbezogener Daten, um die personenbezogenen Daten der Nutzer von Tray Storage Connect, dem Dienst des Unternehmens, zu schützen und diesbezügliche Anliegen zügig und reibungslos zu bearbeiten.</p>

    <h3 className="font-semibold text-slate-900">§ 1 (Zwecke der Erhebung und Nutzung personenbezogener Daten)</h3>
    <p>① Das Unternehmen erhebt nur die für die Bereitstellung des Dienstes erforderlichen personenbezogenen Mindestdaten und erhebt personenbezogene Daten mit Einwilligung des Nutzers für die nachfolgend genannten Zwecke. Die erhobenen personenbezogenen Daten werden nicht für andere als die genannten Zwecke verwendet; ändert sich der Nutzungszweck, trifft das Unternehmen erforderliche Maßnahmen wie das Einholen einer gesonderten Einwilligung gemäß Artikel 18 des Gesetzes zum Schutz personenbezogener Daten.</p>
    <p>② Zur Bereitstellung von KI-OCR und KI-gestützter Dokumentensuche kann das Unternehmen von Mitgliedern registrierte Dokumente, Sprachbefehlsdaten und Nutzungsdatensätze verarbeiten; diese werden ausschließlich im Rahmen der Zwecke der Diensterbringung verwendet. Das Unternehmen nutzt Dokumente von Mitgliedern nicht als allgemeine Trainingsdaten für KI-Modelle; es kann jedoch Nutzungsmuster und Feedback-Daten unter Ausschluss sensibler Informationen innerhalb der Dokumente zur Verbesserung der KI-Modelle und damit der Dienstqualität erheben und nutzen.</p>
    <p>③ Das Unternehmen erhebt und nutzt personenbezogene Daten für folgende Zwecke:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Zweck</th><th className="border border-slate-300 p-2 text-left">Einzelheiten</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">1. Mitgliedsregistrierung und -verwaltung</td><td className="border border-slate-300 p-2">Identitätsprüfung und Authentifizierung für die Mitgliedschaft; Verhinderung von Mehrfach- und betrügerischer Registrierung; Aufrechterhaltung und Einschränkung der Mitgliedschaft; verschiedene Benachrichtigungen und Ankündigungen; Ausschluss von Personen unter 14 Jahren von der Mitgliedschaft</td></tr>
        <tr><td className="border border-slate-300 p-2">2. Bereitstellung und Nutzung des Dienstes</td><td className="border border-slate-300 p-2">Registrierung und Verwaltung von Dokumenten; KI-OCR-Verarbeitung; Dokumentensuche und Informationsbereitstellung über KI-Chatbot; Verarbeitung von Sprachbefehlen; NFC-Tag-basierte Dokumentenverwaltung; abteilungsbezogene Verwaltung von Zugriffsrechten; Bereitstellung von Dokumentenstatistiken</td></tr>
        <tr><td className="border border-slate-300 p-2">3. Zahlung und Abrechnung</td><td className="border border-slate-300 p-2">Zahlungsabwicklung für kostenpflichtige Leistungen; Rechnungsstellung; Verwaltung des Zahlungsverlaufs</td></tr>
        <tr><td className="border border-slate-300 p-2">4. Bearbeitung von Anliegen</td><td className="border border-slate-300 p-2">Prüfung von Anliegen der Mitglieder; Identitätsprüfung; Benachrichtigung über Bearbeitungsergebnisse und Nachverfolgung</td></tr>
        <tr><td className="border border-slate-300 p-2">5. Marketing und Werbung</td><td className="border border-slate-300 p-2">Bereitstellung von Informationen zu Aktionen und Werbeangeboten sowie Teilnahmemöglichkeiten (nur mit gesonderter Einwilligung)</td></tr>
      </tbody>
    </table>
    <p>④ Ungeachtet Absatz 1 kann das Unternehmen personenbezogene Daten ohne Einwilligung des Nutzers erheben und nutzen, soweit dies gesetzlich ausdrücklich vorgesehen ist oder personenbezogene Daten im Rahmen der Nutzung des Dienstes unvermeidbar anfallen.</p>

    <h3 className="font-semibold text-slate-900">§ 2 (Erhobene und genutzte Datenkategorien)</h3>
    <p>① Die vom Unternehmen erhobenen und genutzten personenbezogenen Datenkategorien sind wie folgt:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Erhebungszweck</th><th className="border border-slate-300 p-2 text-left">Einzelheiten</th><th className="border border-slate-300 p-2 text-left">Erhobene Daten</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2" rowSpan={5}>1. Mitgliedsregistrierung und -verwaltung</td><td className="border border-slate-300 p-2">Webregistrierung – Administrator</td><td className="border border-slate-300 p-2">Firmenname, Name, E-Mail, Mobilfunknummer (Identitätsprüfung), Passwort</td></tr>
        <tr><td className="border border-slate-300 p-2">Webregistrierung – Teammitglied</td><td className="border border-slate-300 p-2">Firmenname, Abteilungsname, Name, E-Mail, Mobilfunknummer (Identitätsprüfung), Passwort</td></tr>
        <tr><td className="border border-slate-300 p-2">Registrierung über Kakao-Konto</td><td className="border border-slate-300 p-2">Erforderlich: Kakao-Konto (ID), Passwort</td></tr>
        <tr><td className="border border-slate-300 p-2">Registrierung über Google-Konto</td><td className="border border-slate-300 p-2">Erforderlich: Name, E-Mail-Adresse</td></tr>
        <tr><td className="border border-slate-300 p-2">Registrierung über Naver-/Apple-Konto</td><td className="border border-slate-300 p-2">Erforderlich: ID, Passwort</td></tr>
        <tr><td className="border border-slate-300 p-2" rowSpan={2}>2. Diensterbringung</td><td className="border border-slate-300 p-2">Nutzung von KI-Diensten</td><td className="border border-slate-300 p-2">Hochgeladene Dokumente (Bilder, PDF usw.); Sprachbefehlsdaten; Suchverlauf; Gesprächsprotokolle des KI-Chatbots; NFC-Tag-Informationen; Angaben zum Dokumentenspeicherort</td></tr>
        <tr><td className="border border-slate-300 p-2">Nutzung von Zusatzfunktionen</td><td className="border border-slate-300 p-2">Optional: zusätzliche Angaben bei Nutzung von Zusatzfunktionen</td></tr>
        <tr><td className="border border-slate-300 p-2">3. Zahlung</td><td className="border border-slate-300 p-2">Zahlung für kostenpflichtige Leistungen</td><td className="border border-slate-300 p-2">Kreditkartendaten (Kartennummer, Ablaufdatum, erste 2 Ziffern der PIN); Bankkontodaten; Zahlungsverlauf</td></tr>
        <tr><td className="border border-slate-300 p-2">4. Bearbeitung von Anliegen und Beschwerden</td><td className="border border-slate-300 p-2">Einzelanfragen u. Ä.</td><td className="border border-slate-300 p-2">Erforderlich: Name, E-Mail-Adresse, Kontaktdaten, Anfrageinhalt</td></tr>
        <tr><td className="border border-slate-300 p-2">5. Marketing (mit gesonderter Einwilligung)</td><td className="border border-slate-300 p-2">Aktionen und Werbeangebote</td><td className="border border-slate-300 p-2">E-Mail-Adresse; Mobilfunknummer (bei SMS-Einwilligung)</td></tr>
        <tr><td className="border border-slate-300 p-2">6. Automatisch erhobene Informationen</td><td className="border border-slate-300 p-2">Automatisch bei Dienstnutzung erzeugt</td><td className="border border-slate-300 p-2">Zugriffsprotokolle, Nutzungsdaten, Geräteinformationen, IP-Adresse, Cookies</td></tr>
      </tbody>
    </table>
    <p>② Das Unternehmen nimmt keine Registrierungen von Personen unter 14 Jahren als Mitglieder an.</p>
    <p>③ Das Unternehmen speichert Zahlungsinformationen nicht selbst, sondern verarbeitet diese sicher über den Zahlungsdienstleister Innopay Co., Ltd. (Innopay).</p>

    <h3 className="font-semibold text-slate-900">§ 3 (Speicher- und Nutzungsdauer personenbezogener Daten)</h3>
    <p>① Das Unternehmen verarbeitet personenbezogene Daten innerhalb der bei der Erhebung zugestimmten Speicher- und Nutzungsdauer oder innerhalb der gesetzlich vorgeschriebenen Frist.</p>
    <p>② Die Speicher- und Nutzungsdauer der vom Unternehmen verarbeiteten personenbezogenen Daten ist wie folgt:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Kategorie</th><th className="border border-slate-300 p-2 text-left">Daten</th><th className="border border-slate-300 p-2 text-left">Dauer</th><th className="border border-slate-300 p-2 text-left">Ausnahmen</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Mitgliedsregistrierung und -verwaltung</td><td className="border border-slate-300 p-2">Bei Registrierung erhobene Angaben</td><td className="border border-slate-300 p-2">Bis zum Austritt oder zur Kündigung der Mitgliedschaft</td><td className="border border-slate-300 p-2">2 Jahre nach Austritt zur Prüfung erneuter Registrierung bzw. zur Betrugsprävention aufbewahrt</td></tr>
        <tr><td className="border border-slate-300 p-2" rowSpan={3}>Dienstnutzung</td><td className="border border-slate-300 p-2">Hochgeladene Dokumente und zugehörige Daten</td><td className="border border-slate-300 p-2">Bis zum Austritt oder zur Kündigung der Mitgliedschaft</td><td className="border border-slate-300 p-2">—</td></tr>
        <tr><td className="border border-slate-300 p-2">Sprachbefehlsdaten</td><td className="border border-slate-300 p-2">1 Jahr ab Erhebung</td><td className="border border-slate-300 p-2">Zur Verbesserung der KI-Dienstqualität</td></tr>
        <tr><td className="border border-slate-300 p-2">Feedback-Daten zur Verbesserung der KI-Modelle</td><td className="border border-slate-300 p-2">1 Jahr ab Erhebung</td><td className="border border-slate-300 p-2">Ohne sensible Informationen; anonymisiert</td></tr>
        <tr><td className="border border-slate-300 p-2">Zahlungsinformationen</td><td className="border border-slate-300 p-2">Zahlungsbezogene Aufzeichnungen</td><td className="border border-slate-300 p-2">5 Jahre nach Austritt</td><td className="border border-slate-300 p-2">Aufbewahrt gemäß dem Gesetz zum Verbraucherschutz im elektronischen Geschäftsverkehr</td></tr>
        <tr><td className="border border-slate-300 p-2">Bearbeitung von Anliegen</td><td className="border border-slate-300 p-2">Bei Anliegen erhobene Angaben</td><td className="border border-slate-300 p-2">Bis zur Klärung des Anliegens oder Streits</td><td className="border border-slate-300 p-2">Bearbeitungsunterlagen und Ergebnisse mindestens 3 Jahre aufbewahrt</td></tr>
        <tr><td className="border border-slate-300 p-2">Informations- und Kommunikationsprotokolle</td><td className="border border-slate-300 p-2">Zugriffs- und Nutzungsprotokolle, Suchverlauf</td><td className="border border-slate-300 p-2">Bis zum Austritt oder zur Kündigung der Mitgliedschaft</td><td className="border border-slate-300 p-2">Mindestens 3 Monate gemäß dem Gesetz zum Schutz von Kommunikationsgeheimnissen aufbewahrt</td></tr>
      </tbody>
    </table>

    <h3 className="font-semibold text-slate-900">§ 4 (Weitergabe personenbezogener Daten an Dritte)</h3>
    <p>① Grundsätzlich gibt das Unternehmen personenbezogene Daten des Nutzers nicht an Dritte weiter. Erfolgt eine Weitergabe, informiert das Unternehmen den Nutzer über den Empfänger, den Nutzungszweck des Empfängers, die weitergegebenen Datenkategorien und die Speicher- und Nutzungsdauer und holt die Einwilligung ein.</p>
    <p>② Ungeachtet Absatz 1 können personenbezogene Daten ohne Einwilligung des Nutzers in folgenden Fällen an Dritte weitergegeben werden:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Wenn dies gesetzlich ausdrücklich vorgesehen ist;</li>
      <li>Wenn Behörden, öffentliche Stellen, Ermittlungsbehörden oder Gerichte auf gesetzlicher Grundlage die Herausgabe von Informationen verlangen;</li>
      <li>Wenn pseudonymisierte Daten zu Zwecken der Statistik, wissenschaftlicher Forschung oder der Archivierung im öffentlichen Interesse bereitgestellt werden;</li>
      <li>Im Falle von Notfällen wie Katastrophen, Infektionskrankheiten oder Vorfällen mit unmittelbarer Gefahr für Leben, Gesundheit oder erheblichen Vermögensverlust.</li>
    </ul>

    <h3 className="font-semibold text-slate-900">§ 5 (Auftragsverarbeitung personenbezogener Daten)</h3>
    <p>① Das Unternehmen beauftragt zur reibungslosen Diensterbringung folgende externe Dienstleister mit der Verarbeitung personenbezogener Daten:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Auftragnehmer</th><th className="border border-slate-300 p-2 text-left">Beauftragte Tätigkeit</th><th className="border border-slate-300 p-2 text-left">Speicher- und Nutzungsdauer</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Supabase, Inc.</td><td className="border border-slate-300 p-2">Bereitstellung von Cloud-Servern und Datenspeicherung</td><td className="border border-slate-300 p-2">Bis zur Beendigung des Auftragsverhältnisses oder zum Austritt des Mitglieds</td></tr>
        <tr><td className="border border-slate-300 p-2">OpenAI, L.L.C.</td><td className="border border-slate-300 p-2">KI-gestützte Dokumentenanalyse; KI-Spracherkennung</td><td className="border border-slate-300 p-2">Bis zur Beendigung des Auftragsverhältnisses oder zum Austritt des Mitglieds (Sprachdaten: 1 Jahr ab Erhebung)</td></tr>
        <tr><td className="border border-slate-300 p-2">Naver Cloud Platform</td><td className="border border-slate-300 p-2">KI-OCR-Dienst</td><td className="border border-slate-300 p-2">Bis zur Beendigung des Auftragsverhältnisses oder zum Austritt des Mitglieds</td></tr>
        <tr><td className="border border-slate-300 p-2">Kakao Corporation</td><td className="border border-slate-300 p-2">Versand von Benachrichtigungen (KakaoTalk, SMS usw.)</td><td className="border border-slate-300 p-2">Bis zur erfolgten Zustellung der Nachricht</td></tr>
        <tr><td className="border border-slate-300 p-2">Innopay Co., Ltd. (Innopay)</td><td className="border border-slate-300 p-2">Zahlungsabwicklung und Verarbeitung von Zahlungsdaten</td><td className="border border-slate-300 p-2">Bis zur Beendigung des Auftragsverhältnisses oder gemäß gesetzlicher Aufbewahrungsfrist</td></tr>
      </tbody>
    </table>
    <p>② Bei Abschluss von Auftragsverarbeitungsverträgen legt das Unternehmen gemäß Artikel 26 des Gesetzes zum Schutz personenbezogener Daten im Vertrag das Verbot der Verarbeitung außerhalb des beauftragten Zwecks, technische und organisatorische Schutzmaßnahmen, Einschränkungen der Unterbeauftragung, die Überwachung des Auftragnehmers sowie die Haftung einschließlich Schadensersatz fest.</p>
    <p>③ Ändern sich der Inhalt der beauftragten Tätigkeiten oder der Auftragnehmer, gibt das Unternehmen dies unverzüglich über diese Datenschutzerklärung bekannt.</p>

    <h3 className="font-semibold text-slate-900">§ 6 (Internationale Übermittlung personenbezogener Daten)</h3>
    <p>① Das Unternehmen übermittelt personenbezogene Daten der Nutzer zur Bereitstellung des Dienstes ins Ausland.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Kategorie</th><th className="border border-slate-300 p-2 text-left">Einzelheiten</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Empfänger</td><td className="border border-slate-300 p-2">Supabase, Inc.; OpenAI, L.L.C.</td></tr>
        <tr><td className="border border-slate-300 p-2">Empfängerland</td><td className="border border-slate-300 p-2">USA, u. a. je nach Standort der Cloud-Server (kann sich ändern)</td></tr>
        <tr><td className="border border-slate-300 p-2">Zeitpunkt und Methode der Übermittlung</td><td className="border border-slate-300 p-2">Übertragung über das Netzwerk bei Nutzung des Dienstes</td></tr>
        <tr><td className="border border-slate-300 p-2">Übermittelte Datenkategorien</td><td className="border border-slate-300 p-2">Mitgliedsdaten, hochgeladene Dokumente, KI-Verarbeitungsdaten</td></tr>
        <tr><td className="border border-slate-300 p-2">Übermittlungszweck</td><td className="border border-slate-300 p-2">Bereitstellung des cloudbasierten Dienstes; Bereitstellung der KI-Dienste</td></tr>
        <tr><td className="border border-slate-300 p-2">Speicher- und Nutzungsdauer</td><td className="border border-slate-300 p-2">Bis zur Kündigung der Mitgliedschaft oder Beendigung des Auftragsverarbeitungsvertrags</td></tr>
      </tbody>
    </table>
    <p>② Nutzer können der Übermittlung ihrer personenbezogenen Daten ins Ausland widersprechen; in diesem Fall kann die Nutzung des Dienstes eingeschränkt sein.</p>

    <h3 className="font-semibold text-slate-900">§ 7 (Rechte der Nutzer und deren Ausübung)</h3>
    <p>① Nutzer können jederzeit folgende Rechte hinsichtlich ihrer vom Unternehmen verarbeiteten personenbezogenen Daten ausüben:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Auskunftsrecht:</strong> Nutzer können gemäß Artikel 35 des Gesetzes zum Schutz personenbezogener Daten Auskunft über ihre beim Unternehmen gespeicherten personenbezogenen Daten verlangen. Die Auskunft kann eingeschränkt werden, soweit dies gesetzlich untersagt ist oder die Interessen Dritter gefährdet würden.</li>
      <li><strong>Recht auf Berichtigung und Löschung:</strong> Nutzer können gemäß Artikel 36 des Gesetzes zum Schutz personenbezogener Daten die Berichtigung oder Löschung ihrer personenbezogenen Daten verlangen. Eine Löschung kann jedoch nicht verlangt werden, soweit die betreffenden Daten gesetzlich als zu erhebende Daten bestimmt sind.</li>
      <li><strong>Recht auf Einschränkung der Verarbeitung und Widerruf der Einwilligung:</strong> Nutzer können gemäß Artikel 37 des Gesetzes zum Schutz personenbezogener Daten die Einschränkung der Verarbeitung ihrer personenbezogenen Daten verlangen oder ihre Einwilligung widerrufen.</li>
    </ul>
    <p>② Nutzer können die Rechte aus Absatz 1 ausüben, indem sie sich an den Datenschutzbeauftragten wenden (Telefon: +82-2-333-7334) oder eine E-Mail an support@traystorage.net senden; das Unternehmen bearbeitet solche Anfragen unverzüglich.</p>
    <p>③ Beantragt ein Nutzer die Berichtigung oder Löschung fehlerhafter personenbezogener Daten, nutzt oder gibt das Unternehmen diese Daten nicht weiter, bis die Berichtigung oder Löschung abgeschlossen ist.</p>
    <p>④ Ein gesetzlicher Vertreter des Nutzers oder eine vom Nutzer bevollmächtigte Person kann diese Rechte im Namen des Nutzers ausüben, sofern eine schriftliche Vollmacht beim Unternehmen eingereicht wird.</p>
    <p>⑤ <strong>Rechte im Zusammenhang mit der KI-basierten Verarbeitung personenbezogener Daten:</strong> Nutzer können hinsichtlich der von KI-Diensten bereitgestellten Ergebnisse folgende Rechte ausüben:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Recht auf Erläuterung:</strong> das Recht, eine Erläuterung zu Zweck und Methode der KI-Verarbeitung, den Auswirkungen der KI-Verarbeitungsergebnisse auf den Nutzer sowie den wesentlichen Kriterien der KI-Verarbeitungsergebnisse zu verlangen;</li>
      <li><strong>Widerspruchsrecht:</strong> das Recht, gegen einen offensichtlichen Fehler oder ein unangemessenes KI-Verarbeitungsergebnis Widerspruch einzulegen;</li>
      <li><strong>Recht auf menschliche Überprüfung:</strong> das Recht, eine menschliche Überprüfung eines automatisiert erzielten Verarbeitungsergebnisses zu verlangen.</li>
    </ul>
    <p>⑥ Die Rechte aus Absatz 5 können schriftlich, per E-Mail (support@traystorage.net) oder telefonisch beim Datenschutzbeauftragten (+82-2-333-7334) ausgeübt werden. Das Unternehmen prüft die Anfrage im Rahmen des technisch Machbaren, trifft die erforderlichen Maßnahmen und antwortet innerhalb eines (1) Monats nach Eingang der Anfrage.</p>

    <h3 className="font-semibold text-slate-900">§ 8 (Löschung personenbezogener Daten)</h3>
    <p>① Das Unternehmen löscht personenbezogene Daten unverzüglich, wenn diese nicht mehr benötigt werden, etwa nach Erreichen des Verarbeitungszwecks, Ablauf der Speicherdauer oder Beendigung der Geschäftstätigkeit.</p>
    <p>② Ungeachtet Absatz 1 werden personenbezogene Daten, deren weitere Aufbewahrung gesetzlich vorgeschrieben ist, getrennt von anderen personenbezogenen Daten gespeichert und verwaltet.</p>
    <p>③ Ist das Unternehmen gesetzlich verpflichtet, personenbezogene Daten für einen bestimmten Zeitraum aufzubewahren, bewahrt es diese Daten für den entsprechenden Zeitraum sicher auf, bevor sie gelöscht werden.</p>
    <p>④ Verfahren und Methoden zur Löschung personenbezogener Daten sind wie folgt:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Löschverfahren:</strong> Zu löschende personenbezogene Daten werden ausgewählt und nach Genehmigung durch den Datenschutzbeauftragten gelöscht.</li>
      <li><strong>Löschmethoden:</strong> Elektronisch gespeicherte personenbezogene Daten werden unwiderruflich gelöscht. Auf Papier festgehaltene personenbezogene Daten werden geschreddert, verbrannt oder die betreffenden Stellen unkenntlich gemacht bzw. gelocht.</li>
    </ul>

    <h3 className="font-semibold text-slate-900">§ 9 (Maßnahmen zur Gewährleistung der Sicherheit personenbezogener Daten)</h3>
    <p>Das Unternehmen trifft folgende Maßnahmen, um Verlust, Diebstahl, Offenlegung, Fälschung, Veränderung oder Beschädigung personenbezogener Daten der Nutzer zu verhindern:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Organisatorische Maßnahmen:</strong> Aufstellung und Umsetzung eines internen Managementplans zum Schutz personenbezogener Daten, regelmäßige Mitarbeiterschulungen;</li>
      <li><strong>Technische Maßnahmen:</strong> Zugriffskontrolle und Beschränkung der Zugriffsrechte auf Systeme zur Verarbeitung personenbezogener Daten, Verschlüsselung eindeutiger Identifikationsmerkmale, Installation und regelmäßige Aktualisierung von Sicherheitsprogrammen;</li>
      <li><strong>Physische Maßnahmen:</strong> Bereitstellung sicherer Lagerräume bzw. Installation von Schließsystemen und Zugangskontrollen zum sicheren Aufbewahren personenbezogener Daten;</li>
      <li><strong>Angriffsprävention:</strong> Einrichtung von Sicherheitssystemen und Betrieb von Systemen zur Angriffserkennung, um Datenschutzverletzungen durch Hackerangriffe oder Computerviren zu verhindern;</li>
      <li><strong>Zugriffsverwaltung:</strong> Minimierung der mit personenbezogenen Daten befassten Mitarbeiter und regelmäßige Schulungen; Schließsysteme und Zugriffsbeschränkungen für Dokumente und Speichermedien.</li>
    </ul>

    <h3 className="font-semibold text-slate-900">§ 10 (Einsatz, Betrieb und Ablehnung von Cookies)</h3>
    <p>① Das Unternehmen verwendet „Cookies", um Nutzungsinformationen zu speichern und wiederholt abzurufen, um Nutzern individuell angepasste Leistungen anzubieten. Cookies sind kleine Datenmengen, die vom Server der Website an den Browser des Nutzers gesendet und auf dessen Computer gespeichert werden können.</p>
    <p>② Zweck und Einzelheiten der Cookie-Nutzung sind wie folgt:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Zweck der Cookie-Nutzung:</strong> Bereitstellung optimierter und individuell angepasster Informationen durch Analyse von Besuchsverlauf, Nutzungsmustern und weiteren Daten;</li>
      <li><strong>Methoden zur Ablehnung von Cookies:</strong>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Internet Explorer: Extras &gt; Internetoptionen &gt; Datenschutz</li>
          <li>Google Chrome: Einstellungen &gt; Erweiterte Einstellungen &gt; Datenschutz</li>
          <li>Microsoft Edge: Einstellungen &gt; Cookies und Websiteberechtigungen</li>
          <li>Safari: Einstellungen &gt; Datenschutz &gt; Cookies und Websitedaten</li>
        </ul>
      </li>
      <li>Die Ablehnung von Cookies kann die Nutzung individuell angepasster Leistungen erschweren.</li>
    </ul>

    <h3 className="font-semibold text-slate-900">§ 11 (Hinweise zur Nutzung von KI-Diensten und zur Verarbeitung personenbezogener Daten)</h3>
    <p>① Das Unternehmen setzt Künstliche Intelligenz (KI) zur Verbesserung der Dienstqualität ein und stellt folgende KI-Dienste bereit:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Automatische Textextraktion aus Dokumenten mittels KI-OCR (optische Zeichenerkennung);</li>
      <li>Dokumentensuche und Informationsbereitstellung über KI-Chatbot;</li>
      <li>KI-gestützte Dokumentensuche per Sprachbefehl.</li>
    </ul>
    <p>② Gemäß dem Grundlagengesetz für Künstliche Intelligenz gibt das Unternehmen bei Nutzung von KI-Diensten folgende Hinweise: Bei der vom Nutzer verwendeten Leistung kommt KI-Technologie zum Einsatz; vom Nutzer registrierte Dokumente und Sprachdaten können im Rahmen der KI-Verarbeitung verarbeitet werden; KI-Verarbeitungsergebnisse werden durch automatisierte Algorithmen erzeugt und können Fehler enthalten.</p>
    <p>③ Das Unternehmen nutzt von Mitgliedern registrierte Dokumente nicht als allgemeine Trainingsdaten für KI-Modelle. Zur Verbesserung der Dienstqualität kann das Unternehmen jedoch folgende Daten erheben und nutzen: Nutzungsmuster und Feedback-Daten; Nutzungsdatensätze unter Ausschluss sensibler Informationen in Dokumenten (Personalausweisnummern, Bankkontodaten, Gesundheitsdaten usw.). Diese Daten werden vor der Nutzung anonymisiert oder pseudonymisiert und so verarbeitet, dass eine Identifizierung bestimmter Personen ausgeschlossen ist.</p>
    <p>④ Das Unternehmen plant, im Rahmen künftiger Verbesserungen der KI-Modelle eine Funktion zur automatischen Maskierung sensibler Informationen einzuführen.</p>
    <p>⑤ Folgende KI-Dienstanbieter werden vom Unternehmen mit der Bereitstellung von KI-Diensten beauftragt: OpenAI, L.L.C. (KI-Dokumentenanalyse, Spracherkennung); Naver Cloud Platform (KI-OCR).</p>

    <h3 className="font-semibold text-slate-900">§ 12 (Datenschutzbeauftragter)</h3>
    <p>① Das Unternehmen hat folgenden Datenschutzbeauftragten bestimmt, der die Verarbeitung personenbezogener Daten überwacht und für die Bearbeitung von Beschwerden, die Wiedergutmachung von Schäden und die Ausübung der Rechte der Nutzer verantwortlich ist:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <tbody>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">Name</td><td className="border border-slate-300 p-2">Jeong Do-cheon</td></tr>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">Position</td><td className="border border-slate-300 p-2">Geschäftsführer</td></tr>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">Kontakt</td><td className="border border-slate-300 p-2">+82-2-333-7334 / support@traystorage.net</td></tr>
      </tbody>
    </table>
    <p>② Nutzer können sich mit sämtlichen Anfragen, Beschwerden, Anträgen auf Schadenersatz und sonstigen Angelegenheiten zum Schutz personenbezogener Daten im Zusammenhang mit der Nutzung des Dienstes an den Datenschutzbeauftragten wenden. Das Unternehmen bearbeitet Anfragen von Nutzern unverzüglich.</p>

    <h3 className="font-semibold text-slate-900">§ 13 (Rechtsbehelfe bei Verletzung der Rechte der Nutzer)</h3>
    <p>① Nutzer können sich bei folgenden Stellen über Verletzungen ihrer personenbezogenen Daten beraten lassen und Wiedergutmachung beantragen:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Stelle</th><th className="border border-slate-300 p-2 text-left">Kontakt</th><th className="border border-slate-300 p-2 text-left">Website</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Meldezentrale für Verletzungen personenbezogener Daten (betrieben von KISA)</td><td className="border border-slate-300 p-2">(ohne Vorwahl) 118</td><td className="border border-slate-300 p-2">privacy.kisa.or.kr</td></tr>
        <tr><td className="border border-slate-300 p-2">Schlichtungsausschuss für Streitigkeiten über personenbezogene Daten</td><td className="border border-slate-300 p-2">(ohne Vorwahl) 1833-6972</td><td className="border border-slate-300 p-2">www.kopico.go.kr</td></tr>
        <tr><td className="border border-slate-300 p-2">Oberste Staatsanwaltschaft, Cyber-Ermittlungsabteilung</td><td className="border border-slate-300 p-2">(ohne Vorwahl) 1301</td><td className="border border-slate-300 p-2">www.spo.go.kr</td></tr>
        <tr><td className="border border-slate-300 p-2">Nationale Polizeibehörde, Cyber-Meldesystem (ECRM)</td><td className="border border-slate-300 p-2">(ohne Vorwahl) 182</td><td className="border border-slate-300 p-2">ecrm.cyber.go.kr</td></tr>
      </tbody>
    </table>
    <p>② Das Unternehmen bemüht sich um Beratung und Wiedergutmachung bei Verletzungen personenbezogener Daten von Nutzern. Für eine Beratung wenden Sie sich bitte an:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Ansprechpartner: Jeong Do-cheon</li>
      <li>Telefon: +82-2-333-7334</li>
      <li>E-Mail: support@traystorage.net</li>
    </ul>

    <h3 className="font-semibold text-slate-900">§ 14 (Änderung und Inkrafttreten der Datenschutzerklärung)</h3>
    <p>① Ändert das Unternehmen diese Datenschutzerklärung, veröffentlicht es mindestens sieben (7) Tage vor Inkrafttreten der Änderung einen Vergleich der Inhalte vor und nach der Änderung als Ankündigung auf der Website des Dienstes, damit Nutzer informiert werden. Bei wesentlichen Änderungen, die die Rechte der Nutzer betreffen, erfolgt die Ankündigung mindestens dreißig (30) Tage vorher; bei Bedarf holt das Unternehmen eine erneute Einwilligung der Nutzer ein.</p>
    <p>② Diese Datenschutzerklärung tritt am 9. Februar 2026 in Kraft.</p>

    <h3 className="font-semibold text-slate-900">Schlussbestimmungen</h3>
    <p>Diese Datenschutzerklärung gilt ab dem 9. Februar 2026.</p>

    <h3 className="font-semibold text-slate-900">[Unternehmensangaben]</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>Firma: InfoCreative Co., Ltd.</li>
      <li>Vertreter: Jeong Do-cheon</li>
      <li>Adresse: Räume 708 &amp; 709, Gasan Hanwha Biz Metro 2nd, 43-14 Gasan Digital 2-ro, Geumcheon-gu, Seoul, Republik Korea</li>
      <li>Gewerberegisternummer: 841-86-03004</li>
      <li>Kundencenter: +82-2-333-7334</li>
      <li>E-Mail: support@traystorage.net</li>
    </ul>
  </>
);

const PrivacyZh = () => (
  <>
    <p className="text-xs text-slate-500">制定：2026年2月9日 施行：2026年2月9日</p>

    <p>InfoCreative股份有限公司（以下简称"公司"）依据《个人信息保护法》、《促进信息通信网络利用及信息保护等相关法律》（以下简称"信息通信网络法"）等相关法令，为保护用户的个人信息并迅速、妥善处理相关投诉，制定并公开以下个人信息处理方针。</p>

    <h3 className="font-semibold text-slate-900">第1条（个人信息的收集项目及收集方法）</h3>
    <p>① 公司为提供服务，收集以下个人信息。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">区分</th><th className="border border-slate-300 p-2 text-left">收集项目</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">必填项目</td><td className="border border-slate-300 p-2">姓名、电子邮箱地址、密码、手机号码、所属公司名称、部门名称</td></tr>
        <tr><td className="border border-slate-300 p-2">选填项目</td><td className="border border-slate-300 p-2">个人资料图片</td></tr>
        <tr><td className="border border-slate-300 p-2">自动收集项目</td><td className="border border-slate-300 p-2">IP地址、设备信息、访问日志、服务使用记录、Cookie</td></tr>
        <tr><td className="border border-slate-300 p-2">服务使用过程中收集</td><td className="border border-slate-300 p-2">上传的文档文件及图片、AI OCR处理结果、文档检索记录、AI问答记录</td></tr>
        <tr><td className="border border-slate-300 p-2">付费结算时收集</td><td className="border border-slate-300 p-2">支付信息（支付方式、发卡机构名称、支付审批信息、支付时间等）</td></tr>
      </tbody>
    </table>
    <p>② 个人信息收集方法</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>会员注册时用户直接输入</li>
      <li>服务使用过程中自动生成、收集</li>
      <li>客服中心咨询过程中收集</li>
    </ul>
    <p>③ 公司不直接存储支付信息，而是通过支付代理机构InnoPay（株式会社InnoPay）安全处理。</p>

    <h3 className="font-semibold text-slate-900">第2条（个人信息的收集及使用目的）</h3>
    <p>公司将收集的个人信息用于以下目的。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">使用目的</th><th className="border border-slate-300 p-2 text-left">具体内容</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">会员管理</td><td className="border border-slate-300 p-2">会员注册及身份验证、会员资格维护及管理、防止服务不当使用、传达告知事项</td></tr>
        <tr><td className="border border-slate-300 p-2">服务提供</td><td className="border border-slate-300 p-2">文档存储及管理、AI OCR处理、提供基于AI的检索・分析・问答功能、提供NFC联动服务</td></tr>
        <tr><td className="border border-slate-300 p-2">服务改进</td><td className="border border-slate-300 p-2">提升服务质量、开发新功能、统计分析</td></tr>
        <tr><td className="border border-slate-300 p-2">客户支持</td><td className="border border-slate-300 p-2">处理咨询事项、受理及处理投诉、传达公告事项</td></tr>
        <tr><td className="border border-slate-300 p-2">营销及广告</td><td className="border border-slate-300 p-2">新服务介绍、提供活动信息（仅限已同意者）</td></tr>
      </tbody>
    </table>

    <h3 className="font-semibold text-slate-900">第3条（个人信息的保有及使用期间）</h3>
    <p>① 公司在个人信息收集及使用目的达成后，将立即销毁相关信息。但依相关法令需要保存的情形，将按下列规定保管。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">保存项目</th><th className="border border-slate-300 p-2 text-left">保存期间</th><th className="border border-slate-300 p-2 text-left">保存依据</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">合同或申购撤回等相关记录</td><td className="border border-slate-300 p-2">5年</td><td className="border border-slate-300 p-2">电子商务法</td></tr>
        <tr><td className="border border-slate-300 p-2">货款结算及商品等供应相关记录</td><td className="border border-slate-300 p-2">5年</td><td className="border border-slate-300 p-2">电子商务法</td></tr>
        <tr><td className="border border-slate-300 p-2">消费者投诉或纠纷处理相关记录</td><td className="border border-slate-300 p-2">3年</td><td className="border border-slate-300 p-2">电子商务法</td></tr>
        <tr><td className="border border-slate-300 p-2">服务使用记录、访问日志</td><td className="border border-slate-300 p-2">3个月</td><td className="border border-slate-300 p-2">通信秘密保护法</td></tr>
        <tr><td className="border border-slate-300 p-2">备份数据</td><td className="border border-slate-300 p-2">1年</td><td className="border border-slate-300 p-2">内部政策</td></tr>
        <tr><td className="border border-slate-300 p-2">AI处理日志</td><td className="border border-slate-300 p-2">1年</td><td className="border border-slate-300 p-2">内部政策</td></tr>
      </tbody>
    </table>
    <p>② 转换为休眠会员时，个人信息将单独分离保管，休眠转换后经过3年将被完全删除。</p>

    <h3 className="font-semibold text-slate-900">第4条（个人信息的第三方提供）</h3>
    <p>① 公司原则上不向第三方提供用户的个人信息。但以下情形属于例外：</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>用户事先同意的情形</li>
      <li>依法令规定，或依法令所定程序及方法应侦查机关要求，为侦查目的所需的情形</li>
    </ul>
    <p>② 目前公司未向第三方提供用户的个人信息。</p>

    <h3 className="font-semibold text-slate-900">第5条（个人信息处理的委托）</h3>
    <p>① 公司为提供服务，将个人信息处理业务委托如下。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">受托机构</th><th className="border border-slate-300 p-2 text-left">委托业务内容</th><th className="border border-slate-300 p-2 text-left">保有及使用期间</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Supabase Inc.</td><td className="border border-slate-300 p-2">云服务器托管及数据存储</td><td className="border border-slate-300 p-2">至会员退出为止或委托合同终止时</td></tr>
        <tr><td className="border border-slate-300 p-2">OpenAI, L.L.C.</td><td className="border border-slate-300 p-2">提供AI服务（GPT）</td><td className="border border-slate-300 p-2">服务使用期间</td></tr>
        <tr><td className="border border-slate-300 p-2">Naver株式会社</td><td className="border border-slate-300 p-2">提供AI OCR（Clova OCR）服务</td><td className="border border-slate-300 p-2">服务使用期间</td></tr>
        <tr><td className="border border-slate-300 p-2">株式会社InnoPay（InnoPay）</td><td className="border border-slate-300 p-2">信用卡支付、转账、虚拟账户等支付处理及防止支付盗用</td><td className="border border-slate-300 p-2">依相关法令规定的保存期间或委托合同终止时</td></tr>
      </tbody>
    </table>
    <p>② 公司在签订委托合同时，依《个人信息保护法》在合同书等文件中明确规定禁止在委托业务目的以外处理个人信息、技术性及管理性保护措施、限制再委托、对受托方的管理监督、损害赔偿责任等事项，并监督受托方是否安全处理个人信息。</p>

    <h3 className="font-semibold text-slate-900">第6条（个人信息的国外转移）</h3>
    <p>① 公司为提供服务，将用户的个人信息转移至国外。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">项目</th><th className="border border-slate-300 p-2 text-left">内容</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">接收方</td><td className="border border-slate-300 p-2">Supabase Inc.、OpenAI, L.L.C.</td></tr>
        <tr><td className="border border-slate-300 p-2">转移国家</td><td className="border border-slate-300 p-2">美国等云服务器所在地（具体位置可能变更）</td></tr>
        <tr><td className="border border-slate-300 p-2">转移时间及方法</td><td className="border border-slate-300 p-2">使用服务时通过网络传输</td></tr>
        <tr><td className="border border-slate-300 p-2">转移的个人信息项目</td><td className="border border-slate-300 p-2">会员信息、上传文档、AI处理数据</td></tr>
        <tr><td className="border border-slate-300 p-2">转移目的</td><td className="border border-slate-300 p-2">提供云端服务、提供AI服务</td></tr>
        <tr><td className="border border-slate-300 p-2">保有及使用期间</td><td className="border border-slate-300 p-2">至会员退出为止或委托合同终止时</td></tr>
      </tbody>
    </table>
    <p>② 用户可拒绝个人信息的国外转移，拒绝时服务使用可能受到限制。</p>

    <h3 className="font-semibold text-slate-900">第7条（AI服务中的个人信息处理）</h3>
    <p>① 公司为提供AI服务，对用户上传的文档提取并分析文字。</p>
    <p>② AI服务中处理的个人信息项目</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>上传的文档文件及图片</li>
      <li>AI OCR提取的文本数据</li>
      <li>AI问答记录</li>
      <li>文档检索记录</li>
    </ul>
    <p>③ AI处理过程</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>用户上传文档后，通过AI OCR（Naver Clova OCR）自动提取文字。</li>
      <li>提取的文本存储于Supabase服务器。</li>
      <li>针对用户的提问，通过OpenAI GPT API生成回答。</li>
    </ul>
    <p>④ 公司目前不将用户的个人信息用于AI模型训练。未来如欲用于AI训练目的，将取得用户的明确同意。</p>

    <h3 className="font-semibold text-slate-900">第8条（个人信息的销毁）</h3>
    <p>① 个人信息保有期间已过、处理目的已达成等致使个人信息不再需要时，公司将立即销毁该个人信息。</p>
    <p>② 销毁程序</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>用户输入的信息在达成目的后，将转移至单独的数据库，依内部方针及其他相关法令规定的期间保存后，或立即销毁。</li>
      <li>转移至单独数据库的个人信息，除法律规定外，不会用于其他目的。</li>
    </ul>
    <p>③ 销毁方法</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>电子文件形式的信息：以无法恢复的方式永久删除</li>
      <li>纸质记录的个人信息：以碎纸机粉碎或焚烧处理</li>
    </ul>

    <h3 className="font-semibold text-slate-900">第9条（用户的权利・义务及行使方法）</h3>
    <p>① 用户可随时向公司行使以下各项个人信息保护相关权利。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>个人信息查阅请求权</li>
      <li>如有错误等情形，请求更正的权利</li>
      <li>请求删除的权利</li>
      <li>请求停止处理的权利</li>
    </ul>
    <p>② 依第①项行使权利，可通过书面、电子邮件、客服中心向公司提出，公司将立即采取相应措施。</p>
    <p>③ 依第①项行使权利，亦可通过用户的法定代理人或受委托人等代理人办理。此时须提交依《个人信息处理方法相关公告》附件第11号格式的委托书。</p>
    <p>④ 个人信息查阅及请求停止处理，可能依《个人信息保护法》第35条第4款、第37条第2款受到限制。</p>
    <p>⑤ 如其他法令明确规定该个人信息为收集对象，则不得请求更正及删除该个人信息。</p>
    <p>⑥ 公司在用户依其权利请求查阅、更正・删除、停止处理时，将确认提出请求者是否为本人或正当代理人。</p>

    <h3 className="font-semibold text-slate-900">第10条（用户对AI处理的权利）</h3>
    <p>① 用户对AI服务提供的结果可行使以下权利：</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>说明请求权：请求说明AI处理结果的权利</li>
      <li>异议提出权：对明显错误或不当结果提出异议的权利</li>
      <li>请求人工介入权：请求对自动化处理进行人工审核的权利</li>
    </ul>
    <p>② 第①项权利可通过客服中心（support@traystorage.net，02-333-7334）行使。</p>
    <p>③ 公司将在技术可行范围内审查用户的请求并采取必要措施。</p>

    <h3 className="font-semibold text-slate-900">第11条（个人信息安全性确保措施）</h3>
    <p>公司为确保个人信息的安全性，采取以下措施。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>管理性措施：</strong>制定并实施内部管理计划，最小化并培训个人信息处理相关人员</li>
      <li><strong>技术性措施：</strong>限制个人信息处理系统的访问权限，应用加密技术，安装并更新安全程序</li>
      <li><strong>物理性措施：</strong>对机房、资料保管室等场所实施访问控制</li>
      <li><strong>数据加密：</strong>密码加密存储，传输数据采用SSL/TLS加密</li>
      <li><strong>访问权限管理：</strong>最小化可访问个人信息的负责人员，并按等级分配访问权限</li>
    </ul>

    <h3 className="font-semibold text-slate-900">第12条（Cookie的安装、运营及拒绝）</h3>
    <p>① 公司为向用户提供个性化定制服务，使用存储并随时调用使用信息的"Cookie"。</p>
    <p>② Cookie的使用目的</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>分析用户的访问频率或访问时间等，收集服务使用相关统计数据</li>
      <li>掌握用户的兴趣领域并提供个性化定制服务</li>
      <li>维持登录状态</li>
    </ul>
    <p>③ Cookie的安装、运营及拒绝：用户对Cookie的安装拥有选择权。可通过在网页浏览器中设置选项，选择允许所有Cookie、每次存储Cookie时进行确认，或拒绝存储所有Cookie。</p>
    <p>④ 拒绝存储Cookie时，可能导致使用个性化定制服务出现困难。</p>

    <h3 className="font-semibold text-slate-900">第13条（个人信息保护负责人）</h3>
    <p>① 公司为统一负责个人信息处理相关业务，并妥善处理用户在个人信息处理方面的投诉及损害救济，指定以下个人信息保护负责人。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <tbody>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">姓名</td><td className="border border-slate-300 p-2">郑道天</td></tr>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">职务</td><td className="border border-slate-300 p-2">代表理事</td></tr>
        <tr><td className="border border-slate-300 p-2 bg-slate-100 font-medium">联系方式</td><td className="border border-slate-300 p-2">02-333-7334 / support@traystorage.net</td></tr>
      </tbody>
    </table>
    <p>② 用户在使用公司服务过程中产生的所有个人信息保护相关咨询、投诉处理、损害救济等事项，均可向个人信息保护负责人咨询。</p>

    <h3 className="font-semibold text-slate-900">第14条（权益侵害救济方法）</h3>
    <p>用户为获得因个人信息侵害而应有的救济，可向个人信息纠纷调解委员会、韩国互联网振兴院个人信息侵害举报中心等申请纠纷解决或咨询。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>个人信息纠纷调解委员会：（无地区码）1833-6972 (www.kopico.go.kr)</li>
      <li>个人信息侵害举报中心：（无地区码）118 (privacy.kisa.or.kr)</li>
      <li>大检察厅：（无地区码）1301 (www.spo.go.kr)</li>
      <li>警察厅：（无地区码）182 (ecrm.cyber.go.kr)</li>
    </ul>

    <h3 className="font-semibold text-slate-900">第15条（个人信息处理方针的变更）</h3>
    <p>① 本个人信息处理方针自施行日起适用，如依法令及方针变更内容有新增、删除及更正，将于变更事项施行7日前通过公告事项告知。</p>
    <p>② 如有对用户不利的重大内容变更，将至少提前30日公告并通过电子邮件等方式单独通知。</p>

    <h3 className="font-semibold text-slate-900">附则</h3>
    <p><strong>第1条（施行日）</strong> 本个人信息处理方针自2026年2月9日起施行。</p>

    <h3 className="font-semibold text-slate-900">【公司信息】</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>名称：InfoCreative股份有限公司</li>
      <li>代表人：郑道天</li>
      <li>地址：韩国首尔特别市衿川区加山数码2路43-14 加山韩华Bizmetro2次708室、709室</li>
      <li>营业执照注册号：841-86-03004</li>
      <li>客服中心：02-333-7334</li>
      <li>电子邮箱：support@traystorage.net</li>
    </ul>
  </>
);

export const PrivacyPolicyContent = () => {
  const { i18n } = useTranslation();
  if (i18n.language === 'en') return <PrivacyEn />;
  if (i18n.language === 'ja') return <PrivacyJa />;
  if (i18n.language === 'de') return <PrivacyDe />;
  if (i18n.language === 'zh') return <PrivacyZh />;
  return <PrivacyKo />;
};

export default PrivacyPolicyContent;
