import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/shared/utils/ui-utils';

type SectionHeaderBackLinkProps = {
  href: string;
  children: React.ReactNode;
  arrow?: boolean;
  className?: string;
};

export function SectionHeaderBackLink({
  href,
  children,
  arrow = false,
  className,
}: SectionHeaderBackLinkProps): React.JSX.Element {
  return (
    <Link href={href} className={cn('text-blue-300 hover:text-blue-200', className)}>
      {arrow ? '← ' : null}
      {children}
    </Link>
  );
}
