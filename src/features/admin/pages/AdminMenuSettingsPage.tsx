'use client';

import { 
  ArrowDown, 
  ArrowUp, 
  ChevronLeft, 
  ChevronRight, 
  GripVertical, 
  Plus, 
  Star, 
  Trash2,
  Menu
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ADMIN_MENU_COLOR_MAP,
  ADMIN_MENU_COLORS,
  AdminNavLeaf,
  buildAdminMenuFromCustomNav,
  buildAdminNav,
  adminNavToCustomNav,
  flattenAdminNav,
  getAdminMenuSections,
  normalizeAdminMenuCustomNav,
  type NavItem,
  type AdminMenuCustomNode,
} from '@/features/admin/components/Menu';
import {
  ADMIN_MENU_CUSTOM_ENABLED_KEY,
  ADMIN_MENU_CUSTOM_NAV_KEY,
  ADMIN_MENU_FAVORITES_KEY,
  ADMIN_MENU_SECTION_COLORS_KEY,
  parseAdminMenuBoolean,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import { logClientError } from '@/features/observability';
import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { 
  Button, 
  Checkbox, 
  Input, 
  SearchInput, 
  useToast, 
  SelectSimple, 
  FormSection, 
  FormField, 
  SectionHeader,
  StatusBadge,
  PanelHeader,
  ToggleRow
} from '@/shared/ui';
import { cn, DRAG_KEYS, getFirstDragValue, setDragData } from '@/shared/utils';

const normalize = (value: string): string =>
  value.toLowerCase().replace(/[_/\\-]+/g, ' ').replace(/\s+/g, ' ').trim();

type ColorOption = (typeof ADMIN_MENU_COLORS)[number];

type AdminNavNodeEntry = {
  id: string;
  label: string;
  href?: string;
  parents: string[];
  item: NavItem;
};

type FlattenedCustomNode = {
  node: AdminMenuCustomNode;
  path: number[];
  depth: number;
  index: number;
  siblingCount: number;
};

const createCustomId = (): string =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createCustomNode = (kind: 'link' | 'group'): AdminMenuCustomNode => ({
  id: createCustomId(),
  label: kind === 'group' ? 'New Group' : 'New Link',
  ...(kind === 'link' ? { href: '/admin' } : {}),
  ...(kind === 'group' ? { children: [] } : {}),
});

const cloneCustomNav = (items: AdminMenuCustomNode[]): AdminMenuCustomNode[] => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(items);
  }
  return JSON.parse(JSON.stringify(items)) as AdminMenuCustomNode[];
};

const flattenCustomNav = (
  items: AdminMenuCustomNode[],
  depth: number = 0,
  pathPrefix: number[] = []
): FlattenedCustomNode[] => {
  const entries: FlattenedCustomNode[] = [];
  items.forEach((node: AdminMenuCustomNode, index: number) => {
    const path = [...pathPrefix, index];
    entries.push({ node, path, depth, index, siblingCount: items.length });
    if (node.children && node.children.length > 0) {
      entries.push(...flattenCustomNav(node.children, depth + 1, path));
    }
  });
  return entries;
};

const flattenAdminNavNodes = (items: NavItem[], parents: string[] = []): AdminNavNodeEntry[] => {
  const entries: AdminNavNodeEntry[] = [];
  items.forEach((item: NavItem) => {
    entries.push({ 
      id: item.id, 
      label: item.label, 
      parents, 
      item,
      ...(item.href ? { href: item.href } : {})
    });
    if (item.children && item.children.length > 0) {
      entries.push(...flattenAdminNavNodes(item.children, [...parents, item.label]));
    }
  });
  return entries;
};

const collectCustomIds = (
  items: AdminMenuCustomNode[],
  ids: Set<string> = new Set<string>()
): Set<string> => {
  items.forEach((node: AdminMenuCustomNode) => {
    ids.add(node.id);
    if (node.children && node.children.length > 0) {
      collectCustomIds(node.children, ids);
    }
  });
  return ids;
};

const getNodeAtPath = (items: AdminMenuCustomNode[], path: number[]): AdminMenuCustomNode | null => {
  let current: AdminMenuCustomNode | null = null;
  let cursor: AdminMenuCustomNode[] = items;
  for (const index of path) {
    current = cursor[index] ?? null;
    if (!current) return null;
    cursor = current.children ?? [];
  }
  return current;
};

