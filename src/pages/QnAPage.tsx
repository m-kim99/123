import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  KeyRound,
  FileText,
  FolderOpen,
  Smartphone,
  BarChart3,
  Bot,
  Megaphone,
  Bell,
  Settings,
  X,
} from 'lucide-react';

import { DashboardLayout } from '@/components/DashboardLayout';
import { V1PageHeader, v1Card } from '@/components/ui/v1-components';
import { cn } from '@/lib/utils';

interface QnAItem {
  q: string;
  a: string;
}

interface QnASection {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  items: QnAItem[];
}

const SECTIONS: QnASection[] = [
  {
    id: 'account',
    title: '계정 및 로그인',
    icon: KeyRound,
    color: '#2563eb',
    items: [
      {
        q: 'TrayStorage Connect에 어떻게 가입하나요?',
        a: "로그인 화면의 '회원가입'에서 이메일, 비밀번호, 이름을 입력하고 역할(관리자/팀원)을 선택합니다. 관리자는 새 회사명과 회사 코드를 입력해 회사를 새로 개설하고, 팀원은 관리자에게 받은 회사 코드만 입력하면 해당 회사에 합류됩니다. 회사 코드 없이도 팀원 가입은 가능하며, 이 경우 로그인 후 온보딩 화면에서 회사 정보를 입력합니다. 비밀번호는 보안 검증(길이·복잡도)을 통과해야 하며, 이미 가입된 이메일은 중복 가입이 차단됩니다.",
      },
      {
        q: '비밀번호를 잊어버렸어요. 어떻게 재설정하나요?',
        a: "로그인 화면에서 '비밀번호 찾기'를 선택하면 가입 이메일로 재설정 링크가 발송됩니다. 메일의 링크를 클릭하면 비밀번호 재설정 페이지로 이동하며, 새 비밀번호 역시 보안 정책(검증 통과)을 만족해야 변경됩니다.",
      },
      {
        q: '관리자와 팀원의 차이점은 무엇인가요?',
        a: '관리자는 회사 전체를 관리합니다 — 부서 생성/수정/삭제, 사용자 관리, 모든 부서의 문서·카테고리 접근, 전사 통계, 회사 공지 작성이 가능합니다. 팀원은 소속 부서 중심으로 문서를 열람·업로드하고, 공유받은 문서를 확인하며, 부서 단위 통계만 볼 수 있습니다. 로그인 시 선택한 역할이 실제 계정 역할과 다르면 로그인이 거부됩니다.',
      },
      {
        q: '계정을 삭제(탈퇴)하고 싶어요.',
        a: "설정 또는 탈퇴 페이지에서 진행합니다. 본인 확인을 위해 비밀번호를 다시 입력하고, 데이터 영구 삭제·복구 불가·유예기간에 대한 3개 항목에 모두 동의한 뒤 확인 문구('탈퇴')를 정확히 입력해야 신청됩니다. 탈퇴는 즉시 삭제가 아니라 유예기간을 거치며, 유예기간 동안 다시 로그인하면 경고 창에서 탈퇴 취소를 선택해 계정을 복구할 수 있습니다.",
      },
      {
        q: '네이버 계정으로 로그인할 수 있나요?',
        a: '네, 네이버 소셜 로그인을 지원합니다. 최초 네이버 로그인 시 회사 정보가 없으면 온보딩 화면으로 이동해 회사 코드 등 정보를 입력한 뒤 이용을 시작합니다.',
      },
    ],
  },
  {
    id: 'documents',
    title: '문서 관리',
    icon: FileText,
    color: '#2563eb',
    items: [
      {
        q: '문서를 업로드하려면 어떻게 하나요?',
        a: '문서 관리(또는 세부 스토리지) 페이지에서 업로드 버튼을 누르고 파일을 선택한 뒤, 저장할 세부 스토리지(하위 카테고리)와 대외비/일반 분류를 지정합니다. 업로드 시 OCR로 본문 텍스트가 자동 추출되어 이후 내용 검색에 활용됩니다.',
      },
      {
        q: '어떤 파일 형식을 업로드할 수 있나요?',
        a: 'PDF가 기본이며, JPG·JPEG·PNG 이미지도 업로드할 수 있습니다. 이미지는 업로드 시 자동으로 PDF로 변환되어 저장되므로 보관 형식이 일관되게 유지됩니다.',
      },
      {
        q: '업로드 가능한 문서 수에 제한이 있나요?',
        a: '네, 회사의 구독 플랜에 따라 제한됩니다. 무료 플랜은 최대 100개 문서, 1GB 저장 용량까지 가능합니다. 휴지통으로 삭제된 문서는 카운트에서 제외되므로, 삭제 후 새 문서를 올리면 여유가 생깁니다. 상위 플랜은 한도가 더 크거나 무제한입니다.',
      },
      {
        q: '업로드한 문서를 수정할 수 있나요?',
        a: '문서 파일 자체를 새 파일로 교체(재업로드)할 수 있으며, 이때 OCR 텍스트도 갱신됩니다. 또한 분류(대외비/일반) 등 메타정보도 변경할 수 있습니다.',
      },
      {
        q: '문서를 삭제하면 영구적으로 사라지나요?',
        a: "아니요. 삭제하면 휴지통으로 이동(soft delete)하며 원할 때 복구할 수 있습니다. 영구 삭제는 휴지통에서 별도로 '완전 삭제' 또는 '휴지통 비우기'를 실행해야 이뤄집니다.",
      },
      {
        q: '휴지통에서 문서를 복구하려면?',
        a: "휴지통 페이지에서 대상 문서의 '복구'를 누르면 원래 위치로 되돌아갑니다. 휴지통에서는 개별 '완전 삭제'와 전체 '비우기'도 가능합니다.",
      },
      {
        q: '문서 검색은 어떻게 하나요?',
        a: '상단 검색으로 문서명·카테고리를 검색할 수 있고, OCR로 추출된 본문 내용까지 검색 대상에 포함됩니다. AI 챗봇에 "○○ 내용이 들어간 문서 찾아줘"처럼 자연어로 요청하거나, "이번 주/지난달에 올린 문서"처럼 기간 기반 검색도 가능합니다.',
      },
      {
        q: '개인정보가 포함된 문서는 어떻게 처리되나요?',
        a: 'OCR 처리 과정에서 주민등록번호, 운전면허번호, 여권번호, 카드번호, 휴대전화·일반전화, 이메일 등 개인정보 패턴을 자동 감지·마스킹합니다. 검색 인덱스에도 마스킹된 텍스트가 저장되어 민감정보 노출 위험을 줄입니다.',
      },
      {
        q: '대외비 문서와 일반 문서의 차이는?',
        a: '업로드 시 지정하는 분류입니다. 대외비로 표시된 문서는 별도 표식으로 구분되어 취급에 주의가 필요하며, 일반 문서는 부서 권한 범위 내에서 열람됩니다. 실제 접근 가능 여부는 부서·권한 정책에 따라 제어됩니다.',
      },
      {
        q: '문서를 다른 사람과 공유할 수 있나요?',
        a: "네, 문서를 특정 사용자에게 공유할 수 있으며 열람(view) 또는 다운로드(download) 권한을 선택해 부여합니다. 공유 시 상대방에게 알림이 가고, 받은 문서는 '공유 문서함'에서 확인할 수 있습니다. 공유는 언제든 해제할 수 있습니다.",
      },
    ],
  },
  {
    id: 'categories',
    title: '카테고리 및 부서',
    icon: FolderOpen,
    color: '#8b5cf6',
    items: [
      {
        q: '카테고리 구조는 어떻게 되어 있나요?',
        a: '부서 → 대분류(상위 카테고리) → 세부 스토리지(하위 카테고리) → 문서의 계층 구조입니다. 실제 문서는 세부 스토리지 단위에 보관되며, 세부 스토리지에는 NFC, 보관 위치, 관리번호, 만료일, 색상 라벨 등의 속성을 설정할 수 있습니다.',
      },
      {
        q: '새 카테고리(대분류·세부 스토리지)를 만들려면?',
        a: '관리자(또는 권한 있는 사용자)가 해당 부서 안에서 대분류를 만들고, 그 아래에 세부 스토리지를 추가합니다. 세부 스토리지 생성 시 보관 위치, 관리번호, 색상 라벨, 만료 정책 등을 함께 지정할 수 있습니다.',
      },
      {
        q: '보관 위치(저장 위치)란 무엇인가요?',
        a: '실제 종이 문서가 보관된 물리적 장소를 의미합니다(예: 캐비닛 A-2, 3층 문서고). 세부 스토리지에 보관 위치를 적어두면 NFC 스캔이나 검색으로 디지털 문서와 실물 위치를 함께 찾을 수 있습니다.',
      },
      {
        q: '부서를 추가/수정하려면?',
        a: "관리자만 부서 관리에서 부서를 추가·수정·삭제할 수 있습니다. 회사를 처음 개설하면 '기본 부서'가 자동 생성되며, 새로 가입한 팀원은 별도 지정이 없으면 회사의 첫 부서로 자동 배치됩니다. 부서 수는 플랜 한도(무료 플랜 최대 3개)의 영향을 받습니다.",
      },
      {
        q: '카테고리·세부 스토리지에 만료일을 설정할 수 있나요?',
        a: '네. 세부 스토리지 단위로 만료일을 설정하면, 만료일이 지난 뒤에는 해당 스토리지의 문서 접근이 자동으로 차단됩니다(개별 문서마다 만료일을 지정할 필요가 없습니다). 만료 30일 전·7일 전에 사전 알림이 가고, 만료 시점에도 알림이 발송됩니다.',
      },
    ],
  },
  {
    id: 'nfc',
    title: 'NFC 기능',
    icon: Smartphone,
    color: '#10b981',
    items: [
      {
        q: 'NFC 태그 등록은 어떻게 하나요?',
        a: "세부 스토리지 상세 화면에서 'NFC 등록'을 선택하고 NFC 태그를 단말기에 가까이 대면, 해당 스토리지의 정보가 태그에 기록되어 연결됩니다. NFC 기능은 플랜에 따라 제공되며(무료 플랜은 NFC 태그 0개), NFC 미지원 기기에서는 관련 버튼이 표시되지 않습니다.",
      },
      {
        q: 'NFC 태그를 스캔하면 어떻게 되나요?',
        a: '화면 왼쪽 하단의 NFC 버튼을 눌러 스캔합니다. 태그를 인식하면 연결된 세부 스토리지(또는 카테고리) 페이지로 자동 이동해 관련 문서 목록과 보관 위치를 바로 확인할 수 있습니다. 구형 방식의 태그(카테고리 코드/이름 기록)도 인식해 호환 처리합니다.',
      },
      {
        q: '내 휴대폰이 NFC를 지원하는지 확인하려면?',
        a: '앱이 기기의 NFC 지원 여부를 자동 감지합니다. 지원하지 않으면 NFC 버튼 자체가 표시되지 않습니다. 안드로이드/iOS 네이티브 앱과 웹 NFC 환경을 모두 지원하며, 스캔 중에는 진행 상태와 성공/실패가 안내됩니다.',
      },
      {
        q: 'NFC 태그를 분실했거나 다시 쓰고 싶어요.',
        a: '세부 스토리지의 NFC 연결을 해제하거나, 새 태그에 다시 기록할 수 있습니다. 같은 UID가 다른 스토리지에 중복 연결되지 않도록 기존 연결은 정리된 뒤 새로 등록됩니다.',
      },
    ],
  },
  {
    id: 'statistics',
    title: '통계 및 대시보드',
    icon: BarChart3,
    color: '#2563eb',
    items: [
      {
        q: '대시보드에서 어떤 정보를 볼 수 있나요?',
        a: '월별 업로드 추이, 카테고리·부서별 문서 분포, 증감률 등 핵심 지표를 확인할 수 있습니다. 또한 최근 방문한 스토리지와 즐겨찾기 기반의 빠른 접근 정보도 함께 제공됩니다.',
      },
      {
        q: '팀원도 통계를 볼 수 있나요?',
        a: '팀원은 소속 부서 범위의 통계만 볼 수 있고, 전사 단위 통계와 부서 간 비교는 관리자만 확인할 수 있습니다.',
      },
      {
        q: '더 상세한 통계를 보고 싶어요.',
        a: '고급 통계는 상위 구독 플랜에서 제공되는 기능입니다. 무료 플랜에서는 기본 통계가 제공되며, 플랜을 업그레이드하면 더 세분화된 분석을 이용할 수 있습니다.',
      },
    ],
  },
  {
    id: 'chatbot',
    title: 'AI 챗봇',
    icon: Bot,
    color: '#8b5cf6',
    items: [
      {
        q: 'AI 챗봇은 무엇을 도와주나요?',
        a: '화면 오른쪽 하단의 챗봇으로 문서 검색(내용·기간·부서별), 시스템 사용법 안내, 카테고리/부서 현황 조회, 팀원 조회 등을 도와줍니다. 답변에는 관련 문서나 페이지로 바로 이동하는 링크가 함께 표시됩니다.',
      },
      {
        q: 'AI 모델을 선택할 수 있나요? 음성으로도 쓸 수 있나요?',
        a: '네. 챗봇 하단에서 GPT-5.5 / GPT-5.4 / GPT-4.1 / GPT-4o 중 모델을 선택할 수 있고, 선택은 저장됩니다. 마이크 버튼으로 음성 입력(STT)이 가능하며, 음성 모드에서는 답변을 음성으로 읽어주기도 합니다.',
      },
      {
        q: '챗봇 사용에 제한이 있나요? 대화 내역은 저장되나요?',
        a: 'AI 질의는 플랜별 월 사용량 한도가 있습니다(무료 플랜 월 20회). 대화 내역은 현재 세션 동안 유지되며, 로그아웃하면 보안을 위해 완전히 삭제됩니다.',
      },
    ],
  },
  {
    id: 'announcements',
    title: '공지사항',
    icon: Megaphone,
    color: '#f59e0b',
    items: [
      {
        q: '관리자 공지와 팀 공지의 차이는?',
        a: '관리자 공지는 회사 전체 구성원을 대상으로 하고, 팀 공지는 해당 부서 소속 팀원에게 표시됩니다. 권한에 따라 작성 위치가 구분됩니다.',
      },
      {
        q: '공지사항을 작성하려면?',
        a: '관리자는 공지 관리 메뉴에서 회사 공지를 작성·수정·삭제할 수 있습니다. 팀 단위 공지는 팀 공지 화면에서 관리합니다.',
      },
      {
        q: '운영사(서비스 제공자)의 공지도 따로 있나요?',
        a: '네. 서비스 운영팀이 발행하는 시스템 공지가 별도로 있으며, 점검·업데이트 등 서비스 전반의 안내가 지정된 위치에 노출됩니다.',
      },
    ],
  },
  {
    id: 'notifications',
    title: '알림',
    icon: Bell,
    color: '#2563eb',
    items: [
      {
        q: '어떤 알림을 받을 수 있나요?',
        a: "문서 활동(생성·삭제·공유), 카테고리 변경(생성·삭제), 만료 관리(스토리지 만료 임박/만료) 알림을 받습니다. 관리자는 추가로 알림 범위를 '내 부서만'으로 제한하는 옵션을 사용할 수 있습니다.",
      },
      {
        q: '알림 종류를 끄거나 켤 수 있나요?',
        a: '네. 알림 설정에서 항목별 스위치로 문서 생성/삭제/공유, 카테고리 변경, 만료 알림을 개별적으로 켜고 끌 수 있으며, 변경 사항은 즉시 저장됩니다.',
      },
      {
        q: '푸시 알림은 어떻게 받나요?',
        a: '모바일 앱에서 로그인하면 푸시 식별자가 자동 등록되어 푸시 알림을 받을 수 있습니다. 기기/OS의 알림 권한을 허용해 두어야 정상적으로 수신됩니다.',
      },
    ],
  },
  {
    id: 'etc',
    title: '기타',
    icon: Settings,
    color: '#64748b',
    items: [
      {
        q: '다크 모드를 사용할 수 있나요?',
        a: '네, 라이트/다크 테마 전환을 지원하며 설정에서 변경할 수 있습니다. PDF 미리보기 화면은 가독성을 위해 다크 모드에서도 흰 배경을 유지합니다.',
      },
      {
        q: '지원하는 언어는 무엇인가요?',
        a: '한국어, 영어, 일본어, 독일어 4개 언어를 지원하며, 인터페이스와 챗봇 응답이 선택한 언어에 맞춰 제공됩니다.',
      },
      {
        q: '부적절한 콘텐츠를 신고하려면?',
        a: "대상 문서/게시물의 '신고' 버튼을 눌러 사유(스팸/광고, 부적절한 콘텐츠, 음란물, 욕설·괴롭힘, 폭력, 허위 정보, 개인정보 노출, 저작권 침해, 불법 정보, 기타)를 선택하고 상세 내용을 적어 제출합니다. 접수된 신고는 운영팀이 검토 후 조치하며, 같은 대상에 대한 중복 신고는 자동으로 방지됩니다.",
      },
      {
        q: '문의하거나 도움을 받으려면?',
        a: '앱 내 문의 기능으로 문의를 등록하면 운영팀의 답변을 받을 수 있습니다. 계정 정지·데이터 불일치 등 로그인 관련 문제는 안내 메시지에 따라 고객센터로 문의하면 됩니다.',
      },
    ],
  },
];

