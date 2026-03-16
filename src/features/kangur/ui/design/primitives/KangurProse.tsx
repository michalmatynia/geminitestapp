import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

export const kangurProseVariants = cva(
  'mx-auto max-w-none break-words text-[1rem] leading-7 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:leading-tight [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-3 [&_strong]:font-semibold [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_svg]:max-w-full [&_svg]:h-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto',
  {
    variants: {
      accent: {
        indigo: '[&_a]:text-indigo-600 [&_blockquote]:border-indigo-200',
        violet: '[&_a]:text-violet-600 [&_blockquote]:border-violet-200',
        emerald: '[&_a]:text-emerald-600 [&_blockquote]:border-emerald-200',
        sky: '[&_a]:text-sky-600 [&_blockquote]:border-sky-200',
        amber: '[&_a]:text-amber-700 [&_blockquote]:border-amber-200',
        rose: '[&_a]:text-rose-600 [&_blockquote]:border-rose-200',
        teal: '[&_a]:text-teal-600 [&_blockquote]:border-teal-200',
        slate: '[&_a]:text-slate-700 [&_blockquote]:border-slate-200',
      },
    },
    defaultVariants: {
      accent: 'slate',
    },
  }
);

export type KangurProseProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof kangurProseVariants> & {
    as?: React.ElementType;
  };

export function KangurProse({
  accent = 'slate',
  as: Comp = 'div',
  className,
  ...props
}: KangurProseProps): React.JSX.Element {
  const Component = Comp as React.ElementType<Record<string, unknown>>;
  return React.createElement(Component, {
    ...props,
    className: cn(kangurProseVariants({ accent }), className),
  });
}
