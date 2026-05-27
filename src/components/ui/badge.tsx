import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        blue: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
        amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
        red: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100',
        violet: 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100',
        neutral: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
