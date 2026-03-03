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
  Menu,
} from 'lucide-react';
import React from 'react';

import {
  ADMIN_MENU_COLOR_MAP,
  ADMIN_MENU_COLORS,
  type NavItem,
} from '@/features/admin/components/Menu';
import type { AdminNavLeaf } from '@/shared/contracts/admin';
import {
  Button,
  Checkbox,
  Input,
  SearchInput,
  SelectSimple,
  FormSection,
  FormField,
  SectionHeader,
  StatusBadge,
  PanelHeader,
  ToggleRow,
} from '@/shared/ui';
import { cn, DRAG_KEYS, getFirstDragValue, setDragData } from '@/shared/utils';

import type {
  AdminNavNodeEntry,
  FlattenedCustomNode,
} from '@/shared/contracts/admin';
import {
  AdminMenuSettingsProvider,
  useAdminMenuSettings,
} from '../context/AdminMenuSettingsContext';

type ColorOption = (typeof ADMIN_MENU_COLORS)[number];

function FavoritesSection(): React.JSX.Element {
  const {
    favoritesList,
    favoritesSet,
    query,
    setQuery,
    filteredItems,
    handleToggleFavorite,
    moveFavorite,
  } = useAdminMenuSettings();

  return (
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
            {favoritesList.map((entry: AdminNavLeaf | undefined, index: number) => {
              if (!entry) return null;
              const { id, label, parents } = entry;
              return (
                <div
                  key={id}
                  className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-gray-900/40 p-3'
                >
                  <SectionHeader
                    title={label}
                    subtitle={parents.length ? parents.join(' / ') : undefined}
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
                          onClick={() => moveFavorite(id, 'up')}
                        >
                          <ArrowUp className='size-3' />
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-7 w-7 p-0'
                          disabled={index === favoritesList.length - 1}
                          onClick={() => moveFavorite(id, 'down')}
                        >
                          <ArrowDown className='size-3' />
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-7 px-2 text-[11px]'
                          onClick={() => handleToggleFavorite(id, false)}
                        >
                          Remove
                        </Button>
                      </div>
                    }
                  />
                </div>
              );
            })}
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
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  handleToggleFavorite(item.id, Boolean(checked))
                }
              />
              <div className='min-w-0'>
                <div className='truncate text-sm text-white'>{item.label}</div>
                <div className='truncate text-[11px] text-gray-500'>{item.parents.join(' / ')}</div>
                {item.href ? (
                  <div className='truncate text-[11px] text-gray-600'>{item.href}</div>
                ) : null}
              </div>
            </label>
          ))}
        </div>
      </div>
    </FormSection>
  );
}

