import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── V1 Design Tokens ───────────────────────────────────────
export const V1 = {
  blue: '#2563eb',
  blueInk: '#2563eb',
  blueSoft: '#eff6ff',
  violet: '#8b5cf6',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  ink: '#0f172a',
  muted: '#64748b',
  faint: '#94a3b8',
} as const;

// Token-based color resolver — picks light or dark hex based on current theme.
export const V1_DARK = {
  blue: '#3b82f6',
  blueInk: '#60a5fa',
  blueSoft: 'rgba(59,130,246,0.16)',
  violet: '#a78bfa',
  emerald: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  ink: '#f1f5f9',
  muted: '#94a3b8',
  faint: '#64748b',
} as const;

// Resolve a light-mode hex into its dark-mode equivalent at runtime.
export function resolveThemeColor(lightHex: string): string {
  if (typeof document === 'undefined') return lightHex;
  const isDark = document.documentElement.classList.contains('dark');
  if (!isDark) return lightHex;
  const map: Record<string, string> = {
    '#2563eb': V1_DARK.blue,
    '#1d4ed8': V1_DARK.blueInk,
    '#8b5cf6': V1_DARK.violet,
    '#10b981': V1_DARK.emerald,
    '#f59e0b': V1_DARK.amber,
    '#ef4444': V1_DARK.red,
    '#eab308': '#facc15', // yellow
    '#0f172a': V1_DARK.ink,
    '#64748b': V1_DARK.muted,
    '#94a3b8': V1_DARK.faint,
  };
  return map[lightHex.toLowerCase()] || lightHex;
}

// React hook that re-resolves whenever theme changes.
export function useThemeColor(lightHex: string): string {
  const [color, setColor] = React.useState(() => resolveThemeColor(lightHex));
  React.useEffect(() => {
    const obs = new MutationObserver(() => setColor(resolveThemeColor(lightHex)));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, [lightHex]);
  return color;
}

// ─── Sparkline ──────────────────────────────────────────────
interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = V1.blue,
  width = 80,
  height = 32,
  className,
}: SparklineProps) {
  const resolvedColor = useThemeColor(color);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const gradientOpacity = isDark ? 0.42 : 0.18;
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`spark-${resolvedColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={resolvedColor} stopOpacity={gradientOpacity} />
          <stop offset="100%" stopColor={resolvedColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#spark-${resolvedColor.replace('#', '')})`}
        points={`${pad},${height - pad} ${points} ${width - pad},${height - pad}`}
      />
      <polyline
        fill="none"
        stroke={resolvedColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

// ─── V1 StatTile ────────────────────────────────────────────
interface V1StatTileProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'flat';
  sub?: string;
  data?: number[];
  className?: string;
}

