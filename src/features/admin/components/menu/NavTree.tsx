'use client';

import { AppWindow, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import React, { createContext, useContext } from 'react';

import { Tooltip, TreeContextMenu, Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { type NavItem, isActiveHref } from './admin-menu-utils';
import { ADMIN_MENU_COLOR_MAP } from '../Menu';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type AdminMenuTreeContextValue = {
  isMenuCollapsed: boolean;
  pathname: string;
  openIds: Set<string>;
  onToggleOpen: (id: string) => void;
};

const AdminMenuTreeContext = createContext<AdminMenuTreeContextValue | null>(null);
const AdminMenuDepthContext = createContext<number>(0);

export const useAdminMenuTreeContext = (): AdminMenuTreeContextValue => {
  const context = useContext(AdminMenuTreeContext);
  if (!context) {
    throw new Error('useAdminMenuTreeContext must be used within AdminMenuTreeContext.Provider');
  }
  return context;
};

export const useAdminMenuDepth = (): number => useContext(AdminMenuDepthContext);

const copyToClipboard = async (value: string): Promise<void> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch (error) {
    logClientError(error);
  
    // ignore
  }
};

const buildNavContextItems = (
  item: NavItem,
  isOpen: boolean,
  hasChildren: boolean,
  onToggleOpen: (id: string) => void
): Array<{
  id: string;
  label?: string;
  onSelect?: () => void;
  separator?: boolean;
}> => {
  const items: Array<{
    id: string;
    label?: string;
    onSelect?: () => void;
    separator?: boolean;
  }> = [];

  if (item.action) {
    items.push({ id: 'run-action', label: 'Run action', onSelect: () => item.action?.() });
  }
  if (hasChildren) {
    items.push({
      id: 'toggle-children',
      label: isOpen ? 'Collapse' : 'Expand',
      onSelect: () => onToggleOpen(item.id),
    });
    items.push({ id: 'separator-1', separator: true });
  }
  const itemHref = item.href;
  if (itemHref) {
    items.push({
      id: 'open',
      label: 'Open',
      onSelect: () => {
        if (typeof window !== 'undefined') window.location.assign(itemHref);
      },
    });
    items.push({
      id: 'open-new',
      label: 'Open in new tab',
      onSelect: () => {
        if (typeof window !== 'undefined') window.open(itemHref, '_blank', 'noopener,noreferrer');
      },
    });
    items.push({
      id: 'copy-link',
      label: 'Copy link',
      onSelect: () => void copyToClipboard(itemHref),
    });
  }

  return items;
};

export function NavTree({ items }: { items: NavItem[] }): React.ReactNode {
  const depth = useAdminMenuDepth();
  const { isMenuCollapsed, pathname, openIds, onToggleOpen } = useAdminMenuTreeContext();

  return (
    <div className={cn(depth === 0 ? 'space-y-1.5' : 'space-y-1')}>
      {items.map((item: NavItem) => {
        const hasChildren = !!item.children?.length;
        const active =
          !hasChildren && item.href ? isActiveHref(pathname, item.href, item.exact) : false;
        const isOpen = !isMenuCollapsed && hasChildren && openIds.has(item.id);
        const contextItems = buildNavContextItems(item, isOpen, hasChildren, onToggleOpen);
        const sectionStyle = item.sectionColor ? ADMIN_MENU_COLOR_MAP[item.sectionColor] : null;

        const rowStyle: React.CSSProperties | undefined = isMenuCollapsed
          ? undefined
          : {
            paddingLeft: 10 + depth * 14,
          };

        const focusRingClassName =
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

        const rowClassName = cn(
          'group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition cursor-pointer border-l-2 h-auto font-normal',
          focusRingClassName,
          sectionStyle ? sectionStyle.border : 'border-transparent',
          active ? 'bg-gray-700/60 text-white' : 'text-gray-200 hover:bg-gray-700/40'
        );

        return (
          <div key={item.id}>
            {isMenuCollapsed && depth === 0 ? (
              <Tooltip content={item.label} side='right'>
                <div>
                  {item.href ? (
                    <TreeContextMenu items={contextItems} className='cursor-pointer'>
                      <Link
                        href={item.href}
                        prefetch={false}
                        {...(item.onClick ? { onClick: item.onClick } : {})}
                        className={cn(
                          'flex items-center justify-center rounded-md px-2 py-2 transition border-l-2 cursor-pointer',
                          focusRingClassName,
                          sectionStyle ? sectionStyle.border : 'border-transparent',
                          active
                            ? 'bg-gray-700/60 text-white'
                            : 'text-gray-200 hover:bg-gray-700/40'
                        )}
                      >
                        <span className='relative text-gray-200'>
                          {item.icon ?? <AppWindow className='size-4' />}
                          {sectionStyle ? (
                            <span
                              className={cn(
                                'absolute -right-1 -top-1 h-2 w-2 rounded-full',
                                sectionStyle.dot
                              )}
                            />
                          ) : null}
                        </span>
                        <span className='sr-only'>{item.label}</span>
                      </Link>
                    </TreeContextMenu>
                  ) : (
                    <TreeContextMenu items={contextItems} className='cursor-pointer'>
                      <Button
                        variant='ghost'
                        onClick={(): void => {
                          if (item.action) item.action();
                          if (!item.href && hasChildren) onToggleOpen(item.id);
                        }}
                        className={cn(
                          'flex w-full items-center justify-center rounded-md px-2 py-2 transition border-l-2 cursor-pointer h-auto',
                          focusRingClassName,
                          sectionStyle ? sectionStyle.border : 'border-transparent',
                          active
                            ? 'bg-gray-700/60 text-white'
                            : 'text-gray-200 hover:bg-gray-700/40'
                        )}
                      >
                        <span className='relative text-gray-200'>
                          {item.icon ?? <AppWindow className='size-4' />}
                          {sectionStyle ? (
                            <span
                              className={cn(
                                'absolute -right-1 -top-1 h-2 w-2 rounded-full',
                                sectionStyle.dot
                              )}
                            />
                          ) : null}
                        </span>
                        <span className='sr-only'>{item.label}</span>
                      </Button>
                    </TreeContextMenu>
                  )}
                </div>
              </Tooltip>
            ) : (
              <>
                {hasChildren ? (
                  <TreeContextMenu items={contextItems} className='cursor-pointer'>
                    <Button
                      variant='ghost'
                      onClick={(): void => {
                        if (item.action) {
                          item.action();
                          return;
                        }
                        onToggleOpen(item.id);
                      }}
                      className={rowClassName}
                      style={rowStyle}
                      aria-expanded={isOpen}
                      aria-controls={`${item.id}-children`}
                    >
                      <div className='flex min-w-0 items-center gap-2'>
                        {depth === 0 && item.icon ? (
                          <>
                            {sectionStyle ? (
                              <span className={cn('h-2 w-2 rounded-full', sectionStyle.dot)} />
                            ) : null}
                            <span className='shrink-0 text-gray-200'>{item.icon}</span>
                          </>
                        ) : depth > 0 ? (
                          sectionStyle ? (
                            <span className={cn('h-1.5 w-1.5 rounded-full', sectionStyle.dot)} />
                          ) : (
                            <span className='shrink-0 text-gray-600'>•</span>
                          )
                        ) : null}

                        <span className='min-w-0 truncate text-left'>{item.label}</span>
                      </div>

                      <ChevronRightIcon
                        className={cn(
                          'size-4 shrink-0 text-gray-400 transition-transform duration-200',
                          isOpen ? 'rotate-90' : ''
                        )}
                        aria-hidden='true'
                      />
                    </Button>
                  </TreeContextMenu>
                ) : item.href ? (
                  <TreeContextMenu items={contextItems} className='cursor-pointer'>
                    <Link
                      href={item.href}
                      prefetch={false}
                      {...(item.onClick ? { onClick: item.onClick } : {})}
                      className={rowClassName}
                      style={rowStyle}
                    >
                      <div className='flex min-w-0 items-center gap-2'>
                        {depth === 0 && item.icon ? (
                          <>
                            {sectionStyle ? (
                              <span className={cn('h-2 w-2 rounded-full', sectionStyle.dot)} />
                            ) : null}
                            <span className='shrink-0 text-gray-200'>{item.icon}</span>
                          </>
                        ) : depth > 0 ? (
                          sectionStyle ? (
                            <span className={cn('h-1.5 w-1.5 rounded-full', sectionStyle.dot)} />
                          ) : (
                            <span className='shrink-0 text-gray-600'>•</span>
                          )
                        ) : null}
                        <span className='min-w-0 truncate'>{item.label}</span>
                      </div>
                    </Link>
                  </TreeContextMenu>
                ) : (
                  <TreeContextMenu items={contextItems} className='cursor-pointer'>
                    <Button
                      variant='ghost'
                      onClick={(): void => {
                        if (item.action) item.action();
                      }}
                      className={rowClassName}
                      style={rowStyle}
                    >
                      <div className='flex min-w-0 items-center gap-2'>
                        {depth === 0 && item.icon ? (
                          <>
                            {sectionStyle ? (
                              <span className={cn('h-2 w-2 rounded-full', sectionStyle.dot)} />
                            ) : null}
                            <span className='shrink-0 text-gray-200'>{item.icon}</span>
                          </>
                        ) : depth > 0 ? (
                          sectionStyle ? (
                            <span className={cn('h-1.5 w-1.5 rounded-full', sectionStyle.dot)} />
                          ) : (
                            <span className='shrink-0 text-gray-600'>•</span>
                          )
                        ) : null}
                        <span className='min-w-0 truncate text-left'>{item.label}</span>
                      </div>
                    </Button>
                  </TreeContextMenu>
                )}

                {hasChildren && isOpen ? (
                  <div className='mt-1' id={`${item.id}-children`}>
                    <AdminMenuDepthContext.Provider value={depth + 1}>
                      <NavTree items={item.children ?? []} />
                    </AdminMenuDepthContext.Provider>
                  </div>
                ) : null}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { AdminMenuTreeContext, AdminMenuDepthContext };
