import { useTranslation } from 'react-i18next';

const TermsKo = () => (
  <>
    <p className="text-xs text-slate-500">제정 2026.02.09. / 개정 2026.07.01. 시행 2026.07.01.</p>

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
      <li>"AI 서비스"란 광학문자인식(OCR), 문서 내용 분석, 검색, 요약, 분류, 질의응답 등 인공지능 기술을 활용하여 자동화된 방식으로 문서 관련 정보를 제공하는 기능을 말하며, OpenAI GPT 및 네이버 클로바 OCR 등 제3자가 제공하는 AI 모델을 포함합니다.</li>
      <li>"AI OCR"이란 이미지 또는 스캔된 문서에서 문자 정보를 자동으로 인식·추출하는 광학문자인식 기술을 말합니다.</li>
      <li>"무료 요금제"란 회사가 정한 범위 내에서 이용요금 없이 서비스를 이용할 수 있는 요금제를 말하며, 조직당 멤버 수 등 회사가 정한 제한이 적용됩니다.</li>
      <li>"유료 요금제"란 회원이 이용요금을 납부하고 회사가 제공하는 기본 기능을 이용할 수 있는 요금제(베이직 요금제 등)를 말합니다.</li>
      <li>"멤버"란 하나의 조직(회원 계정) 내에서 서비스를 이용하도록 등록된 관리자 및 팀원을 통칭하여 말합니다.</li>
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

    <h3 className="font-semibold text-slate-900">제10조 (요금제 및 결제)</h3>
    <p>① 회사는 서비스를 무료 요금제와 유료 요금제로 구분하여 제공합니다. 각 요금제의 구체적인 이용 범위 및 제한 사항은 제12조에서 정하는 바에 따릅니다.</p>
    <p>② 회사가 제공하는 요금제의 종류 및 이용요금은 다음과 같습니다. 표시된 이용요금은 부가가치세(VAT)가 포함된 금액입니다.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">요금제</th><th className="border border-slate-300 p-2 text-left">이용요금</th><th className="border border-slate-300 p-2 text-left">주요 내용</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">무료 요금제</td><td className="border border-slate-300 p-2">무료</td><td className="border border-slate-300 p-2">조직(회원 계정)당 최대 10명의 멤버까지 이용 가능</td></tr>
        <tr><td className="border border-slate-300 p-2">베이직 요금제</td><td className="border border-slate-300 p-2">멤버 1인당 월 6,600원 (최대 3인, 인원 추가 불가)</td><td className="border border-slate-300 p-2">유료 결제 시 회사가 제공하는 기본 기능을 모두 이용 가능</td></tr>
        <tr><td className="border border-slate-300 p-2">프로 요금제</td><td className="border border-slate-300 p-2">멤버 1인당 월 15,000원 (인원수 지정 가능)</td><td className="border border-slate-300 p-2">기본 기능에 더하여 AI 챗봇, NFC 등 고급 기능 이용 가능</td></tr>
      </tbody>
    </table>
    <p>③ 베이직 요금제는 멤버 1인당 월 6,600원(부가가치세 포함)의 정기 결제형 상품으로, 최대 3인까지만 구독할 수 있으며 구독 인원의 추가는 불가능합니다. 프로 요금제는 멤버 1인당 월 15,000원(부가가치세 포함)의 정기 결제형 상품으로, 회원이 필요한 인원수를 자유롭게 지정하여 구독할 수 있습니다.</p>
    <p>④ 유료 요금제(베이직·프로 요금제)를 결제한 회원은 회사가 제공하는 기본 기능을 모두 이용할 수 있습니다. 다만, 요금제별 이용 범위(구독 인원 수 등)는 제12조 및 서비스 화면에서 정하는 바에 따르며, 회사가 별도로 정한 부가 서비스 또는 추가 기능에 대해서는 별도의 요금이 부과될 수 있으며, 이 경우 사전에 공지합니다.</p>
    <p>⑤ 정기 결제는 최초 결제일을 기준으로 매월 같은 일자에 회원이 선택한 결제 수단으로 자동 결제되며, 회원이 해지하지 않는 한 1개월 단위로 자동 갱신됩니다. 매월 결제일이 정기적으로 도래하지 않는 경우(예: 31일이 없는 달) 해당 월의 말일에 결제되며, 결제일이 휴일 또는 공휴일인 경우에도 정상적으로 결제가 진행됩니다.</p>
    <p>⑥ 구독 기간 중 멤버를 추가하거나 감원하는 경우, 변경된 멤버 수는 다음 정기 결제일부터 반영됩니다. 다만 베이직 요금제는 최대 3인을 초과하여 멤버를 추가할 수 없으며, 3인을 초과하는 인원이 필요한 경우 프로 요금제로 전환해야 합니다. 멤버 추가에 따른 차액 정산 방식 등 세부 사항은 서비스 화면 또는 회사가 정한 운영정책에 따릅니다.</p>
    <p>⑦ 회원은 신용카드 결제, 무통장 입금, 가상계좌 이체, 기타 회사가 지정하는 결제 수단을 이용하여 이용요금을 납부할 수 있습니다.</p>
    <p>⑧ 회원이 결제 시 선택한 결제 수단의 한도 초과, 잔고 부족, 결제 수단의 임의 해지 등으로 이용요금을 체납하는 경우, 회사는 연체가 발생한 일자에 유료 요금제의 서비스 이용을 중단하거나 무료 요금제로 전환할 수 있습니다.</p>
    <p>⑨ 회원이 결제수단에 대해 정당한 사용권한을 가지고 있지 않거나, 결제 이후 해당 결제수단에 대한 이의를 제기하거나 결제를 거부하는 경우 회사는 서비스 제공을 중단할 수 있습니다.</p>
    <p>⑩ 회사는 이용요금을 서비스의 종류 및 기간에 따라 변경할 수 있으며, 이 경우 제3조에 따른 절차를 거쳐 공지 및 통지합니다. 다만 변경 이전에 계약한 금액은 소급하여 적용하지 않습니다.</p>

    <h3 className="font-semibold text-slate-900">제11조 (청약철회 및 환불)</h3>
    <p>① 유료 요금제를 신규로 결제한 회원은 결제일로부터 7일 이내에 서비스를 이용하지 아니한 경우 청약을 철회할 수 있으며, 이 경우 회사는 결제대금 전액을 환불합니다.</p>
    <p>② 제1항에도 불구하고 다음 각 호의 경우에는 청약철회가 제한될 수 있습니다.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>회원의 책임 있는 사유로 서비스가 멸실되거나 훼손된 경우</li>
      <li>회원이 서비스를 상당 부분 사용하여 그 가치가 현저히 감소한 경우</li>
    </ul>
    <p>③ 정기 결제형 유료 요금제를 이용 중인 회원이 결제일로부터 7일이 경과한 후 해지 및 환불을 요청하는 경우, 원칙적으로 이미 결제된 해당 결제 주기(당월)에 대한 환불은 이루어지지 않으며, 해당 결제 주기가 만료되는 시점까지 서비스 이용 권한은 유지되고 그 이후 자동 갱신이 중단됩니다.</p>
    <p>④ 회원이 정부가 고시하는 "콘텐츠이용자보호지침" 등 관련 법령에 따라 환불을 받을 수 있는 경우, 회사는 해당 지침이 정하는 범위 내에서 환불 수수료를 부과할 수 있습니다.</p>
    <p>⑤ 환불은 회원이 결제한 방법과 동일한 방법으로 처리하는 것을 원칙으로 하며, 동일한 방법으로 환불이 불가능한 경우 회사가 정하는 방법으로 환불합니다.</p>
    <p>⑥ 환불 처리는 환불 요청일로부터 영업일 기준 7일 이내에 완료됩니다.</p>
    <p>⑦ 무료 요금제 이용에 대하여는 환불 대상 금액이 존재하지 아니합니다.</p>

    <h3 className="font-semibold text-slate-900">제12조 (요금제별 서비스 이용 범위 및 제한)</h3>
    <p>① 무료 요금제와 유료 요금제의 서비스 이용 범위 및 제한은 다음과 같습니다.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">구분</th><th className="border border-slate-300 p-2 text-left">내용</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">파일 업로드</td><td className="border border-slate-300 p-2">1회 업로드 시 최대 50MB, 지원 형식은 PDF, JPG, PNG</td></tr>
        <tr><td className="border border-slate-300 p-2">동시 접속</td><td className="border border-slate-300 p-2">1계정당 1기기에서만 동시 접속 가능</td></tr>
        <tr><td className="border border-slate-300 p-2">무료 요금제</td><td className="border border-slate-300 p-2">조직(회원 계정)당 최대 10명의 멤버까지 이용 가능하며, 회사가 정한 기본 기능을 이용할 수 있습니다.</td></tr>
        <tr><td className="border border-slate-300 p-2">유료 요금제(베이직)</td><td className="border border-slate-300 p-2">멤버 1인당 월 6,600원(최대 3인, 인원 추가 불가)으로, 회사가 제공하는 기본 기능을 이용할 수 있습니다.</td></tr>
        <tr><td className="border border-slate-300 p-2">유료 요금제(프로)</td><td className="border border-slate-300 p-2">멤버 1인당 월 15,000원(인원수 지정 가능)으로, 회사가 제공하는 기본 기능 및 고급 기능을 이용할 수 있습니다.</td></tr>
      </tbody>
    </table>
    <p>② 무료 요금제를 이용 중인 조직의 멤버 수가 10명을 초과하게 되는 경우, 회사는 유료 요금제로의 전환을 안내할 수 있으며, 전환 전까지 멤버 추가 등 일부 기능의 이용이 제한될 수 있습니다.</p>
    <p>③ 회사는 서비스의 안정적 운영을 위해 필요한 경우 상기 제한 사항을 변경할 수 있으며, 변경 시 제3조에 따라 사전에 공지합니다.</p>

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
    <p>② 회사는 AI 서비스 제공을 위해 OpenAI GPT 및 네이버 클로바 OCR 등 제3자가 제공하는 AI 모델을 활용합니다.</p>
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
    <p>③ 회원은 멤버 등록 및 관리에 관한 책임을 부담하며, 유료 요금제 이용 시 등록된 멤버 수에 따라 이용요금이 산정됨을 인지하고 이를 준수하여야 합니다.</p>
    <p>④ 회원은 이 약관 및 관련 법령에서 규정한 사항을 준수하여야 합니다.</p>

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
    <p>④ 회사는 유료 결제와 관련한 결제사항 정보를 관련 법령에서 정한 기간 동안 보존합니다.</p>
    <p>⑤ 회사는 생산물배상책임보험, 개인정보보호배상책임보험, 영업배상책임보험, 사이버보험에 가입하여 서비스 제공 중 발생할 수 있는 위험에 대비합니다.</p>

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
    <p><strong>제1조 (시행일)</strong> 이 약관은 2026년 7월 1일부터 시행합니다.</p>
    <p><strong>제2조 (경과조치)</strong> ① 이 약관 시행 이전에 가입한 회원에 대해서는 개정된 약관을 적용합니다. ② 베타 테스트 기간 중 가입한 회원에게는 유료 요금제 전환 시 별도의 우대 혜택이 제공될 수 있습니다. ③ 이 약관 시행 당시 무료로 서비스를 이용 중인 회원은 무료 요금제 회원으로 전환되며, 멤버 수가 10명을 초과하는 경우 회사가 정한 유예기간 내에 유료 요금제로 전환하여야 합니다.</p>

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
    <p className="text-xs text-slate-500">Enacted: February 9, 2026 | Revised: July 1, 2026 | Effective: July 1, 2026</p>

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
      <li>"AI Service" refers to functionalities that provide document-related information through automated processes utilizing AI technology, including optical character recognition (OCR), document content analysis, search, summarization, classification, and question-answering. This includes third-party AI models such as OpenAI GPT and Naver Clova OCR.</li>
      <li>"AI OCR" refers to optical character recognition technology that automatically recognizes and extracts textual information from images or scanned documents.</li>
      <li>"Free Plan" refers to a pricing plan under which the Service may be used without usage fees within the scope determined by the Company, subject to limitations set by the Company such as the number of Seats per organization.</li>
      <li>"Paid Plan" refers to a pricing plan (such as the Basic Plan) under which a Member pays usage fees to use the basic features provided by the Company.</li>
      <li>"Seat" refers collectively to the Administrators and Team Members registered within a single organization (member account) to use the Service.</li>
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

    <h3 className="font-semibold text-slate-900">Article 10 (Pricing Plans and Payment)</h3>
    <p>① The Company provides the Service under two types of plans: the Free Plan and the Paid Plan. The specific scope of use and limitations of each plan shall be governed by Article 12.</p>
    <p>② The types of plans offered by the Company and their fees are as follows. The fees displayed are amounts inclusive of value-added tax (VAT).</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Plan</th><th className="border border-slate-300 p-2 text-left">Fee</th><th className="border border-slate-300 p-2 text-left">Key Details</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Free Plan</td><td className="border border-slate-300 p-2">Free</td><td className="border border-slate-300 p-2">Up to ten (10) Seats per organization (member account)</td></tr>
        <tr><td className="border border-slate-300 p-2">Basic Plan</td><td className="border border-slate-300 p-2">KRW 6,600 per Seat per month (up to 3 Seats; no additional Seats)</td><td className="border border-slate-300 p-2">Full access to the basic features provided by the Company upon paid subscription</td></tr>
        <tr><td className="border border-slate-300 p-2">Pro Plan</td><td className="border border-slate-300 p-2">KRW 15,000 per Seat per month (customizable number of Seats)</td><td className="border border-slate-300 p-2">Access to the basic features plus advanced features such as AI chatbot and NFC</td></tr>
      </tbody>
    </table>
    <p>③ The Basic Plan is a recurring subscription product priced at KRW 6,600 per Seat per month (VAT included), available for up to a maximum of three (3) Seats, and additional Seats cannot be added under the Basic Plan. The Pro Plan is a recurring subscription product priced at KRW 15,000 per Seat per month (VAT included), and Members may freely designate the number of Seats to subscribe to.</p>
    <p>④ A Member who has subscribed to a Paid Plan (Basic or Pro Plan) may use all basic features provided by the Company. However, the scope of use for each plan (such as the number of subscribed Seats) shall be governed by Article 12 and the Service screen, and separate fees may apply to add-on services or additional features separately determined by the Company, in which case prior notice shall be given.</p>
    <p>⑤ Recurring payments are automatically charged to the Member's selected payment method on the same date each month based on the initial payment date, and are automatically renewed on a monthly basis unless the Member cancels. If the payment date does not regularly occur in a given month (e.g., a month without the 31st), payment shall be made on the last day of that month, and payment shall proceed normally even if the payment date falls on a holiday or public holiday.</p>
    <p>⑥ If Seats are added or reduced during the subscription period, the changed number of Seats shall be reflected from the next recurring payment date. However, under the Basic Plan, Seats cannot be added beyond three (3); a Member requiring more than three (3) Seats must switch to the Pro Plan. Detailed matters such as the method of settling differences arising from added Seats shall be governed by the Service screen or the operational policy determined by the Company.</p>
    <p>⑦ Members may pay service fees using the following payment methods: credit card payment; bank transfer; virtual account transfer; other payment methods designated by the Company.</p>
    <p>⑧ If a Member fails to pay fees due to exceeding the limit of, insufficient balance in, or unilateral cancellation of the selected payment method, the Company may suspend the Paid Plan service or convert the account to the Free Plan on the date the delinquency occurs.</p>
    <p>⑨ If a Member does not have legitimate authorization to use the payment method, or raises an objection to or refuses the payment after it has been made, the Company may suspend the provision of the Service.</p>
    <p>⑩ The Company may change fees according to the type and period of the Service, in which case it shall provide notice and notification through the procedures under Article 3. However, amounts contracted prior to such change shall not be applied retroactively.</p>

    <h3 className="font-semibold text-slate-900">Article 11 (Withdrawal of Subscription and Refund)</h3>
    <p>① A Member who newly subscribes to a Paid Plan may withdraw the subscription within seven (7) days from the date of payment, provided that the Member has not used the Service, in which case the Company shall refund the full payment amount.</p>
    <p>② Notwithstanding Paragraph 1, withdrawal of subscription may be restricted in the following cases:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>The service has been destroyed or damaged due to reasons attributable to the Member;</li>
      <li>The value of the service has significantly decreased due to substantial use by the Member.</li>
    </ul>
    <p>③ If a Member using a recurring-payment Paid Plan requests cancellation and refund after seven (7) days have elapsed from the payment date, in principle no refund shall be made for the already-paid billing cycle (the current month); the right to use the Service shall be maintained until the end of that billing cycle, after which automatic renewal shall be discontinued.</p>
    <p>④ Where a Member is entitled to a refund under applicable laws such as the government-issued "Guidelines for the Protection of Content Users," the Company may charge a refund fee within the scope prescribed by such guidelines.</p>
    <p>⑤ Refunds shall, in principle, be processed through the same payment method used by the Member. If a refund through the same method is not possible, the Company shall process the refund through an alternative method determined by the Company.</p>
    <p>⑥ Refund processing shall be completed within seven (7) business days from the date of the refund request.</p>
    <p>⑦ No refundable amount exists for use of the Free Plan.</p>

    <h3 className="font-semibold text-slate-900">Article 12 (Service Usage Scope and Limitations by Plan)</h3>
    <p>① The scope of use and limitations of the Free Plan and the Paid Plan are as follows:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Category</th><th className="border border-slate-300 p-2 text-left">Details</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">File Upload</td><td className="border border-slate-300 p-2">Maximum 50 MB per upload; supported formats: PDF, JPG, PNG</td></tr>
        <tr><td className="border border-slate-300 p-2">Simultaneous Access</td><td className="border border-slate-300 p-2">Only one (1) device per account may be logged in simultaneously</td></tr>
        <tr><td className="border border-slate-300 p-2">Free Plan</td><td className="border border-slate-300 p-2">Up to ten (10) Seats per organization (member account); access to the basic features determined by the Company</td></tr>
        <tr><td className="border border-slate-300 p-2">Paid Plan (Basic)</td><td className="border border-slate-300 p-2">KRW 6,600 per Seat per month (up to 3 Seats; no additional Seats); access to the basic features provided by the Company</td></tr>
        <tr><td className="border border-slate-300 p-2">Paid Plan (Pro)</td><td className="border border-slate-300 p-2">KRW 15,000 per Seat per month (customizable number of Seats); access to the basic and advanced features provided by the Company</td></tr>
      </tbody>
    </table>
    <p>② If the number of Seats in an organization using the Free Plan exceeds ten (10), the Company may guide the organization to transition to the Paid Plan, and the use of certain features such as adding Seats may be restricted until the transition.</p>
    <p>③ The Company may change the above limitations as necessary for the stable operation of the Service, and shall provide prior notice of any such changes in accordance with Article 3.</p>

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
    <p>② The Company utilizes third-party AI models, including OpenAI GPT and Naver Clova OCR, for the provision of AI Services.</p>
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
    <p>③ Members shall bear responsibility for the registration and management of Seats and, when using a Paid Plan, shall acknowledge and comply with the fact that fees are calculated based on the number of registered Seats.</p>
    <p>④ Members shall comply with the provisions of these Terms and applicable laws, and shall not engage in any conduct that interferes with the Company's operations.</p>

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
    <p>④ The Company shall retain payment-related information concerning paid transactions for the period prescribed by applicable laws.</p>
    <p>⑤ The Company maintains the following insurance policies to prepare for risks that may arise during Service provision: Product Liability Insurance; Personal Information Protection Liability Insurance; Commercial General Liability Insurance; Cyber Insurance.</p>

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
    <p><strong>Article 1 (Effective Date)</strong> These Terms shall take effect on July 1, 2026.</p>
    <p><strong>Article 2 (Transitional Measures)</strong> ① Members who registered prior to the effective date of these Terms shall be subject to the revised Terms. ② Members who registered during the beta testing period may receive preferential benefits upon the transition to the Paid Plan. ③ Members using the Service free of charge as of the effective date of these Terms shall be converted to Free Plan members; if the number of Seats exceeds ten (10), they shall transition to a Paid Plan within the grace period determined by the Company.</p>

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

const TermsJa = () => (
  <>
    <p className="text-xs text-slate-500">制定 2026.02.09. / 改定 2026.07.01. 施行 2026.07.01.</p>

    <h3 className="font-semibold text-slate-900">第1条 (目的)</h3>
    <p>この約款は、株式会社インフォクリエイティブ（以下「当社」）が提供する文書管理サービスであるトレイストレージコネクト（以下「本サービス」）の利用に関して、当社と会員との間の権利、義務及び責任事項、本サービスの利用条件及び手続き、その他必要な事項を定めることを目的とします。</p>

    <h3 className="font-semibold text-slate-900">第2条 (定義)</h3>
    <p>① この約款で使用する用語の定義は次のとおりです。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>「本サービス」とは、会員が保有する文書をクラウドベースで保存・管理し、人工知能（AI）技術を活用して文書情報を探索・検索・分析できるよう当社が提供するオンラインプラットフォームサービスをいいます。</li>
      <li>「トレイストレージコネクト」とは、当社が本サービスを提供するために運営するウェブ及びモバイルベースのプラットフォームをいいます。</li>
      <li>「会員」とは、この約款に同意し、当社が定める手続きに従って会員登録を完了して本サービスを利用する者をいいます。</li>
      <li>「管理者」とは、組織内で部署の作成、権限管理、全体文書統計の確認等の管理機能を遂行できる権限を付与された会員をいいます。</li>
      <li>「チームメンバー」とは、管理者が付与した権限の範囲内で文書を登録・照会・編集できる会員をいいます。</li>
      <li>「投稿物」とは、会員が本サービスにアップロードした文書ファイル、写真、画像等一切の資料をいいます。</li>
      <li>「AIサービス」とは、光学文字認識（OCR）、文書内容分析、検索、要約、分類、質疑応答等、人工知能技術を活用して自動化された方式で文書関連情報を提供する機能をいい、OpenAI GPT及びNAVERクローバOCR等、第三者が提供するAIモデルを含みます。</li>
      <li>「AI OCR」とは、画像又はスキャンされた文書から文字情報を自動的に認識・抽出する光学文字認識技術をいいます。</li>
      <li>「無料プラン」とは、当社が定める範囲内で利用料金なしに本サービスを利用できるプランをいい、組織当たりのメンバー数等、当社が定める制限が適用されます。</li>
      <li>「有料プラン」とは、会員が利用料金を支払い、当社が提供する基本機能を利用できるプラン（ベーシックプラン等）をいいます。</li>
      <li>「メンバー」とは、一つの組織（会員アカウント）内で本サービスを利用するよう登録された管理者及びチームメンバーを総称していいます。</li>
      <li>「トレイストレージ製品」とは、紙文書を保管・管理するための物理的保管箱であり、NFCタグを取り付けて本サービスと連動できる当社の有料販売製品をいいます。</li>
      <li>「NFCタグ」とは、近距離無線通信（Near Field Communication）技術を活用してトレイストレージ製品と本サービスを連動するステッカー形態の装置をいいます。</li>
    </ul>
    <p>② この約款で定めていない用語の意味は、関連法令及び一般的な商取引の慣行に従います。</p>

    <h3 className="font-semibold text-slate-900">第3条 (約款の明示と改定)</h3>
    <p>① 当社は、この約款の内容を会員が容易に確認できるよう、本サービスの初期画面又は当社ホームページ（www.traystorage.net）に掲示します。</p>
    <p>② 当社は、「約款の規制に関する法律」、「情報通信網利用促進及び情報保護等に関する法律」（以下「情報通信網法」）、「電子商取引等における消費者保護に関する法律」等の関連法令に違反しない範囲でこの約款を改定することができます。</p>
    <p>③ 当社が約款を改定する場合、改定内容と適用日を明示して、適用日の7日前から本サービス画面及び当社ホームページに告知します。ただし、会員に不利又は重大な事項を変更する場合には、適用日の30日前から告知し、会員が登録した電子メール又は携帯電話番号へ個別に通知します。</p>
    <p>④ 当社が第3項により改定約款を告知又は通知する際、会員に適用日前までに意思表示をしなければ意思表示が表明されたものとみなす旨を明確に告知又は通知したにもかかわらず、会員が明示的に拒否の意思表示をしなかった場合、会員が改定約款に同意したものとみなします。</p>
    <p>⑤ 会員が改定約款の適用に同意しない場合、当社は改定約款の内容を適用することができず、この場合、会員は利用契約を解約することができます。</p>

    <h3 className="font-semibold text-slate-900">第4条 (約款外の準則)</h3>
    <p>① この約款で定めていない事項及びこの約款の解釈については、「約款の規制に関する法律」、情報通信網法、「個人情報保護法」、「電子商取引等における消費者保護に関する法律」、「人工知能基本法」、「電子文書及び電子取引基本法」等の関連法令又は商慣例に従います。</p>
    <p>② 当社は、必要な場合、本サービスの詳細利用指針（運営方針）を定めることができ、これを本サービス画面に掲示するか、その他の方法で会員に告知します。</p>

    <h3 className="font-semibold text-slate-900">第5条 (会員登録)</h3>
    <p>① 利用者は、当社が定める登録様式に従って会員情報を記入した後、この約款に同意するという意思表示をすることにより会員登録を申請します。</p>
    <p>② 当社は、第1項のとおり会員として登録することを申請した利用者のうち、次の各号に該当しない限り会員として登録します。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>登録申請者がこの約款により以前に会員資格を喪失したことがある場合（ただし、会員資格喪失後2年が経過した者であって、当社の会員再登録の承諾を得た場合は例外）</li>
      <li>登録内容に虚偽、記載漏れ、誤記がある場合</li>
      <li>会員退会後7日が経過していない者が再登録を申請する場合</li>
      <li>利用停止期間中にある会員が利用契約を任意に解約して再登録を申請する場合</li>
      <li>その他、会員として登録することが当社の技術上著しく支障があると判断される場合</li>
    </ul>
    <p>③ 会員登録契約の成立時期は、当社の承諾が会員に到達した時点とします。</p>
    <p>④ 会員は、会員登録時に登録した事項に変更がある場合、直ちに電子メールその他の方法で当社に対してその変更事項を知らせなければなりません。</p>
    <p>⑤ 第4項の変更事項を当社に知らせなかったことにより発生した不利益について、当社は責任を負いません。</p>

    <h3 className="font-semibold text-slate-900">第6条 (会員退会及び資格喪失)</h3>
    <p>① 会員はいつでも当社に退会を要請することができ、当社は直ちに会員退会を処理します。</p>
    <p>② 会員が次の各号の事由に該当する場合、当社は会員資格を制限及び停止させることができます。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>登録申請時に虚偽の内容を登録した場合</li>
      <li>他の会員の本サービス利用を妨害し、又はその情報を盗用する等、電子商取引の秩序を脅かす場合</li>
      <li>本サービスを利用して法令又はこの約款が禁止し、若しくは公序良俗に反する行為をする場合</li>
    </ul>
    <p>③ 当社が会員資格を制限・停止させた後、同一の行為が2回以上繰り返され、又は30日以内にその事由が是正されない場合、当社は会員資格を喪失させることができます。</p>
    <p>④ 当社が会員資格を喪失させる場合には、会員登録を抹消します。この場合、会員にこれを通知し、会員登録抹消前に最低30日以上の期間を定めて疎明する機会を付与します。</p>
    <p>⑤ 会員退会又は会員資格喪失時、会員の投稿物及び個人情報は直ちに削除されます。ただし、関連法令及び当社の個人情報処理方針により保管する必要がある情報は、一定期間保管後に削除します。</p>

    <h3 className="font-semibold text-slate-900">第7条 (休眠会員への転換)</h3>
    <p>① 会員が1年間本サービスにログインしない場合、当社は当該会員を休眠会員に転換し、個人情報を別途分離して保管します。</p>
    <p>② 休眠会員に転換された後3年が経過すると、会員の個人情報及び投稿物は完全に削除されます。</p>
    <p>③ 当社は、休眠会員転換予定日の30日前までに会員に電子メール等で休眠転換予定の事実を通知します。</p>
    <p>④ 休眠会員は、ログインを通じて本人確認手続きを経て休眠状態を解除し、本サービスを再開することができます。</p>

    <h3 className="font-semibold text-slate-900">第8条 (サービスの提供及び変更)</h3>
    <p>① 当社は、会員に次のようなサービスを提供します。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>文書ファイル及び画像のクラウドベースの保存及び管理サービス</li>
      <li>部署別文書分類及び管理機能</li>
      <li>NFCタグを活用した物理的保管箱との連動サービス</li>
      <li>AI OCRによる文書テキストの自動認識及び抽出</li>
      <li>AIベースの文書検索、分析、要約、質疑応答機能</li>
      <li>チャット及び音声命令方式のAIインターフェース</li>
      <li>文書保管期間設定、統計データ提供、お知らせ掲示等の付加機能</li>
      <li>権限管理機能（アクセス不可／ビューア／編集者／管理者の4段階）</li>
      <li>その他、当社が追加で開発し、又は提携契約等を通じて会員に提供する一切のサービス</li>
    </ul>
    <p>② 当社は、本サービスの品質向上、技術発展、運営上の必要に応じて、本サービスの全部又は一部を変更することができます。</p>
    <p>③ 本サービスの内容、利用方法、利用時間について変更がある場合には、変更事由、変更されるサービスの内容及び提供日等を、その変更前7日以上、本サービス画面に掲示し、又は会員に通知します。</p>
    <p>④ 当社は、無料で提供されるサービスの一部又は全部を、当社の方針及び運営の必要上、修正、中断、変更することができ、これについて関連法令に特別な規定がない限り、会員に別途の補償をしません。</p>

    <h3 className="font-semibold text-slate-900">第9条 (サービス利用時間及び中断)</h3>
    <p>① 本サービスの利用は、当社の業務上又は技術上特別な支障がない限り、年中無休、1日24時間を原則とします。</p>
    <p>② 第1項にもかかわらず、当社は次の各号の場合、本サービスの全部又は一部を制限し、又は中断することができます。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>コンピュータ等の情報通信設備の保守点検、交換及び故障、通信途絶等の事由が発生した場合</li>
      <li>本サービスのための設備の保守等の工事によりやむを得ない場合</li>
      <li>停電、諸設備の障害又は利用量の輻輳等により正常なサービス利用に支障がある場合</li>
      <li>サービス提供業者との契約終了等のような当社の諸事情により本サービスを維持できない場合</li>
      <li>その他、天災地変、国家非常事態等の不可抗力的事由がある場合</li>
    </ul>
    <p>③ 当社は、第2項の事由により本サービスの提供が一時的に中断されることにより会員又は第三者が被った損害について、当社の故意又は重過失がない限り責任を負いません。</p>
    <p>④ 当社は、本サービスを中断する場合、第3項の不可抗力的事由がある場合を除いては、最低7日前に本サービス画面に告知し、又は会員に通知します。</p>

    <h3 className="font-semibold text-slate-900">第10条 (プラン及び決済)</h3>
    <p>① 当社は、本サービスを無料プランと有料プランに区分して提供します。各プランの具体的な利用範囲及び制限事項は、第12条で定めるところに従います。</p>
    <p>② 当社が提供するプランの種類及び利用料金は次のとおりです。表示された利用料金は、付加価値税（VAT）が含まれた金額です。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">プラン</th><th className="border border-slate-300 p-2 text-left">利用料金</th><th className="border border-slate-300 p-2 text-left">主な内容</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">無料プラン</td><td className="border border-slate-300 p-2">無料</td><td className="border border-slate-300 p-2">組織（会員アカウント）当たり最大10名のメンバーまで利用可能</td></tr>
        <tr><td className="border border-slate-300 p-2">ベーシックプラン</td><td className="border border-slate-300 p-2">メンバー1人当たり月6,600ウォン（最大3人、人数追加不可）</td><td className="border border-slate-300 p-2">有料決済時、当社が提供する基本機能をすべて利用可能</td></tr>
        <tr><td className="border border-slate-300 p-2">プロプラン</td><td className="border border-slate-300 p-2">メンバー1人当たり月15,000ウォン（人数指定可能）</td><td className="border border-slate-300 p-2">基本機能に加え、AIチャットボット、NFC等の高度な機能を利用可能</td></tr>
      </tbody>
    </table>
    <p>③ ベーシックプランは、メンバー1人当たり月6,600ウォン（付加価値税込み）の定期決済型商品であり、最大3人まで購読することができ、購読中のメンバー追加はできません。プロプランは、メンバー1人当たり月15,000ウォン（付加価値税込み）の定期決済型商品であり、会員が必要な人数を自由に指定して購読することができます。</p>
    <p>④ 有料プラン（ベーシック・プロプラン）を決済した会員は、当社が提供する基本機能を利用することができます。ただし、プランごとの利用範囲（購読人数等）は第12条及び本サービス画面に従い、当社が別途定める付加サービス又は追加機能については、別途の料金が課される場合があり、この場合は事前に告知します。</p>
    <p>⑤ 定期決済は、最初の決済日を基準に毎月同じ日付に会員が選択した決済手段で自動決済され、会員が解約しない限り1か月単位で自動更新されます。毎月の決済日が定期的に到来しない場合（例：31日がない月）は当該月の末日に決済され、決済日が休日又は祝日である場合にも正常に決済が進行します。</p>
    <p>⑥ 購読期間中にメンバーを追加又は減員する場合、変更されたメンバー数は次回の定期決済日から反映されます。ただし、ベーシックプランでは最大3人を超えてメンバーを追加することはできず、3人を超える人数が必要な場合はプロプランへの転換が必要です。メンバー追加に伴う差額精算方式等の詳細事項は、本サービス画面又は当社が定める運営方針に従います。</p>
    <p>⑦ 会員は、クレジットカード決済、銀行振込、仮想口座振替、その他当社が指定する決済手段を利用して利用料金を納付することができます。</p>
    <p>⑧ 会員が決済時に選択した決済手段の限度超過、残高不足、決済手段の任意解約等により利用料金を滞納する場合、当社は延滞が発生した日に有料プランのサービス利用を中断し、又は無料プランに転換することができます。</p>
    <p>⑨ 会員が決済手段について正当な使用権限を有していない場合、又は決済以後に当該決済手段について異議を申し立て、若しくは決済を拒否する場合、当社は本サービスの提供を中断することができます。</p>
    <p>⑩ 当社は、利用料金を本サービスの種類及び期間に応じて変更することができ、この場合、第3条による手続きを経て告知及び通知します。ただし、変更以前に契約した金額は遡及して適用しません。</p>

    <h3 className="font-semibold text-slate-900">第11条 (申込みの撤回及び返金)</h3>
    <p>① 有料プランを新規に決済した会員は、決済日から7日以内に本サービスを利用しなかった場合、申込みを撤回することができ、この場合、当社は決済代金の全額を返金します。</p>
    <p>② 第1項にもかかわらず、次の各号の場合には申込みの撤回が制限される場合があります。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>会員の責めに帰すべき事由により本サービスが滅失又は毀損した場合</li>
      <li>会員が本サービスを相当部分使用してその価値が著しく減少した場合</li>
    </ul>
    <p>③ 定期決済型の有料プランを利用中の会員が、決済日から7日が経過した後に解約及び返金を要請する場合、原則としてすでに決済された当該決済周期（当月分）についての返金は行われず、当該決済周期が満了する時点までサービス利用権限は維持され、その後の自動更新が中断されます。</p>
    <p>④ 会員が、政府が告示する「コンテンツ利用者保護指針」等の関連法令により返金を受けることができる場合、当社は当該指針が定める範囲内で返金手数料を課すことができます。</p>
    <p>⑤ 返金は、会員が決済した方法と同一の方法で処理することを原則とし、同一の方法で返金が不可能な場合は、当社が定める方法で返金します。</p>
    <p>⑥ 返金処理は、返金要請日から営業日基準で7日以内に完了します。</p>
    <p>⑦ 無料プランの利用については、返金対象となる金額は存在しません。</p>

    <h3 className="font-semibold text-slate-900">第12条 (プラン別サービス利用範囲及び制限)</h3>
    <p>① 無料プランと有料プランのサービス利用範囲及び制限は次のとおりです。</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">区分</th><th className="border border-slate-300 p-2 text-left">内容</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">ファイルアップロード</td><td className="border border-slate-300 p-2">1回のアップロード時最大50MB、対応形式はPDF、JPG、PNG</td></tr>
        <tr><td className="border border-slate-300 p-2">同時接続</td><td className="border border-slate-300 p-2">1アカウント当たり1台の端末でのみ同時接続可能</td></tr>
        <tr><td className="border border-slate-300 p-2">無料プラン</td><td className="border border-slate-300 p-2">組織（会員アカウント）当たり最大10名のメンバーまで利用可能であり、当社が定める基本機能を利用することができます。</td></tr>
        <tr><td className="border border-slate-300 p-2">有料プラン（ベーシック）</td><td className="border border-slate-300 p-2">メンバー1人当たり月6,600ウォン（最大3人、人数追加不可）で、当社が提供する基本機能を利用することができます。</td></tr>
        <tr><td className="border border-slate-300 p-2">有料プラン（プロ）</td><td className="border border-slate-300 p-2">メンバー1人当たり月15,000ウォン（人数指定可能）で、当社が提供する基本機能及び高度な機能を利用することができます。</td></tr>
      </tbody>
    </table>
    <p>② 無料プランを利用中の組織のメンバー数が10名を超過することになる場合、当社は有料プランへの転換を案内することができ、転換前まではメンバー追加等一部機能の利用が制限される場合があります。</p>
    <p>③ 当社は、本サービスの安定的運営のために必要な場合、上記の制限事項を変更することができ、変更時には第3条により事前に告知します。</p>

    <h3 className="font-semibold text-slate-900">第13条 (投稿物の管理)</h3>
    <p>① 会員が本サービス内に掲載した投稿物の著作権は、当該投稿物の著作者に帰属します。</p>
    <p>② 会員は、本サービスに次の各号に該当する投稿物を登録することはできません。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>他人の権利や名誉、信用その他正当な利益を侵害する内容</li>
      <li>犯罪行為と関連があると判断される内容</li>
      <li>当社又は第三者の著作権等の知的財産権を侵害する内容</li>
      <li>当社又は第三者の名誉を毀損し、又は業務を妨害する内容</li>
      <li>わいせつ又は暴力的なメッセージ、画像、音声その他公序良俗に反する内容</li>
      <li>次の個人情報及び機微情報が含まれた文書：住民登録番号・パスポート番号・運転免許番号・外国人登録番号等の個人識別情報／印鑑証明書・登記権利証等の法的権利・義務を証明する文書／家族関係証明書・住民登録票謄本・抄本等の身分関係証明文書／通帳の写し・クレジットカード情報等の金融情報が含まれた文書／健康診断結果・診療記録等の医療情報が含まれた文書／履歴書・経歴証明書等の個人の経歴事項を詳細に記載した文書</li>
    </ul>
    <p>③ 会員が第2項に該当する情報が含まれた文書を登録しようとする場合、必ず当該情報を削除し、又はマスキング（隠し）処理した後に登録しなければなりません。</p>
    <p>④ 当社は、会員が第2項に違反して投稿物を登録した場合、事前通知なく当該投稿物を削除し、又は掲載を拒否することができ、当該会員の本サービス利用を制限し、又は利用契約を解約することができます。</p>
    <p>⑤ 会員が第2項に違反して掲載した投稿物により当社又は第三者に損害が発生した場合、当該会員はその損害を賠償する責任があります。</p>
    <p>⑥ 当社は、NFCタグと連動して使用する場合、物理的保管箱に入れられた文書の種類及び概略的な内容のみ把握できる最小限の情報のみを登録することを推奨します。</p>

    <h3 className="font-semibold text-slate-900">第14条 (AIサービスの提供及び告知事項)</h3>
    <p>① 当社は、会員が登録した投稿物に対して次のAIサービスを提供します。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>AI OCR（光学文字認識）：画像又はスキャン文書からのテキスト自動抽出</li>
      <li>文書検索及び分類：文書内容を分析して自動分類及び検索機能を提供</li>
      <li>質疑応答：チャット又は音声命令を通じた文書情報の照会</li>
      <li>文書要約及び分析：文書内容の要約及び統計分析</li>
    </ul>
    <p>② 当社は、AIサービスの提供のため、OpenAI GPT及びNAVERクローバOCR等、第三者が提供するAIモデルを活用します。</p>
    <p>③ AI OCRは、会員が投稿物をアップロードすると直ちにリアルタイムで処理され、処理結果はSupabaseクラウドサーバー（AWSベース）に保存されます。</p>
    <p>④ 当社が提供するAIサービスは、次のような特性及び制限事項があります。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>AIサービスは補助的な情報提供手段であり、法律、会計、税務、医療、人事等の専門的判断に代わるものではありません。</li>
      <li>AIが提供する情報の完全性、正確性、最新性は保証されないため、会員は最終判断時に必ず原本文書を確認しなければなりません。</li>
      <li>AI分析結果は参考資料としてのみ活用されるべきであり、重要な意思決定の唯一の根拠として使用されてはなりません。</li>
    </ul>
    <p>⑤ 当社は、AIサービスの誤り、不正確性、又は会員がAIサービスの結果を信頼して発生した損害について、故意又は重過失がない限り責任を負いません。</p>

    <h3 className="font-semibold text-slate-900">第15条 (AI処理に関する会員の権利)</h3>
    <p>① 会員は、AIサービスが提供した結果に対して次の権利を行使することができます。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>説明要請権：AI処理結果に対する説明を要請する権利</li>
      <li>異議申立権：明白な誤り又は不適切な結果について異議を申し立てる権利</li>
      <li>人的介入要請権：自動化された処理に対する人的検討を要請する権利</li>
    </ul>
    <p>② 当社は、第1項の要請を受けた場合、技術的に可能な範囲内でこれを検討し、必要な措置を取ります。</p>
    <p>③ 会員は、カスタマーセンター（support@traystorage.net、02-333-7334）を通じて第1項の権利を行使することができます。</p>

    <h3 className="font-semibold text-slate-900">第16条 (投稿物のAI学習への活用)</h3>
    <p>① 当社は、現在、会員の投稿物を一般的なAIモデルの学習データとして活用しません。</p>
    <p>② ただし、サービス品質改善及び機能高度化のため、個人識別情報を完全に除去した非識別化された統計情報の生成及び分析、サービスの誤り改善及び品質向上のための技術検証の目的で投稿物を活用することができます。</p>
    <p>③ 今後、当社がAIモデルの学習のために会員の投稿物を活用しようとする場合、事前に会員の明示的同意を得ます。</p>
    <p>④ 会員はいつでも、自身の投稿物がAI学習に活用されることを拒否することができます。</p>

    <h3 className="font-semibold text-slate-900">第17条 (個人情報の保護及び国外移転)</h3>
    <p>① 当社は、関連法令の定めるところに従って会員の個人情報を保護するよう努力し、個人情報の保護及び利用については、関連法令及び当社の個人情報処理方針が適用されます。</p>
    <p>② 当社は、本サービスの提供のため、会員の投稿物及び個人情報をクラウドサーバー（Supabase、AWSベース）に保存し、当該サーバーは海外に所在する場合があります。</p>
    <p>③ 個人情報の国外移転に関する事項：移転される個人情報の項目（会員情報、投稿物、AI処理結果）、移転先の国（米国等Supabaseサーバー所在地）、移転目的（クラウドベースのサービス提供及びデータ保存）、保有及び利用期間（会員退会時まで又は関連法令による保管期間）</p>
    <p>④ 当社は、今後、国内サーバーへの転換を検討することができ、サーバー位置の変更時には事前に告知します。</p>
    <p>⑤ 当社の個人情報処理方針は、本サービス画面及び当社ホームページで確認することができます。</p>

    <h3 className="font-semibold text-slate-900">第18条 (会員の義務)</h3>
    <p>① 会員は、次の行為をしてはなりません：申請又は変更時の虚偽内容の登録、他人の情報の盗用、当社又は第三者の知的財産権等の権利侵害、当社又は第三者の名誉を毀損し若しくは業務を妨害する行為、わいせつ又は暴力的な情報の掲示、当社の同意なく営利を目的として本サービスを使用する行為、コンピュータウイルス等の悪性プログラムを流布する行為、当社のサービスを利用して得た情報を当社の事前承諾なく使用し若しくは他人に提供する行為、自動化された手段を利用して本サービスに無断でアクセスし若しくはデータを収集する行為、当社のサーバーに否定的な影響を及ぼし若しくはサービス運営を妨害する行為、その他関連法令に違反し若しくは善良な風俗その他の社会通念に反する行為</p>
    <p>② 管理者は、部署の作成、アクセス権限の付与、チームメンバー管理等についての責任を負い、権限設定の誤り又は不適切な権限付与により発生した問題について第一次的責任を負います。</p>
    <p>③ 会員は、メンバーの登録及び管理に関する責任を負い、有料プランの利用時に登録されたメンバー数に応じて利用料金が算定されることを認識し、これを遵守しなければなりません。</p>
    <p>④ 会員は、この約款及び関連法令で定める事項を遵守しなければなりません。</p>

    <h3 className="font-semibold text-slate-900">第19条 (権限管理)</h3>
    <p>① 本サービスは、管理者とチームメンバーに区分される役割ベースの権限管理体系を運営します。</p>
    <p>② 管理者の権限及び責任：部署の作成及び削除、文書の大分類及び詳細カテゴリの作成及び管理、チームメンバー別の部署アクセス権限の設定（アクセス不可／ビューア／編集者／管理者の4段階）、全部署の文書照会及び統計確認（現在、組織当たり管理者は1名であり、今後、複数の管理者の指定が可能となるよう更新される場合があります。）</p>
    <p>③ チームメンバーの権限：自身が所属する部署内での文書の大分類及び詳細カテゴリの作成、自身が所属する部署の文書の登録、照会、編集、管理者が許可した他部署の文書に対する制限的アクセス</p>
    <p>④ 他部署アクセス権限の要請手続き：チームメンバーが管理者に他部署アクセス権限を要請 → 管理者がアクセスレベルを設定 → 設定完了後、チームメンバーは当該部署にアクセス可能</p>
    <p>⑤ 管理者は、権限設定時に最小権限の原則に従い、業務遂行に必要な最小限の権限のみを付与しなければなりません。</p>

    <h3 className="font-semibold text-slate-900">第20条 (当社の義務)</h3>
    <p>① 当社は、関連法令とこの約款が禁止し、又は美風良俗に反する行為をせず、継続的かつ安定的に本サービスを提供するために最善を尽くして努力します。</p>
    <p>② 当社は、会員が安全に本サービスを利用できるよう、個人情報（信用情報を含む）保護のためのセキュリティシステムを備えなければならず、個人情報処理方針を公示し遵守します。</p>
    <p>③ 当社は、本サービスの利用に関連して会員から提起された意見や不満が正当であると認める場合、これを処理しなければなりません。</p>
    <p>④ 当社は、有料決済に関する決済事項情報を、関連法令で定める期間保存します。</p>
    <p>⑤ 当社は、生産物賠償責任保険、個人情報保護賠償責任保険、営業賠償責任保険、サイバー保険に加入し、本サービス提供中に発生し得る危険に備えます。</p>

    <h3 className="font-semibold text-slate-900">第21条 (著作権の帰属及び利用制限)</h3>
    <p>① 当社が作成した著作物に対する著作権その他の知的財産権は当社に帰属します。</p>
    <p>② 会員は、本サービスを利用することにより得た情報のうち、当社に知的財産権が帰属する情報を、当社の事前承諾なく営利目的で利用し、又は第三者に利用させてはなりません。</p>
    <p>③ 会員が本サービス内に掲載した投稿物の著作権は、当該投稿物の著作者に帰属します。</p>
    <p>④ 会員は、本サービスを利用して取得した情報を加工、販売する行為等、本サービスに掲載された資料を商業的に利用することはできません。</p>

    <h3 className="font-semibold text-slate-900">第22条 (NFC製品の販売及び瑕疵処理)</h3>
    <p>① 当社は、トレイストレージ製品（NFCタグを含む）を、当社直営販売店及びオンライン販売店（オークション、Gマーケット、11st、NAVERスマートストア、Cafe24自社モール等）を通じて販売します。</p>
    <p>② トレイストレージ製品に瑕疵がある場合、会員は購入日から1年以内に無償A/Sを要請することができます。</p>
    <p>③ 製品の瑕疵に関するA/Sのお問い合わせは、カスタマーセンター（02-333-7334、support@traystorage.net）へ受け付けることができます。</p>
    <p>④ 製品の交換、返品、返金に関する事項は、「電子商取引等における消費者保護に関する法律」等の関連法令に従います。</p>

    <h3 className="font-semibold text-slate-900">第23条 (データ保管及びバックアップ)</h3>
    <p>① 当社は、会員の投稿物及びサービス利用データを安全に保管するよう努力します。</p>
    <p>② 会員退会時、会員の投稿物及び個人情報は直ちに削除されます。ただし、バックアップデータ（1年）、AI処理ログ（1年）、関連法令により保存が必要な情報（当該法令で定める期間）は、明示した期間保管されます。</p>
    <p>③ 休眠会員に転換された場合、個人情報は別途分離保管され、休眠転換後3年が経過すると、すべてのデータは完全に削除されます。</p>
    <p>④ 当社は、天災地変、ハッキング、システム障害等の不可抗力的事由によるデータ損失について、故意又は重過失がない限り責任を負いません。</p>
    <p>⑤ 会員は、重要なデータについては別途バックアップを維持することを推奨します。</p>

    <h3 className="font-semibold text-slate-900">第24条 (免責条項)</h3>
    <p>① 当社は、天災地変、戦争、基幹通信事業者のサービス中止、ハッキング、DDoS攻撃等、当社の帰責事由なく発生したサービス中断及びそれによる損害について責任を負いません。</p>
    <p>② 当社は、会員の帰責事由によるサービス利用の障害について責任を負いません。</p>
    <p>③ 当社は、会員が本サービスを利用して期待する収益を喪失したことについて責任を負いません。</p>
    <p>④ 当社は、会員が本サービスに掲載した情報、資料、事実の信頼度、正確性等の内容については責任を負いません。</p>
    <p>⑤ 当社は、会員間又は会員と第三者相互間で本サービスを媒介として取引等を行った場合には責任を負いません。</p>
    <p>⑥ 当社は、無料で提供されるサービスの利用に関連して、関連法令に特別な規定がない限り責任を負いません。</p>
    <p>⑦ AIサービスの特性上発生し得る誤り、不正確な情報提供、予期しない結果について、当社は故意又は重過失がない限り責任を負いません。</p>

    <h3 className="font-semibold text-slate-900">第25条 (損害賠償)</h3>
    <p>① 当社又は会員がこの約款に違反して相手方に損害を与えた場合、その損害を賠償する責任があります。ただし、故意又は過失がない場合には、この限りではありません。</p>
    <p>② 当社は、サービス中断、誤り等により会員に損害が発生した場合、有料会員には1か月～3か月の無料利用券を提供し、無料会員には別途補償しません。</p>
    <p>③ 当社が提供する補償は現金賠償に代わるものではなく、会員は損害の程度に応じて別途損害賠償を請求することができます。</p>
    <p>④ 会員がこの約款に違反して当社に損害が発生した場合、会員は当社に対してその損害を賠償する責任があります。</p>

    <h3 className="font-semibold text-slate-900">第26条 (紛争の解決)</h3>
    <p>① 当社は、会員が提起する正当な意見や不満を反映し、その被害を補償処理するため、被害補償処理機構を設置・運営します。</p>
    <p>② 当社は、会員から提出される不満事項及び意見は優先的にその事項を処理します。ただし、迅速な処理が困難な場合には、会員にその事由と処理日程を直ちに通報いたします。</p>
    <p>③ 当社と会員との間で発生した電子商取引紛争に関連して会員の被害救済申請がある場合には、公正取引委員会又は市・道知事が依頼する紛争調停機関の調停に従うことができます。</p>

    <h3 className="font-semibold text-slate-900">第27条 (裁判権及び準拠法)</h3>
    <p>① この約款に明示されていない事項は、「電子商取引等における消費者保護に関する法律」、「約款の規制に関する法律」、情報通信網法、「個人情報保護法」、「人工知能基本法」等の関連法令及び商慣例に従います。</p>
    <p>② 本サービスの利用により発生した紛争について訴訟が必要な場合、民事訴訟法上の管轄裁判所に提起します。</p>

    <h3 className="font-semibold text-slate-900">第28条 (カスタマーセンター)</h3>
    <p>会員は、本サービスの利用に関連してお問い合わせ事項がある場合、次のカスタマーセンターに連絡することができます。</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>電話番号：02-333-7334</li>
      <li>メール：support@traystorage.net</li>
      <li>営業時間：平日09:00～18:00（土日・祝日を除く）</li>
    </ul>

    <h3 className="font-semibold text-slate-900">附則</h3>
    <p><strong>第1条 (施行日)</strong> この約款は2026年7月1日から施行します。</p>
    <p><strong>第2条 (経過措置)</strong> ① この約款の施行以前に登録した会員については、改定された約款を適用します。 ② ベータテスト期間中に登録した会員には、有料プランへの転換時に別途の優待特典が提供される場合があります。 ③ この約款の施行当時、無料で本サービスを利用中の会員は無料プラン会員に転換され、メンバー数が10名を超過する場合は、当社が定める猶予期間内に有料プランへ転換しなければなりません。</p>

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

const TermsDe = () => (
  <>
    <p className="text-xs text-slate-500">Erlassen: 09.02.2026 | Geändert: 01.07.2026 | Inkrafttreten: 01.07.2026</p>

    <h3 className="font-semibold text-slate-900">§ 1 (Zweck)</h3>
    <p>Diese Nutzungsbedingungen regeln die Rechte, Pflichten und Verantwortlichkeiten zwischen der InfoCreative Co., Ltd. (im Folgenden „Unternehmen") und ihren Mitgliedern sowie die Bedingungen, Verfahren und sonstigen erforderlichen Angelegenheiten im Zusammenhang mit der Nutzung von Tray Storage Connect (im Folgenden „Dienst"), einem vom Unternehmen bereitgestellten Dokumentenmanagement-Dienst.</p>

    <h3 className="font-semibold text-slate-900">§ 2 (Begriffsbestimmungen)</h3>
    <p>① Die in diesen Nutzungsbedingungen verwendeten Begriffe sind wie folgt definiert:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>„Dienst" bezeichnet die vom Unternehmen bereitgestellte Online-Plattform, mit der Mitglieder ihre Dokumente cloudbasiert speichern und verwalten sowie mithilfe von Künstlicher Intelligenz (KI) durchsuchen, analysieren und auswerten können.</li>
      <li>„Tray Storage Connect" bezeichnet die vom Unternehmen zur Bereitstellung des Dienstes betriebene Web- und Mobilplattform.</li>
      <li>„Mitglied" bezeichnet jede Person, die diesen Nutzungsbedingungen zugestimmt und die vom Unternehmen festgelegte Registrierung abgeschlossen hat, um den Dienst zu nutzen.</li>
      <li>„Administrator" bezeichnet ein Mitglied, dem innerhalb einer Organisation Verwaltungsrechte eingeräumt wurden, einschließlich des Anlegens von Abteilungen, der Verwaltung von Zugriffsrechten und der Einsicht in Gesamtstatistiken der Dokumente.</li>
      <li>„Teammitglied" bezeichnet ein Mitglied, das Dokumente im Rahmen der vom Administrator eingeräumten Berechtigungen registrieren, einsehen und bearbeiten kann.</li>
      <li>„Beitrag" bezeichnet sämtliche vom Mitglied in den Dienst hochgeladenen Materialien, einschließlich Dokumentdateien, Fotos und Bilder.</li>
      <li>„KI-Dienst" bezeichnet Funktionen, die mittels Künstlicher Intelligenz automatisiert dokumentenbezogene Informationen bereitstellen, einschließlich optischer Zeichenerkennung (OCR), Inhaltsanalyse, Suche, Zusammenfassung, Klassifizierung und Frage-Antwort-Funktionen. Hierzu zählen auch KI-Modelle Dritter wie OpenAI GPT und Naver Clova OCR.</li>
      <li>„KI-OCR" bezeichnet die Technologie der optischen Zeichenerkennung, die Textinformationen aus Bildern oder gescannten Dokumenten automatisch erkennt und extrahiert.</li>
      <li>„Kostenloser Tarif" bezeichnet einen Tarif, mit dem der Dienst im vom Unternehmen festgelegten Umfang gebührenfrei genutzt werden kann, vorbehaltlich vom Unternehmen festgelegter Einschränkungen wie etwa der Anzahl der Lizenzplätze pro Organisation.</li>
      <li>„Kostenpflichtiger Tarif" bezeichnet einen Tarif (z. B. den Basic-Tarif), bei dem das Mitglied eine Nutzungsgebühr entrichtet, um die vom Unternehmen bereitgestellten Grundfunktionen zu nutzen.</li>
      <li>„Lizenzplatz" bezeichnet zusammenfassend die innerhalb einer Organisation (eines Mitgliedskontos) registrierten Administratoren und Teammitglieder, die den Dienst nutzen.</li>
      <li>„Tray-Storage-Produkt" bezeichnet eine vom Unternehmen verkaufte physische Aufbewahrungsbox für Papierdokumente, die über ein angebrachtes NFC-Tag mit dem Dienst verknüpft werden kann.</li>
      <li>„NFC-Tag" bezeichnet eine aufklebbare Vorrichtung, die das Tray-Storage-Produkt mittels Nahfeldkommunikation (Near Field Communication) mit dem Dienst verknüpft.</li>
    </ul>
    <p>② Begriffe, die in diesen Nutzungsbedingungen nicht definiert sind, werden gemäß den geltenden Gesetzen und der allgemeinen Handelspraxis ausgelegt.</p>

    <h3 className="font-semibold text-slate-900">§ 3 (Bekanntgabe und Änderung der Nutzungsbedingungen)</h3>
    <p>① Das Unternehmen veröffentlicht den Inhalt dieser Nutzungsbedingungen auf der Startseite des Dienstes oder auf der Website des Unternehmens (www.traystorage.net), damit Mitglieder ihn jederzeit einsehen können.</p>
    <p>② Das Unternehmen kann diese Nutzungsbedingungen ändern, soweit dies nicht gegen geltendes Recht verstößt, einschließlich des Gesetzes zur Regelung von Allgemeinen Geschäftsbedingungen, des Gesetzes zur Förderung der Nutzung von Informations- und Kommunikationsnetzen und zum Schutz von Informationen (im Folgenden „Netzgesetz") sowie des Gesetzes zum Verbraucherschutz im elektronischen Geschäftsverkehr.</p>
    <p>③ Bei einer Änderung dieser Nutzungsbedingungen gibt das Unternehmen den Inhalt der Änderung sowie das Datum des Inkrafttretens an und veröffentlicht diese Angaben mindestens sieben (7) Tage vor dem Inkrafttreten auf dem Dienst und der Unternehmenswebsite. Betrifft die Änderung wesentliche oder für Mitglieder nachteilige Punkte, erfolgt die Bekanntgabe mindestens dreißig (30) Tage vorher, zusätzlich mit individueller Benachrichtigung an die registrierte E-Mail-Adresse oder Mobilfunknummer des Mitglieds.</p>
    <p>④ Weist das Unternehmen bei der Bekanntgabe oder Benachrichtigung gemäß Absatz 3 ausdrücklich darauf hin, dass die Nichtäußerung eines Widerspruchs bis zum Inkrafttreten als Zustimmung gilt, und widerspricht das Mitglied nicht ausdrücklich, gilt das Mitglied als mit den geänderten Nutzungsbedingungen einverstanden.</p>
    <p>⑤ Stimmt ein Mitglied der Anwendung der geänderten Nutzungsbedingungen nicht zu, kann das Unternehmen die geänderten Nutzungsbedingungen nicht anwenden; das Mitglied kann in diesem Fall den Nutzungsvertrag kündigen.</p>

    <h3 className="font-semibold text-slate-900">§ 4 (Ergänzende Bestimmungen)</h3>
    <p>① Für Angelegenheiten, die in diesen Nutzungsbedingungen nicht geregelt sind, sowie für deren Auslegung gelten die einschlägigen Gesetze, einschließlich des Gesetzes zur Regelung von Allgemeinen Geschäftsbedingungen, des Netzgesetzes, des Gesetzes zum Schutz personenbezogener Daten, des Gesetzes zum Verbraucherschutz im elektronischen Geschäftsverkehr, des Grundlagengesetzes für Künstliche Intelligenz, des Grundlagengesetzes für elektronische Dokumente und elektronischen Geschäftsverkehr sowie die allgemeine Handelspraxis.</p>
    <p>② Das Unternehmen kann bei Bedarf detaillierte Nutzungsrichtlinien (Betriebsrichtlinien) festlegen und diese im Dienst veröffentlichen oder auf andere Weise bekannt geben.</p>

    <h3 className="font-semibold text-slate-900">§ 5 (Mitgliedsregistrierung)</h3>
    <p>① Interessenten beantragen die Mitgliedschaft, indem sie die vom Unternehmen vorgesehenen Registrierungsangaben ausfüllen und ihre Zustimmung zu diesen Nutzungsbedingungen erklären.</p>
    <p>② Das Unternehmen registriert Antragsteller als Mitglieder, sofern keiner der folgenden Fälle vorliegt:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Der Antragsteller hat zuvor gemäß diesen Nutzungsbedingungen seine Mitgliedschaft verloren (ausgenommen, wenn seit dem Verlust der Mitgliedschaft zwei (2) Jahre vergangen sind und das Unternehmen einer erneuten Registrierung zugestimmt hat);</li>
      <li>Die Registrierungsangaben enthalten falsche, unvollständige oder fehlerhafte Angaben;</li>
      <li>Der Antragsteller beantragt eine erneute Registrierung, bevor seit dem Austritt sieben (7) Tage vergangen sind;</li>
      <li>Ein Mitglied, dessen Nutzung gesperrt wurde, kündigt einseitig den Nutzungsvertrag und beantragt eine erneute Registrierung;</li>
      <li>Die Registrierung würde den technischen Betrieb des Unternehmens erheblich beeinträchtigen.</li>
    </ul>
    <p>③ Der Mitgliedschaftsvertrag gilt als zustande gekommen, sobald die Annahme des Unternehmens dem Mitglied zugegangen ist.</p>
    <p>④ Ändern sich die bei der Registrierung angegebenen Daten, hat das Mitglied das Unternehmen umgehend per E-Mail oder auf anderem Weg über die Änderung zu informieren.</p>
    <p>⑤ Das Unternehmen haftet nicht für Nachteile, die durch die Nichtmitteilung von Änderungen gemäß Absatz 4 entstehen.</p>

    <h3 className="font-semibold text-slate-900">§ 6 (Kündigung und Verlust der Mitgliedschaft)</h3>
    <p>① Ein Mitglied kann jederzeit die Kündigung der Mitgliedschaft beim Unternehmen beantragen; das Unternehmen bearbeitet die Kündigung unverzüglich.</p>
    <p>② Liegt einer der folgenden Gründe vor, kann das Unternehmen die Mitgliedschaft einschränken oder sperren:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Angabe falscher Informationen bei der Registrierung;</li>
      <li>Beeinträchtigung der Nutzung des Dienstes durch andere Mitglieder, Missbrauch ihrer Daten oder sonstige Gefährdung der Ordnung des elektronischen Geschäftsverkehrs;</li>
      <li>Nutzung des Dienstes für Handlungen, die gegen geltendes Recht oder diese Nutzungsbedingungen verstoßen oder gegen die guten Sitten verstoßen.</li>
    </ul>
    <p>③ Wiederholt sich dasselbe Verhalten nach einer Einschränkung oder Sperrung zwei (2) oder mehr Mal, oder wird der Grund nicht innerhalb von dreißig (30) Tagen behoben, kann das Unternehmen die Mitgliedschaft entziehen.</p>
    <p>④ Entzieht das Unternehmen die Mitgliedschaft, wird die Registrierung gelöscht. Das Unternehmen benachrichtigt das Mitglied hierüber und gewährt vor der Löschung eine Frist von mindestens dreißig (30) Tagen zur Stellungnahme.</p>
    <p>⑤ Bei Kündigung oder Verlust der Mitgliedschaft werden die Beiträge und personenbezogenen Daten des Mitglieds unverzüglich gelöscht. Informationen, deren Aufbewahrung nach geltendem Recht und der Datenschutzerklärung des Unternehmens erforderlich ist, werden für die vorgeschriebene Dauer aufbewahrt und danach gelöscht.</p>

    <h3 className="font-semibold text-slate-900">§ 7 (Umwandlung in ein ruhendes Konto)</h3>
    <p>① Meldet sich ein Mitglied ein (1) Jahr lang nicht beim Dienst an, wandelt das Unternehmen das Konto in ein ruhendes Konto um und speichert die personenbezogenen Daten getrennt.</p>
    <p>② Drei (3) Jahre nach der Umwandlung in ein ruhendes Konto werden die personenbezogenen Daten und Beiträge des Mitglieds endgültig gelöscht.</p>
    <p>③ Das Unternehmen benachrichtigt das Mitglied mindestens dreißig (30) Tage vor der geplanten Umwandlung per E-Mail oder auf anderem Weg.</p>
    <p>④ Ein Mitglied mit ruhendem Konto kann durch Identitätsprüfung bei der Anmeldung den Ruhezustand aufheben und den Dienst wieder nutzen.</p>

    <h3 className="font-semibold text-slate-900">§ 8 (Bereitstellung und Änderung des Dienstes)</h3>
    <p>① Das Unternehmen stellt Mitgliedern folgende Leistungen bereit:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Cloudbasierte Speicherung und Verwaltung von Dokumentdateien und Bildern;</li>
      <li>Abteilungsbezogene Dokumentenklassifizierung und -verwaltung;</li>
      <li>Verknüpfung mit physischen Aufbewahrungsboxen über NFC-Tags;</li>
      <li>Automatische Texterkennung und -extraktion aus Dokumenten mittels KI-OCR;</li>
      <li>KI-gestützte Dokumentensuche, -analyse, -zusammenfassung und Frage-Antwort-Funktion;</li>
      <li>KI-Schnittstelle über Chat und Sprachbefehle;</li>
      <li>Zusatzfunktionen wie Festlegung der Aufbewahrungsdauer von Dokumenten, statistische Auswertungen und Ankündigungen;</li>
      <li>Verwaltung von Zugriffsrechten (vier Stufen: kein Zugriff / Betrachter / Bearbeiter / Administrator);</li>
      <li>Sonstige vom Unternehmen zusätzlich entwickelte oder im Rahmen von Kooperationen bereitgestellte Leistungen.</li>
    </ul>
    <p>② Das Unternehmen kann den Dienst ganz oder teilweise ändern, um die Qualität zu verbessern, technische Weiterentwicklungen umzusetzen oder betrieblichen Erfordernissen nachzukommen.</p>
    <p>③ Bei Änderungen des Inhalts, der Nutzungsmethode oder der Nutzungszeiten des Dienstes gibt das Unternehmen den Grund der Änderung, die Einzelheiten des geänderten Dienstes und das Bereitstellungsdatum mindestens sieben (7) Tage vor der Änderung im Dienst bekannt oder benachrichtigt die Mitglieder.</p>
    <p>④ Das Unternehmen kann kostenlos bereitgestellte Leistungen ganz oder teilweise ändern, aussetzen oder einstellen, wie es aus geschäftlichen oder betrieblichen Gründen erforderlich ist, ohne dass Mitgliedern hierfür eine Entschädigung zusteht, sofern gesetzlich nichts anderes vorgeschrieben ist.</p>

    <h3 className="font-semibold text-slate-900">§ 9 (Nutzungszeiten und Unterbrechung des Dienstes)</h3>
    <p>① Der Dienst steht grundsätzlich an 365 Tagen im Jahr, 24 Stunden täglich zur Verfügung, sofern keine betrieblichen oder technischen Gründe des Unternehmens entgegenstehen.</p>
    <p>② Ungeachtet Absatz 1 kann das Unternehmen den Dienst ganz oder teilweise einschränken oder unterbrechen in folgenden Fällen:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Wartung, Austausch oder Ausfall von informationstechnischen Anlagen oder Unterbrechung der Kommunikation;</li>
      <li>Unvermeidbare Bauarbeiten an den Anlagen für den Dienst;</li>
      <li>Stromausfall, Anlagenstörungen oder übermäßiges Datenaufkommen, die die normale Nutzung des Dienstes beeinträchtigen;</li>
      <li>Umstände wie die Beendigung von Verträgen mit Dienstanbietern, aufgrund derer der Dienst nicht aufrechterhalten werden kann;</li>
      <li>Höhere Gewalt wie Naturkatastrophen oder nationale Notlagen.</li>
    </ul>
    <p>③ Das Unternehmen haftet nicht für Schäden, die Mitgliedern oder Dritten durch eine vorübergehende Unterbrechung des Dienstes gemäß Absatz 2 entstehen, sofern kein Vorsatz oder grobe Fahrlässigkeit des Unternehmens vorliegt.</p>
    <p>④ Bei einer Unterbrechung des Dienstes gibt das Unternehmen dies mindestens sieben (7) Tage vorher im Dienst bekannt oder benachrichtigt die Mitglieder, außer in den Fällen höherer Gewalt gemäß Absatz 3.</p>

    <h3 className="font-semibold text-slate-900">§ 10 (Tarife und Zahlung)</h3>
    <p>① Das Unternehmen stellt den Dienst in Form eines kostenlosen Tarifs und kostenpflichtiger Tarife bereit. Der konkrete Nutzungsumfang und die Einschränkungen der jeweiligen Tarife richten sich nach § 12.</p>
    <p>② Die vom Unternehmen angebotenen Tarife und die zugehörigen Gebühren sind wie folgt. Die angegebenen Gebühren enthalten die Mehrwertsteuer.</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Tarif</th><th className="border border-slate-300 p-2 text-left">Gebühr</th><th className="border border-slate-300 p-2 text-left">Wesentliche Merkmale</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Kostenloser Tarif</td><td className="border border-slate-300 p-2">Kostenlos</td><td className="border border-slate-300 p-2">Bis zu zehn (10) Lizenzplätze pro Organisation (Mitgliedskonto)</td></tr>
        <tr><td className="border border-slate-300 p-2">Basic-Tarif</td><td className="border border-slate-300 p-2">6.600 KRW pro Lizenzplatz und Monat (max. 3 Lizenzplätze, keine Erweiterung möglich)</td><td className="border border-slate-300 p-2">Voller Zugang zu den vom Unternehmen bereitgestellten Grundfunktionen nach Abschluss eines kostenpflichtigen Abonnements</td></tr>
        <tr><td className="border border-slate-300 p-2">Pro-Tarif</td><td className="border border-slate-300 p-2">15.000 KRW pro Lizenzplatz und Monat (Anzahl frei wählbar)</td><td className="border border-slate-300 p-2">Zugang zu den Grundfunktionen sowie erweiterten Funktionen wie KI-Chatbot und NFC</td></tr>
      </tbody>
    </table>
    <p>③ Der Basic-Tarif ist ein wiederkehrendes Abonnement zu 6.600 KRW pro Lizenzplatz und Monat (inkl. Mehrwertsteuer) für maximal drei (3) Lizenzplätze; eine Erweiterung der Lizenzplätze ist beim Basic-Tarif nicht möglich. Der Pro-Tarif ist ein wiederkehrendes Abonnement zu 15.000 KRW pro Lizenzplatz und Monat (inkl. Mehrwertsteuer), bei dem Mitglieder die Anzahl der Lizenzplätze frei festlegen können.</p>
    <p>④ Mitglieder, die einen kostenpflichtigen Tarif (Basic oder Pro) abonniert haben, können alle vom Unternehmen bereitgestellten Grundfunktionen nutzen. Der jeweilige Nutzungsumfang (z. B. Anzahl der Lizenzplätze) richtet sich nach § 12 und den Angaben im Dienst; für gesondert vom Unternehmen festgelegte Zusatzleistungen können zusätzliche Gebühren anfallen, worüber im Voraus informiert wird.</p>
    <p>⑤ Wiederkehrende Zahlungen werden ausgehend vom ersten Zahlungsdatum monatlich am gleichen Kalendertag automatisch über die vom Mitglied gewählte Zahlungsmethode abgebucht und verlängern sich automatisch um jeweils einen Monat, sofern das Mitglied nicht kündigt. Fällt das Zahlungsdatum in einem Monat nicht regelmäßig an (z. B. bei Monaten ohne 31. Tag), erfolgt die Abbuchung am letzten Tag dieses Monats; die Abbuchung erfolgt auch dann regulär, wenn das Zahlungsdatum auf einen Feiertag fällt.</p>
    <p>⑥ Werden während der Abonnementlaufzeit Lizenzplätze hinzugefügt oder entfernt, wird die geänderte Anzahl ab dem nächsten wiederkehrenden Zahlungstermin berücksichtigt. Beim Basic-Tarif können jedoch nicht mehr als drei (3) Lizenzplätze genutzt werden; wird eine höhere Anzahl benötigt, ist ein Wechsel zum Pro-Tarif erforderlich. Einzelheiten zur Verrechnung von Differenzbeträgen bei hinzugefügten Lizenzplätzen richten sich nach den Angaben im Dienst oder den vom Unternehmen festgelegten Betriebsrichtlinien.</p>
    <p>⑦ Mitglieder können Gebühren mittels Kreditkartenzahlung, Banküberweisung, virtueller Kontonummer oder sonstiger vom Unternehmen bestimmter Zahlungsmethoden entrichten.</p>
    <p>⑧ Kommt ein Mitglied aufgrund von Überschreitung des Limits, unzureichendem Kontostand oder einseitiger Kündigung der gewählten Zahlungsmethode mit der Zahlung in Rückstand, kann das Unternehmen den kostenpflichtigen Tarif ab dem Tag des Zahlungsrückstands aussetzen oder das Konto auf den kostenlosen Tarif umstellen.</p>
    <p>⑨ Verfügt ein Mitglied nicht über die rechtmäßige Berechtigung zur Nutzung der Zahlungsmethode oder erhebt es nach erfolgter Zahlung Einwände oder verweigert die Zahlung, kann das Unternehmen die Bereitstellung des Dienstes aussetzen.</p>
    <p>⑩ Das Unternehmen kann die Gebühren je nach Art und Dauer des Dienstes ändern; in diesem Fall erfolgen Bekanntgabe und Benachrichtigung gemäß dem Verfahren nach § 3. Bereits vereinbarte Beträge werden durch eine Änderung nicht rückwirkend berührt.</p>

    <h3 className="font-semibold text-slate-900">§ 11 (Widerruf und Rückerstattung)</h3>
    <p>① Ein Mitglied, das einen kostenpflichtigen Tarif neu abonniert hat, kann den Vertrag innerhalb von sieben (7) Tagen nach dem Zahlungsdatum widerrufen, sofern der Dienst nicht genutzt wurde; in diesem Fall erstattet das Unternehmen den vollen Zahlungsbetrag.</p>
    <p>② Ungeachtet Absatz 1 kann der Widerruf in folgenden Fällen eingeschränkt sein:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Der Dienst wurde aus vom Mitglied zu vertretenden Gründen zerstört oder beschädigt;</li>
      <li>Der Wert des Dienstes hat sich durch erhebliche Nutzung durch das Mitglied deutlich verringert.</li>
    </ul>
    <p>③ Beantragt ein Mitglied, das einen wiederkehrenden kostenpflichtigen Tarif nutzt, die Kündigung und Rückerstattung, nachdem sieben (7) Tage seit dem Zahlungsdatum vergangen sind, erfolgt grundsätzlich keine Rückerstattung für den bereits bezahlten Abrechnungszeitraum (laufenden Monat); das Nutzungsrecht bleibt bis zum Ende dieses Zeitraums bestehen, danach wird die automatische Verlängerung eingestellt.</p>
    <p>④ Steht einem Mitglied nach den staatlich festgelegten „Richtlinien zum Schutz von Inhaltsnutzern" oder anderen einschlägigen Vorschriften eine Rückerstattung zu, kann das Unternehmen im Rahmen dieser Richtlinien eine Rückerstattungsgebühr erheben.</p>
    <p>⑤ Rückerstattungen erfolgen grundsätzlich über dieselbe Zahlungsmethode, die das Mitglied verwendet hat. Ist dies nicht möglich, erfolgt die Rückerstattung über eine vom Unternehmen bestimmte alternative Methode.</p>
    <p>⑥ Die Bearbeitung der Rückerstattung wird innerhalb von sieben (7) Werktagen nach Eingang des Antrags abgeschlossen.</p>
    <p>⑦ Für die Nutzung des kostenlosen Tarifs besteht kein rückerstattungsfähiger Betrag.</p>

    <h3 className="font-semibold text-slate-900">§ 12 (Nutzungsumfang und Einschränkungen je Tarif)</h3>
    <p>① Der Nutzungsumfang und die Einschränkungen des kostenlosen und der kostenpflichtigen Tarife sind wie folgt:</p>
    <table className="w-full border-collapse border border-slate-300 my-2 text-sm">
      <thead><tr className="bg-slate-100"><th className="border border-slate-300 p-2 text-left">Kategorie</th><th className="border border-slate-300 p-2 text-left">Einzelheiten</th></tr></thead>
      <tbody>
        <tr><td className="border border-slate-300 p-2">Datei-Upload</td><td className="border border-slate-300 p-2">Maximal 50 MB pro Upload; unterstützte Formate: PDF, JPG, PNG</td></tr>
        <tr><td className="border border-slate-300 p-2">Gleichzeitiger Zugriff</td><td className="border border-slate-300 p-2">Pro Konto kann nur ein (1) Gerät gleichzeitig angemeldet sein</td></tr>
        <tr><td className="border border-slate-300 p-2">Kostenloser Tarif</td><td className="border border-slate-300 p-2">Bis zu zehn (10) Lizenzplätze pro Organisation (Mitgliedskonto); Zugang zu den vom Unternehmen festgelegten Grundfunktionen</td></tr>
        <tr><td className="border border-slate-300 p-2">Kostenpflichtiger Tarif (Basic)</td><td className="border border-slate-300 p-2">6.600 KRW pro Lizenzplatz und Monat (max. 3 Lizenzplätze, keine Erweiterung möglich); Zugang zu den vom Unternehmen bereitgestellten Grundfunktionen</td></tr>
        <tr><td className="border border-slate-300 p-2">Kostenpflichtiger Tarif (Pro)</td><td className="border border-slate-300 p-2">15.000 KRW pro Lizenzplatz und Monat (Anzahl frei wählbar); Zugang zu Grund- und erweiterten Funktionen des Unternehmens</td></tr>
      </tbody>
    </table>
    <p>② Übersteigt die Anzahl der Lizenzplätze einer Organisation im kostenlosen Tarif zehn (10), kann das Unternehmen einen Wechsel zu einem kostenpflichtigen Tarif empfehlen; bis zum Wechsel können bestimmte Funktionen, etwa das Hinzufügen von Lizenzplätzen, eingeschränkt sein.</p>
    <p>③ Das Unternehmen kann die oben genannten Einschränkungen ändern, soweit dies für den stabilen Betrieb des Dienstes erforderlich ist, und gibt Änderungen gemäß § 3 vorher bekannt.</p>

    <h3 className="font-semibold text-slate-900">§ 13 (Verwaltung von Beiträgen)</h3>
    <p>① Das Urheberrecht an Beiträgen, die ein Mitglied im Dienst veröffentlicht, verbleibt beim jeweiligen Urheber.</p>
    <p>② Mitglieder dürfen keine Beiträge registrieren, die einer der folgenden Kategorien entsprechen:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Inhalte, die Rechte, Ansehen, Kreditwürdigkeit oder sonstige berechtigte Interessen Dritter verletzen;</li>
      <li>Inhalte, die im Zusammenhang mit Straftaten stehen;</li>
      <li>Inhalte, die die geistigen Eigentumsrechte des Unternehmens oder Dritter verletzen;</li>
      <li>Inhalte, die den Ruf des Unternehmens oder Dritter schädigen oder deren Geschäftstätigkeit stören;</li>
      <li>Obszöne oder gewalttätige Nachrichten, Bilder, Tonaufnahmen oder sonstige gegen die guten Sitten verstoßende Inhalte;</li>
      <li>Dokumente mit sensiblen personenbezogenen Daten, u. a.: persönliche Identifikationsnummern wie Personalausweis-, Reisepass- oder Führerscheinnummern; Dokumente zum Nachweis rechtlicher Ansprüche wie Siegelzertifikate oder Grundbuchauszüge; Dokumente zum Nachweis des Personenstands wie Familienstandsbescheinigungen; Dokumente mit Finanzinformationen wie Kontoauszüge oder Kreditkartendaten; Dokumente mit Gesundheitsdaten wie Untersuchungsergebnisse oder Krankenakten; Dokumente mit detaillierten beruflichen Werdegängen wie Lebensläufe.</li>
    </ul>
    <p>③ Möchte ein Mitglied Dokumente mit den in Absatz 2 genannten Informationen registrieren, müssen diese Informationen vor der Registrierung entfernt oder unkenntlich gemacht (maskiert) werden.</p>
    <p>④ Verstößt ein Mitglied gegen Absatz 2, kann das Unternehmen den betreffenden Beitrag ohne vorherige Ankündigung löschen oder dessen Veröffentlichung verweigern sowie die Nutzung des Dienstes einschränken oder den Nutzungsvertrag kündigen.</p>
    <p>⑤ Entsteht dem Unternehmen oder Dritten durch einen unter Verstoß gegen Absatz 2 veröffentlichten Beitrag ein Schaden, haftet das betreffende Mitglied für diesen Schaden.</p>
    <p>⑥ Bei Nutzung der NFC-Tag-Verknüpfung empfiehlt das Unternehmen, nur die minimal erforderlichen Informationen zur Identifizierung von Art und grobem Inhalt der in der physischen Aufbewahrungsbox befindlichen Dokumente zu registrieren.</p>

    <h3 className="font-semibold text-slate-900">§ 14 (Bereitstellung von KI-Diensten und Hinweise)</h3>
    <p>① Das Unternehmen stellt für von Mitgliedern registrierte Beiträge folgende KI-Dienste bereit:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>KI-OCR (optische Zeichenerkennung): automatische Textextraktion aus Bildern oder gescannten Dokumenten;</li>
      <li>Dokumentensuche und -klassifizierung: automatisierte Klassifizierung und Suche basierend auf einer Analyse des Dokumentinhalts;</li>
      <li>Frage-Antwort-Funktion: Abruf von Dokumentinformationen per Chat oder Sprachbefehl;</li>
      <li>Zusammenfassung und Analyse: Zusammenfassung und statistische Auswertung von Dokumentinhalten.</li>
    </ul>
    <p>② Das Unternehmen nutzt zur Bereitstellung der KI-Dienste KI-Modelle Dritter, u. a. OpenAI GPT und Naver Clova OCR.</p>
    <p>③ KI-OCR verarbeitet Beiträge in Echtzeit unmittelbar nach dem Hochladen durch das Mitglied; die Verarbeitungsergebnisse werden auf Cloud-Servern von Supabase (auf AWS-Basis) gespeichert.</p>
    <p>④ Die vom Unternehmen bereitgestellten KI-Dienste weisen folgende Merkmale und Einschränkungen auf:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>KI-Dienste dienen als unterstützendes Informationsmittel und ersetzen keine fachliche Beurteilung in Bereichen wie Recht, Buchhaltung, Steuern, Medizin oder Personalwesen;</li>
      <li>Vollständigkeit, Richtigkeit und Aktualität der von der KI bereitgestellten Informationen werden nicht garantiert; Mitglieder müssen bei endgültigen Entscheidungen stets das Originaldokument prüfen;</li>
      <li>KI-Analyseergebnisse dürfen nur als Referenzmaterial verwendet werden und nicht die alleinige Grundlage wichtiger Entscheidungen bilden.</li>
    </ul>
    <p>⑤ Das Unternehmen haftet nicht für Fehler, Ungenauigkeiten oder Schäden, die durch das Vertrauen eines Mitglieds auf Ergebnisse des KI-Dienstes entstehen, sofern kein Vorsatz oder grobe Fahrlässigkeit des Unternehmens vorliegt.</p>

    <h3 className="font-semibold text-slate-900">§ 15 (Rechte der Mitglieder bei der KI-Verarbeitung)</h3>
    <p>① Mitglieder können hinsichtlich der von KI-Diensten bereitgestellten Ergebnisse folgende Rechte ausüben:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Recht auf Erläuterung: das Recht, eine Erläuterung des KI-Verarbeitungsergebnisses zu verlangen;</li>
      <li>Widerspruchsrecht: das Recht, gegen offensichtlich fehlerhafte oder unangemessene Ergebnisse Widerspruch einzulegen;</li>
      <li>Recht auf menschliches Eingreifen: das Recht, eine menschliche Überprüfung der automatisierten Verarbeitung zu verlangen.</li>
    </ul>
    <p>② Das Unternehmen prüft eingehende Anfragen gemäß Absatz 1 im Rahmen der technischen Möglichkeiten und trifft die erforderlichen Maßnahmen.</p>
    <p>③ Mitglieder können die Rechte aus Absatz 1 über das Kundencenter (support@traystorage.net, +82-2-333-7334) ausüben.</p>

    <h3 className="font-semibold text-slate-900">§ 16 (Nutzung von Beiträgen für KI-Training)</h3>
    <p>① Das Unternehmen nutzt Beiträge von Mitgliedern derzeit nicht als Trainingsdaten für allgemeine KI-Modelle.</p>
    <p>② Zur Verbesserung der Dienstqualität und Weiterentwicklung von Funktionen können Beiträge jedoch zur Erstellung und Analyse anonymisierter statistischer Informationen, aus denen sämtliche personenbezogenen Daten vollständig entfernt wurden, sowie zur technischen Fehlerbehebung genutzt werden.</p>
    <p>③ Beabsichtigt das Unternehmen künftig, Beiträge von Mitgliedern für das Training von KI-Modellen zu nutzen, wird zuvor die ausdrückliche Zustimmung des Mitglieds eingeholt.</p>
    <p>④ Mitglieder können der Nutzung ihrer Beiträge für KI-Training jederzeit widersprechen.</p>

    <h3 className="font-semibold text-slate-900">§ 17 (Schutz personenbezogener Daten und internationale Übermittlung)</h3>
    <p>① Das Unternehmen bemüht sich, die personenbezogenen Daten der Mitglieder gemäß den geltenden Gesetzen zu schützen; für Schutz und Nutzung personenbezogener Daten gelten die geltenden Gesetze sowie die Datenschutzerklärung des Unternehmens.</p>
    <p>② Das Unternehmen speichert Beiträge und personenbezogene Daten von Mitgliedern zur Erbringung des Dienstes auf Cloud-Servern (Supabase, auf AWS-Basis); diese Server können sich im Ausland befinden.</p>
    <p>③ Angaben zur internationalen Übermittlung personenbezogener Daten: übermittelte Datenkategorien (Mitgliedsdaten, Beiträge, KI-Verarbeitungsergebnisse); Zielland (u. a. USA, Standort der Supabase-Server); Zweck der Übermittlung (Bereitstellung cloudbasierter Dienste und Datenspeicherung); Speicher- und Nutzungsdauer (bis zum Austritt des Mitglieds oder gemäß den einschlägigen Aufbewahrungsfristen).</p>
    <p>④ Das Unternehmen kann künftig eine Umstellung auf inländische Server prüfen und wird über eine Änderung des Serverstandorts vorab informieren.</p>
    <p>⑤ Die Datenschutzerklärung des Unternehmens ist im Dienst und auf der Unternehmenswebsite einsehbar.</p>

    <h3 className="font-semibold text-slate-900">§ 18 (Pflichten der Mitglieder)</h3>
    <p>① Mitglieder dürfen Folgendes nicht tun: falsche Angaben bei Antragstellung oder Änderung machen; die Daten anderer Personen missbrauchen; geistige Eigentumsrechte oder sonstige Rechte des Unternehmens oder Dritter verletzen; den Ruf des Unternehmens oder Dritter schädigen oder deren Geschäftstätigkeit stören; obszöne oder gewalttätige Informationen veröffentlichen; den Dienst ohne Zustimmung des Unternehmens zu gewerblichen Zwecken nutzen; Computerviren oder sonstige Schadprogramme verbreiten; über den Dienst erlangte Informationen ohne vorherige Zustimmung des Unternehmens nutzen oder an Dritte weitergeben; sich mittels automatisierter Mittel unbefugt Zugang zum Dienst verschaffen oder Daten sammeln; die Server des Unternehmens negativ beeinträchtigen oder den Betrieb des Dienstes stören; sonstige Handlungen begehen, die gegen geltendes Recht oder die guten Sitten verstoßen.</p>
    <p>② Administratoren tragen die Verantwortung für die Einrichtung von Abteilungen, die Vergabe von Zugriffsrechten und die Verwaltung von Teammitgliedern und haften primär für Probleme, die durch fehlerhafte oder unangemessene Rechtevergabe entstehen.</p>
    <p>③ Mitglieder sind für die Registrierung und Verwaltung von Lizenzplätzen verantwortlich und müssen bei Nutzung eines kostenpflichtigen Tarifs berücksichtigen, dass sich die Gebühr nach der Anzahl der registrierten Lizenzplätze richtet.</p>
    <p>④ Mitglieder haben die Bestimmungen dieser Nutzungsbedingungen und der geltenden Gesetze einzuhalten.</p>

    <h3 className="font-semibold text-slate-900">§ 19 (Verwaltung von Zugriffsrechten)</h3>
    <p>① Der Dienst nutzt ein rollenbasiertes Zugriffsrechtesystem, das zwischen Administratoren und Teammitgliedern unterscheidet.</p>
    <p>② Rechte und Pflichten des Administrators: Anlegen und Löschen von Abteilungen; Erstellen und Verwalten von Dokumenten-Hauptkategorien und Unterkategorien; Festlegen der Abteilungszugriffsrechte je Teammitglied (vier Stufen: kein Zugriff / Betrachter / Bearbeiter / Administrator); Einsicht in Dokumente und Statistiken aller Abteilungen. (Derzeit ist pro Organisation nur ein (1) Administrator zulässig; künftig kann die Zuweisung mehrerer Administratoren ermöglicht werden.)</p>
    <p>③ Rechte des Teammitglieds: Erstellen von Dokumenten-Hauptkategorien und Unterkategorien innerhalb der eigenen Abteilung; Registrieren, Einsehen und Bearbeiten von Dokumenten der eigenen Abteilung; eingeschränkter Zugriff auf Dokumente anderer Abteilungen, sofern vom Administrator gewährt.</p>
    <p>④ Verfahren zur Beantragung des Zugriffs auf andere Abteilungen: Das Teammitglied beantragt beim Administrator den Zugriff auf eine andere Abteilung → der Administrator legt die Zugriffsstufe fest → nach Abschluss kann das Teammitglied auf die betreffende Abteilung zugreifen.</p>
    <p>⑤ Der Administrator hat bei der Vergabe von Rechten den Grundsatz der minimalen Rechtevergabe zu beachten und nur die für die Aufgabenerfüllung erforderlichen Mindestrechte einzuräumen.</p>

    <h3 className="font-semibold text-slate-900">§ 20 (Pflichten des Unternehmens)</h3>
    <p>① Das Unternehmen unterlässt Handlungen, die gegen geltendes Recht oder diese Nutzungsbedingungen verstoßen oder gegen die guten Sitten verstoßen, und bemüht sich, den Dienst fortlaufend und stabil bereitzustellen.</p>
    <p>② Das Unternehmen unterhält Sicherheitssysteme zum Schutz personenbezogener Daten (einschließlich Kreditinformationen), damit Mitglieder den Dienst sicher nutzen können, und veröffentlicht und beachtet seine Datenschutzerklärung.</p>
    <p>③ Das Unternehmen bearbeitet begründete Meinungen oder Beschwerden von Mitgliedern im Zusammenhang mit der Nutzung des Dienstes, sofern diese als berechtigt anerkannt werden.</p>
    <p>④ Das Unternehmen bewahrt Zahlungsinformationen im Zusammenhang mit kostenpflichtigen Transaktionen für die gesetzlich vorgeschriebene Dauer auf.</p>
    <p>⑤ Das Unternehmen unterhält eine Produkthaftpflichtversicherung, eine Haftpflichtversicherung für den Schutz personenbezogener Daten, eine Betriebshaftpflichtversicherung sowie eine Cyberversicherung, um Risiken im Zusammenhang mit der Bereitstellung des Dienstes abzudecken.</p>

    <h3 className="font-semibold text-slate-900">§ 21 (Urheberrecht und Nutzungsbeschränkungen)</h3>
    <p>① Das Urheberrecht und sonstige geistige Eigentumsrechte an vom Unternehmen erstellten Werken stehen dem Unternehmen zu.</p>
    <p>② Mitglieder dürfen Informationen, an denen dem Unternehmen geistige Eigentumsrechte zustehen und die durch die Nutzung des Dienstes erlangt wurden, nicht ohne vorherige Zustimmung des Unternehmens zu gewerblichen Zwecken nutzen oder Dritten zur Nutzung überlassen.</p>
    <p>③ Das Urheberrecht an Beiträgen, die ein Mitglied im Dienst veröffentlicht, verbleibt beim jeweiligen Urheber.</p>
    <p>④ Mitglieder dürfen im Dienst veröffentlichte Materialien nicht gewerblich verwerten, einschließlich der Verarbeitung und des Verkaufs über den Dienst erlangter Informationen.</p>

    <h3 className="font-semibold text-slate-900">§ 22 (Verkauf von NFC-Produkten und Mängelbehandlung)</h3>
    <p>① Das Unternehmen vertreibt Tray-Storage-Produkte (einschließlich NFC-Tags) über eigene Verkaufsstellen sowie Online-Marktplätze (Auction, G-Market, 11st, Naver Smart Store, Cafe24-eigener Shop u. a.).</p>
    <p>② Bei einem Mangel an einem Tray-Storage-Produkt kann das Mitglied innerhalb eines (1) Jahres nach dem Kaufdatum einen kostenlosen Kundendienst beantragen.</p>
    <p>③ Anfragen zu Produktmängeln können an das Kundencenter (+82-2-333-7334, support@traystorage.net) gerichtet werden.</p>
    <p>④ Umtausch, Rückgabe und Rückerstattung von Produkten richten sich nach den geltenden Gesetzen, einschließlich des Gesetzes zum Verbraucherschutz im elektronischen Geschäftsverkehr.</p>

    <h3 className="font-semibold text-slate-900">§ 23 (Datenaufbewahrung und Sicherung)</h3>
    <p>① Das Unternehmen bemüht sich, Beiträge und Nutzungsdaten der Mitglieder sicher aufzubewahren.</p>
    <p>② Bei Austritt eines Mitglieds werden dessen Beiträge und personenbezogene Daten unverzüglich gelöscht. Folgende Daten werden jedoch für die angegebene Dauer aufbewahrt: Sicherungsdaten (ein Jahr); KI-Verarbeitungsprotokolle (ein Jahr); gesetzlich aufzubewahrende Informationen (für die dort vorgeschriebene Dauer).</p>
    <p>③ Bei Umwandlung in ein ruhendes Konto werden personenbezogene Daten getrennt aufbewahrt; drei (3) Jahre nach der Umwandlung werden alle Daten endgültig gelöscht.</p>
    <p>④ Das Unternehmen haftet nicht für Datenverlust durch höhere Gewalt wie Naturkatastrophen, Hackerangriffe oder Systemausfälle, sofern kein Vorsatz oder grobe Fahrlässigkeit des Unternehmens vorliegt.</p>
    <p>⑤ Mitgliedern wird empfohlen, für wichtige Daten eigene Sicherungskopien zu führen.</p>

    <h3 className="font-semibold text-slate-900">§ 24 (Haftungsausschluss)</h3>
    <p>① Das Unternehmen haftet nicht für Dienstunterbrechungen und daraus resultierende Schäden, die durch Umstände außerhalb seines Einflussbereichs entstehen, einschließlich Naturkatastrophen, Krieg, Einstellung von Diensten durch Telekommunikationsanbieter, Hackerangriffe und DDoS-Angriffe.</p>
    <p>② Das Unternehmen haftet nicht für Störungen der Dienstnutzung, die auf Gründe zurückzuführen sind, die dem Mitglied zuzurechnen sind.</p>
    <p>③ Das Unternehmen haftet nicht für entgangene Gewinne, die einem Mitglied durch die Nutzung des Dienstes entstehen.</p>
    <p>④ Das Unternehmen haftet nicht für die Zuverlässigkeit, Richtigkeit oder sonstige inhaltliche Aspekte von Informationen, Daten oder Angaben, die Mitglieder im Dienst veröffentlichen.</p>
    <p>⑤ Das Unternehmen haftet nicht für Geschäfte oder sonstige Transaktionen, die Mitglieder untereinander oder mit Dritten über den Dienst abschließen.</p>
    <p>⑥ Das Unternehmen haftet für die Nutzung kostenlos bereitgestellter Leistungen nicht, sofern gesetzlich nichts anderes vorgeschrieben ist.</p>
    <p>⑦ Das Unternehmen haftet nicht für Fehler, ungenaue Informationen oder unerwartete Ergebnisse, die sich aus der Natur der KI-Dienste ergeben, sofern kein Vorsatz oder grobe Fahrlässigkeit des Unternehmens vorliegt.</p>

    <h3 className="font-semibold text-slate-900">§ 25 (Schadensersatz)</h3>
    <p>① Verursacht das Unternehmen oder ein Mitglied durch einen Verstoß gegen diese Nutzungsbedingungen der anderen Partei einen Schaden, haftet die verursachende Partei für diesen Schaden. Dies gilt nicht, wenn kein Vorsatz oder Fahrlässigkeit vorliegt.</p>
    <p>② Entsteht einem Mitglied durch Dienstunterbrechungen, Fehler oder ähnliche Ursachen ein Schaden, gewährt das Unternehmen kostenpflichtigen Mitgliedern eine kostenlose Nutzungszeit von ein (1) bis drei (3) Monaten; kostenlosen Mitgliedern wird keine gesonderte Entschädigung gewährt.</p>
    <p>③ Die vom Unternehmen gewährte Entschädigung ersetzt keinen Geldschadensersatz; Mitglieder können entsprechend dem Umfang ihres Schadens gesondert Schadensersatz verlangen.</p>
    <p>④ Verursacht ein Mitglied durch einen Verstoß gegen diese Nutzungsbedingungen einen Schaden beim Unternehmen, haftet das Mitglied dem Unternehmen gegenüber für diesen Schaden.</p>

    <h3 className="font-semibold text-slate-900">§ 26 (Streitbeilegung)</h3>
    <p>① Das Unternehmen richtet eine Stelle zur Bearbeitung von Schadensersatzforderungen ein, um berechtigte Meinungen oder Beschwerden von Mitgliedern zu berücksichtigen und Schäden zu regulieren.</p>
    <p>② Das Unternehmen bearbeitet von Mitgliedern eingereichte Beschwerden und Meinungen vorrangig. Ist eine zügige Bearbeitung nicht möglich, teilt das Unternehmen dem Mitglied unverzüglich den Grund und den voraussichtlichen Bearbeitungszeitraum mit.</p>
    <p>③ Bei einem Streit über den elektronischen Geschäftsverkehr zwischen Unternehmen und Mitglied kann auf Antrag des Mitglieds ein Schlichtungsverfahren bei einer von der Fair Trade Commission oder der zuständigen Provinzregierung beauftragten Streitbeilegungsstelle durchgeführt werden.</p>

    <h3 className="font-semibold text-slate-900">§ 27 (Gerichtsstand und anwendbares Recht)</h3>
    <p>① Für in diesen Nutzungsbedingungen nicht geregelte Angelegenheiten gelten die einschlägigen Gesetze, einschließlich des Gesetzes zum Verbraucherschutz im elektronischen Geschäftsverkehr, des Gesetzes zur Regelung von Allgemeinen Geschäftsbedingungen, des Netzgesetzes, des Gesetzes zum Schutz personenbezogener Daten und des Grundlagengesetzes für Künstliche Intelligenz sowie die allgemeine Handelspraxis.</p>
    <p>② Für Rechtsstreitigkeiten aus der Nutzung des Dienstes ist das nach der südkoreanischen Zivilprozessordnung zuständige Gericht maßgeblich.</p>

    <h3 className="font-semibold text-slate-900">§ 28 (Kundencenter)</h3>
    <p>Mitglieder können sich bei Fragen zur Nutzung des Dienstes an folgendes Kundencenter wenden:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Telefon: +82-2-333-7334</li>
      <li>E-Mail: support@traystorage.net</li>
      <li>Öffnungszeiten: werktags 09:00–18:00 Uhr (koreanische Zeit), außer an Wochenenden und Feiertagen</li>
    </ul>

    <h3 className="font-semibold text-slate-900">Schlussbestimmungen</h3>
    <p><strong>§ 1 (Inkrafttreten)</strong> Diese Nutzungsbedingungen treten am 1. Juli 2026 in Kraft.</p>
    <p><strong>§ 2 (Übergangsregelungen)</strong> ① Für Mitglieder, die sich vor Inkrafttreten dieser Nutzungsbedingungen registriert haben, gelten die geänderten Nutzungsbedingungen. ② Mitglieder, die sich während der Beta-Testphase registriert haben, können beim Wechsel zu einem kostenpflichtigen Tarif besondere Vorteile erhalten. ③ Mitglieder, die zum Zeitpunkt des Inkrafttretens dieser Nutzungsbedingungen den Dienst kostenlos nutzen, werden in den kostenlosen Tarif überführt; übersteigt die Anzahl der Lizenzplätze zehn (10), ist innerhalb der vom Unternehmen festgelegten Übergangsfrist ein Wechsel zu einem kostenpflichtigen Tarif erforderlich.</p>

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

export const TermsOfServiceContent = () => {
  const { i18n } = useTranslation();
  if (i18n.language === 'en') return <TermsEn />;
  if (i18n.language === 'ja') return <TermsJa />;
  if (i18n.language === 'de') return <TermsDe />;
  return <TermsKo />;
};

export default TermsOfServiceContent;
