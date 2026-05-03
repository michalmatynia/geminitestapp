'use client';

import { Map as MapIcon } from 'lucide-react';
import React, { useDeferredValue, useMemo, useState } from 'react';

import { buildAdminNav } from '@/features/admin/components/admin-menu-nav';
import {
  buildAdminMenuFromCustomNav,
  normalizeAdminMenuCustomNav,
  type AdminMenuCustomNode,
} from '@/features/admin/components/menu/admin-menu-utils';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  parseAdminMenuBoolean,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { PanelHeader } from '@/shared/ui/templates.public';

import { buildRouteEntries, filterRouteEntries, groupRouteEntries } from './admin-route-map-data';
import { AdminRouteMapContent } from './admin-route-map-view';

export function AdminRouteMapPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const baseNav = useMemo(
    () => buildAdminNav({ onOpenChat: () => {}, onCreatePageClick: () => {} }),
    []
  );
  const customEnabled = useMemo(
    () => parseAdminMenuBoolean(settingsStore.get(ADMIN_MENU_CUSTOM_ENABLED_KEY), false),
    [settingsStore]
  );
  const customNav = useMemo(() => {
    const raw = settingsStore.get(ADMIN_MENU_CUSTOM_NAV_KEY);
    const parsed = parseAdminMenuJson<AdminMenuCustomNode[]>(raw, []);
    return normalizeAdminMenuCustomNav(parsed);
  }, [settingsStore]);
  const menuNav = useMemo(
    () => (customEnabled ? buildAdminMenuFromCustomNav(customNav, baseNav) : baseNav),
    [baseNav, customEnabled, customNav]
  );
  const entries = useMemo(() => buildRouteEntries(menuNav), [menuNav]);
  const filtered = useMemo(() => filterRouteEntries(entries, deferredQuery), [entries, deferredQuery]);
  const grouped = useMemo(() => groupRouteEntries(filtered), [filtered]);

  return (
    <div className='page-section space-y-6'>
      <PanelHeader
        title='Admin Route Map'
        description='Reference of admin routes with clear descriptions for each destination.'
        icon={<MapIcon className='size-4' />}
      />
      <AdminRouteMapContent
        entries={entries}
        filtered={filtered}
        grouped={grouped}
        onQueryChange={setQuery}
        query={query}
      />
    </div>
  );
}

export default AdminRouteMapPage;
