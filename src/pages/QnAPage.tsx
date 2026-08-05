import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

interface QnASectionMeta {
  id: string;
  icon: LucideIcon;
  color: string;
}

const SECTION_META: QnASectionMeta[] = [
  { id: 'account', icon: KeyRound, color: '#2563eb' },
  { id: 'documents', icon: FileText, color: '#2563eb' },
  { id: 'categories', icon: FolderOpen, color: '#8b5cf6' },
  { id: 'nfc', icon: Smartphone, color: '#10b981' },
  { id: 'statistics', icon: BarChart3, color: '#2563eb' },
  { id: 'chatbot', icon: Bot, color: '#8b5cf6' },
  { id: 'announcements', icon: Megaphone, color: '#f59e0b' },
  { id: 'notifications', icon: Bell, color: '#2563eb' },
  { id: 'etc', icon: Settings, color: '#64748b' },
];

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
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const sections = useMemo(
    () =>
      SECTION_META.map((meta) => ({
        ...meta,
        title: t(`qnaPage.sections.${meta.id}.title`),
        items: t(`qnaPage.sections.${meta.id}.items`, { returnObjects: true }) as QnAItem[],
      })),
    // i18n.language를 의존성에 두어 언어 전환 시 재계산
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );

  const totalCount = useMemo(
    () => sections.reduce((sum, s) => sum + s.items.length, 0),
    [sections],
  );

  const filteredSections = useMemo(() => {
    if (!isSearching) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.q.toLowerCase().includes(normalizedQuery) ||
            item.a.toLowerCase().includes(normalizedQuery),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, isSearching, normalizedQuery]);

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
        eyebrow={t('qnaPage.eyebrow')}
        title={t('qnaPage.title')}
        sub={t('qnaPage.sub')}
      />

      {/* 검색 */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('qnaPage.searchPlaceholder')}
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
          ? t('qnaPage.searchResult', { query: query.trim(), n: matchCount })
          : t('qnaPage.totalQuestions', { n: totalCount })}
      </p>

      {filteredSections.length === 0 ? (
        <div className={cn(v1Card, 'py-16 flex flex-col items-center justify-center text-center')}>
          <HelpCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">{t('qnaPage.noResult')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('qnaPage.noResultHint')}</p>
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
