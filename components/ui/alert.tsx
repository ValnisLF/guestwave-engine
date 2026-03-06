import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-slate-300 bg-slate-50 text-slate-700',
      destructive: 'border-red-300 bg-red-50 text-red-700',
      success: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert };
