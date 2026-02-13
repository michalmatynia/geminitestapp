'use client';

import Link from 'next/link';
import React, { useDeferredValue, useMemo, useState } from 'react';

import {
  buildAdminMenuFromCustomNav,
  buildAdminNav,
  flattenAdminNav,
  normalizeAdminMenuCustomNav,
  type AdminMenuCustomNode,
  type FlattenedNavItem,
  type NavItem,
} from '@/features/admin/components/Menu';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  parseAdminMenuBoolean,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Card, SectionHeader, SectionPanel, SearchInput, Badge, FormSection } from '@/shared/ui';

type RouteMapEntry = FlattenedNavItem & {
  description: string;
  section: string;
  breadcrumb: string;
};

const ROUTE_DESCRIPTION_OVERRIDES: Record<string, string> = {
  '/admin': 'Admin home dashboard with quick links and global status.',
  '/admin/routes': 'Reference map of admin routes with descriptions.',
  '/admin/ai-paths': 'Design, test, and run AI Paths workflows.',
  '/admin/ai-paths/queue': 'Monitor queued, running, and completed path runs.',
  '/admin/ai-paths/dead-letter': 'Inspect failed AI runs and retry or requeue them.',
  '/admin/validator': 'Manage validator pattern lists for Products and Image Studio.',
  '/admin/prompt-exploder': 'Explode long prompts into editable typed segments and reassemble them.',
  '/admin/products': 'Browse and manage all products in the catalog.',
  '/admin/cms/builder': 'Visual page builder for CMS layouts.',
  '/admin/settings': 'System settings overview and quick access cards.',
  '/admin/settings/menu': 'Customize the admin menu structure and favorites.',
};

const buildFallbackDescription = (entry: FlattenedNavItem): string => {
  if (entry.href && ROUTE_DESCRIPTION_OVERRIDES[entry.href]) {
    return ROUTE_DESCRIPTION_OVERRIDES[entry.href] ?? '';
  }
  const label = entry.label.trim();
  const lower = label.toLowerCase();
  const section = entry.parents[0] ?? 'Admin';
  const parent = entry.parents[entry.parents.length - 1] ?? section;

  if (lower.startsWith('create ')) {
    return `Create a new ${label.slice(7).trim().toLowerCase()} entry.`;
  }
  if (lower.includes('settings')) {
    return `Configure ${parent.toLowerCase()} settings and defaults.`;
  }
  if (lower === 'overview') {
    return `Overview of ${parent.toLowerCase()} configuration.`;
  }
  if (lower.includes('list') || lower.startsWith('all ')) {
    return `Browse and manage ${label.replace(/^all\s+/i, '').toLowerCase()} records.`;
  }
  if (lower.includes('jobs')) {
    return `Monitor and manage ${parent.toLowerCase()} jobs and runs.`;
  }
  if (lower.includes('queue')) {
    return `Inspect queued and running ${parent.toLowerCase()} tasks.`;
  }
  if (lower.includes('dead letter')) {
    return 'Review failed jobs and decide on retries or cleanup.';
  }
  if (lower.includes('logs')) {
    return `Review ${parent.toLowerCase()} logs and diagnostics.`;
  }
  if (lower.includes('builder')) {
    return `Compose and edit ${parent.toLowerCase()} layouts.`;
  }
  if (lower.includes('themes')) {
    return `Manage ${parent.toLowerCase()} themes and styling presets.`;
  }
  if (lower.includes('slugs')) {
    return `Manage slug records for ${parent.toLowerCase()} content.`;
  }
  if (lower.includes('zones')) {
    return `Manage layout zones for ${parent.toLowerCase()} content.`;
  }
  if (lower.includes('analytics')) {
    return 'Review analytics and activity summaries.';
  }
  if (lower.includes('permissions')) {
    return 'Manage access permissions and role rules.';
  }
  if (lower.includes('users')) {
    return 'Manage user accounts and access controls.';
  }
  if (lower.includes('chat')) {
    return `Open the ${parent.toLowerCase()} chat workspace.`;
  }
  if (lower.includes('sessions')) {
    return `Review saved ${parent.toLowerCase()} sessions.`;
  }
  if (lower.includes('memory')) {
    return `Manage ${parent.toLowerCase()} memory and embeddings.`;
  }
  if (lower.includes('context')) {
    return `Edit shared context for ${parent.toLowerCase()}.`;
  }

  return `Open ${label} under ${section}.`;
};

const buildRouteEntries = (items: NavItem[]): RouteMapEntry[] => {
  const flattened = flattenAdminNav(items);
  return flattened.map((entry: FlattenedNavItem) => {
    const section = entry.parents[0] ?? 'General';
    const breadcrumb = [...entry.parents, entry.label].join(' / ');
    return {
      ...entry,
      section,
      breadcrumb,
      description: buildFallbackDescription(entry),
    };
  });
};

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

  const filtered = useMemo(() => {
    if (!deferredQuery.trim()) return entries;
    const q = deferredQuery.toLowerCase();
    return entries.filter((entry: RouteMapEntry) => {
      const haystack = [
        entry.label,
        entry.href ?? '',
        entry.description,
        entry.breadcrumb,
        entry.keywords?.join(' ') ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, deferredQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, RouteMapEntry[]>();
    filtered.forEach((entry: RouteMapEntry) => {
      const list = map.get(entry.section) ?? [];
      list.push(entry);
      map.set(entry.section, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <SectionHeader
        title='Admin Route Map'
        description='Reference of admin routes with clear descriptions for each destination.'
      />

      <SectionPanel className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-col gap-1'>
          <div className='text-sm text-gray-200'>Routes indexed</div>
          <div className='text-xs text-gray-400'>
            Showing {filtered.length} of {entries.length} routes
          </div>
        </div>
        <div className='w-full max-w-sm'>
          <SearchInput
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder='Search routes, labels, keywords...'
          />
        </div>
      </SectionPanel>

      {grouped.length === 0 ? (
        <SectionPanel className='text-sm text-gray-400'>No routes match your search.</SectionPanel>
      ) : (
        grouped.map(([section, sectionEntries]: [string, RouteMapEntry[]]) => (
          <FormSection
            key={section}
            title={section}
            actions={
              <Badge variant='outline' className='text-[10px]'>
                {sectionEntries.length}
              </Badge>
            }
          >
            <div className='grid gap-3 md:grid-cols-2'>
              {sectionEntries.map((entry: RouteMapEntry) => (
                <Card key={entry.id} className='border-border bg-card/60 p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <Link
                        href={entry.href ?? '#'}
                        className='text-sm font-semibold text-white hover:text-gray-200'
                      >
                        {entry.label}
                      </Link>
                      <div className='mt-1 truncate font-mono text-[11px] text-cyan-200'>
                        {entry.href}
                      </div>
                    </div>
                    <Badge variant='secondary' className='shrink-0 text-[10px]'>
                      {entry.parents.length ? entry.parents[entry.parents.length - 1] : 'Root'}
                    </Badge>
                  </div>
                  <p className='mt-2 text-xs text-gray-300'>{entry.description}</p>
                  <div className='mt-2 text-[10px] text-gray-500'>{entry.breadcrumb}</div>
                </Card>
              ))}
            </div>
          </FormSection>
        ))
      )}
    </div>
  );
}
