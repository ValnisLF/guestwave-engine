import * as React from 'react';
import { cn } from '@/lib/utils';

type HeadingProps = React.ComponentProps<'h2'> & {
  level?: 1 | 2 | 3 | 4;
  tone?: 'default' | 'primary' | 'accent';
};

const headingSizeByLevel: Record<NonNullable<HeadingProps['level']>, string> = {
  1: 'text-4xl md:text-5xl',
  2: 'text-3xl md:text-4xl',
  3: 'text-2xl md:text-3xl',
  4: 'text-xl md:text-2xl',
};

function Heading({
  className,
  children,
  level = 2,
  tone = 'default',
  style,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as const;
  const colorStyle =
    tone === 'primary'
      ? ({ color: 'var(--primary-color, var(--primary))' } as React.CSSProperties)
      : tone === 'accent'
        ? ({ color: 'var(--accent-color, var(--accent))' } as React.CSSProperties)
        : undefined;

  return (
    <Tag
      className={cn('font-semibold tracking-tight text-slate-900', headingSizeByLevel[level], className)}
      style={{ ...colorStyle, ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}

type TextProps = React.ComponentProps<'p'> & {
  tone?: 'default' | 'muted' | 'primary' | 'accent';
};

function Text({ className, tone = 'default', style, ...props }: TextProps) {
  const toneClass = tone === 'muted' ? 'text-slate-600' : 'text-slate-700';
  const colorStyle =
    tone === 'primary'
      ? ({ color: 'var(--primary-color, var(--primary))' } as React.CSSProperties)
      : tone === 'accent'
        ? ({ color: 'var(--accent-color, var(--accent))' } as React.CSSProperties)
        : undefined;

  return (
    <p
      className={cn('leading-relaxed', toneClass, className)}
      style={{ ...colorStyle, ...style }}
      {...props}
    />
  );
}

export { Heading, Text };
