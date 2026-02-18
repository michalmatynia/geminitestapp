'use client';

import Link from 'next/link';
import React from 'react';

import { cn } from '@/shared/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps): React.JSX.Element {
  if (items.length === 0) return <></>;

  return (
    <nav
      aria-label='Breadcrumb'
      className={cn('flex flex-wrap items-center gap-1 text-xs text-gray-400', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={item.label + (item.href ?? '')}>
            {item.href && !isLast ? (
              <Link 
                href={item.href} 
                className='transition-colors hover:text-gray-200'
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast && 'text-gray-300')}>
                {item.label}
              </span>
            )}
            {!isLast && <span className='mx-0.5 text-gray-600'>/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
