import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbItemData {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface DocumentBreadcrumbProps {
  items: BreadcrumbItemData[];
  className?: string;
}

export const DocumentBreadcrumb = React.memo(function DocumentBreadcrumb({ items, className }: DocumentBreadcrumbProps) {
  const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/team';

  // 모바일: 마지막 2개만 표시
  const visibleItems = items.length > 2 ? items.slice(-2) : items;

  const isDesktop = window.innerWidth >= 768;
  const renderItems = isDesktop ? items : visibleItems;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {/* 데스크톱: 홈 아이콘 표시 */}
        <BreadcrumbItem className="hidden md:flex">
          <BreadcrumbLink asChild>
            <Link to={basePath} className="flex items-center gap-1">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* 모바일: 항목이 3개 이상이면 생략 표시 */}
        {items.length > 2 && (
          <>
            <BreadcrumbSeparator className="md:hidden">
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem className="md:hidden">
              <span className="text-slate-400">...</span>
            </BreadcrumbItem>
          </>
        )}

        {/* 데스크톱: 전체 항목 / 모바일: 마지막 2개 */}
        {renderItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {item.isCurrentPage || !item.href ? (
                <BreadcrumbPage className="max-w-[150px] truncate md:max-w-none">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    to={item.href}
                    className="max-w-[150px] truncate md:max-w-none"
                  >
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
});
