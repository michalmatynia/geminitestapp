import type { AdminMenuColorOption } from '@/shared/contracts/admin';
import type { TreeContextMenuItem } from '@/shared/contracts/ui/menus';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { cn } from '@/shared/utils/ui-utils';

import { ADMIN_MENU_COLOR_MAP } from './admin-menu-constants';
import type { NavItem } from './admin-menu-utils';

const FOCUS_RING_CLASS_NAME =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

export const hasText = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== '';

const copyToClipboard = async (value: string): Promise<void> => {
  if (typeof navigator === 'undefined') {
    return;
  }

  await navigator.clipboard.writeText(value);
};

const copyLinkToClipboard = (value: string): void => {
  copyToClipboard(value).catch(logClientError);
};

export const getSectionStyle = (
  sectionColor: string | undefined
): AdminMenuColorOption | undefined => {
  if (!hasText(sectionColor)) {
    return undefined;
  }

  return ADMIN_MENU_COLOR_MAP[sectionColor];
};

export const getTreeRowClassName = (
  active: boolean,
  sectionStyle: AdminMenuColorOption | undefined
): string =>
  cn(
    'group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition cursor-pointer border-l-2 h-auto font-normal',
    FOCUS_RING_CLASS_NAME,
    sectionStyle !== undefined ? sectionStyle.border : 'border-transparent',
    active ? 'bg-gray-700/60 text-white' : 'text-gray-200 hover:bg-gray-700/40'
  );

export const getCollapsedRootClassName = (
  active: boolean,
  sectionStyle: AdminMenuColorOption | undefined
): string =>
  cn(
    'flex w-full items-center justify-center rounded-md px-2 py-2 transition border-l-2 cursor-pointer h-auto',
    FOCUS_RING_CLASS_NAME,
    sectionStyle !== undefined ? sectionStyle.border : 'border-transparent',
    active ? 'bg-gray-700/60 text-white' : 'text-gray-200 hover:bg-gray-700/40'
  );

export const buildNavContextItems = ({
  hasChildren,
  isOpen,
  item,
  onNavigateHref,
  onToggleOpen,
}: {
  hasChildren: boolean;
  isOpen: boolean;
  item: NavItem;
  onNavigateHref: (href: string) => void;
  onToggleOpen: (id: string) => void;
}): TreeContextMenuItem[] => {
  const items: TreeContextMenuItem[] = [];
  if (item.action !== undefined) {
    items.push({ id: 'run-action', label: 'Run action', onSelect: item.action });
  }
  if (hasChildren) {
    items.push({
      id: 'toggle-children',
      label: isOpen ? 'Collapse' : 'Expand',
      onSelect: () => onToggleOpen(item.id),
    });
    items.push({ id: 'separator-1', separator: true });
  }

  const itemHref = hasText(item.href) ? item.href : null;
  if (itemHref !== null) {
    items.push({ id: 'open', label: 'Open', onSelect: () => onNavigateHref(itemHref) });
    items.push({
      id: 'open-new',
      label: 'Open in new tab',
      onSelect: () => {
        if (typeof window !== 'undefined') {
          window.open(itemHref, '_blank', 'noopener,noreferrer');
        }
      },
    });
    items.push({
      id: 'copy-link',
      label: 'Copy link',
      onSelect: () => copyLinkToClipboard(itemHref),
    });
  }

  return items;
};