const TOTAL_COUNT = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

interface AccordionItemProps {
  item: QnAItem;
  open: boolean;
  onToggle: () => void;
}

function AccordionItem({ item, open, onToggle }: AccordionItemProps) {
  return (
    <div className="border-t border-border/60 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 text-left px-4 sm:px-5 py-3.5 hover:bg-accent/60 transition-colors"
      >
        <span className="mt-0.5 text-[13px] font-bold text-[#2563eb] dark:text-[#3b82f6] shrink-0">Q</span>
        <span className="flex-1 text-[14px] font-medium text-foreground leading-snug">{item.q}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="flex items-start gap-3 px-4 sm:px-5 pb-4 pt-0.5">
          <span className="mt-0.5 text-[13px] font-bold text-muted-foreground shrink-0">A</span>
          <p className="flex-1 text-[13.5px] text-muted-foreground leading-relaxed whitespace-pre-line">
            {item.a}
          </p>
        </div>
      )}
    </div>
  );
}

export function QnAPage() {
  const [query, setQuery] = useState('');
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const filteredSections = useMemo(() => {
    if (!isSearching) return SECTIONS;
    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.q.toLowerCase().includes(normalizedQuery) ||
          item.a.toLowerCase().includes(normalizedQuery),
      ),
    })).filter((section) => section.items.length > 0);
  }, [isSearching, normalizedQuery]);

  const matchCount = useMemo(
    () => filteredSections.reduce((sum, s) => sum + s.items.length, 0),
    [filteredSections],
  );

  const toggleKey = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isOpen = (key: string) => isSearching || openKeys.has(key);

  return (
    <DashboardLayout>
      <V1PageHeader
        eyebrow="HELP CENTER"
        title="FAQ"
        sub="TrayStorage Connect 사용 중 궁금한 점을 빠르게 찾아보세요."
      />

      {/* 검색 */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="질문이나 키워드로 검색..."
          className="w-full h-11 pl-10 pr-10 rounded-[12px] border border-border bg-card text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] transition-shadow"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {isSearching
          ? `'${query.trim()}' 검색 결과 ${matchCount}개`
          : `전체 ${TOTAL_COUNT}개의 질문`}
      </p>

      {filteredSections.length === 0 ? (
        <div className={cn(v1Card, 'py-16 flex flex-col items-center justify-center text-center')}>
          <HelpCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">검색 결과가 없습니다.</p>
          <p className="text-xs text-muted-foreground mt-1">다른 키워드로 검색해 보세요.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.id} className={v1Card}>
                <div className="px-4 sm:px-5 py-3.5 flex items-center gap-2.5 border-b border-border/60">
                  <div
                    className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                    style={{ background: `${section.color}18` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: section.color }} />
                  </div>
                  <h2 className="text-[15px] font-semibold text-foreground flex-1">{section.title}</h2>
                  <span className="text-xs text-muted-foreground">{section.items.length}</span>
                </div>
                <div>
                  {section.items.map((item, idx) => {
                    const key = `${section.id}-${idx}`;
                    return (
                      <AccordionItem
                        key={key}
                        item={item}
                        open={isOpen(key)}
                        onToggle={() => toggleKey(key)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
