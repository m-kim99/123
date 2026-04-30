import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export const COLOR_LABELS = [
  { value: 'ffffff', nameKey: 'colors.white' },
  { value: 'e80000', nameKey: 'colors.red' },
  { value: 'ff7f00', nameKey: 'colors.orange' },
  { value: 'ffff00', nameKey: 'colors.yellow' },
  { value: '26af00', nameKey: 'colors.green' },
  { value: '009eff', nameKey: 'colors.blue' },
  { value: '8800a0', nameKey: 'colors.purple' },
  { value: '7f4800', nameKey: 'colors.brown' },
  { value: 'a5a5a5', nameKey: 'colors.gray' },
  { value: '000000', nameKey: 'colors.black' },
] as const;

interface ColorLabelPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function ColorLabelPicker({ value, onChange, className }: ColorLabelPickerProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {COLOR_LABELS.map((color) => (
        <button
          key={color.value}
          type="button"
          title={t(color.nameKey)}
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
