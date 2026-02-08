'use client';

import {
  PackageIcon,
  BookOpenIcon,
  SettingsIcon,
  MessageCircleIcon,
  StickyNoteIcon,
  ShieldIcon,
  ActivityIcon,
  BarChart3Icon,
  WorkflowIcon,
  HomeIcon,
  GitBranchIcon,
  Plug,
  AppWindow,
  Image as ImageIcon,
  ChevronRightIcon,
  StarIcon,
  SparklesIcon,
  MapIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
  parseAdminMenuBoolean,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { useCreateChatbotSession } from '@/features/ai/chatbot/hooks/useChatbotMutations';
import { useChatbotSessions } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, SearchInput, Tooltip, TreeContextMenu, TreeHeader } from '@/shared/ui';
import { cn } from '@/shared/utils';

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  exact?: boolean;
  icon?: React.ReactNode;
  keywords?: string[];
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  action?: () => void;
  children?: NavItem[];
  sectionColor?: string;
};

export type AdminMenuCustomNode = {
  id: string;
  label?: string;
  href?: string;
  children?: AdminMenuCustomNode[];
};

export type AdminMenuColorOption = {
  value: string;
  label: string;
  dot: string;
  border: string;
  text: string;
};

export const ADMIN_MENU_COLORS: AdminMenuColorOption[] = [
  { value: 'slate', label: 'Slate', dot: 'bg-slate-400', border: 'border-slate-400/60', text: 'text-slate-200' },
  { value: 'emerald', label: 'Emerald', dot: 'bg-emerald-400', border: 'border-emerald-400/60', text: 'text-emerald-200' },
  { value: 'blue', label: 'Blue', dot: 'bg-blue-400', border: 'border-blue-400/60', text: 'text-blue-200' },
  { value: 'amber', label: 'Amber', dot: 'bg-amber-400', border: 'border-amber-400/60', text: 'text-amber-200' },
  { value: 'violet', label: 'Violet', dot: 'bg-violet-400', border: 'border-violet-400/60', text: 'text-violet-200' },
  { value: 'cyan', label: 'Cyan', dot: 'bg-cyan-400', border: 'border-cyan-400/60', text: 'text-cyan-200' },
  { value: 'orange', label: 'Orange', dot: 'bg-orange-400', border: 'border-orange-400/60', text: 'text-orange-200' },
  { value: 'rose', label: 'Rose', dot: 'bg-rose-400', border: 'border-rose-400/60', text: 'text-rose-200' },
];

export const ADMIN_MENU_COLOR_MAP: Record<string, AdminMenuColorOption> = Object.fromEntries(
  ADMIN_MENU_COLORS.map((option: AdminMenuColorOption) => [option.value, option])
);

export type FlattenedNavItem = {
  id: string;
  label: string;
  href?: string;
  keywords?: string[];
  parents: string[];
  item: NavItem;
};

export type AdminNavLeaf = FlattenedNavItem;

export const flattenAdminNav = (items: NavItem[], parents: string[] = []): FlattenedNavItem[] => {
  const entries: FlattenedNavItem[] = [];
  items.forEach((item: NavItem) => {
    const nextParents = [...parents, item.label];
    if (item.href && (!item.children || item.children.length === 0)) {
      entries.push({
        id: item.id,
        label: item.label,
        href: item.href,
        ...(item.keywords ? { keywords: item.keywords } : {}),
        parents: parents,
        item,
      });
    }
    if (item.children && item.children.length > 0) {
      entries.push(...flattenAdminNav(item.children, nextParents));
    }
  });
  return entries;
};

export const getAdminMenuSections = (items: NavItem[]): Array<{ id: string; label: string }> =>
  items.map((item: NavItem) => ({ id: item.id, label: item.label }));

export const normalizeAdminMenuCustomNav = (value: unknown): AdminMenuCustomNode[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const walk = (nodes: unknown[]): AdminMenuCustomNode[] => {
    const result: AdminMenuCustomNode[] = [];
    nodes.forEach((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return;
      const rawId = (entry as { id?: unknown }).id;
      if (typeof rawId !== 'string' || rawId.trim().length === 0) return;
      const id = rawId.trim();
      if (seen.has(id)) return;
      seen.add(id);
      const node: AdminMenuCustomNode = { id };
      const rawLabel = (entry as { label?: unknown }).label;
      if (typeof rawLabel === 'string' && rawLabel.trim().length > 0) {
        node.label = rawLabel;
      }
      const rawHref = (entry as { href?: unknown }).href;
      if (typeof rawHref === 'string' && rawHref.trim().length > 0) {
        node.href = rawHref;
      }
      const rawChildren = (entry as { children?: unknown }).children;
      if (Array.isArray(rawChildren)) {
        const children = walk(rawChildren);
        node.children = children;
      }
      result.push(node);
    });
    return result;
  };
  return walk(value);
};

