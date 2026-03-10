'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useRef, useCallback, useEffect } from 'react';

import { cn, getMotionSafeScrollBehavior } from '@/shared/utils';

import { Button } from './button';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  scrollable?: boolean;
  backgroundColor?: string;
  size?: 'xs' | 'sm';
}

/**
 * Breadcrumbs - A unified component for navigation trails.
 * Supports optional scrolling for long paths, consistent with BreadcrumbScroller.
 */
export function Breadcrumbs({
  items,
  className,
  scrollable = false,
  backgroundColor,
  size = 'xs',
}: BreadcrumbsProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !scrollable) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
  }, [scrollable]);

  useEffect(() => {
    if (!scrollable) return;
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => updateScrollState();
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [scrollable, updateScrollState]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === 'left' ? -140 : 140;
    el.scrollBy({ left: offset, behavior: getMotionSafeScrollBehavior('smooth') });
  };

  if (items.length === 0) return <></>;

  const content = (
    <nav
      aria-label='Breadcrumb'
      className={cn(
        'flex items-center gap-1',
        size === 'xs' ? 'text-[10px]' : 'text-xs',
        scrollable ? 'overflow-x-auto scrollbar-hidden px-5 py-2' : 'flex-wrap',
        className
      )}
      ref={scrollRef}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={item.label + (item.href ?? '') + index}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className='transition-colors hover:text-gray-200 whitespace-nowrap text-gray-400'
                onClick={item.onClick}
              >
                {item.label}
              </Link>
            ) : item.onClick ? (
              <button
                type='button'
                onClick={item.onClick}
                className='transition-colors hover:text-gray-200 whitespace-nowrap text-gray-400'
              >
                {item.label}
              </button>
            ) : (
              <span className={cn('whitespace-nowrap', isLast ? 'text-gray-300' : 'text-gray-400')}>
                {item.label}
              </span>
            )}
            {!isLast && <span className='mx-0.5 text-gray-600 shrink-0'>/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );

  if (scrollable) {
    return (
      <div className='relative' style={{ backgroundColor }}>
        {canScrollLeft && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label='Scroll breadcrumb left'
            onClick={() => handleScroll('left')}
            className='absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full size-6 bg-black/40 p-1 text-gray-300 hover:bg-black/60'
          >
            <ChevronLeft size={12} />
          </Button>
        )}
        {canScrollRight && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label='Scroll breadcrumb right'
            onClick={() => handleScroll('right')}
            className='absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full size-6 bg-black/40 p-1 text-gray-300 hover:bg-black/60'
          >
            <ChevronRight size={12} />
          </Button>
        )}
        {content}
      </div>
    );
  }

  return content;
}
