import { useTranslation } from 'react-i18next';

const TermsKo = () => (
  <>
    <p className="text-xs text-slate-500">제정 2026.02.09. 시행 2026.02.09.</p>

    <h3 className="font-semibold text-slate-900">제1조 (목적)</h3>
    <p>이 약관은 주식회사 인포크리에이티브(이하 "회사")가 제공하는 문서 관리 서비스인 트레이 스토리지 커넥트(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 서비스 이용 조건 및 절차, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

    <h3 className="font-semibold text-slate-900">제2조 (정의)</h3>
    <p>① 이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>"서비스"란 회원이 보유한 문서를 클라우드 기반으로 저장·관리하고, 인공지능(AI) 기술을 활용하여 문서 정보를 탐색·검색·분석할 수 있도록 회사가 제공하는 온라인 플랫폼 서비스를 말합니다.</li>
      <li>"트레이 스토리지 커넥트"란 회사가 서비스를 제공하기 위하여 운영하는 웹 및 모바일 기반 플랫폼을 말합니다.</li>
      <li>"회원"이란 이 약관에 동의하고 회사가 정한 절차에 따라 회원가입을 완료하여 서비스를 이용하는 자를 말합니다.</li>
      <li>"관리자"란 조직 내에서 부서 생성, 권한 관리, 전체 문서 통계 확인 등의 관리 기능을 수행할 수 있는 권한을 부여받은 회원을 말합니다.</li>
      <li>"팀원"이란 관리자가 부여한 권한 범위 내에서 문서를 등록·조회·편집할 수 있는 회원을 말합니다.</li>
      <li>"게시물"이란 회원이 서비스에 업로드한 문서 파일, 사진, 이미지 등 일체의 자료를 말합니다.</li>
      <li>"AI 서비스"란 광학문자인식(OCR), 문서 내용 분석, 검색, 요약, 분류, 질의응답 등 인공지능 기술을 활용하여 자동화된 방식으로 문서 관련 정보를 제공하는 기능을 말하며, 구글 제미나이(Gemini) 및 네이버 클로바 OCR 등 제3자가 제공하는 AI 모델을 포함합니다.</li>
      <li>"AI OCR"이란 이미지 또는 스캔된 문서에서 문자 정보를 자동으로 인식·추출하는 광학문자인식 기술을 말합니다.</li>
      <li>"트레이 스토리지 제품"이란 종이문서를 보관·관리하기 위한 물리적 보관함으로서, NFC 태그를 부착하여 서비스와 연동할 수 있는 회사의 유료 판매 제품을 말합니다.</li>
      <li>"NFC 태그"란 근거리 무선통신(Near Field Communication) 기술을 활용하여 트레이 스토리지 제품과 서비스를 연동하는 스티커 형태의 장치를 말합니다.</li>
    </ul>
    <p>② 이 약관에서 정하지 않은 용어의 의미는 관련 법령 및 일반적인 상거래 관행에 따릅니다.</p>

    <h3 className="font-semibold text-slate-900">제3조 (약관의 명시와 개정)</h3>
    <p>① 회사는 이 약관의 내용을 회원이 쉽게 확인할 수 있도록 서비스 초기 화면 또는 회사 홈페이지(www.traystorage.net)에 게시합니다.</p>
    <p>② 회사는 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」(이하 "정보통신망법"), 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령을 위반하지 않는 범위에서 이 약관을 개정할 수 있습니다.</p>
    <p>③ 회사가 약관을 개정하는 경우, 개정 내용과 적용일자를 명시하여 적용일자 7일 전부터 서비스 화면 및 회사 홈페이지에 공지합니다. 다만, 회원에게 불리하거나 중대한 사항을 변경하는 경우에는 적용일자 30일 전부터 공지하고, 회원이 등록한 전자우편 또는 휴대전화번호로 개별 통지합니다.</p>
    <p>④ 회사가 제3항에 따라 개정약관을 공지 또는 통지하면서 회원에게 적용일자 전까지 의사표시를 하지 않으면 의사표시가 표명된 것으로 본다는 뜻을 명확하게 공지 또는 통지하였음에도 회원이 명시적으로 거부의 의사표시를 하지 아니한 경우 회원이 개정약관에 동의한 것으로 봅니다.</p>
    <p>⑤ 회원이 개정약관의 적용에 동의하지 않는 경우 회사는 개정약관의 내용을 적용할 수 없으며, 이 경우 회원은 이용계약을 해지할 수 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제4조 (약관 외 준칙)</h3>
    <p>① 이 약관에서 정하지 아니한 사항과 이 약관의 해석에 관하여는 「약관의 규제에 관한 법률」, 정보통신망법, 「개인정보 보호법」, 「전자상거래 등에서의 소비자보호에 관한 법률」, 「인공지능 기본법」, 「전자문서 및 전자거래 기본법」 등 관련 법령 또는 상관례에 따릅니다.</p>
    <p>② 회사는 필요한 경우 서비스의 세부 이용지침(운영정책)을 정할 수 있으며, 이를 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지합니다.</p>

    <h3 className="font-semibold text-slate-900">제5조 (회원가입)</h3>
    <p>① 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</p>
    <p>② 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우(다만, 회원자격 상실 후 2년이 경과한 자로서 회사의 회원 재가입 승낙을 얻은 경우는 예외)</li>
      <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
      <li>회원 탈퇴 후 7일이 경과하지 않은 자가 재가입을 신청하는 경우</li>
      <li>이용정지 기간 중에 있는 회원이 이용계약을 임의로 해지하고 재가입을 신청하는 경우</li>
      <li>기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</li>
    </ul>
    <p>③ 회원가입계약의 성립 시기는 회사의 승낙이 회원에게 도달한 시점으로 합니다.</p>
    <p>④ 회원은 회원가입 시 등록한 사항에 변경이 있는 경우, 즉시 전자우편 기타 방법으로 회사에 대하여 그 변경사항을 알려야 합니다.</p>
    <p>⑤ 제4항의 변경사항을 회사에 알리지 않아 발생한 불이익에 대하여 회사는 책임지지 않습니다.</p>

    <h3 className="font-semibold text-slate-900">제6조 (회원탈퇴 및 자격 상실)</h3>
    <p>① 회원은 언제든지 회사에 탈퇴를 요청할 수 있으며, 회사는 즉시 회원탈퇴를 처리합니다.</p>
    <p>② 회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>가입 신청 시에 허위 내용을 등록한 경우</li>
      <li>다른 회원의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우</li>
      <li>서비스를 이용하여 법령 또는 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
    </ul>
    <p>③ 회사가 회원자격을 제한·정지시킨 후, 동일한 행위가 2회 이상 반복되거나 30일 이내에 그 사유가 시정되지 아니하는 경우 회사는 회원자격을 상실시킬 수 있습니다.</p>
    <p>④ 회사가 회원자격을 상실시키는 경우에는 회원등록을 말소합니다. 이 경우 회원에게 이를 통지하고, 회원등록 말소 전에 최소한 30일 이상의 기간을 정하여 소명할 기회를 부여합니다.</p>
    <p>⑤ 회원 탈퇴 또는 회원자격 상실 시 회원의 게시물 및 개인정보는 즉시 삭제됩니다. 다만, 관련 법령 및 회사의 개인정보 처리방침에 따라 보관할 필요가 있는 정보는 일정 기간 보관 후 삭제합니다.</p>

    <h3 className="font-semibold text-slate-900">제7조 (휴면회원 전환)</h3>
    <p>① 회원이 1년 동안 서비스에 로그인하지 않은 경우, 회사는 해당 회원을 휴면회원으로 전환하고 개인정보를 별도 분리하여 보관합니다.</p>
    <p>② 휴면회원으로 전환된 후 3년이 경과하면 회원의 개인정보 및 게시물은 완전히 삭제됩니다.</p>
    <p>③ 회사는 휴면회원 전환 예정일 30일 전까지 회원에게 전자우편 등으로 휴면 전환 예정 사실을 통지합니다.</p>
    <p>④ 휴면회원은 로그인을 통해 본인 확인 절차를 거쳐 휴면 상태를 해제하고 서비스를 재개할 수 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제8조 (서비스의 제공 및 변경)</h3>
    <p>① 회사는 회원에게 다음과 같은 서비스를 제공합니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>문서 파일 및 이미지의 클라우드 기반 저장 및 관리 서비스</li>
      <li>부서별 문서 분류 및 관리 기능</li>
      <li>NFC 태그를 활용한 물리적 보관함과의 연동 서비스</li>
      <li>AI OCR을 통한 문서 텍스트 자동 인식 및 추출</li>
      <li>AI 기반 문서 검색, 분석, 요약, 질의응답 기능</li>
      <li>채팅 및 음성 명령 방식의 AI 인터페이스</li>
      <li>문서 보관기간 설정, 통계 데이터 제공, 공지사항 게시 등 부가 기능</li>
      <li>권한 관리 기능(접근불가/뷰어/편집자/관리자 4단계)</li>
      <li>기타 회사가 추가로 개발하거나 제휴계약 등을 통해 회원에게 제공하는 일체의 서비스</li>
    </ul>
    <p>② 회사는 서비스의 품질 향상, 기술 발전, 운영상의 필요에 따라 서비스의 전부 또는 일부를 변경할 수 있습니다.</p>
    <p>③ 서비스의 내용, 이용방법, 이용시간에 대하여 변경이 있는 경우에는 변경사유, 변경될 서비스의 내용 및 제공일자 등을 그 변경 전 7일 이상 서비스 화면에 게시하거나 회원에게 통지합니다.</p>
    <p>④ 회사는 무료로 제공되는 서비스의 일부 또는 전부를 회사의 정책 및 운영의 필요상 수정, 중단, 변경할 수 있으며, 이에 대하여 관련 법령에 특별한 규정이 없는 한 회원에게 별도의 보상을 하지 않습니다.</p>

    <h3 className="font-semibold text-slate-900">제9조 (서비스 이용시간 및 중단)</h3>
    <p>① 서비스의 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴, 1일 24시간을 원칙으로 합니다.</p>
    <p>② 제1항에도 불구하고 회사는 다음 각 호의 경우 서비스의 전부 또는 일부를 제한하거나 중단할 수 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 등의 사유가 발생한 경우</li>
      <li>서비스를 위한 설비의 보수 등 공사로 인해 부득이한 경우</li>
      <li>정전, 제반 설비의 장애 또는 이용량의 폭주 등으로 정상적인 서비스 이용에 지장이 있는 경우</li>
      <li>서비스 제공업자와의 계약 종료 등과 같은 회사의 제반 사정으로 서비스를 유지할 수 없는 경우</li>
      <li>기타 천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우</li>
    </ul>
    <p>③ 회사는 제2항의 사유로 서비스 제공이 일시적으로 중단됨으로 인하여 회원 또는 제3자가 입은 손해에 대하여 회사의 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</p>
    <p>④ 회사는 서비스를 중단하는 경우 제3항의 불가항력적 사유가 있는 경우를 제외하고는 최소 7일 전에 서비스 화면에 공지하거나 회원에게 통지합니다.</p>

    <h3 className="font-semibold text-slate-900">제10조 (유료서비스 및 결제)</h3>
    <p>① 회사는 일부 서비스를 유료로 제공할 수 있으며, 회원이 유료서비스를 이용하는 경우 이용요금을 납부해야 합니다.</p>
    <p>② 현재 서비스는 베타 테스트 기간으로 무료로 제공되며, 베타 테스트 종료 후 유료로 전환됩니다. 유료 전환 시 회사는 최소 30일 전에 요금제 및 결제 방법을 공지합니다.</p>
    <p>③ 베타 테스트 종료 후 예상 요금제는 다음과 같습니다(향후 변경될 수 있음).</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>월 구독 방식: 사용자 수에 따른 요금 부과(1인당 월 20,000원 예정)</li>
      <li>신규 가입 회원에게는 최초 1개월 무료 이용 혜택 제공</li>
    </ul>
    <p>④ 회원은 신용카드 결제, 무통장 입금, 가상계좌 이체, 기타 회사가 지정하는 결제 수단을 이용하여 이용요금을 납부할 수 있습니다.</p>
    <p>⑤ 회원이 결제수단에 대해 정당한 사용권한을 가지고 있지 않거나, 결제 이후 해당 결제수단에 대한 이의를 제기하거나 결제를 거부하는 경우 회사는 서비스 제공을 중단할 수 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제11조 (청약철회 및 환불)</h3>
    <p>① 회원은 유료서비스 결제일로부터 7일 이내에 청약을 철회할 수 있으며, 이 경우 회사는 결제대금 전액을 환불합니다.</p>
    <p>② 제1항에도 불구하고 다음 각 호의 경우에는 청약철회가 제한될 수 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>회원의 책임 있는 사유로 서비스가 멸실되거나 훼손된 경우</li>
      <li>회원이 서비스를 상당 부분 사용하여 그 가치가 현저히 감소한 경우</li>
    </ul>
    <p>③ 결제일로부터 7일 경과 후 환불을 요청하는 경우, 1개월분 이용요금을 공제한 잔액을 환불합니다.</p>
    <p>④ 환불은 회원이 결제한 방법과 동일한 방법으로 처리하는 것을 원칙으로 하며, 동일한 방법으로 환불이 불가능한 경우 회사가 정하는 방법으로 환불합니다.</p>
    <p>⑤ 환불 처리는 환불 요청일로부터 영업일 기준 7일 이내에 완료됩니다.</p>

    <h3 className="font-semibold text-slate-900">제12조 (서비스 이용 제한)</h3>
    <p>① 회원의 서비스 이용 범위 및 제한은 다음과 같습니다.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">구분</th><th className="border border-slate-300 p-2 text-left">내용</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">파일 업로드</td><td className="border border-slate-300 p-2">1회 업로드 시 최대 50MB, 지원 형식은 PDF, JPG, PNG</td></tr>
        <tr><td className="border border-slate-300 p-2">동시 접속</td><td className="border border-slate-300 p-2">1계정당 1기기에서만 동시 접속 가능</td></tr>
        <tr><td className="border border-slate-300 p-2">무료 회원</td><td className="border border-slate-300 p-2">가입 후 1개월간만 서비스 이용 가능</td></tr>
        <tr><td className="border border-slate-300 p-2">유료 회원</td><td className="border border-slate-300 p-2">기능 및 용량 제한 없이 서비스 이용 가능</td></tr>
      </tbody>
    </table>
    <p>② 회사는 서비스의 안정적 운영을 위해 필요한 경우 상기 제한 사항을 변경할 수 있으며, 변경 시 사전에 공지합니다.</p>

    <h3 className="font-semibold text-slate-900">제13조 (게시물의 관리)</h3>
    <p>① 회원이 서비스 내에 게시한 게시물의 저작권은 해당 게시물의 저작자에게 귀속됩니다.</p>
    <p>② 회원은 서비스에 다음 각 호에 해당하는 게시물을 등록할 수 없습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>타인의 권리나 명예, 신용 기타 정당한 이익을 침해하는 내용</li>
      <li>범죄행위와 관련이 있다고 판단되는 내용</li>
      <li>회사 또는 제3자의 저작권 등 지적재산권을 침해하는 내용</li>
      <li>회사 또는 제3자의 명예를 손상시키거나 업무를 방해하는 내용</li>
      <li>외설 또는 폭력적인 메시지, 화상, 음성 기타 공서양속에 반하는 내용</li>
      <li>다음의 개인정보 및 민감정보가 포함된 문서: 주민등록번호·여권번호·운전면허번호·외국인등록번호 등 개인 식별 정보 / 인감증명서·등기권리증 등 법적 권리·의무를 증명하는 문서 / 가족관계증명서·주민등록표 등·초본 등 신분관계 증명 문서 / 통장 사본·신용카드 정보 등 금융 정보가 포함된 문서 / 건강검진 결과·진료기록 등 의료정보가 포함된 문서 / 이력서·경력증명서 등 개인의 경력사항을 상세히 담은 문서</li>
    </ul>
    <p>③ 회원이 제2항에 해당하는 정보가 포함된 문서를 등록하고자 하는 경우, 반드시 해당 정보를 삭제하거나 마스킹(가림) 처리한 후 등록해야 합니다.</p>
    <p>④ 회사는 회원이 제2항을 위반하여 게시물을 등록한 경우, 사전 통지 없이 해당 게시물을 삭제하거나 게시를 거부할 수 있으며, 해당 회원의 서비스 이용을 제한하거나 이용계약을 해지할 수 있습니다.</p>
    <p>⑤ 회원이 제2항을 위반하여 게시한 게시물로 인해 회사 또는 제3자에게 손해가 발생한 경우, 해당 회원은 그 손해를 배상할 책임이 있습니다.</p>
    <p>⑥ 회사는 NFC 태그와 연동하여 사용하는 경우, 물리적 보관함에 담긴 문서의 종류 및 개략적인 내용만 파악할 수 있는 최소한의 정보만 등록할 것을 권장합니다.</p>

    <h3 className="font-semibold text-slate-900">제14조 (AI 서비스 제공 및 고지사항)</h3>
    <p>① 회사는 회원이 등록한 게시물에 대하여 다음의 AI 서비스를 제공합니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>AI OCR(광학문자인식): 이미지 또는 스캔 문서에서 텍스트 자동 추출</li>
      <li>문서 검색 및 분류: 문서 내용을 분석하여 자동 분류 및 검색 기능 제공</li>
      <li>질의응답: 채팅 또는 음성 명령을 통한 문서 정보 조회</li>
      <li>문서 요약 및 분석: 문서 내용의 요약 및 통계 분석</li>
    </ul>
    <p>② 회사는 AI 서비스 제공을 위해 구글 제미나이(Gemini) Pro 및 네이버 클로바 OCR 등 제3자가 제공하는 AI 모델을 활용합니다.</p>
    <p>③ AI OCR은 회원이 게시물을 업로드하는 즉시 실시간으로 처리되며, 처리 결과는 Supabase 클라우드 서버(AWS 기반)에 저장됩니다.</p>
    <p>④ 회사가 제공하는 AI 서비스는 다음과 같은 특성 및 제한사항이 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>AI 서비스는 보조적 정보 제공 수단이며, 법률, 회계, 세무, 의료, 인사 등 전문적 판단을 대체하지 않습니다.</li>
      <li>AI가 제공하는 정보의 완전성, 정확성, 최신성이 보장되지 않으므로, 회원은 최종 판단 시 반드시 원본 문서를 확인해야 합니다.</li>
      <li>AI 분석 결과는 참고 자료로만 활용되어야 하며, 중요한 의사결정의 유일한 근거로 사용되어서는 안 됩니다.</li>
    </ul>
    <p>⑤ 회사는 AI 서비스의 오류, 부정확성 또는 회원이 AI 서비스 결과를 신뢰하여 발생한 손해에 대하여 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</p>

    <h3 className="font-semibold text-slate-900">제15조 (AI 처리에 관한 회원의 권리)</h3>
    <p>① 회원은 AI 서비스가 제공한 결과에 대하여 다음의 권리를 행사할 수 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>설명 요청권: AI 처리 결과에 대한 설명을 요청할 권리</li>
      <li>이의제기권: 명백한 오류 또는 부적절한 결과에 대하여 이의를 제기할 권리</li>
      <li>인적 개입 요청권: 자동화된 처리에 대한 인적 검토를 요청할 권리</li>
    </ul>
    <p>② 회사는 제1항의 요청을 받은 경우 기술적으로 가능한 범위 내에서 이를 검토하고 필요한 조치를 취합니다.</p>
    <p>③ 회원은 고객센터(support@traystorage.net, 02-333-7334)를 통해 제1항의 권리를 행사할 수 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제16조 (게시물의 AI 학습 활용)</h3>
    <p>① 회사는 현재 회원의 게시물을 일반적인 AI 모델 학습 데이터로 활용하지 않습니다.</p>
    <p>② 다만, 서비스 품질 개선 및 기능 고도화를 위해 개인식별정보를 완전히 제거한 비식별화된 통계 정보의 생성 및 분석, 서비스 오류 개선 및 품질 향상을 위한 기술 검증 목적으로 게시물을 활용할 수 있습니다.</p>
    <p>③ 향후 회사가 AI 모델 학습을 위해 회원의 게시물을 활용하고자 하는 경우, 사전에 회원의 명시적 동의를 받습니다.</p>
    <p>④ 회원은 언제든지 자신의 게시물이 AI 학습에 활용되는 것을 거부할 수 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제17조 (개인정보의 보호 및 국외 이전)</h3>
    <p>① 회사는 관련 법령이 정하는 바에 따라 회원의 개인정보를 보호하기 위해 노력하며, 개인정보의 보호 및 이용에 대해서는 관련 법령 및 회사의 개인정보 처리방침이 적용됩니다.</p>
    <p>② 회사는 서비스 제공을 위해 회원의 게시물 및 개인정보를 클라우드 서버(Supabase, AWS 기반)에 저장하며, 해당 서버는 해외에 위치할 수 있습니다.</p>
    <p>③ 개인정보의 국외 이전에 관한 사항: 이전되는 개인정보 항목(회원정보, 게시물, AI 처리 결과), 이전 국가(미국 등 Supabase 서버 소재지), 이전 목적(클라우드 기반 서비스 제공 및 데이터 저장), 보유 및 이용 기간(회원 탈퇴 시까지 또는 관련 법령에 따른 보관 기간)</p>
    <p>④ 회사는 향후 국내 서버 전환을 검토할 수 있으며, 서버 위치 변경 시 사전에 공지합니다.</p>
    <p>⑤ 회사의 개인정보 처리방침은 서비스 화면 및 회사 홈페이지에서 확인할 수 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제18조 (회원의 의무)</h3>
    <p>① 회원은 다음 행위를 하여서는 안 됩니다: 신청 또는 변경 시 허위내용의 등록, 타인의 정보 도용, 회사 또는 제3자의 지적재산권 등 권리 침해, 회사 또는 제3자의 명예를 손상시키거나 업무를 방해하는 행위, 외설 또는 폭력적인 정보 게시, 회사의 동의 없이 영리를 목적으로 서비스를 사용하는 행위, 컴퓨터 바이러스 등 악성 프로그램을 유포하는 행위, 회사의 서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이 사용하거나 타인에게 제공하는 행위, 자동화된 수단을 이용하여 서비스에 무단 접근하거나 데이터를 수집하는 행위, 회사의 서버에 부정적인 영향을 미치거나 서비스 운영을 방해하는 행위, 기타 관련 법령에 위배되거나 선량한 풍속 기타 사회통념에 반하는 행위</p>
    <p>② 관리자는 부서 생성, 접근 권한 부여, 팀원 관리 등에 대한 책임을 부담하며, 권한 설정의 오류 또는 부적절한 권한 부여로 인해 발생한 문제에 대하여 일차적 책임을 집니다.</p>
    <p>③ 회원은 이 약관 및 관련 법령에서 규정한 사항을 준수하여야 합니다.</p>

    <h3 className="font-semibold text-slate-900">제19조 (권한 관리)</h3>
    <p>① 서비스는 관리자와 팀원으로 구분되는 역할 기반 권한 관리 체계를 운영합니다.</p>
    <p>② 관리자의 권한 및 책임: 부서 생성 및 삭제, 문서 대분류 및 세부 카테고리 생성 및 관리, 팀원별 부서 접근 권한 설정(접근불가/뷰어/편집자/관리자 4단계), 전체 부서의 문서 조회 및 통계 확인 (현재 조직당 관리자는 1명이며, 향후 복수의 관리자 지정이 가능하도록 업데이트될 수 있습니다.)</p>
    <p>③ 팀원의 권한: 자신이 속한 부서 내에서 문서 대분류 및 세부 카테고리 생성, 자신이 속한 부서의 문서 등록, 조회, 편집, 관리자가 허용한 타 부서의 문서에 대한 제한적 접근</p>
    <p>④ 타 부서 접근 권한 요청 절차: 팀원이 관리자에게 타 부서 접근 권한을 요청 → 관리자가 접근 수준을 설정 → 설정 완료 후 팀원은 해당 부서에 접근 가능</p>
    <p>⑤ 관리자는 권한 설정 시 최소 권한의 원칙에 따라 업무 수행에 필요한 최소한의 권한만 부여해야 합니다.</p>

    <h3 className="font-semibold text-slate-900">제20조 (회사의 의무)</h3>
    <p>① 회사는 관련 법령과 이 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 서비스를 제공하기 위하여 최선을 다하여 노력합니다.</p>
    <p>② 회사는 회원이 안전하게 서비스를 이용할 수 있도록 개인정보(신용정보 포함)보호를 위해 보안시스템을 갖추어야 하며 개인정보 처리방침을 공시하고 준수합니다.</p>
    <p>③ 회사는 서비스 이용과 관련하여 회원으로부터 제기된 의견이나 불만이 정당하다고 인정할 경우 이를 처리하여야 합니다.</p>
    <p>④ 회사는 생산물배상책임보험, 개인정보보호배상책임보험, 영업배상책임보험, 사이버보험에 가입하여 서비스 제공 중 발생할 수 있는 위험에 대비합니다.</p>

    <h3 className="font-semibold text-slate-900">제21조 (저작권의 귀속 및 이용제한)</h3>
    <p>① 회사가 작성한 저작물에 대한 저작권 기타 지적재산권은 회사에 귀속합니다.</p>
    <p>② 회원은 서비스를 이용함으로써 얻은 정보 중 회사에게 지적재산권이 귀속된 정보를 회사의 사전 승낙 없이 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.</p>
    <p>③ 회원이 서비스 내에 게시한 게시물의 저작권은 해당 게시물의 저작자에게 귀속됩니다.</p>
    <p>④ 회원은 서비스를 이용하여 취득한 정보를 가공, 판매하는 행위 등 서비스에 게재된 자료를 상업적으로 이용할 수 없습니다.</p>

    <h3 className="font-semibold text-slate-900">제22조 (NFC 제품 판매 및 하자 처리)</h3>
    <p>① 회사는 트레이 스토리지 제품(NFC 태그 포함)을 회사 직영 판매처 및 온라인 판매처(옥션, 지마켓, 11번가, 네이버 스마트스토어, 카페24 자사몰 등)를 통해 판매합니다.</p>
    <p>② 트레이 스토리지 제품에 하자가 있는 경우, 회원은 구입일로부터 1년 이내에 무상 A/S를 요청할 수 있습니다.</p>
    <p>③ 제품 하자에 대한 A/S 문의는 고객센터(02-333-7334, support@traystorage.net)로 접수할 수 있습니다.</p>
    <p>④ 제품의 교환, 반품, 환불에 관한 사항은 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령에 따릅니다.</p>

    <h3 className="font-semibold text-slate-900">제23조 (데이터 보관 및 백업)</h3>
    <p>① 회사는 회원의 게시물 및 서비스 이용 데이터를 안전하게 보관하기 위해 노력합니다.</p>
    <p>② 회원 탈퇴 시 회원의 게시물 및 개인정보는 즉시 삭제됩니다. 다만, 백업 데이터(1년), AI 처리 로그(1년), 관련 법령에 따라 보존이 필요한 정보(해당 법령에서 정한 기간)는 명시한 기간 동안 보관됩니다.</p>
    <p>③ 휴면회원으로 전환된 경우, 개인정보는 별도 분리 보관되며, 휴면 전환 후 3년이 경과하면 모든 데이터는 완전히 삭제됩니다.</p>
    <p>④ 회사는 천재지변, 해킹, 시스템 장애 등 불가항력적 사유로 인한 데이터 손실에 대하여 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</p>
    <p>⑤ 회원은 중요한 데이터에 대해서는 별도로 백업을 유지할 것을 권장합니다.</p>

    <h3 className="font-semibold text-slate-900">제24조 (면책조항)</h3>
    <p>① 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지, 해킹, DDOS 공격 등 회사의 귀책사유 없이 발생한 서비스 중단 및 그로 인한 손해에 대하여 책임을 지지 않습니다.</p>
    <p>② 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</p>
    <p>③ 회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않습니다.</p>
    <p>④ 회사는 회원이 서비스에 게재한 정보, 자료, 사실의 신뢰도, 정확성 등 내용에 관하여는 책임을 지지 않습니다.</p>
    <p>⑤ 회사는 회원 간 또는 회원과 제3자 상호간에 서비스를 매개로 하여 거래 등을 한 경우에는 책임을 지지 않습니다.</p>
    <p>⑥ 회사는 무료로 제공되는 서비스 이용과 관련하여 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.</p>
    <p>⑦ AI 서비스의 특성상 발생할 수 있는 오류, 부정확한 정보 제공, 예상치 못한 결과에 대하여 회사는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</p>

    <h3 className="font-semibold text-slate-900">제25조 (손해배상)</h3>
    <p>① 회사 또는 회원이 이 약관을 위반하여 상대방에게 손해를 입힌 경우, 그 손해를 배상할 책임이 있습니다. 다만, 고의 또는 과실이 없는 경우에는 그러하지 아니합니다.</p>
    <p>② 회사는 서비스 중단, 오류 등으로 인하여 회원에게 손해가 발생한 경우, 유료 회원에게는 1개월~3개월 무료 이용권을 제공하고, 무료 회원에게는 별도 보상하지 않습니다.</p>
    <p>③ 회사가 제공하는 보상은 현금 배상을 대체하는 것이 아니며, 회원은 손해의 정도에 따라 별도로 손해배상을 청구할 수 있습니다.</p>
    <p>④ 회원이 이 약관을 위반하여 회사에 손해가 발생한 경우, 회원은 회사에 대하여 그 손해를 배상할 책임이 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제26조 (분쟁의 해결)</h3>
    <p>① 회사는 회원이 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.</p>
    <p>② 회사는 회원으로부터 제출되는 불만사항 및 의견은 우선적으로 그 사항을 처리합니다. 다만, 신속한 처리가 곤란한 경우에는 회원에게 그 사유와 처리일정을 즉시 통보해 드립니다.</p>
    <p>③ 회사와 회원 간에 발생한 전자상거래 분쟁과 관련하여 회원의 피해구제신청이 있는 경우에는 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.</p>

    <h3 className="font-semibold text-slate-900">제27조 (재판권 및 준거법)</h3>
    <p>① 이 약관에 명시되지 않은 사항은 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 정보통신망법, 「개인정보 보호법」, 「인공지능 기본법」 등 관련 법령 및 상관례에 따릅니다.</p>
    <p>② 서비스 이용으로 발생한 분쟁에 대하여 소송이 필요한 경우, 민사소송법상의 관할법원에 제기합니다.</p>

    <h3 className="font-semibold text-slate-900">제28조 (고객센터)</h3>
    <p>회원은 서비스 이용과 관련하여 문의사항이 있는 경우 다음의 고객센터로 연락할 수 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>전화번호: 02-333-7334</li>
      <li>이메일: support@traystorage.net</li>
      <li>운영시간: 평일 09:00 ~ 18:00 (주말 및 공휴일 제외)</li>
    </ul>

    <h3 className="font-semibold text-slate-900">부칙</h3>
    <p><strong>제1조 (시행일)</strong> 이 약관은 2026년 2월 9일부터 시행합니다.</p>
    <p><strong>제2조 (경과조치)</strong> ① 이 약관 시행 이전에 가입한 회원에 대해서는 개정된 약관을 적용합니다. ② 베타 테스트 기간 중 가입한 회원에게는 유료 전환 시 별도의 우대 혜택이 제공될 수 있습니다.</p>

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

const TermsEn = () => (
  <>
    <p className="text-xs text-slate-500">Enacted: February 9, 2026 | Effective: February 9, 2026</p>

    <h3 className="font-semibold text-slate-900">Article 1 (Purpose)</h3>
    <p>These Terms of Service (hereinafter "Terms") are intended to prescribe the rights, obligations, and responsibilities between InfoCreative Co., Ltd. (hereinafter "Company") and its Members, as well as the conditions, procedures, and other necessary matters pertaining to the use of Tray Storage Connect (hereinafter "Service"), a document management service provided by the Company.</p>

    <h3 className="font-semibold text-slate-900">Article 2 (Definitions)</h3>
    <p>① The definitions of terms used in these Terms are as follows:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>"Service" refers to the online platform service provided by the Company that enables Members to store and manage their documents on a cloud-based system, and to explore, search, and analyze document information using artificial intelligence (AI) technology.</li>
      <li>"Tray Storage Connect" refers to the web and mobile-based platform operated by the Company for the provision of the Service.</li>
      <li>"Member" refers to any person who has agreed to these Terms and completed the membership registration process as prescribed by the Company to use the Service.</li>
      <li>"Administrator" refers to a Member who has been granted administrative privileges within an organization, including the ability to create departments, manage access permissions, and view overall document statistics.</li>
      <li>"Team Member" refers to a Member who may register, view, and edit documents within the scope of permissions granted by the Administrator.</li>
      <li>"Posting" refers to any and all materials uploaded to the Service by a Member, including document files, photographs, and images.</li>
      <li>"AI Service" refers to functionalities that provide document-related information through automated processes utilizing AI technology, including optical character recognition (OCR), document content analysis, search, summarization, classification, and question-answering. This includes third-party AI models such as Google Gemini and Naver Clova OCR.</li>
      <li>"AI OCR" refers to optical character recognition technology that automatically recognizes and extracts textual information from images or scanned documents.</li>
      <li>"Tray Storage Product" refers to a physical storage unit for paper documents sold by the Company, which can be linked to the Service via an attached NFC tag.</li>
      <li>"NFC Tag" refers to a sticker-type device that links the Tray Storage Product with the Service using Near Field Communication technology.</li>
    </ul>
    <p>② The meanings of terms not defined in these Terms shall be interpreted in accordance with applicable laws and general commercial practices.</p>

    <h3 className="font-semibold text-slate-900">Article 3 (Posting and Revision of Terms)</h3>
    <p>① The Company shall post the contents of these Terms on the initial screen of the Service or on the Company's website (www.traystorage.net) so that Members may easily access them.</p>
    <p>② The Company may revise these Terms to the extent that such revision does not violate applicable laws, including the Act on the Regulation of Terms and Conditions, the Act on Promotion of Information and Communications Network Utilization and Information Protection, Etc. (hereinafter "Network Act"), and the Act on Consumer Protection in Electronic Commerce, Etc.</p>
    <p>③ When the Company revises these Terms, it shall specify the details of the revision and the effective date, and shall post such notice on the Service and the Company's website at least seven (7) days prior to the effective date. However, if the revision involves changes that are disadvantageous or material to Members, such notice shall be posted at least thirty (30) days prior to the effective date, and individual notification shall be sent to Members via their registered email or mobile phone number.</p>
    <p>④ If the Company posts or notifies a revised version of the Terms pursuant to Paragraph 3 and clearly states that failure to express objection by the effective date shall be deemed as consent, and the Member does not expressly object, the Member shall be deemed to have agreed to the revised Terms.</p>
    <p>⑤ If a Member does not agree to the application of the revised Terms, the Company may not apply the revised Terms, and the Member may terminate the service agreement.</p>

    <h3 className="font-semibold text-slate-900">Article 4 (Supplementary Rules)</h3>
    <p>① Matters not stipulated in these Terms and the interpretation of these Terms shall be governed by applicable laws, including the Act on the Regulation of Terms and Conditions, the Network Act, the Personal Information Protection Act, the Act on Consumer Protection in Electronic Commerce, Etc., the Framework Act on Artificial Intelligence, the Framework Act on Electronic Documents and Electronic Commerce, and general commercial practices.</p>
    <p>② The Company may establish detailed service usage guidelines (operational policies) as necessary, and shall post them on the Service or notify Members through other means.</p>

    <h3 className="font-semibold text-slate-900">Article 5 (Membership Registration)</h3>
    <p>① A prospective user shall apply for membership by filling in the membership information in the form prescribed by the Company and expressing consent to these Terms.</p>
    <p>② The Company shall register applicants as Members unless any of the following circumstances apply:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>The applicant has previously lost membership status under these Terms; provided, however, that an exception may be made for a person who has obtained the Company's approval for re-registration after two (2) years have elapsed since the loss of membership status;</li>
      <li>The registration information contains false, incomplete, or erroneous information;</li>
      <li>The applicant applies for re-registration before seven (7) days have elapsed since withdrawal;</li>
      <li>A Member whose use has been suspended has unilaterally terminated the service agreement and applies for re-registration;</li>
      <li>Registration would otherwise significantly impede the Company's technical operations.</li>
    </ul>
    <p>③ The membership agreement shall be deemed to have been formed at the time the Company's acceptance reaches the Member.</p>
    <p>④ If there are any changes to the information registered at the time of membership registration, the Member shall promptly notify the Company of such changes via email or other means.</p>
    <p>⑤ The Company shall not be liable for any disadvantages arising from the Member's failure to notify the Company of changes pursuant to Paragraph 4.</p>

    <h3 className="font-semibold text-slate-900">Article 6 (Withdrawal and Loss of Membership)</h3>
    <p>① A Member may request withdrawal from membership at any time, and the Company shall process such withdrawal immediately.</p>
    <p>② If a Member falls under any of the following circumstances, the Company may restrict or suspend the Member's membership:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Registration of false information at the time of application;</li>
      <li>Interfering with other Members' use of the Service, misappropriating their information, or otherwise threatening the order of electronic commerce;</li>
      <li>Using the Service to engage in conduct that violates laws or these Terms, or that is contrary to public morals.</li>
    </ul>
    <p>③ After the Company has restricted or suspended a Member's membership, if the same conduct is repeated two (2) or more times or if the cause is not remedied within thirty (30) days, the Company may revoke the Member's membership.</p>
    <p>④ When the Company revokes a Member's membership, it shall cancel the membership registration. In such case, the Company shall notify the Member and provide at least thirty (30) days to present a defense before cancellation.</p>
    <p>⑤ Upon withdrawal or loss of membership, the Member's Postings and personal information shall be deleted immediately. However, information required to be retained under applicable laws and the Company's Privacy Policy shall be retained for the prescribed period before deletion.</p>

    <h3 className="font-semibold text-slate-900">Article 7 (Dormant Account Conversion)</h3>
    <p>① If a Member does not log in to the Service for one (1) year, the Company shall convert the Member to a dormant account and store the personal information separately.</p>
    <p>② Three (3) years after conversion to a dormant account, the Member's personal information and Postings shall be permanently deleted.</p>
    <p>③ The Company shall notify the Member of the scheduled dormant conversion via email or other means at least thirty (30) days prior to the conversion date.</p>
    <p>④ A dormant Member may reactivate the account and resume Service use by completing identity verification through login.</p>

    <h3 className="font-semibold text-slate-900">Article 8 (Provision and Modification of Services)</h3>
    <p>① The Company provides the following services to Members:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Cloud-based storage and management of document files and images;</li>
      <li>Department-based document classification and management;</li>
      <li>Linking with physical storage units via NFC tags;</li>
      <li>Automatic text recognition and extraction from documents via AI OCR;</li>
      <li>AI-powered document search, analysis, summarization, and question-answering;</li>
      <li>AI interface through chat and voice command;</li>
      <li>Supplementary features such as document retention period settings, statistical data, and notice postings;</li>
      <li>Access permission management (four levels: No Access / Viewer / Editor / Administrator);</li>
      <li>Any other services additionally developed by the Company or provided to Members through partnership agreements.</li>
    </ul>
    <p>② The Company may modify all or part of the Service for quality improvement, technological advancement, or operational necessity.</p>
    <p>③ If there are changes to the content, method, or hours of the Service, the Company shall post or notify Members of the reasons for change, the details of the modified Service, and the date of provision at least seven (7) days prior to the change.</p>
    <p>④ The Company may modify, suspend, or change all or part of any Service provided free of charge as necessary for its policies and operations, and shall not provide separate compensation to Members unless otherwise required by applicable laws.</p>

    <h3 className="font-semibold text-slate-900">Article 9 (Service Hours and Suspension)</h3>
    <p>① The Service shall be available 24 hours a day, 365 days a year, unless otherwise prevented by the Company's operational or technical circumstances.</p>
    <p>② Notwithstanding Paragraph 1, the Company may restrict or suspend all or part of the Service in the following cases:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Maintenance, replacement, or failure of information and communication equipment, or disruption of communications;</li>
      <li>Unavoidable construction work for service facilities;</li>
      <li>Power outages, equipment failures, or excessive traffic that impairs normal Service use;</li>
      <li>Circumstances such as termination of contracts with service providers that make it impossible to maintain the Service;</li>
      <li>Force majeure events such as natural disasters or national emergencies.</li>
    </ul>
    <p>③ The Company shall not be liable for any damages incurred by Members or third parties due to temporary suspension of Service pursuant to Paragraph 2, unless caused by the Company's willful misconduct or gross negligence.</p>
    <p>④ When suspending the Service, the Company shall post notice on the Service or notify Members at least seven (7) days in advance, except in cases of force majeure pursuant to Paragraph 3.</p>

    <h3 className="font-semibold text-slate-900">Article 10 (Paid Services and Payment)</h3>
    <p>① The Company may offer certain services on a paid basis, and Members who use paid services shall pay the applicable fees.</p>
    <p>② The Service is currently provided free of charge during the beta testing period. Upon conclusion of the beta test, the Service will transition to paid plans. The Company shall announce pricing plans and payment methods at least thirty (30) days prior to the paid transition.</p>
    <p>③ The anticipated pricing plans after beta testing are as follows (subject to change):</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Monthly subscription: Fees charged per user (estimated at KRW 20,000 per person per month);</li>
      <li>New Members shall receive one (1) month of free use upon initial registration.</li>
    </ul>
    <p>④ Members may pay service fees using the following payment methods: credit card payment; bank transfer; virtual account transfer; other payment methods designated by the Company.</p>
    <p>⑤ If a Member does not have legitimate authorization to use the payment method, or raises an objection to or refuses the payment after it has been made, the Company may suspend the provision of the Service.</p>

    <h3 className="font-semibold text-slate-900">Article 11 (Withdrawal of Subscription and Refund)</h3>
    <p>① A Member may withdraw the subscription within seven (7) days from the date of payment for a paid service, and the Company shall refund the full payment amount.</p>
    <p>② Notwithstanding Paragraph 1, withdrawal of subscription may be restricted in the following cases:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>The service has been destroyed or damaged due to reasons attributable to the Member;</li>
      <li>The value of the service has significantly decreased due to substantial use by the Member.</li>
    </ul>
    <p>③ If a refund is requested after seven (7) days from the payment date, the remaining balance after deducting one (1) month's usage fee shall be refunded.</p>
    <p>④ Refunds shall, in principle, be processed through the same payment method used by the Member. If a refund through the same method is not possible, the Company shall process the refund through an alternative method determined by the Company.</p>
    <p>⑤ Refund processing shall be completed within seven (7) business days from the date of the refund request.</p>

    <h3 className="font-semibold text-slate-900">Article 12 (Service Usage Limitations)</h3>
    <p>① The scope and limitations of Service usage by Members are as follows:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Category</th><th className="border border-slate-300 p-2 text-left">Details</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">File Upload</td><td className="border border-slate-300 p-2">Maximum 50 MB per upload; supported formats: PDF, JPG, PNG</td></tr>
        <tr><td className="border border-slate-300 p-2">Simultaneous Access</td><td className="border border-slate-300 p-2">Only one (1) device per account may be logged in simultaneously</td></tr>
        <tr><td className="border border-slate-300 p-2">Free Members</td><td className="border border-slate-300 p-2">Service is available for one (1) month from the date of registration</td></tr>
        <tr><td className="border border-slate-300 p-2">Paid Members</td><td className="border border-slate-300 p-2">Service is available without feature or capacity limitations</td></tr>
      </tbody>
    </table>
    <p>② The Company may change the above limitations as necessary for the stable operation of the Service, and shall provide prior notice of any such changes.</p>

    <h3 className="font-semibold text-slate-900">Article 13 (Management of Postings)</h3>
    <p>① The copyright of Postings made by a Member within the Service shall belong to the respective author of such Postings.</p>
    <p>② Members shall not register Postings that fall under any of the following categories:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Content that infringes on the rights, reputation, credibility, or other legitimate interests of others;</li>
      <li>Content deemed to be related to criminal activity;</li>
      <li>Content that infringes on the intellectual property rights of the Company or third parties;</li>
      <li>Content that damages the reputation or disrupts the operations of the Company or third parties;</li>
      <li>Obscene or violent messages, images, audio, or other content contrary to public morals;</li>
      <li>Documents containing sensitive personal information, including: personal identification numbers such as resident registration numbers, passport numbers, driver's license numbers, and alien registration numbers; documents certifying legal rights and obligations such as seal certificates and registration title deeds; documents certifying personal status such as family relation certificates and resident registration records; documents containing financial information such as copies of bank accounts and credit card information; documents containing medical information such as health checkup results and medical records; documents containing detailed personal career information such as resumes and career certificates.</li>
    </ul>
    <p>③ If a Member wishes to register documents containing information described in Paragraph 2, the Member must remove or mask (redact) such information before registration.</p>
    <p>④ If a Member registers Postings in violation of Paragraph 2, the Company may delete such Postings or refuse their publication without prior notice, and may restrict the Member's use of the Service or terminate the service agreement.</p>
    <p>⑤ If Postings registered by a Member in violation of Paragraph 2 cause damage to the Company or a third party, the Member shall be liable for such damages.</p>
    <p>⑥ When using the NFC tag linking feature, the Company recommends that Members register only the minimum information necessary to identify the type and general contents of documents stored in the physical storage unit.</p>

    <h3 className="font-semibold text-slate-900">Article 14 (Provision and Disclaimers for AI Services)</h3>
    <p>① The Company provides the following AI Services with respect to Postings registered by Members:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>AI OCR (Optical Character Recognition): Automatic text extraction from images or scanned documents;</li>
      <li>Document search and classification: Automated classification and search functionality based on document content analysis;</li>
      <li>Question-answering: Document information retrieval through chat or voice commands;</li>
      <li>Document summarization and analysis: Summarization and statistical analysis of document contents.</li>
    </ul>
    <p>② The Company utilizes third-party AI models, including Google Gemini Pro and Naver Clova OCR, for the provision of AI Services.</p>
    <p>③ AI OCR processes documents in real time as Members upload Postings, and the processing results are stored on Supabase cloud servers (AWS-based).</p>
    <p>④ The AI Services provided by the Company have the following characteristics and limitations:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>AI Services serve as supplementary information tools and do not replace professional judgment in areas such as law, accounting, taxation, medicine, or human resources;</li>
      <li>The completeness, accuracy, and currency of information provided by AI are not guaranteed; Members must verify against original documents when making final decisions;</li>
      <li>AI analysis results shall be used as reference materials only and shall not serve as the sole basis for important decision-making.</li>
    </ul>
    <p>⑤ The Company shall not be liable for errors, inaccuracies, or damages arising from a Member's reliance on AI Service results, unless caused by the Company's willful misconduct or gross negligence.</p>

    <h3 className="font-semibold text-slate-900">Article 15 (Member Rights Regarding AI Processing)</h3>
    <p>① Members may exercise the following rights with respect to results provided by the AI Service:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Right to explanation: The right to request an explanation of AI processing results;</li>
      <li>Right to object: The right to raise an objection regarding clearly erroneous or inappropriate results;</li>
      <li>Right to human intervention: The right to request human review of automated processing.</li>
    </ul>
    <p>② Upon receiving a request under Paragraph 1, the Company shall review and take necessary measures within technically feasible limits. However, due to the technical nature of AI Services, individual explanations or corrections for all processing results are not guaranteed.</p>
    <p>③ Members may exercise the rights under Paragraph 1 through the Customer Center (support@traystorage.net, +82-2-333-7334).</p>

    <h3 className="font-semibold text-slate-900">Article 16 (Use of Postings for AI Training)</h3>
    <p>① The Company does not currently use Members' Postings as training data for general AI models.</p>
    <p>② However, Postings may be used in the following limited cases for service quality improvement and feature enhancement: generation and analysis of de-identified statistical information from which all personally identifiable information has been completely removed; technical verification for service error correction and quality improvement.</p>
    <p>③ If the Company wishes to use Members' Postings for AI model training in the future, it shall obtain the Member's explicit prior consent. Even in such cases, Postings containing sensitive information as described in Article 13, Paragraph 2 shall be excluded from training data.</p>
    <p>④ Members may refuse to have their Postings used for AI training at any time, and the Company shall immediately exclude such Postings from training data.</p>

    <h3 className="font-semibold text-slate-900">Article 17 (Protection of Personal Information and Cross-Border Transfer)</h3>
    <p>① The Company shall endeavor to protect Members' personal information in accordance with applicable laws. The protection and use of personal information shall be governed by applicable laws and the Company's Privacy Policy.</p>
    <p>② The Company stores Members' Postings and personal information on cloud servers (Supabase, AWS-based) for service provision, and such servers may be located overseas.</p>
    <p>③ Details regarding the cross-border transfer of personal information are as follows: personal information items transferred (member information, Postings, AI processing results); destination country (United States and other locations where Supabase servers are situated); purpose of transfer (cloud-based service provision and data storage); retention and use period (until membership withdrawal or as required by applicable laws).</p>
    <p>④ The Company may consider transitioning to domestic servers in the future and shall provide prior notice of any change in server location.</p>
    <p>⑤ The Company's Privacy Policy is available on the Service and the Company's website.</p>

    <h3 className="font-semibold text-slate-900">Article 18 (Member Obligations)</h3>
    <p>① Members shall not engage in the following conduct: registering false information at the time of application or modification; misappropriating another person's information; infringing on the intellectual property rights or other rights of the Company or third parties; damaging the reputation or disrupting the operations of the Company or third parties; publicly disclosing or posting obscene or violent information, images, or audio; using the Service for commercial purposes without the Company's consent; distributing computer viruses or other malicious programs; using information obtained through the Service without the Company's prior consent or providing such information to third parties; gaining unauthorized access to the Service or collecting data using automated means; negatively affecting the Company's servers or interfering with service operations; any other conduct that violates applicable laws or is contrary to good morals and social norms.</p>
    <p>② Administrators shall bear responsibility for department creation, access permission assignment, and team member management. The Administrator shall bear primary liability for issues arising from errors in or inappropriate assignment of permissions.</p>
    <p>③ Members shall comply with the provisions of these Terms and applicable laws, and shall not engage in any conduct that interferes with the Company's operations.</p>

    <h3 className="font-semibold text-slate-900">Article 19 (Access Permission Management)</h3>
    <p>① The Service operates a role-based access permission management system divided into Administrators and Team Members.</p>
    <p>② The Administrator's permissions and responsibilities are as follows: creation and deletion of departments; creation and management of document main categories and subcategories; setting department access permissions for each Team Member (four levels: No Access / Viewer / Editor / Administrator); viewing documents and statistics across all departments. Currently, one (1) Administrator per organization is permitted; future updates may allow designation of multiple Administrators.</p>
    <p>③ Team Member permissions are as follows: creation of document main categories and subcategories within their assigned department; registration, viewing, and editing of documents within their assigned department; limited access to documents in other departments as permitted by the Administrator.</p>
    <p>④ The procedure for requesting access to other departments is as follows: the Team Member requests cross-department access from the Administrator → the Administrator sets the access level → upon completion, the Team Member may access the designated department.</p>
    <p>⑤ The Administrator shall adhere to the principle of least privilege when assigning permissions, granting only the minimum permissions necessary for task performance, and shall be liable for information leaks or other issues arising from unnecessary permission assignments.</p>

    <h3 className="font-semibold text-slate-900">Article 20 (Company Obligations)</h3>
    <p>① The Company shall not engage in conduct prohibited by applicable laws and these Terms or contrary to public morals, and shall endeavor to provide the Service on a continuous and stable basis.</p>
    <p>② The Company shall maintain security systems to protect personal information (including credit information) to ensure Members can use the Service safely, and shall publicly disclose and comply with its Privacy Policy.</p>
    <p>③ The Company shall address opinions or complaints raised by Members regarding Service use when deemed legitimate. The Company shall communicate the process and results of handling such opinions or complaints through bulletin boards or email.</p>
    <p>④ The Company maintains the following insurance policies to prepare for risks that may arise during Service provision: Product Liability Insurance; Personal Information Protection Liability Insurance; Commercial General Liability Insurance; Cyber Insurance.</p>

    <h3 className="font-semibold text-slate-900">Article 21 (Ownership and Restrictions on Intellectual Property)</h3>
    <p>① Copyright and other intellectual property rights to works created by the Company shall belong to the Company.</p>
    <p>② Members shall not reproduce, transmit, publish, distribute, broadcast, or otherwise use for commercial purposes, or allow third parties to use, any information to which the Company holds intellectual property rights that was obtained through the Service, without the Company's prior consent.</p>
    <p>③ The copyright of Postings made by a Member within the Service shall belong to the respective author of such Postings.</p>
    <p>④ Members shall not commercially exploit materials posted on the Service, including processing and selling information obtained through the Service.</p>

    <h3 className="font-semibold text-slate-900">Article 22 (NFC Product Sales and Defect Handling)</h3>
    <p>① The Company sells Tray Storage Products (including NFC tags) through the following channels: Company-owned direct sales outlets; online marketplaces (Auction, G-Market, 11st, Naver Smart Store, Cafe24 proprietary store, etc.).</p>
    <p>② If a Tray Storage Product is defective, the Member may request free after-sales service within one (1) year from the date of purchase.</p>
    <p>③ Inquiries regarding product defects may be submitted to the Customer Center (+82-2-333-7334, support@traystorage.net).</p>
    <p>④ Matters regarding product exchange, return, and refund shall be governed by applicable laws, including the Act on Consumer Protection in Electronic Commerce, Etc.</p>

    <h3 className="font-semibold text-slate-900">Article 23 (Data Retention and Backup)</h3>
    <p>① The Company shall endeavor to securely retain Members' Postings and Service usage data.</p>
    <p>② Upon membership withdrawal, the Member's Postings and personal information shall be deleted immediately. However, the following information shall be retained for the specified periods: backup data (one year); AI processing logs (one year); information required to be preserved under applicable laws (for the period prescribed by such laws).</p>
    <p>③ In the case of conversion to a dormant account, personal information shall be stored separately, and all data shall be permanently deleted three (3) years after dormant conversion.</p>
    <p>④ The Company shall not be liable for data loss caused by force majeure events such as natural disasters, hacking, or system failures, unless caused by the Company's willful misconduct or gross negligence.</p>
    <p>⑤ Members are advised to maintain separate backups of important data.</p>

    <h3 className="font-semibold text-slate-900">Article 24 (Disclaimer)</h3>
    <p>① The Company shall not be liable for service interruptions and resulting damages caused by events beyond the Company's control, including natural disasters, war, suspension of services by telecommunications carriers, hacking, and DDoS attacks.</p>
    <p>② The Company shall not be liable for service disruptions caused by reasons attributable to the Member.</p>
    <p>③ The Company shall not be liable for the loss of anticipated profits from the Member's use of the Service, nor for damages arising from materials obtained through the Service.</p>
    <p>④ The Company shall not be liable for the reliability, accuracy, or other aspects of the content of information, data, or facts posted by Members on the Service.</p>
    <p>⑤ The Company shall not be liable for transactions or other dealings conducted between Members or between a Member and a third party through the Service.</p>
    <p>⑥ The Company shall not be liable for matters related to the use of services provided free of charge, unless otherwise required by applicable laws.</p>
    <p>⑦ The Company shall not be liable for errors, inaccurate information, or unexpected results inherent to the nature of AI Services, unless caused by the Company's willful misconduct or gross negligence.</p>

    <h3 className="font-semibold text-slate-900">Article 25 (Damages)</h3>
    <p>① If the Company or a Member causes damage to the other party by violating these Terms, the party at fault shall be liable for such damages. However, this shall not apply where there is no willful misconduct or negligence.</p>
    <p>② If a Member suffers damage due to service interruptions, errors, or other causes, the Company shall address such damages as follows: for paid Members, provision of one (1) to three (3) months of free service; for free Members, no separate compensation.</p>
    <p>③ Compensation provided by the Company does not replace monetary damages, and Members may separately claim damages in proportion to the extent of their loss.</p>
    <p>④ If a Member causes damage to the Company by violating these Terms, the Member shall be liable to compensate the Company for such damages.</p>

    <h3 className="font-semibold text-slate-900">Article 26 (Dispute Resolution)</h3>
    <p>① The Company shall establish and operate a damage compensation processing body to reflect legitimate opinions or complaints raised by Members and to process damage claims.</p>
    <p>② The Company shall prioritize processing complaints and opinions submitted by Members. However, if prompt processing is not feasible, the Company shall immediately notify the Member of the reason and the expected processing schedule.</p>
    <p>③ In the event of an e-commerce dispute between the Company and a Member, and the Member files a request for damage relief, the dispute may be referred for mediation to a dispute resolution body commissioned by the Fair Trade Commission or a provincial governor.</p>

    <h3 className="font-semibold text-slate-900">Article 27 (Jurisdiction and Governing Law)</h3>
    <p>① Matters not stipulated in these Terms shall be governed by applicable laws, including the Act on Consumer Protection in Electronic Commerce, Etc., the Act on the Regulation of Terms and Conditions, the Network Act, the Personal Information Protection Act, the Framework Act on Artificial Intelligence, and general commercial practices.</p>
    <p>② Any litigation arising from the use of the Service shall be filed with the competent court under the Civil Procedure Act of the Republic of Korea.</p>

    <h3 className="font-semibold text-slate-900">Article 28 (Customer Center)</h3>
    <p>Members may contact the following Customer Center for inquiries regarding Service use:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Phone: +82-2-333-7334</li>
      <li>Email: support@traystorage.net</li>
      <li>Operating hours: Weekdays 09:00 – 18:00 KST (excluding weekends and public holidays)</li>
    </ul>

    <h3 className="font-semibold text-slate-900">Supplementary Provisions</h3>
    <p><strong>Article 1 (Effective Date)</strong> These Terms shall take effect on February 9, 2026.</p>
    <p><strong>Article 2 (Transitional Measures)</strong> ① Members who registered prior to the effective date of these Terms shall be subject to the revised Terms. ② Members who registered during the beta testing period may receive preferential benefits upon the transition to paid services.</p>

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

export const TermsOfServiceContent = () => {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? <TermsEn /> : <TermsKo />;
};

export default TermsOfServiceContent;
