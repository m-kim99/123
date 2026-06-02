import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import rootLogo from '@/assets/logos/logo-brand.png';
import logo from '@/assets/logos/logo.png';

interface AuthShellProps {
  heroHeadline: string;
  heroDescription?: string;
  children: ReactNode;
}

export function AuthShell({ heroHeadline, heroDescription, children }: AuthShellProps) {
  const { t, i18n } = useTranslation();
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-[#0b1220] overflow-hidden">
      {/* 좌측 브랜드 패널 — 태블릿/데스크탑만 표시 */}
      <div
        className="hidden md:flex w-[44%] shrink-0 relative flex-col justify-between p-10 lg:p-12 overflow-hidden bg-black h-screen sticky top-0"
      >
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          src="/login-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div className="relative z-10 flex items-end gap-2.5">
          <img src={rootLogo} alt={t('login.logoAlt')} className="h-12 w-auto object-contain" />
          <span className="text-[11px] font-bold text-white bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-[6px] tracking-wide -translate-y-[25%]">BETA</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white leading-tight tracking-tight whitespace-pre-line">
            {heroHeadline}
          </h1>
          {heroDescription && (
            <div className="mt-4 text-sm text-white/80 leading-relaxed max-w-sm flex flex-col gap-2">
              {heroDescription.split('\n\n').map((block: string, i: number) => (
                <p key={i} className="whitespace-pre-line m-0">{block}</p>
              ))}
            </div>
          )}
        </div>
        <div className="relative z-10 text-[11px] text-white/70 leading-relaxed">
          {t('login.copyright')}
        </div>
      </div>

      {/* 모바일 전용 — 영상 배경 + 카드 오버레이 (실제 모바일 기기만) */}
      {isMobileDevice && (
        <div className="md:hidden flex-1 relative min-h-screen flex flex-col items-center justify-center overflow-y-auto">
          <video
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            src="/login-bg.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />

          <div className="relative z-10 w-full max-w-[400px] px-5 py-10 flex flex-col items-center">
            {/* 카드 위 헤드라인 */}
            <h1 className="font-bold text-white text-center leading-snug tracking-tight mb-6 whitespace-pre-line" style={{ fontSize: 'clamp(14px, 4.8vw, 20px)' }}>
              {heroHeadline}
            </h1>

            {/* 폼 카드 */}
            <div className="w-full bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] p-6">
              {/* 카드 내 로고 */}
              <div className="flex items-center justify-center mb-5">
                <img src={logo} alt={t('login.logoAlt')} className="h-[52px] w-auto object-contain" />
                <span className="ml-2 self-start mt-[25px] text-[11px] font-bold text-[#2563eb] bg-[#dbeafe] px-1.5 py-0.5 rounded">BETA</span>
              </div>
              {children}
              <div className="mt-5 pt-4 border-t border-[#e5e7eb] text-[10px] text-center text-slate-500 leading-relaxed whitespace-pre-line">
                {i18n.language === 'ko'
                  ? '주식회사 인포크리에이티브\n대표: 정도천\n사업자등록번호: 841-86-03004\n통신판매업신고번호: 2024-서울금천-0112호\n\n고객지원: support@traystorage.net\n도입문의 및 비즈니스 제안: support@traystorage.net\n고객지원번호: 02-333-7334\n\n서울특별시 금천구 가산디지털2로 43-14 708-709호\n(가산동, 가산한화비즈메트로2차)'
                  : 'InfoCreative Inc.\nCEO: Do-Cheon Jeong\nBusiness Registration No: 841-86-03004\nMail-order Sales No: 2024-Seoul Geumcheon-0112\n\nSupport: support@traystorage.net\nBusiness Inquiries: support@traystorage.net\nSupport Line: 02-333-7334\n\n708-709, 43-14 Gasan Digital 2-ro, Geumcheon-gu, Seoul, Korea'}
              </div>
            </div>

            {/* 카드 아래 저작권 */}
            <div className="mt-4 text-[10px] text-center text-white/60 leading-relaxed">
              {t('login.copyright')}
            </div>
          </div>
        </div>
      )}

      {/* 우측 폼 패널 — 데스크탑 or 모바일 md 이상 */}
      <div className={`${isMobileDevice ? 'hidden md:flex' : 'flex'} flex-1 flex-col items-center justify-start h-screen overflow-y-auto p-6 sm:p-8 dark:bg-[#0b1220]`}>
        {/* 모바일 전용 로고 */}
        <div className="md:hidden mb-8 flex items-end gap-2">
          <img src={logo} alt={t('login.logoAlt')} className="h-12 w-auto object-contain" />
          <span className="text-xs font-bold text-[#2563eb] bg-[#dbeafe] px-2 py-1 rounded -translate-y-[25%]">BETA</span>
        </div>

        <div className="w-full max-w-[420px] my-auto py-8">
          {children}
          <div className="mt-6 pt-5 border-t border-[#e5e7eb] text-xs text-center text-slate-500 leading-relaxed whitespace-pre-line">
            {i18n.language === 'ko'
              ? '주식회사 인포크리에이티브\n대표: 정도천\n사업자등록번호: 841-86-03004\n통신판매업신고번호: 2024-서울금천-0112호\n\n고객지원: support@traystorage.net\n도입문의 및 비즈니스 제안: support@traystorage.net\n고객지원번호: 02-333-7334\n\n서울특별시 금천구 가산디지털2로 43-14 708-709호\n(가산동, 가산한화비즈메트로2차)'
              : 'InfoCreative Inc.\nCEO: Do-Cheon Jeong\nBusiness Registration No: 841-86-03004\nMail-order Sales No: 2024-Seoul Geumcheon-0112\n\nSupport: support@traystorage.net\nBusiness Inquiries: support@traystorage.net\nSupport Line: 02-333-7334\n\n708-709, 43-14 Gasan Digital 2-ro, Geumcheon-gu, Seoul, Korea'}
          </div>
        </div>
      </div>
    </div>
  );
}
