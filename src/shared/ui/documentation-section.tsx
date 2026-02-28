

import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

interface DocumentationSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function DocumentationSection({
  title,
  children,
  className,
}: DocumentationSectionProps): React.JSX.Element {
  return (
    <div className={cn('rounded-lg border border-border/60 bg-card/40 p-5', className)}>
      <h3 className='text-base font-semibold text-white'>{title}</h3>
      <div className='mt-3 text-gray-400'>{children}</div>
    </div>
  );
}
