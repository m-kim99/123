import { cn } from '@/lib/utils';

export const COLOR_LABELS = [
  { value: 'ffffff', name: '흰색' },
  { value: 'e80000', name: '빨강' },
  { value: 'ff7f00', name: '주황' },
  { value: 'ffff00', name: '노랑' },
  { value: '26af00', name: '초록' },
  { value: '009eff', name: '파랑' },
  { value: '8800a0', name: '보라' },
  { value: '7f4800', name: '갈색' },
  { value: 'a5a5a5', name: '회색' },
  { value: '000000', name: '검정' },
] as const;

interface ColorLabelPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function ColorLabelPicker({ value, onChange, className }: ColorLabelPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {COLOR_LABELS.map((color) => (
        <button
          key={color.value}
          type="button"
          title={color.name}
          onClick={() => onChange(value === color.value ? null : color.value)}
          className={cn(
            'w-8 h-8 rounded-full border-2 transition-all hover:scale-110',
            value === color.value
              ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1'
              : 'border-gray-300',
            color.value === 'ffffff' && 'border-gray-400'
          )}
          style={{ backgroundColor: `#${color.value}` }}
        />
      ))}
    </div>
  );
}

interface ColorLabelBadgeProps {
  colorLabel: string | null | undefined;
  className?: string;
}

export function ColorLabelBadge({ colorLabel, className }: ColorLabelBadgeProps) {
  if (!colorLabel) return null;

  return (
    <div
      className={cn('w-6 h-6 rounded-full border border-gray-200 flex-shrink-0', className)}
      style={{ backgroundColor: `#${colorLabel}` }}
    />
  );
}