export const adminNavToCustomNav = (items: NavItem[]): AdminMenuCustomNode[] =>
  items.map((item: NavItem) => ({
    id: item.id,
    label: item.label,
    ...(item.href ? { href: item.href } : {}),
    ...(item.children && item.children.length > 0
      ? { children: adminNavToCustomNav(item.children) }
      : {}),
  }));

const indexAdminNav = (
  items: NavItem[],
  map: Map<string, NavItem> = new Map<string, NavItem>()
): Map<string, NavItem> => {
  items.forEach((item: NavItem) => {
    map.set(item.id, item);
    if (item.children && item.children.length > 0) {
      indexAdminNav(item.children, map);
    }
  });
  return map;
};

const mapCustomNavToAdminNav = (
  items: AdminMenuCustomNode[],
  baseMap: Map<string, NavItem>
): NavItem[] => {
  const result: NavItem[] = [];
  items.forEach((node: AdminMenuCustomNode) => {
    const base = baseMap.get(node.id);
    const label = node.label ?? base?.label ?? 'Untitled';
    if (!label) return;
    const href = node.href ?? base?.href;
    const children = Array.isArray(node.children)
      ? mapCustomNavToAdminNav(node.children, baseMap)
      : base?.children;
    const next: NavItem = {
      id: node.id,
      label,
      ...(href ? { href } : {}),
      ...(base?.exact ? { exact: base.exact } : {}),
      ...(base?.icon ? { icon: base.icon } : {}),
      ...(base?.keywords ? { keywords: base.keywords } : {}),
      ...(base?.onClick ? { onClick: base.onClick } : {}),
      ...(base?.action ? { action: base.action } : {}),
      ...(children && children.length > 0 ? { children } : {}),
    };
    result.push(next);
  });
  return result;
};

export const buildAdminMenuFromCustomNav = (
  customNav: AdminMenuCustomNode[],
  baseNav: NavItem[]
): NavItem[] => {
  if (!customNav || customNav.length === 0) return baseNav;
  const baseMap = indexAdminNav(baseNav);
  const mapped = mapCustomNavToAdminNav(customNav, baseMap);
  return mapped.length > 0 ? mapped : baseNav;
};

const OPEN_KEY = 'adminMenuOpenIds.v2';

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripQuery = (href: string): string => href.split('?')[0] ?? href;

const isActiveHref = (pathname: string, href: string, exact?: boolean): boolean => {
  const baseHref = stripQuery(href);
  if (!baseHref) return false;
  if (exact) return pathname === baseHref;
  if (pathname === baseHref) return true;
  if (baseHref === '/admin') return pathname === '/admin';
  return pathname.startsWith(`${baseHref}/`);
};

const matchesQuery = (item: NavItem, query: string): boolean => {
  if (!query) return true;
  const haystack = normalizeText(
    [
      item.label,
      item.href ? stripQuery(item.href) : '',
      ...(item.keywords ?? []),
    ].join(' ')
  );
  return haystack.includes(query);
};

const filterTree = (items: NavItem[], query: string): NavItem[] => {
  if (!query) return items;
  const next: NavItem[] = [];
  items.forEach((item: NavItem) => {
    const children = item.children ? filterTree(item.children, query) : [];
    if (matchesQuery(item, query) || children.length > 0) {
      next.push({ ...item, ...(children.length ? { children } : {}) });
    }
  });
  return next;
};

const copyToClipboard = async (value: string): Promise<void> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // ignore clipboard errors
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
    items.push({ id: 'toggle-children', label: isOpen ? 'Collapse' : 'Expand', onSelect: () => onToggleOpen(item.id) });
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
        if (typeof window !== 'undefined') window.open(itemHref, '_blank', 'noopener');
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

