import React from 'react';

import { cn } from '@/shared/utils/ui-utils';

export function MailClientStatusLine({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'error';
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-h-24 items-center justify-center border border-dashed px-4 py-6 text-center text-sm',
        tone === 'error' ? 'border-red-400/30 text-red-300' : 'border-border/60 text-muted-foreground'
      )}
    >
      {children}
    </div>
  );
}