function SectionColorsSection(): React.JSX.Element {
  const { sections, sectionColors, updateSectionColor } = useAdminMenuSettings();

  return (
    <FormSection
      title='Section Colors'
      description='Assign accents to top-level menu sections.'
      className='p-6'
      variant='subtle'
    >
      <div className='space-y-4'>
        {sections.map((section: NavItem) => {
          const sectionId = section.id;
          const sectionLabel = section.label;
          const current = sectionColors[sectionId] ?? 'none';
          const colorStyle = current !== 'none' ? ADMIN_MENU_COLOR_MAP[current] : null;
          return (
            <div
              key={sectionId}
              className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-gray-900/40 p-3'
            >
              <div className='flex items-center gap-2'>
                {colorStyle ? (
                  <span className={cn('h-2.5 w-2.5 rounded-full', colorStyle.dot)} />
                ) : (
                  <span className='h-2.5 w-2.5 rounded-full border border-dashed border-gray-500' />
                )}
                <span className='text-sm text-gray-200'>{sectionLabel}</span>
              </div>
              <SelectSimple
                size='sm'
                value={current}
                onValueChange={(value: string) => updateSectionColor(sectionId, value)}
                options={[
                  { value: 'none', label: 'None' },
                  ...ADMIN_MENU_COLORS.map((option: ColorOption) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ]}
                className='w-[160px]'
                triggerClassName='h-8 text-xs'
              />
            </div>
          );
        })}
      </div>
    </FormSection>
  );
}

function MenuBuilderSection(): React.JSX.Element {
  const {
    customEnabled,
    setCustomEnabled,
    handleAddRootNode,
    flattenedCustomNav,
    libraryItemMap,
    draggedPath,
    setDraggedPath,
    dragOver,
    setDragOver,
    moveCustomNodeTo,
    updateCustomLabel,
    updateCustomHref,
    indentCustomNode,
    outdentCustomNode,
    removeCustomNode,
    libraryQuery,
    setLibraryQuery,
    filteredLibraryItems,
    customIds,
    addBuiltInNode,
    handleReset,
  } = useAdminMenuSettings();

  const isSamePath = (a: number[], b: number[]): boolean =>
    a.length === b.length && a.every((value: number, index: number) => value === b[index]);

  return (
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
        onCheckedChange={setCustomEnabled}
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
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => handleAddRootNode('group')}
        >
          <Plus className='mr-2 size-4' />
          Add group
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={() => handleReset()}>
          Restore default layout
        </Button>
      </div>

      <div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]'>
        <div>
          <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Layout</h3>
          <p className='mt-1 text-[11px] text-gray-500'>
            Drag the grip to reorder. Use indent/outdent to nest items.
          </p>
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
                      const position =
                        event.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
                      setDragOver({ path, position });
                    }}
                    onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
                      event.preventDefault();
                      const raw = getFirstDragValue(event.dataTransfer, [
                        DRAG_KEYS.ADMIN_MENU_PATH,
                        DRAG_KEYS.TEXT,
                      ]);
                      let dragged: number[] | null = draggedPath;
                      if (raw) {
                        try {
                          const parsed = JSON.parse(raw) as unknown;
                          if (
                            Array.isArray(parsed) &&
                            parsed.every((val: unknown) => Number.isInteger(val))
                          ) {
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
                      setDragOver((prev: { path: number[]; position: 'above' | 'below' } | null) =>
                        prev && isSamePath(prev.path, path) ? null : prev
                      );
                    }}
                  >
                    {isDragTarget && dragOver?.position === 'above' ? (
                      <div className='pointer-events-none absolute -top-1 left-2 right-2 h-0.5 rounded-full bg-blue-500' />
                    ) : null}
                    {isDragTarget && dragOver?.position === 'below' ? (
                      <div className='pointer-events-none absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-blue-500' />
                    ) : null}
                    <div
                      className='flex min-w-0 flex-1 flex-wrap items-center gap-2'
                      style={{ paddingLeft: depth * 16 }}
                    >
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
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            updateCustomLabel(path, event.target.value)
                          }
                          placeholder='Label'
                          className='h-8 bg-gray-900/40 text-xs'
                          disabled={isBuiltIn}
                        />
                      </div>
                      <div className='min-w-[180px] flex-1'>
                        <Input
                          value={hrefValue}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            updateCustomHref(path, event.target.value)
                          }
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
          <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
            Add built-in items
          </h3>
          <SearchInput
            value={libraryQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setLibraryQuery(event.target.value)
            }
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
                  <div
                    key={entry.id}
                    className='flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/30 p-3'
                  >
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
  );
}

function AdminMenuSettingsInner(): React.JSX.Element {
  const { isDirty, isDefaultState, isSaving, handleSave, handleReset } = useAdminMenuSettings();

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
            label: isSaving ? 'Saving...' : 'Save Settings',
            onClick: () => {
              void handleSave();
            },
            disabled: !isDirty || isSaving,
          },
        ]}
      />

      <div className='mt-8 grid gap-6 lg:grid-cols-2'>
        <FavoritesSection />
        <SectionColorsSection />
      </div>

      <MenuBuilderSection />
    </div>
  );
}

export function AdminMenuSettingsPage(): React.JSX.Element {
  return (
    <AdminMenuSettingsProvider>
      <AdminMenuSettingsInner />
    </AdminMenuSettingsProvider>
  );
}
