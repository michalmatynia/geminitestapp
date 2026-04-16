'use client';

import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';
import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils/ui-utils';
import { getTextContent } from '@/shared/utils/a11y';

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  showIcon?: boolean;
  className?: string;
  iconClassName?: string;
  iconSide?: 'left' | 'right';
  onClick?: ((e: React.MouseEvent) => void) | undefined;
}

export function ExternalLink({
  href,
  children,
  showIcon = true,
  className,
  iconClassName,
  iconSide = 'right',
  onClick,
}: ExternalLinkProps): React.JSX.Element {
  const isExternal = href.startsWith('http') || href.startsWith('mailto:');
  const inferredLabel = getTextContent(children).trim();
  const ariaLabel =
    inferredLabel || (isExternal ? `External link to ${href}` : `Link to ${href}`);

  const icon = showIcon ? (
    <ExternalLinkIcon
      className={cn(
        'size-3.5 opacity-70 group-hover:opacity-100 transition-opacity',
        iconClassName
      )}
      aria-hidden='true'
    />
  ) : null;

  const content = (
    <div className='flex items-center gap-1.5'>
      {iconSide === 'left' && icon}
      <span>{children}</span>
      {iconSide === 'right' && icon}
    </div>
  );

  const finalClassName = cn(
    'group inline-flex items-center text-sky-400 hover:text-sky-300 transition-colors',
    className
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className={finalClassName}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={finalClassName}
      aria-label={ariaLabel}
      {...(onClick ? { onClick } : {})}
    >
      {content}
    </Link>
  );
}
