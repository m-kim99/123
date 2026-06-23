import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TermsOfServiceContent } from '@/components/terms/TermsOfService';
import { PrivacyPolicyContent } from '@/components/terms/PrivacyPolicy';

const SUPPORT_PHONE = '02-333-7334';
const SUPPORT_EMAIL = 'support@traystorage.net';

const COMPANY_INFO_KO =
  '주식회사 인포크리에이티브 · 대표 정도천 · 사업자등록번호 841-86-03004\n통신판매업신고번호 2024-서울금천-0112호\n서울특별시 금천구 가산디지털2로 43-14 708-709호 (가산동, 가산한화비즈메트로2차)';
const COMPANY_INFO_EN =
  'InfoCreative Inc. · CEO Do-Cheon Jeong · Business Registration No. 841-86-03004\nMail-order Sales No. 2024-Seoul Geumcheon-0112\n708-709, 43-14 Gasan Digital 2-ro, Geumcheon-gu, Seoul, Korea';

export function SiteFooter() {
  const { i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const basePath = user?.role === 'admin' ? '/admin' : '/team';
  const [termsPopupType, setTermsPopupType] = useState<'tos' | 'privacy' | null>(null);
  const isKo = i18n.language === 'ko';

  const columns: { title: string; links: { label: string; to: string }[] }[] = [
    {
      title: isKo ? '서비스' : 'Service',
      links: [
        { label: isKo ? '대시보드' : 'Dashboard', to: basePath },
        { label: isKo ? '문서 관리' : 'Documents', to: `${basePath}/documents` },
        { label: isKo ? '부서 관리' : 'Departments', to: `${basePath}/departments` },
        { label: isKo ? '통계' : 'Statistics', to: `${basePath}/statistics` },
      ],
    },
    {
      title: isKo ? '고객지원' : 'Support',
      links: [
        { label: isKo ? '공지사항' : 'Announcements', to: `${basePath}/announcements` },
        { label: isKo ? '문의 / Q&A' : 'Inquiry / Q&A', to: `${basePath}/qna` },
        { label: isKo ? '휴지통' : 'Trash', to: `${basePath}/trash` },
      ],
    },
  ];

  return (
    <>
      <footer className="mt-10 border-t border-slate-200 dark:border-white/[0.08] bg-[#f8f9fa] dark:bg-[#0b1220]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_1fr] gap-10">
            {/* 고객센터 */}
            <div>
              <p className="text-[13px] font-semibold text-slate-500 dark:text-[#94a3b8]">
                {isKo ? '고객센터' : 'Customer Center'}
              </p>
              <a
                href={`tel:${SUPPORT_PHONE.replace(/-/g, '')}`}
                className="mt-2 inline-flex items-center gap-2 text-[28px] font-bold tracking-tight text-slate-900 dark:text-[#f1f5f9] hover:text-[#2563eb] dark:hover:text-[#3b82f6] transition-colors"
              >
                <Phone className="w-6 h-6" />
                {SUPPORT_PHONE}
              </a>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-1 flex items-center gap-2 text-[16px] font-semibold text-slate-700 dark:text-[#e2e8f0] hover:text-[#2563eb] dark:hover:text-[#3b82f6] transition-colors"
              >
                <Mail className="w-4 h-4" />
                {SUPPORT_EMAIL}
              </a>
              <p className="mt-2 text-[13px] text-slate-500 dark:text-[#94a3b8]">
                {isKo
                  ? '월~금 10:00–18:00 (점심시간 12:00–13:00)'
                  : 'Mon–Fri 10:00–18:00 (Lunch 12:00–13:00)'}
              </p>
              <div className="flex gap-2 mt-4">
                <Link
                  to={`${basePath}/qna`}
                  className="h-9 px-5 inline-flex items-center justify-center rounded-[8px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] dark:bg-[#3b82f6] dark:hover:bg-[#60a5fa] transition-colors"
                >
                  FAQ
                </Link>
                <Link
                  to={`${basePath}/qna`}
                  className="h-9 px-5 inline-flex items-center justify-center rounded-[8px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] dark:bg-[#3b82f6] dark:hover:bg-[#60a5fa] transition-colors"
                >
                  {isKo ? '1:1 문의' : '1:1 Inquiry'}
                </Link>
              </div>
            </div>

            {/* 링크 컬럼 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              {columns.map((col) => (
                <div key={col.title}>
                  <p className="text-[14px] font-semibold text-slate-800 dark:text-[#e2e8f0] mb-3">
                    {col.title}
                  </p>
                  <ul className="space-y-2.5">
                    {col.links.map((link) => (
                      <li key={link.to + link.label}>
                        <Link
                          to={link.to}
                          className="text-[13px] text-slate-500 dark:text-[#94a3b8] hover:text-[#2563eb] dark:hover:text-[#3b82f6] transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {/* 약관 컬럼 */}
              <div>
                <p className="text-[14px] font-semibold text-slate-800 dark:text-[#e2e8f0] mb-3">
                  {isKo ? '약관 및 정책' : 'Legal'}
                </p>
                <ul className="space-y-2.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => setTermsPopupType('tos')}
                      className="text-[13px] text-slate-500 dark:text-[#94a3b8] hover:text-[#2563eb] dark:hover:text-[#3b82f6] transition-colors"
                    >
                      {isKo ? '이용약관' : 'Terms of Service'}
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setTermsPopupType('privacy')}
                      className="text-[13px] font-medium text-slate-700 dark:text-[#cbd5e1] hover:text-[#2563eb] dark:hover:text-[#3b82f6] transition-colors"
                    >
                      {isKo ? '개인정보 처리방침' : 'Privacy Policy'}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 하단: 회사정보 + 카피라이트 */}
          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/[0.08]">
            <p className="text-[11px] text-slate-400 dark:text-[#64748b] leading-relaxed whitespace-pre-line">
              {isKo ? COMPANY_INFO_KO : COMPANY_INFO_EN}
            </p>
            <p className="mt-3 text-[11px] text-slate-400 dark:text-[#64748b]">
              Copyright © {new Date().getFullYear()} InfoCreative Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* 약관 팝업 */}
      <Dialog open={termsPopupType !== null} onOpenChange={(open) => { if (!open) setTermsPopupType(null); }}>
        <DialogContent variant="v1" className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" hideClose>
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-slate-100 dark:border-white/[0.08] shrink-0">
            <div className="w-10 h-10 rounded-[10px] bg-[#eff6ff] dark:bg-[rgba(59,130,246,0.16)] flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-semibold text-slate-900 dark:text-[#f1f5f9] tracking-[-0.01em]">
                {termsPopupType === 'tos'
                  ? (isKo ? '이용약관' : 'Terms of Service')
                  : (isKo ? '개인정보 처리방침' : 'Privacy Policy')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setTermsPopupType(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            <div className="text-[13px] text-slate-700 dark:text-[#cbd5e1] leading-relaxed space-y-4">
              {termsPopupType === 'tos' ? <TermsOfServiceContent /> : <PrivacyPolicyContent />}
            </div>
          </div>
          <div className="flex justify-end px-6 py-3.5 border-t border-[#f1f5f9] dark:border-white/[0.08] bg-[#fafbfc] dark:bg-[#0b1220] rounded-b-[16px] shrink-0">
            <button
              type="button"
              onClick={() => setTermsPopupType(null)}
              className="h-9 px-5 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
            >
              {isKo ? '확인' : 'Confirm'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SiteFooter;
