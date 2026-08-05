import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '@/lib/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 렌더 중 발생한 예외를 잡아 안내 화면으로 대체한다.
 * 없으면 페이지 한 곳의 예외로 앱 전체가 흰 화면이 된다.
 *
 * 번역은 useTranslation 훅 대신 i18n 인스턴스를 직접 쓴다 —
 * 클래스 컴포넌트라 훅을 못 쓰고, 키가 없어도 defaultValue 로 안전하게 표시된다.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 콘솔에는 원문 그대로 남긴다 (사용자 화면에는 노출하지 않는다).
    console.error('[ErrorBoundary] 렌더 오류:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;

    const t = (key: string, defaultValue: string) => i18n.t(key, { defaultValue });

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md text-center space-y-5">
          <h1 className="text-xl font-semibold text-slate-900">
            {t('errorBoundary.title', '화면을 표시하지 못했습니다')}
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            {t(
              'errorBoundary.description',
              '일시적인 오류가 발생했습니다. 새로고침해도 계속되면 관리자에게 문의해 주세요.',
            )}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {t('errorBoundary.reload', '새로고침')}
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {t('errorBoundary.goHome', '처음으로')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