const getParentAtPath = (
  items: AdminMenuCustomNode[],
  path: number[]
): { parent: AdminMenuCustomNode[]; index: number } | null => {
  if (path.length === 0) return null;
  const parentPath = path.slice(0, -1);
  const parentNode = parentPath.length ? getNodeAtPath(items, parentPath) : null;
  const parent = parentPath.length ? parentNode?.children ?? null : items;
  if (!parent) return null;
  return { parent, index: path[path.length - 1] as number };
};

const stripUsedIds = (
  node: AdminMenuCustomNode,
  usedIds: Set<string>
): AdminMenuCustomNode | null => {
  if (usedIds.has(node.id)) return null;
  usedIds.add(node.id);
  const children = node.children
    ? node.children
      .map((child: AdminMenuCustomNode) => stripUsedIds(child, usedIds))
      .filter((child: AdminMenuCustomNode | null): child is AdminMenuCustomNode => Boolean(child))
    : undefined;
  return {
    ...node,
    ...(children ? { children } : {}),
  };
};

export function AdminMenuSettingsPage(): React.JSX.Element {
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSettingsBulk = useUpdateSettingsBulk();
  const { toast } = useToast();

  const [favorites, setFavorites] = useState<string[]>([]);
  const [sectionColors, setSectionColors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [customEnabled, setCustomEnabled] = useState(false);
  const [customNav, setCustomNav] = useState<AdminMenuCustomNode[]>([]);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [draggedPath, setDraggedPath] = useState<number[] | null>(null);
  const [dragOver, setDragOver] = useState<{ path: number[]; position: 'above' | 'below' } | null>(null);

  const noopClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
  }, []);

  const baseNav = useMemo(
    () =>
      buildAdminNav({
        onOpenChat: noopClick,
        onCreatePageClick: () => {},
      }),
    [noopClick]
  );

  const defaultCustomNav = useMemo(() => adminNavToCustomNav(baseNav), [baseNav]);
  const normalizedCustomNav = useMemo(() => {
    const normalized = normalizeAdminMenuCustomNav(customNav);
    return normalized.length > 0 ? normalized : defaultCustomNav;
  }, [customNav, defaultCustomNav]);

  const settingsValues = useMemo(() => {
    const map = settingsQuery.data ?? new Map<string, string>();
    const favoritesRaw = parseAdminMenuJson<unknown[]>(map.get(ADMIN_MENU_FAVORITES_KEY), []);
    const sectionColorsRaw = parseAdminMenuJson<Record<string, string> | null>(
      map.get(ADMIN_MENU_SECTION_COLORS_KEY),
      null
    );
    const customEnabledValue = parseAdminMenuBoolean(
      map.get(ADMIN_MENU_CUSTOM_ENABLED_KEY),
      false
    );
    const customNavRaw = parseAdminMenuJson<AdminMenuCustomNode[]>(
      map.get(ADMIN_MENU_CUSTOM_NAV_KEY),
      []
    );
    return {
      favorites: favoritesRaw.filter(
        (id: unknown): id is string => typeof id === 'string' && id.length > 0
      ),
      sectionColors:
        sectionColorsRaw && typeof sectionColorsRaw === 'object' ? sectionColorsRaw : {},
      customEnabled: customEnabledValue,
      customNav: normalizeAdminMenuCustomNav(customNavRaw),
    };
  }, [settingsQuery.data]);

  const settingsSnapshot = useMemo(
    () =>
      JSON.stringify({
        favorites: settingsValues.favorites,
        sectionColors: settingsValues.sectionColors,
        customEnabled: settingsValues.customEnabled,
        customNav:
          settingsValues.customNav.length > 0 ? settingsValues.customNav : defaultCustomNav,
      }),
    [defaultCustomNav, settingsValues]
  );

  const prevSettingsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!settingsQuery.isFetched) return;
    if (settingsSnapshot === prevSettingsRef.current) return;
    prevSettingsRef.current = settingsSnapshot;
    setFavorites(settingsValues.favorites);
    setSectionColors(settingsValues.sectionColors);
    setCustomEnabled(settingsValues.customEnabled);
    setCustomNav(
      settingsValues.customNav.length > 0 ? settingsValues.customNav : defaultCustomNav
    );
  }, [defaultCustomNav, settingsQuery.isFetched, settingsSnapshot, settingsValues]);

  const menuNav = useMemo(
    () => (customEnabled ? buildAdminMenuFromCustomNav(normalizedCustomNav, baseNav) : baseNav),
    [baseNav, customEnabled, normalizedCustomNav]
  );

  const sections = useMemo(() => getAdminMenuSections(menuNav), [menuNav]);
  const flattened = useMemo(() => flattenAdminNav(menuNav), [menuNav]);
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const favoritesList = useMemo(
    () => favorites.map((id: string) => flattened.find((item: AdminNavLeaf) => item.id === id)).filter(Boolean),
    [favorites, flattened]
  );

  const filteredItems = useMemo(() => {
    const normalized = normalize(query);
    const items = flattened.filter((item: AdminNavLeaf) =>
      normalize([item.label, item.href ?? '', ...(item.keywords ?? []), ...item.parents].join(' '))
        .includes(normalized)
    );
    return items.sort((a: AdminNavLeaf, b: AdminNavLeaf) => a.label.localeCompare(b.label));
  }, [flattened, query]);

  const flattenedCustomNav = useMemo(() => flattenCustomNav(customNav), [customNav]);
  const libraryItems = useMemo(() => flattenAdminNavNodes(baseNav), [baseNav]);
  const libraryItemMap = useMemo(
    () => new Map(libraryItems.map((item: AdminNavNodeEntry) => [item.id, item])),
    [libraryItems]
  );
  const customIds = useMemo(() => collectCustomIds(customNav), [customNav]);
  const filteredLibraryItems = useMemo(() => {
    const normalized = normalize(libraryQuery);
    const items = libraryItems.filter((item: AdminNavNodeEntry) =>
      normalize([item.label, item.href ?? '', ...item.parents].join(' ')).includes(normalized)
    );
    return items.sort((a: AdminNavNodeEntry, b: AdminNavNodeEntry) => a.label.localeCompare(b.label));
  }, [libraryItems, libraryQuery]);

  const defaultPayload = useMemo(
    () =>
      JSON.stringify({
        favorites: [],
        sectionColors: {},
        customEnabled: false,
        customNav: defaultCustomNav,
      }),
    [defaultCustomNav]
  );

  const baseline = useMemo(
    () =>
      JSON.stringify({
        favorites: settingsValues.favorites,
        sectionColors: settingsValues.sectionColors,
        customEnabled: settingsValues.customEnabled,
        customNav:
          settingsValues.customNav.length > 0 ? settingsValues.customNav : defaultCustomNav,
      }),
    [defaultCustomNav, settingsValues]
  );

  const currentPayload = useMemo(
    () =>
      JSON.stringify({
        favorites,
        sectionColors,
        customEnabled,
        customNav: normalizedCustomNav,
      }),
    [customEnabled, favorites, normalizedCustomNav, sectionColors]
  );

  const isDirty = baseline !== currentPayload;
  const isDefaultState = currentPayload === defaultPayload;

  const handleToggleFavorite = (id: string, checked: boolean): void => {
    setFavorites((prev: string[]) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((fav: string) => fav !== id);
    });
  };

  const moveFavorite = (id: string, direction: 'up' | 'down'): void => {
    setFavorites((prev: string[]) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const [removed] = next.splice(index, 1);
      if (!removed) return prev;
      next.splice(targetIndex, 0, removed);
      return next;
    });
  };

  const updateSectionColor = (sectionId: string, value: string): void => {
    setSectionColors((prev: Record<string, string>) => {
      const next = { ...prev };
      if (value === 'none') {
        delete next[sectionId];
        return next;
      }
      next[sectionId] = value;
      return next;
    });
  };

  const isSamePath = (a: number[], b: number[]): boolean =>
    a.length === b.length && a.every((value: number, index: number) => value === b[index]);
  const isPathPrefix = (parent: number[], child: number[]): boolean =>
    parent.length <= child.length && parent.every((value: number, index: number) => value === child[index]);

  const moveCustomNodeTo = (
    dragged: number[],
    target: number[],
    position: 'above' | 'below'
  ): void => {
    if (isSamePath(dragged, target)) return;
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const draggedInfo = getParentAtPath(next, dragged);
      const targetInfo = getParentAtPath(next, target);
      if (!draggedInfo || !targetInfo) return prev;
      const targetParentPath = target.slice(0, -1);
      if (isPathPrefix(dragged, targetParentPath)) return prev;
      const [node] = draggedInfo.parent.splice(draggedInfo.index, 1);
      if (!node) return prev;

      let insertIndex = position === 'above' ? targetInfo.index : targetInfo.index + 1;
      if (
        draggedInfo.parent === targetInfo.parent &&
        draggedInfo.index < insertIndex
      ) {
        insertIndex -= 1;
      }
      targetInfo.parent.splice(insertIndex, 0, node);
      return next;
    });
  };

  const updateCustomLabel = (path: number[], value: string): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const info = getParentAtPath(next, path);
      if (!info) return prev;
      const node = info.parent[info.index];
      if (!node) return prev;
      node.label = value;
      return next;
    });
  };

  const updateCustomHref = (path: number[], value: string): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const info = getParentAtPath(next, path);
      if (!info) return prev;
      const node = info.parent[info.index];
      if (!node) return prev;
      if (value.trim().length === 0) {
        delete node.href;
      } else {
        node.href = value;
      }
      return next;
    });
  };

  const addCustomNodeAt = (kind: 'link' | 'group', parentPath?: number[]): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const node = createCustomNode(kind);
      if (!parentPath || parentPath.length === 0) {
        next.unshift(node);
        return next;
      }
      const parentNode = getNodeAtPath(next, parentPath);
      if (!parentNode) return prev;
      if (!parentNode.children) parentNode.children = [];
      parentNode.children.push(node);
      return next;
    });
  };

  const handleAddRootNode = (kind: 'link' | 'group'): void => {
    setCustomEnabled(true);
    addCustomNodeAt(kind);
  };

  const addBuiltInNode = (entry: AdminNavNodeEntry): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const usedIds = collectCustomIds(next);
      const [node] = adminNavToCustomNav([entry.item]);
      if (!node) return prev;
      const cleaned = stripUsedIds(node, usedIds);
      if (!cleaned) return prev;
      next.push(cleaned);
      return next;
    });
  };

  const removeCustomNode = (path: number[]): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const info = getParentAtPath(next, path);
      if (!info) return prev;
      info.parent.splice(info.index, 1);
      return next;
    });
  };

  const indentCustomNode = (path: number[]): void => {
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const info = getParentAtPath(next, path);
      if (!info || info.index === 0) return prev;
      const [node] = info.parent.splice(info.index, 1);
      const newParent = info.parent[info.index - 1];
      if (!newParent || !node) return prev;
      if (!newParent.children) newParent.children = [];
      newParent.children.push(node);
      return next;
    });
  };

  const outdentCustomNode = (path: number[]): void => {
    if (path.length < 2) return;
    setCustomNav((prev: AdminMenuCustomNode[]) => {
      const next = cloneCustomNav(prev);
      const info = getParentAtPath(next, path);
      if (!info) return prev;
      const parentPath = path.slice(0, -1);
      const parentInfo = getParentAtPath(next, parentPath);
      if (!parentInfo) return prev;
      const [node] = info.parent.splice(info.index, 1);
      if (!node) return prev;
      parentInfo.parent.splice(parentInfo.index + 1, 0, node);
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    try {
      const validFavorites = favorites.filter((id: string) => flattened.some((item: AdminNavLeaf) => item.id === id));
      const sectionIds = new Set(sections.map((section: { id: string }) => section.id));
      const validSectionColors = Object.fromEntries(
        Object.entries(sectionColors).filter(([sectionId]: [string, string]) => sectionIds.has(sectionId))
      );
      await updateSettingsBulk.mutateAsync([
        { key: ADMIN_MENU_FAVORITES_KEY, value: JSON.stringify(validFavorites) },
        { key: ADMIN_MENU_SECTION_COLORS_KEY, value: JSON.stringify(validSectionColors) },
        { key: ADMIN_MENU_CUSTOM_ENABLED_KEY, value: JSON.stringify(customEnabled) },
        { key: ADMIN_MENU_CUSTOM_NAV_KEY, value: JSON.stringify(normalizedCustomNav) },
      ]);
      toast('Admin menu settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminMenuSettingsPage', action: 'save' } });
      toast(error instanceof Error ? error.message : 'Failed to save admin menu settings.', { variant: 'error' });
    }
  };

  const handleReset = (): void => {
    setFavorites([]);
    setSectionColors({});
    setCustomEnabled(false);
    setCustomNav(defaultCustomNav);
  };

  return (
    <div className='container mx-auto py-10'>
      <PanelHeader
        title='Admin Menu'
        description='Pin favorites, color sections, and build a custom menu layout.'
        icon={<Menu className='size-4' />}
        actions={[
          {
            key: 'reset',
            label: 'Reset',
            variant: 'outline',
            onClick: handleReset,
            disabled: isDefaultState,
          },
          {
            key: 'save',
            label: updateSettingsBulk.isPending ? 'Saving...' : 'Save Settings',
            onClick: () => { void handleSave(); },
            disabled: !isDirty || updateSettingsBulk.isPending,
          }
        ]}
      />

      <div className='mt-8 grid gap-6 lg:grid-cols-2'>
        <FormSection
          title='Favorites'
          description='Pin menu items to appear at the top.'
          actions={<Star className='size-4 text-amber-300' />}
          className='p-6'
          variant='subtle'
        >
          <div className='space-y-3'>
            {favoritesList.length === 0 ? (
              <div className='rounded-md border border-border/40 bg-gray-900/20 p-3 text-xs text-gray-400'>
                No favorites yet. Select items below to pin them here.
              </div>
            ) : (
              <div className='space-y-2'>
                {favoritesList.map((entry: AdminNavLeaf | undefined, index: number) => (
                  <div key={entry?.id} className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-gray-900/40 p-3'>
                    <SectionHeader
                      title={entry?.label}
                      subtitle={entry?.parents?.length ? entry.parents.join(' / ') : undefined}
                      size='xs'
                      className='flex-1'
                      actions={
                        <div className='flex items-center gap-1'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-7 w-7 p-0'
                            disabled={index === 0}
                            onClick={() => entry?.id && moveFavorite(entry.id, 'up')}
                          >
                            <ArrowUp className='size-3' />
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-7 w-7 p-0'
                            disabled={index === favoritesList.length - 1}
                            onClick={() => entry?.id && moveFavorite(entry.id, 'down')}
                          >
                            <ArrowDown className='size-3' />
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-7 px-2 text-[11px]'
                            onClick={() => entry?.id && handleToggleFavorite(entry.id, false)}
                          >
                            Remove
                          </Button>
                        </div>
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='mt-5'>
            <FormField label='Add favorites'>
              <SearchInput
                value={query}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                placeholder='Search admin menu…'
                className='mt-2 h-9 bg-gray-900/40'
                onClear={() => setQuery('')}
                size='sm'
              />
            </FormField>
            <div className='mt-3 max-h-72 space-y-2 overflow-auto pr-2'>
              {filteredItems.map((item: AdminNavLeaf) => (
                <label
                  key={item.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border border-border/60 bg-card/30 px-3 py-2 transition hover:bg-card/50',
                    favoritesSet.has(item.id) && 'border-amber-500/40 bg-amber-500/5'
                  )}
                >
                  <Checkbox
                    checked={favoritesSet.has(item.id)}
                    onCheckedChange={(checked: boolean | 'indeterminate') => handleToggleFavorite(item.id, Boolean(checked))}
                  />
                  <div className='min-w-0'>
                    <div className='truncate text-sm text-white'>{item.label}</div>
                    <div className='truncate text-[11px] text-gray-500'>
                      {item.parents.join(' / ')}
                    </div>
                    {item.href ? (
                      <div className='truncate text-[11px] text-gray-600'>{item.href}</div>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </FormSection>

        <FormSection
          title='Section Colors'
          description='Assign accents to top-level menu sections.'
          className='p-6'
          variant='subtle'
        >
          <div className='space-y-4'>
            {sections.map((section: NavItem) => {
              const current = sectionColors[section.id] ?? 'none';
              const colorStyle = current !== 'none' ? ADMIN_MENU_COLOR_MAP[current] : null;
              return (
                <div key={section.id} className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-gray-900/40 p-3'>
                  <div className='flex items-center gap-2'>
                    {colorStyle ? (
                      <span className={cn('h-2.5 w-2.5 rounded-full', colorStyle.dot)} />
                    ) : (
                      <span className='h-2.5 w-2.5 rounded-full border border-dashed border-gray-500' />
                    )}
                    <span className='text-sm text-gray-200'>{section.label}</span>
                  </div>
                  <SelectSimple size='sm'
                    value={current}
                    onValueChange={(value: string) => updateSectionColor(section.id, value)}
                    options={[
                      { value: 'none', label: 'None' },
                      ...ADMIN_MENU_COLORS.map((option: ColorOption) => ({
                        value: option.value,
                        label: option.label,
                      }))
                    ]}
                    className='w-[160px]'
                    triggerClassName='h-8 text-xs'
                  />
                </div>
              );
            })}
          </div>
        </FormSection>
      </div>

      <FormSection
        title='Menu Builder'
        description='Create hierarchies, reorder items, and add custom links.'
        className='mt-6 p-6'
        variant='subtle'
      >
        <ToggleRow
          type='switch'
          label='Use custom layout'
          description='Enable this to apply the custom menu structure defined below.'
          checked={customEnabled}
          onCheckedChange={(checked: boolean) => setCustomEnabled(checked)}
          className='mb-6'
        />

        {!customEnabled ? (
          <div className='mb-4 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-xs text-gray-400'>
            Custom layout is disabled. Enable it to apply this menu structure.
          </div>
        ) : null}

        <div className='flex flex-wrap items-center gap-2'>
          <Button type='button' size='sm' onClick={() => handleAddRootNode('link')}>
            <Plus className='mr-2 size-4' />
            Add link
          </Button>
          <Button type='button' variant='outline' size='sm' onClick={() => handleAddRootNode('group')}>
            <Plus className='mr-2 size-4' />
            Add group
          </Button>
          <Button type='button' variant='outline' size='sm' onClick={() => setCustomNav(defaultCustomNav)}>
            Restore default layout
          </Button>
        </div>

        <div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]'>
          <div>
            <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Layout</h3>
            <p className='mt-1 text-[11px] text-gray-500'>Drag the grip to reorder. Use indent/outdent to nest items.</p>
            {flattenedCustomNav.length === 0 ? (
              <p className='mt-3 rounded-md border border-border bg-card/40 p-3 text-xs text-gray-400'>
                No items yet. Add links or groups to start building your menu.
              </p>
            ) : (
              <div className='mt-3 space-y-2'>
                {flattenedCustomNav.map((entry: FlattenedCustomNode, index: number) => {
                  const { node, path, depth } = entry;
                  const baseEntry = libraryItemMap.get(node.id);
                  const isBuiltIn = Boolean(baseEntry);
                  const labelValue = node.label ?? baseEntry?.label ?? 'Untitled';
                  const hrefValue = node.href ?? baseEntry?.href ?? '';
                  const canIndent = index > 0;
                  const canOutdent = path.length > 1;
                  const isDragging = draggedPath ? isSamePath(draggedPath, path) : false;
                  const isDragTarget = dragOver ? isSamePath(dragOver.path, path) : false;
                  return (
                    <div
                      key={node.id}
                      className={cn(
                        'relative flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-card/30 px-3 py-2',
                        isDragging && 'opacity-50'
                      )}
                      onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
                        event.preventDefault();
                        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const position = event.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
                        setDragOver({ path, position });
                      }}
                      onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
                        event.preventDefault();
                        const raw = getFirstDragValue(event.dataTransfer, [DRAG_KEYS.ADMIN_MENU_PATH, DRAG_KEYS.TEXT]);
                        let dragged: number[] | null = draggedPath;
                        if (raw) {
                          try {
                            const parsed = JSON.parse(raw) as unknown;
                            if (Array.isArray(parsed) && parsed.every((value: unknown) => Number.isInteger(value))) {
                              dragged = parsed as number[];
                            }
                          } catch {
                            // ignore
                          }
                        }
                        if (!dragged || !dragOver) {
                          setDragOver(null);
                          return;
                        }
                        moveCustomNodeTo(dragged, path, dragOver.position);
                        setDragOver(null);
                        setDraggedPath(null);
                      }}
                      onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
                        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                        setDragOver((prev: { path: number[]; position: 'above' | 'below' } | null) => (prev && isSamePath(prev.path, path) ? null : prev));
                      }}
                    >
                      {isDragTarget && dragOver?.position === 'above' ? (
                        <div className='pointer-events-none absolute -top-1 left-2 right-2 h-0.5 rounded-full bg-blue-500' />
                      ) : null}
                      {isDragTarget && dragOver?.position === 'below' ? (
                        <div className='pointer-events-none absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-blue-500' />
                      ) : null}
                      <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2' style={{ paddingLeft: depth * 16 }}>
                        <button
                          type='button'
                          className='grid h-8 w-8 place-items-center rounded-md border border-border/70 bg-gray-900/40 text-gray-400 hover:text-gray-200'
                          draggable
                          onDragStart={(event: React.DragEvent<HTMLButtonElement>): void => {
                            const payload = JSON.stringify(path);
                            setDragData(
                              event.dataTransfer,
                              { [DRAG_KEYS.ADMIN_MENU_PATH]: payload },
                              { text: payload, effectAllowed: 'move' }
                            );
                            setDraggedPath(path);
                          }}
                          onDragEnd={(): void => {
                            setDraggedPath(null);
                            setDragOver(null);
                          }}
                          title='Drag to reorder'
                        >
                          <GripVertical className='size-4' />
                        </button>
                        <div className='min-w-[160px] flex-1'>
                          <Input
                            value={labelValue}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateCustomLabel(path, event.target.value)}
                            placeholder='Label'
                            className='h-8 bg-gray-900/40 text-xs'
                            disabled={isBuiltIn}
                          />
                        </div>
                        <div className='min-w-[180px] flex-1'>
                          <Input
                            value={hrefValue}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateCustomHref(path, event.target.value)}
                            placeholder='/admin/...'
                            className='h-8 bg-gray-900/40 text-xs'
                            disabled={isBuiltIn}
                          />
                        </div>
                        <StatusBadge
                          status={isBuiltIn ? 'Built-in' : 'Custom'}
                          variant={isBuiltIn ? 'info' : 'success'}
                          size='sm'
                          className='font-bold'
                        />
                      </div>
                      <div className='flex items-center gap-1'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-8 w-8 p-0'
                          disabled={!canIndent}
                          onClick={() => indentCustomNode(path)}
                          title='Indent'
                        >
                          <ChevronRight className='size-3' />
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-8 w-8 p-0'
                          disabled={!canOutdent}
                          onClick={() => outdentCustomNode(path)}
                          title='Outdent'
                        >
                          <ChevronLeft className='size-3' />
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-8 w-8 p-0 text-red-200 hover:text-red-100'
                          onClick={() => removeCustomNode(path)}
                          title='Remove'
                        >
                          <Trash2 className='size-3' />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Add built-in items</h3>
            <SearchInput
              value={libraryQuery}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setLibraryQuery(event.target.value)}
              placeholder='Search built-in menu…'
              className='mt-2 h-9 bg-gray-900/40'
              onClear={() => setLibraryQuery('')}
              size='sm'
            />
            <div className='mt-3 max-h-80 space-y-2 overflow-auto pr-2'>
              {filteredLibraryItems.length === 0 ? (
                <p className='rounded-md border border-border bg-card/40 p-3 text-xs text-gray-400'>
                  No matching menu items.
                </p>
              ) : (
                filteredLibraryItems.map((entry: AdminNavNodeEntry) => {
                  const isAdded = customIds.has(entry.id);
                  return (
                    <div key={entry.id} className='flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/30 p-3'>
                      <SectionHeader
                        title={entry.label}
                        subtitle={`${entry.parents.join(' / ')}${entry.parents.length ? ' / ' : ''}${entry.href ?? 'Group'}`}
                        size='xs'
                        className='flex-1'
                        actions={
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-7 px-2 text-[11px]'
                            disabled={isAdded}
                            onClick={() => addBuiltInNode(entry)}
                          >
                            {isAdded ? 'Added' : 'Add'}
                          </Button>
                        }
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