const collectGroupIds = (items: NavItem[]): Set<string> => {
  const ids = new Set<string>();
  const walk = (node: NavItem): void => {
    if (node.children && node.children.length > 0) {
      ids.add(node.id);
      node.children.forEach(walk);
    }
  };
  items.forEach(walk);
  return ids;
};

 
const collectActiveGroupIds = (
  items: NavItem[],
  pathname: string,
  favoriteIds: Set<string>
): Set<string> => {
  const active = new Set<string>();
  const walk = (node: NavItem): { any: boolean; nonFavorite: boolean } => {
    const selfActiveRaw = node.href ? isActiveHref(pathname, node.href, node.exact) : false;
    // Special-case: don't auto-open "section folders" that point to /admin itself.
    // Users expect clicking "Admin" (home) to not expand Workspace unless they explicitly open it.
    const selfActive =
      selfActiveRaw &&
      !(
        (node.children?.length ?? 0) > 0 &&
        node.href &&
        stripQuery(node.href) === '/admin' &&
        pathname === '/admin'
      );
    const childResults: Array<{ any: boolean; nonFavorite: boolean }> = (node.children ?? []).map(walk);
    const childActive = childResults.some((result) => result.any);
    const childNonFavorite = childResults.some((result) => result.nonFavorite);
    const isFavoriteLeaf = !node.children?.length && favoriteIds.has(node.id);
    const nonFavoriteActive = (selfActive && !isFavoriteLeaf) || childNonFavorite;
    if ((selfActive || childActive) && node.children && node.children.length > 0) {
      const shouldOpen = node.id === 'favorites' ? false : nonFavoriteActive;
      if (shouldOpen) {
        active.add(node.id);
      }
    }
    return { any: selfActive || childActive, nonFavorite: nonFavoriteActive };
  };
  items.forEach((item: NavItem) => walk(item));
  return active;
};

const applySectionColors = (
  items: NavItem[],
  sectionColors: Record<string, string>,
  parentColor?: string
): NavItem[] =>
  items.map((item: NavItem): NavItem => {
    const resolvedColor = parentColor ?? sectionColors[item.id];
    const children = item.children
      ? applySectionColors(item.children, sectionColors, resolvedColor)
      : undefined;
    return {
      ...item,
      ...(resolvedColor ? { sectionColor: resolvedColor } : {}),
      ...(children ? { children } : {}),
    };
  });

