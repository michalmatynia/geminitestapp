import type { AdminNavItem, AdminNavLeaf } from '@/shared/contracts/admin';

export type NavItem = Omit<AdminNavItem, 'children'> & {
  icon?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  action?: () => void;
  required?: boolean;
  children?: NavItem[];
  sectionColor?: string;
};

export type FlattenedNavItem = AdminNavLeaf;

export type DeferredAdminMenuSettingsTarget = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (handler: () => void, timeout?: number) => number;
  clearTimeout: (handle: number) => void;
};

export {
  adminNavToCustomNav,
  applySectionColors,
  collectActiveGroupIds,
  collectGroupIds,
  filterTree,
  flattenAdminNav,
  getAdminMenuSections,
  isActiveHref,
  matchesQuery,
  normalizeText,
  stripQuery,
} from './admin-menu-utils-tree';

export {
  buildAdminMenuFromCustomNav,
  indexAdminNav,
  mapCustomNavToAdminNav,
  normalizeAdminMenuCustomNav,
} from './admin-menu-utils-nav';

export const scheduleDeferredAdminMenuSettingsHydration = (
  target: DeferredAdminMenuSettingsTarget,
  onReady: () => void
): (() => void) => {
  if (typeof target.requestIdleCallback === 'function') {
    const idleHandle = target.requestIdleCallback(onReady);
    return (): void => {
      if (typeof target.cancelIdleCallback === 'function') {
        target.cancelIdleCallback(idleHandle);
      }
    };
  }

  const timeoutHandle = target.setTimeout(onReady, 1);
  return (): void => {
    target.clearTimeout(timeoutHandle);
  };
};