export function V1StatTile({
  title,
  value,
  icon: Icon,
  color = V1.blue,
  delta,
  deltaTone,
  sub,
  data,
  className,
}: V1StatTileProps) {
  const resolvedColor = useThemeColor(color);
  const tone = deltaTone ?? (delta?.startsWith('−') || delta?.startsWith('-') ? 'down' : delta === 'WARN' ? 'flat' : 'up');
  const deltaColor =
    tone === 'down' ? 'text-red-700 bg-red-50' :
    tone === 'flat' ? 'text-amber-700 bg-amber-50' :
    'text-emerald-700 bg-emerald-50';

  return (
    <div className={cn(
      'bg-card border border-border rounded-[14px] shadow-sm p-4 sm:p-5',
      className,
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${resolvedColor}18` }}
        >
          <Icon className="h-[15px] w-[15px]" style={{ color: resolvedColor }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground leading-tight truncate">{title}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[28px] sm:text-[30px] font-bold leading-none tracking-tight text-foreground" style={{ fontFeatureSettings: '"tnum"' }}>
              {value}
            </span>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          </div>
          {delta && (
            <span className={cn('inline-block mt-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded', deltaColor)}>
              {delta}
            </span>
          )}
        </div>
        {data && data.length >= 2 && (
          <Sparkline data={data} color={resolvedColor} width={72} height={28} />
        )}
      </div>
    </div>
  );
}

// ─── V1 CardHeader ──────────────────────────────────────────
interface V1CardHeaderProps {
  title: string;
  sub?: string;
  icon?: LucideIcon;
  iconColor?: string;
  action?: React.ReactNode;
  className?: string;
}

export function V1CardHeader({
  title,
  sub,
  icon: Icon,
  iconColor = V1.blue,
  action,
  className,
}: V1CardHeaderProps) {
  const resolvedIconColor = useThemeColor(iconColor);
  return (
    <div className={cn(
      'px-5 sm:px-6 py-4 flex items-center justify-between border-b border-border/50 gap-3',
      className,
    )}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div
            className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ background: `${resolvedIconColor}15` }}
          >
            <Icon className="h-4 w-4" style={{ color: resolvedIconColor }} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">{title}</h3>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}

// ─── V1 Chip ────────────────────────────────────────────────
type ChipVariant = 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'neutral';

const chipStyles: Record<ChipVariant, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
};

interface V1ChipProps {
  variant?: ChipVariant;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function V1Chip({
  variant = 'neutral',
  icon: Icon,
  children,
  className,
}: V1ChipProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border whitespace-nowrap',
      chipStyles[variant],
      className,
    )}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

// ─── V1 OutlineButton ───────────────────────────────────────
interface V1ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

export function V1OutlineButton({
  icon: Icon,
  children,
  className,
  size = 'md',
  ...props
}: V1ButtonProps) {
  const sizeClass = size === 'sm'
    ? 'h-8 px-2.5 text-xs gap-1.5'
    : 'h-9 px-3.5 text-[13px] gap-1.5';

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-[10px] border border-border bg-card font-medium text-foreground hover:bg-accent transition-colors whitespace-nowrap',
        sizeClass,
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  );
}

// ─── V1 PrimaryButton ───────────────────────────────────────
export function V1PrimaryButton({
  icon: Icon,
  children,
  className,
  size = 'md',
  ...props
}: V1ButtonProps) {
  const sizeClass = size === 'sm'
    ? 'h-8 px-2.5 text-xs gap-1.5'
    : 'h-9 px-3.5 text-[13px] gap-1.5';

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-[10px] bg-[#2563eb] hover:bg-[#1d4ed8] dark:bg-[#3b82f6] dark:hover:bg-[#60a5fa] text-white font-semibold shadow-[0_1px_2px_rgba(37,99,235,0.3)] transition-colors whitespace-nowrap',
        sizeClass,
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  );
}

// ─── V1 PageHeader ──────────────────────────────────────────
interface V1PageHeaderProps {
  title: React.ReactNode;
  sub?: string;
  eyebrow?: string;
  breadcrumb?: string[];
  right?: React.ReactNode;
  className?: string;
}

export function V1PageHeader({
  title,
  sub,
  eyebrow,
  breadcrumb,
  right,
  className,
}: V1PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6', className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 flex-wrap">
            {breadcrumb.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />}
                <span className={i === breadcrumb.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {item}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
        {eyebrow && (
          <p className="text-xs font-medium text-muted-foreground mb-1">{eyebrow}</p>
        )}
        <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {sub && <p className="text-sm text-muted-foreground mt-1.5">{sub}</p>}
      </div>
      {right && <div className="shrink-0 flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

// ─── V1 Card wrapper ────────────────────────────────────────
export const v1Card = 'bg-card border border-border rounded-[14px] shadow-sm overflow-hidden';

// ─── V1 Modal Header ────────────────────────────────────────
interface V1ModalHeaderProps {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  sub?: string;
  className?: string;
}

export function V1ModalHeader({ icon: Icon, iconColor = V1.blue, title, sub, className }: V1ModalHeaderProps) {
  const resolvedIconColor = useThemeColor(iconColor);
  return (
    <div className={cn('flex items-start gap-3 px-6 pt-5 pb-4 border-b border-border/50', className)}>
      {Icon && (
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: `${resolvedIconColor}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: resolvedIconColor }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-[17px] font-semibold text-foreground tracking-[-0.01em] leading-tight">{title}</h2>
        {sub && <p className="text-[13px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── V1 Modal Footer ────────────────────────────────────────
interface V1ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function V1ModalFooter({ children, className }: V1ModalFooterProps) {
  return (
    <div className={cn('flex items-center gap-2 justify-end px-6 py-3.5 border-t border-border/50 bg-muted', className)}>
      {children}
    </div>
  );
}

// ─── V1 Modal Body ──────────────────────────────────────────
interface V1ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function V1ModalBody({ children, className }: V1ModalBodyProps) {
  return (
    <div className={cn('px-6 py-5 flex flex-col gap-4 overflow-auto', className)}>
      {children}
    </div>
  );
}