function NavTree({
  items,
  depth,
  openIds,
  onToggleOpen,
}: {
  items: NavItem[];
  depth: number;
  openIds: Set<string>;
  onToggleOpen: (id: string) => void;
}): React.ReactNode {
  const { isMenuCollapsed } = useAdminLayout();
  const pathname = usePathname();

  return (
    <div className={cn(depth === 0 ? 'space-y-1.5' : 'space-y-1')}>
      {items.map((item: NavItem) => {
        const hasChildren = !!item.children?.length;
        // Only highlight leaf links (not folders). Folders get their "current" indicator via being open.
        const active = !hasChildren && item.href ? isActiveHref(pathname, item.href, item.exact) : false;
        const isOpen = !isMenuCollapsed && hasChildren && openIds.has(item.id);
        const contextItems = buildNavContextItems(item, isOpen, hasChildren, onToggleOpen);
        const sectionStyle = item.sectionColor ? ADMIN_MENU_COLOR_MAP[item.sectionColor] : null;

        const rowStyle: React.CSSProperties | undefined =
          isMenuCollapsed
            ? undefined
            : {
              paddingLeft: 10 + depth * 14,
            };

        const rowClassName = cn(
          'group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition cursor-pointer border-l-2',
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
                          sectionStyle ? sectionStyle.border : 'border-transparent',
                          active ? 'bg-gray-700/60 text-white' : 'text-gray-200 hover:bg-gray-700/40'
                        )}
                      >
                        <span className='relative text-gray-200'>
                          {item.icon ?? <AppWindow className='size-4' />}
                          {sectionStyle ? (
                            <span className={cn('absolute -right-1 -top-1 h-2 w-2 rounded-full', sectionStyle.dot)} />
                          ) : null}
                        </span>
                        <span className='sr-only'>{item.label}</span>
                      </Link>
                    </TreeContextMenu>
                  ) : (
                    <TreeContextMenu items={contextItems} className='cursor-pointer'>
                      <button
                        type='button'
                        onClick={(): void => {
                          if (item.action) item.action();
                          if (!item.href && hasChildren) onToggleOpen(item.id);
                        }}
                        className={cn(
                          'flex w-full items-center justify-center rounded-md px-2 py-2 transition border-l-2 cursor-pointer',
                          sectionStyle ? sectionStyle.border : 'border-transparent',
                          active ? 'bg-gray-700/60 text-white' : 'text-gray-200 hover:bg-gray-700/40'
                        )}
                      >
                        <span className='relative text-gray-200'>
                          {item.icon ?? <AppWindow className='size-4' />}
                          {sectionStyle ? (
                            <span className={cn('absolute -right-1 -top-1 h-2 w-2 rounded-full', sectionStyle.dot)} />
                          ) : null}
                        </span>
                        <span className='sr-only'>{item.label}</span>
                      </button>
                    </TreeContextMenu>
                  )}
                </div>
              </Tooltip>
            ) : (
              <>
                {hasChildren ? (
                  <TreeContextMenu items={contextItems} className='cursor-pointer'>
                    <button
                      type='button'
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
                    </button>
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
                    <button
                      type='button'
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
                    </button>
                  </TreeContextMenu>
                )}

                {hasChildren && isOpen ? (
                  <div className='mt-1' id={`${item.id}-children`}>
                    <NavTree
                      items={item.children ?? []}
                      depth={depth + 1}
                      openIds={openIds}
                      onToggleOpen={onToggleOpen}
                    />
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

export const buildAdminNav = (handlers: {
  onOpenChat: React.MouseEventHandler<HTMLAnchorElement>;
  onCreatePageClick: () => void;
}): NavItem[] => ([
  {
    id: 'home',
    label: 'Home',
    href: '/admin',
    icon: <HomeIcon className='size-4' />,
    keywords: ['dashboard', 'home'],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: <AppWindow className='size-4' />,
    children: [
      { id: 'workspace/front-manage', label: 'Front Manage', href: '/admin/front-manage' },
      { id: 'workspace/import', label: 'Import', href: '/admin/import' },
      { id: 'workspace/files', label: 'Files', href: '/admin/files' },
      { id: 'workspace/databases', label: 'Databases', href: '/admin/databases' },
      { id: 'workspace/app-embeds', label: 'App Embeds', href: '/admin/app-embeds' },
    ],
  },
  {
    id: 'image-studio',
    label: 'Image Studio',
    href: '/admin/image-studio',
    icon: <ImageIcon className='size-4' />,
    keywords: ['ai', 'images', 'mask', 'studio', 'relight'],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    href: '/admin/products',
    icon: <PackageIcon className='size-4' />,
    children: [
      {
        id: 'commerce/products',
        label: 'Products',
        href: '/admin/products',
        children: [
          { id: 'commerce/products/all', label: 'All Products', href: '/admin/products', exact: true },
          { id: 'commerce/products/drafts', label: 'Drafts', href: '/admin/drafts' },
          { id: 'commerce/products/builder', label: 'Builder', href: '/admin/products/builder' },
          { id: 'commerce/products/producers', label: 'Producers', href: '/admin/products/producers' },
          { id: 'commerce/products/preferences', label: 'Preferences', href: '/admin/products/preferences' },
          { id: 'commerce/products/settings', label: 'Settings', href: '/admin/products/settings' },
        ],
      },
      {
        id: 'commerce/assets',
        label: 'Assets',
        href: '/admin/3d-assets',
        children: [
          { id: 'commerce/assets/3d', label: '3D Assets', href: '/admin/3d-assets' },
          { id: 'commerce/assets/3d-list', label: '3D Asset List', href: '/admin/3d-assets/list' },
        ],
      },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    href: '/admin/integrations',
    icon: <Plug className='size-4' />,
    children: [
      { id: 'integrations/connections', label: 'Connections', href: '/admin/integrations' },
      { id: 'integrations/add', label: 'Add Integration', href: '/admin/integrations/add' },
      { id: 'integrations/imports', label: 'Imports', href: '/admin/integrations/imports' },
      {
        id: 'integrations/marketplaces',
        label: 'Marketplaces',
        href: '/admin/integrations/marketplaces',
        children: [
          {
            id: 'integrations/marketplaces/allegro',
            label: 'Allegro',
            href: '/admin/integrations/marketplaces/allegro',
            children: [
              { id: 'integrations/marketplaces/allegro/connections', label: 'Connections', href: '/admin/integrations/marketplaces/allegro/connections' },
              { id: 'integrations/marketplaces/allegro/listing-management', label: 'Listing Management', href: '/admin/integrations/marketplaces/allegro/listing-management' },
              { id: 'integrations/marketplaces/allegro/listing-templates', label: 'Listing Templates', href: '/admin/integrations/marketplaces/allegro/listing-templates' },
              { id: 'integrations/marketplaces/allegro/messages', label: 'Messages', href: '/admin/integrations/marketplaces/allegro/messages' },
              { id: 'integrations/marketplaces/allegro/parameter-mapping', label: 'Parameter Mapping', href: '/admin/integrations/marketplaces/allegro/parameter-mapping' },
              { id: 'integrations/marketplaces/allegro/shipping-price-management', label: 'Shipping Price Management', href: '/admin/integrations/marketplaces/allegro/shipping-price-management' },
            ],
          },
          { id: 'integrations/marketplaces/category-mapper', label: 'Category Mapper', href: '/admin/integrations/marketplaces/category-mapper' },
          { id: 'integrations/marketplaces/tradera', label: 'Tradera', href: '/admin/integrations/tradera' },
        ],
      },
    ],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    href: '/admin/ai-paths/queue',
    icon: <WorkflowIcon className='size-4' />,
    keywords: ['queue', 'runner', 'workers', 'background', 'tasks'],
    children: [
      { id: 'jobs/queue', label: 'Job Queue', href: '/admin/ai-paths/queue' },
      { id: 'jobs/dead-letter', label: 'Dead Letter', href: '/admin/ai-paths/dead-letter' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    href: '/admin/ai-paths',
    icon: <GitBranchIcon className='size-4' />,
    children: [
      {
        id: 'ai/ai-paths',
        label: 'AI Paths',
        href: '/admin/ai-paths',
        children: [
          { id: 'ai/ai-paths/canvas', label: 'Canvas', href: '/admin/ai-paths', exact: true },
          { id: 'ai/ai-paths/trigger-buttons', label: 'Trigger Buttons', href: '/admin/ai-paths/trigger-buttons' },
        ],
      },
      {
        id: 'ai/prompt-engine',
        label: 'Global Prompt Engine',
        href: '/admin/prompt-engine',
        keywords: ['validation', 'extractor', 'formatter', 'prompt rules'],
        children: [
          { id: 'ai/prompt-engine/validation', label: 'Global Validation Patterns', href: '/admin/prompt-engine/validation' },
        ],
      },
      {
        id: 'ai/image-studio',
        label: 'Image Studio',
        href: '/admin/image-studio',
        keywords: ['images', 'mask', 'polygon', 'relight', 'studio'],
        children: [
          { id: 'ai/image-studio/studio', label: 'Studio', href: '/admin/image-studio' },
          { id: 'ai/image-studio/projects', label: 'Projects', href: '/admin/image-studio?tab=projects' },
          { id: 'ai/image-studio/settings', label: 'Settings', href: '/admin/image-studio?tab=settings' },
          { id: 'ai/image-studio/ui-presets', label: 'UI Presets', href: '/admin/image-studio/ui-presets' },
        ],
      },
      {
        id: 'ai/agent-creator',
        label: 'Agent Creator',
        href: '/admin/agentcreator',
        children: [
          {
            id: 'ai/agent-creator/learners',
            label: 'Learner Agents',
            href: '/admin/agentcreator/teaching',
            keywords: ['teaching', 'embedding', 'rag', 'school'],
            children: [
              { id: 'ai/agent-creator/learners/agents', label: 'Agents', href: '/admin/agentcreator/teaching/agents' },
              { id: 'ai/agent-creator/learners/school', label: 'Embedding School', href: '/admin/agentcreator/teaching/collections' },
              { id: 'ai/agent-creator/learners/chat', label: 'Chat', href: '/admin/agentcreator/teaching/chat' },
            ],
          },
          { id: 'ai/agent-creator/personas', label: 'Personas', href: '/admin/agentcreator/personas' },
        ],
      },
      {
        id: 'ai/chatbot',
        label: 'Chatbot',
        href: '/admin/chatbot',
        children: [
          {
            id: 'ai/chatbot/chat',
            label: 'Chat',
            href: '/admin/chatbot',
            icon: <MessageCircleIcon className='size-4' />,
            onClick: handlers.onOpenChat,
          },
          { id: 'ai/chatbot/sessions', label: 'Sessions', href: '/admin/chatbot/sessions' },
          { id: 'ai/chatbot/context', label: 'Global Context', href: '/admin/chatbot/context' },
          { id: 'ai/chatbot/memory', label: 'Memory', href: '/admin/chatbot/memory' },
        ],
      },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    href: '/admin/notes',
    icon: <BookOpenIcon className='size-4' />,
    children: [
      {
        id: 'content/notes',
        label: 'Notes',
        href: '/admin/notes',
        icon: <StickyNoteIcon className='size-4' />,
        children: [
          { id: 'content/notes/list', label: 'Note List', href: '/admin/notes' },
          { id: 'content/notes/notebooks', label: 'Notebooks', href: '/admin/notes/notebooks' },
          { id: 'content/notes/tags', label: 'Tags', href: '/admin/notes/tags' },
          { id: 'content/notes/themes', label: 'Themes', href: '/admin/notes/themes' },
          { id: 'content/notes/settings', label: 'Settings', href: '/admin/notes/settings' },
        ],
      },
      {
        id: 'content/cms',
        label: 'CMS',
        href: '/admin/cms',
        children: [
          { id: 'content/cms/pages', label: 'Pages', href: '/admin/cms/pages' },
          {
            id: 'content/cms/pages/create',
            label: 'Create Page',
            keywords: ['new page'],
            href: '/admin/cms/pages/create',
            onClick: (event: React.MouseEvent<HTMLAnchorElement>): void => {
              event.preventDefault();
              handlers.onCreatePageClick();
            },
          },
          { id: 'content/cms/builder', label: 'Page Builder', href: '/admin/cms/builder' },
          { id: 'content/cms/builder/settings', label: 'Builder Settings', href: '/admin/cms/builder/settings' },
          { id: 'content/cms/zones', label: 'Zones', href: '/admin/cms/zones' },
          { id: 'content/cms/slugs', label: 'Slugs', href: '/admin/cms/slugs' },
          { id: 'content/cms/slugs/create', label: 'Create Slug', href: '/admin/cms/slugs/create' },
          { id: 'content/cms/themes', label: 'Themes', href: '/admin/cms/themes' },
          { id: 'content/cms/themes/create', label: 'Create Theme', href: '/admin/cms/themes/create' },
        ],
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    href: '/admin/settings',
    icon: <SettingsIcon className='size-4' />,
    children: [
      {
        id: 'system/settings',
        label: 'Settings',
        href: '/admin/settings',
        children: [
          { id: 'system/settings/overview', label: 'Overview', href: '/admin/settings' },
          { id: 'system/settings/brain', label: 'Brain', href: '/admin/settings/brain' },
          { id: 'system/settings/typography', label: 'Typography', href: '/admin/settings/typography' },
          { id: 'system/settings/notifications', label: 'Notifications', href: '/admin/settings/notifications' },
          { id: 'system/settings/playwright', label: 'Playwright Personas', href: '/admin/settings/playwright' },
          { id: 'system/settings/logging', label: 'Logging', href: '/admin/settings/logging' },
          { id: 'system/settings/recovery', label: 'Transient Recovery', href: '/admin/settings/recovery' },
          { id: 'system/settings/sync', label: 'Background Sync', href: '/admin/settings/sync' },
          { id: 'system/settings/database', label: 'Database', href: '/admin/settings/database' },
          { id: 'system/settings/menu', label: 'Admin Menu', href: '/admin/settings/menu' },
        ],
      },
      {
        id: 'system/routes',
        label: 'Route Map',
        href: '/admin/routes',
        icon: <MapIcon className='size-4' />,
        keywords: ['routes', 'navigation', 'map'],
      },
      {
        id: 'system/analytics',
        label: 'Analytics',
        href: '/admin/analytics',
        icon: <BarChart3Icon className='size-4' />,
        keywords: ['page analytics', 'traffic', 'visitors', 'referrers'],
      },
      {
        id: 'system/ai-insights',
        label: 'AI Insights',
        href: '/admin/ai-insights',
        icon: <SparklesIcon className='size-4' />,
        keywords: ['ai insights', 'analytics', 'logs', 'warnings'],
      },
      { id: 'system/logs', label: 'System Logs', href: '/admin/system/logs', icon: <ActivityIcon className='size-4' /> },
      { id: 'system/uploads', label: 'Upload Events', href: '/admin/ai-paths/queue?tab=file-uploads', icon: <ActivityIcon className='size-4' /> },
      {
        id: 'system/auth',
        label: 'Auth',
        href: '/admin/auth',
        icon: <ShieldIcon className='size-4' />,
        children: [
          { id: 'system/auth/dashboard', label: 'Dashboard', href: '/admin/auth/dashboard' },
          { id: 'system/auth/users', label: 'Users', href: '/admin/auth/users' },
          { id: 'system/auth/permissions', label: 'Permissions', href: '/admin/auth/permissions' },
          { id: 'system/auth/settings', label: 'Settings', href: '/admin/auth/settings' },
          { id: 'system/auth/user-pages', label: 'User Pages', href: '/admin/auth/user-pages' },
        ],
      },
    ],
  },
]);

export default function Menu(): React.ReactNode {
  const { isMenuCollapsed, setIsMenuCollapsed, setIsProgrammaticallyCollapsed } = useAdminLayout();
  const router = useRouter();
  const pathname = usePathname();

  const [userOpenIds, setUserOpenIds] = useState<Set<string>>(new Set());
  const [openIdsLoaded, setOpenIdsLoaded] = useState(false);
  const [closedAutoIds, setClosedAutoIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const { data: chatbotSessions = [] } = useChatbotSessions();
  const { mutateAsync: createChatbotSession } = useCreateChatbotSession();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(OPEN_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setUserOpenIds(new Set(parsed.filter((id: unknown): id is string => typeof id === 'string')));
      }
    } catch {
      // ignore
    } finally {
      setOpenIdsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!openIdsLoaded) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(Array.from(userOpenIds)));
    } catch {
      // ignore
    }
  }, [openIdsLoaded, userOpenIds]);

  const handleOpenChat = useCallback((event: React.MouseEvent<HTMLAnchorElement>): void => {
    if (typeof window === 'undefined') return;
    event.preventDefault();

    const openChat = async (): Promise<void> => {
      const storedSession = window.localStorage.getItem('chatbotSessionId');
      if (storedSession) {
        router.push(`/admin/chatbot?session=${storedSession}`);
        return;
      }
      try {
        const latestId: string | undefined = chatbotSessions[0]?.id;
        if (latestId) {
          window.localStorage.setItem('chatbotSessionId', latestId);
          router.push(`/admin/chatbot?session=${latestId}`);
          return;
        }
        
        const created = await createChatbotSession({});
        if (created.sessionId) {
          window.localStorage.setItem('chatbotSessionId', created.sessionId);
          router.push(`/admin/chatbot?session=${created.sessionId}`);
        } else {
          router.push('/admin/chatbot');
        }
      } catch {
        router.push('/admin/chatbot');
      }
    };

    void openChat();
  }, [router, chatbotSessions, createChatbotSession]);

  const handleCreatePageClick = useCallback((): void => {
    setIsMenuCollapsed(true);
    setIsProgrammaticallyCollapsed(true);
    router.push('/admin/cms/pages/create');
  }, [router, setIsMenuCollapsed, setIsProgrammaticallyCollapsed]);

  const settingsStore = useSettingsStore();
  const favoriteIds = useMemo(() => {
    const raw = settingsStore.get(ADMIN_MENU_FAVORITES_KEY);
    const parsed = parseAdminMenuJson<unknown[]>(raw, []);
    return parsed.filter(
      (id: unknown): id is string => typeof id === 'string' && id.length > 0
    );
  }, [settingsStore]);
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const sectionColors = useMemo(() => {
    const raw = settingsStore.get(ADMIN_MENU_SECTION_COLORS_KEY);
    const parsed = parseAdminMenuJson<Record<string, string> | null>(raw, null);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }, [settingsStore]);
  const customEnabled = useMemo(
    () => parseAdminMenuBoolean(settingsStore.get(ADMIN_MENU_CUSTOM_ENABLED_KEY), false),
    [settingsStore]
  );
  const customNav = useMemo(() => {
    const raw = settingsStore.get(ADMIN_MENU_CUSTOM_NAV_KEY);
    const parsed = parseAdminMenuJson<AdminMenuCustomNode[]>(raw, []);
    return normalizeAdminMenuCustomNav(parsed);
  }, [settingsStore]);

  const baseNav = useMemo(
    () => buildAdminNav({ onOpenChat: handleOpenChat, onCreatePageClick: handleCreatePageClick }),
    [handleCreatePageClick, handleOpenChat]
  );

  const nav = useMemo(
    () => (customEnabled ? buildAdminMenuFromCustomNav(customNav, baseNav) : baseNav),
    [baseNav, customEnabled, customNav]
  );

  const navWithColors = useMemo(
    () => applySectionColors(nav, sectionColors),
    [nav, sectionColors]
  );
  const baseNavWithColors = useMemo(
    () => applySectionColors(baseNav, sectionColors),
    [baseNav, sectionColors]
  );

  const favoriteItems = useMemo((): NavItem[] => {
    if (favoriteIds.length === 0) return [];
    const flattened = flattenAdminNav(baseNavWithColors);
    const byId = new Map(flattened.map((entry: FlattenedNavItem) => [entry.id, entry.item]));
    const seen = new Set<string>();
    const items: NavItem[] = [];
    favoriteIds.forEach((id: string) => {
      if (seen.has(id)) return;
      const item = byId.get(id);
      if (!item) return;
      const { children: _children, ...rest } = item;
      items.push(rest);
      seen.add(id);
    });
    return items;
  }, [favoriteIds, baseNavWithColors]);

  const navWithFavorites = useMemo((): NavItem[] => {
    if (favoriteItems.length === 0) return navWithColors;
    return [
      {
        id: 'favorites',
        label: 'Favorites',
        icon: <StarIcon className='size-4' />,
        children: favoriteItems,
      },
      ...navWithColors,
    ];
  }, [favoriteItems, navWithColors]);

  const normalizedQuery = normalizeText(deferredQuery);
  const filteredNav = useMemo(() => filterTree(navWithFavorites, normalizedQuery), [navWithFavorites, normalizedQuery]);
  const autoOpenIds = useMemo(
    () =>
      normalizedQuery
        ? collectGroupIds(filteredNav)
        : collectActiveGroupIds(navWithFavorites, pathname, favoriteIdSet),
    [favoriteIdSet, filteredNav, navWithFavorites, normalizedQuery, pathname]
  );
  const allGroupIds = useMemo(() => collectGroupIds(navWithFavorites), [navWithFavorites]);

  const [lastPathnameForClosed, setLastPathnameForClosed] = useState(pathname);
  if (pathname !== lastPathnameForClosed) {
    setLastPathnameForClosed(pathname);
    if (!normalizedQuery) {
      setClosedAutoIds((prev: Set<string>) => {
        const next = new Set<string>();
        prev.forEach((id: string) => {
          if (autoOpenIds.has(id)) next.add(id);
        });
        return next;
      });
    }
  }

  const effectiveOpenIds = useMemo(() => {
    if (normalizedQuery) {
      const open = new Set<string>(userOpenIds);
      autoOpenIds.forEach((id: string) => open.add(id));
      return open;
    }
    const open = new Set<string>(userOpenIds);
    autoOpenIds.forEach((id: string) => {
      if (!closedAutoIds.has(id)) open.add(id);
    });
    return open;
  }, [autoOpenIds, closedAutoIds, normalizedQuery, userOpenIds]);

  const isAnyFolderOpen = effectiveOpenIds.size > 0;

  const handleToggleAllFolders = useCallback((): void => {
    // While searching, folders are intentionally opened to reveal results.
    if (normalizedQuery) return;

    if (isAnyFolderOpen) {
      // Collapse everything, including auto-opened active groups.
      setUserOpenIds(new Set<string>());
      setClosedAutoIds(new Set<string>(autoOpenIds));
      return;
    }

    // Expand everything.
    setClosedAutoIds(new Set<string>());
    setUserOpenIds(new Set<string>(allGroupIds));
  }, [allGroupIds, autoOpenIds, isAnyFolderOpen, normalizedQuery]);



  return (
    <nav
      data-admin-menu
      className={cn('flex flex-col gap-3', isMenuCollapsed ? 'items-stretch' : '')}
    >
      {!isMenuCollapsed ? (
        <TreeHeader>
          <div className='flex items-center gap-2'>
            <SearchInput
              value={query}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder='Search admin pages…'
              className='h-9 flex-1 bg-gray-900/40'
              onClear={() => setQuery('')}
            />
            <Button
              variant='outline'
              size='sm'
              className='h-9 shrink-0'
              disabled={Boolean(normalizedQuery)}
              onClick={handleToggleAllFolders}
              title={normalizedQuery ? 'Clear search to toggle all folders' : undefined}
            >
              {isAnyFolderOpen ? 'Collapse all' : 'Expand all'}
            </Button>
          </div>
          {normalizedQuery ? (
            <div className='text-[11px] text-gray-500'>
              Filtering menu: <span className='text-gray-300'>{query.trim()}</span>
            </div>
          ) : null}
        </TreeHeader>
      ) : (
        <Tooltip content={isAnyFolderOpen ? 'Collapse all folders' : 'Expand all folders'} side='right'>
          <div>
            <Button
              variant='outline'
              size='sm'
              className='h-9 w-full'
              disabled={Boolean(normalizedQuery)}
              onClick={handleToggleAllFolders}
            >
              {isAnyFolderOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </Tooltip>
      )}

      <NavTree
        items={filteredNav}
        depth={0}
        openIds={effectiveOpenIds}
        onToggleOpen={(id: string): void => {
          if (normalizedQuery) return;
	          const isOpen = effectiveOpenIds.has(id);

	          if (isOpen) {
	            // One-click close, even for auto-opened "active route" folders.
	            setUserOpenIds((prev: Set<string>) => {
	              if (!prev.has(id)) return prev;
	              const next = new Set(prev);
	              next.delete(id);
	              return next;
	            });
	            if (autoOpenIds.has(id)) {
	              setClosedAutoIds((prev: Set<string>) => {
	                if (prev.has(id)) return prev;
	                const next = new Set(prev);
	                next.add(id);
	                return next;
	              });
	            }
	            return;
	          }

	          setClosedAutoIds((prev: Set<string>) => {
	            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          setUserOpenIds((prev: Set<string>) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }}
      />
    </nav>
  );
}
