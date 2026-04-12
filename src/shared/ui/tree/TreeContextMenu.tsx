'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { TreeContextMenuItem, TreeContextMenuProps } from '@/shared/contracts/ui/menus';
import { cn } from '@/shared/utils/ui-utils';

export type { TreeContextMenuItem, TreeContextMenuProps };

const MENUITEM_SELECTOR = 'button[role="menuitem"]:not([disabled])';

function getMenuItemElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(MENUITEM_SELECTOR));
}

export function TreeContextMenu({
  items,
  align = 'start',
  sideOffset = 4,
  className,
  children,
}: TreeContextMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const anchorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const hasItems = useMemo(() => items.some((item) => item.separator || item.label), [items]);

  const closeMenu = useCallback((): void => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const focusTrigger = useCallback((): void => {
    if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, []);

  useEffect((): void => {
    setMounted(true);
  }, []);

  useEffect((): (() => void) | void => {
    if (!open) return undefined;

    const handlePointer = (event: MouseEvent): void => {
      const target = event.target as Node | null;
      if (!menuRef.current || (target && menuRef.current.contains(target))) return;
      closeMenu();
      focusTrigger();
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeMenu();
        focusTrigger();
      }
    };

    const handleScroll = (): void => {
      closeMenu();
      focusTrigger();
    };

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
  }, [open, closeMenu, focusTrigger]);

  // Auto-focus first menu item when menu opens
  useEffect((): void => {
    if (!open || !menuRef.current) return;
    const menuItems = getMenuItemElements(menuRef.current);
    if (menuItems.length > 0) {
      setActiveIndex(0);
      menuItems[0]?.focus();
    }
  }, [open]);

  React.useLayoutEffect((): void => {
    if (!open || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const anchor = anchorRef.current;
    let nextX =
      anchor.x + (align === 'center' ? -rect.width / 2 : align === 'end' ? -rect.width : 0);
    let nextY = anchor.y + sideOffset;

    if (nextX + rect.width > window.innerWidth) {
      nextX = Math.max(8, window.innerWidth - rect.width - 8);
    }
    if (nextX < 8) nextX = 8;
    if (nextY + rect.height > window.innerHeight) {
      nextY = Math.max(8, anchor.y - rect.height - sideOffset);
    }
    if (nextY < 8) nextY = 8;

    if (nextX !== position.x || nextY !== position.y) {
      setPosition({ x: nextX, y: nextY });
    }
  }, [open, align, sideOffset]);

  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
      if (!menuRef.current) return;
      const menuItems = getMenuItemElements(menuRef.current);

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const next = activeIndex < menuItems.length - 1 ? activeIndex + 1 : 0;
          setActiveIndex(next);
          menuItems[next]?.focus();
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prev = activeIndex > 0 ? activeIndex - 1 : menuItems.length - 1;
          setActiveIndex(prev);
          menuItems[prev]?.focus();
          break;
        }
        case 'Home': {
          event.preventDefault();
          setActiveIndex(0);
          menuItems[0]?.focus();
          break;
        }
        case 'End': {
          event.preventDefault();
          const lastIndex = menuItems.length - 1;
          setActiveIndex(lastIndex);
          menuItems[lastIndex]?.focus();
          break;
        }
        case 'Tab': {
          event.preventDefault();
          closeMenu();
          focusTrigger();
          break;
        }
      }
    },
    [activeIndex, closeMenu, focusTrigger]
  );

  if (!hasItems) {
    return <>{children}</>;
  }

  const menu =
    open && mounted
      ? createPortal(
        <div
          ref={menuRef}
          className='z-50 min-w-[8rem] overflow-hidden rounded-md border border-border/50 bg-popover/90 p-1 text-popover-foreground shadow-md backdrop-blur-md'
          style={{ position: 'fixed', top: position.y, left: position.x }}
          role='menu'
          aria-label='Context menu'
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item: TreeContextMenuItem) => {
            if (item.separator) {
              return <div key={item.id} className='-mx-1 my-1 h-px bg-foreground/10' role='separator' />;
            }
            return (
              <button
                key={item.id}
                type='button'
                onClick={() => {
                  if (item.disabled) return;
                  item.onSelect?.();
                  closeMenu();
                  focusTrigger();
                }}
                aria-label={item.label}
                className={cn(
                  'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                  item.disabled
                    ? 'pointer-events-none opacity-50'
                    : 'hover:bg-foreground/10 focus:bg-foreground/10 focus:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40',
                  item.tone === 'danger' && 'text-red-300 hover:text-red-200'
                )}
                role='menuitem'
                disabled={item.disabled}
                tabIndex={-1}
              >
                {item.icon ? (
                  <span className='mr-2 inline-flex size-4 items-center justify-center' aria-hidden='true'>
                    {item.icon}
                  </span>
                ) : null}
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body
      )
      : null;

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        className={cn('contents', className)}
        onContextMenu={(event: React.MouseEvent): void => {
          event.preventDefault();
          const nextAnchor = { x: event.clientX, y: event.clientY };
          anchorRef.current = nextAnchor;
          setPosition(nextAnchor);
          setOpen(true);
        }}
        onKeyDown={(event: React.KeyboardEvent): void => {
          if (event.key === 'ContextMenu' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const rect = triggerRef.current?.getBoundingClientRect();
            const nextAnchor = rect
              ? { x: rect.left, y: rect.bottom }
              : { x: 0, y: 0 };
            anchorRef.current = nextAnchor;
            setPosition(nextAnchor);
            setOpen(true);
          }
        }}
      >
        {children}
      </span>
      {menu}
    </>
  );
}
