'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/utils';

export type TreeContextMenuItem = {
  id: string;
  label?: string | undefined;
  onSelect?: (() => void) | undefined;
  disabled?: boolean | undefined;
  tone?: ('default' | 'danger') | undefined;
  icon?: React.ReactNode | undefined;
  separator?: boolean | undefined;
};

export interface TreeContextMenuProps {
  items: TreeContextMenuItem[];
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  children: React.ReactNode;
}

export function TreeContextMenu({
  items,
  align = 'start',
  sideOffset = 4,
  className,
  children,
}: TreeContextMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const hasItems = useMemo(
    () => items.some((item) => item.separator || item.label),
    [items]
  );

  useEffect((): void => {
     
    setMounted(true);
  }, []);

  useEffect((): (() => void) | void => {
    if (!open) return undefined;

    const handlePointer = (event: MouseEvent): void => {
      const target = event.target as Node | null;
      if (!menuRef.current || (target && menuRef.current.contains(target))) return;
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };

    const handleScroll = (): void => setOpen(false);

    window.addEventListener('mousedown', handlePointer);
    window.addEventListener('contextmenu', handlePointer);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return (): void => {
      window.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('contextmenu', handlePointer);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  React.useLayoutEffect((): void => {
    if (!open || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    let nextX = position.x + (align === 'center' ? -rect.width / 2 : align === 'end' ? -rect.width : 0);
    let nextY = position.y + sideOffset;

    if (nextX + rect.width > window.innerWidth) {
      nextX = Math.max(8, window.innerWidth - rect.width - 8);
    }
    if (nextX < 8) nextX = 8;
    if (nextY + rect.height > window.innerHeight) {
      nextY = Math.max(8, position.y - rect.height - sideOffset);
    }
    if (nextY < 8) nextY = 8;

    if (nextX !== position.x || nextY !== position.y) {
      setPosition({ x: nextX, y: nextY });
    }
  }, [open, align, sideOffset, position.x, position.y]);

  if (!hasItems) {
    return <>{children}</>;
  }

  const menu = open && mounted ? createPortal(
    <div
      ref={menuRef}
      className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-border/50 bg-popover/90 p-1 text-popover-foreground shadow-md backdrop-blur-md"
      style={{ position: 'fixed', top: position.y, left: position.x }}
      role="menu"
    >
      {items.map((item) => {
        if (item.separator) {
          return <div key={item.id} className="-mx-1 my-1 h-px bg-foreground/10" />;
        }
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.disabled) return;
              item.onSelect?.();
              setOpen(false);
            }}
            className={cn(
              'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
              item.disabled ? 'pointer-events-none opacity-50' : 'hover:bg-foreground/10 focus:bg-foreground/10 focus:text-foreground',
              item.tone === 'danger' && 'text-red-300 hover:text-red-200'
            )}
            role="menuitem"
            disabled={item.disabled}
          >
            {item.icon ? <span className="mr-2 inline-flex size-4 items-center justify-center">{item.icon}</span> : null}
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <span
        className={cn('contents', className)}
        onContextMenu={(event: React.MouseEvent): void => {
          event.preventDefault();
          setPosition({ x: event.clientX, y: event.clientY });
          setOpen(true);
        }}
      >
        {children}
      </span>
      {menu}
    </>
  );
}
