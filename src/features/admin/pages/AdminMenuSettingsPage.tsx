'use client';

import {
  ArrowDownToLine,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Link2,
  Menu,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  ADMIN_MENU_COLOR_MAP,
  ADMIN_MENU_COLORS,
  type NavItem,
} from '@/features/admin/components/Menu';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree';
import type { AdminNavLeaf, AdminNavNodeEntry } from '@/shared/contracts/admin';
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
  FolderTreePanel,
  UI_GRID_ROOMY_CLASSNAME,
  insetPanelVariants,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  AdminMenuSettingsProvider,
  useAdminMenuSettings,
} from '../context/AdminMenuSettingsContext';

const TREE_INSTANCE = 'admin_menu_layout';

type ColorOption = (typeof ADMIN_MENU_COLORS)[number];
const SECTION_COLOR_OPTIONS: Array<LabeledOptionDto<string>> = [
  { value: 'none', label: 'None' },
  ...ADMIN_MENU_COLORS.map((option: ColorOption) => ({
    value: option.value,
    label: option.label,
  })),
];
const NODE_TYPE_OPTIONS: Array<LabeledOptionDto<'group' | 'link'>> = [
  { value: 'group', label: 'Group' },
  { value: 'link', label: 'Link' },
];

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
                          ↑
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-7 w-7 p-0'
                          disabled={index === favoritesList.length - 1}
                          onClick={() => moveFavorite(id, 'down')}
                        >
                          ↓
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
                options={SECTION_COLOR_OPTIONS}
                className='w-[160px]'
                triggerClassName='h-8 text-xs'
               ariaLabel='Select option' title='Select option'/>
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
    addCustomChildNode,
    removeCustomNodeById,
    updateCustomNodeLabelById,
    updateCustomNodeHrefById,
    updateCustomNodeSemanticById,
    replaceCustomNavFromMasterNodes,
    layoutMasterNodes,
    layoutNodeStateById,
    libraryQuery,
    setLibraryQuery,
    filteredLibraryItems,
    customIds,
    addBuiltInNode,
    handleReset,
  } = useAdminMenuSettings();

  const replaceCustomNavFromMasterNodesRef = useRef(replaceCustomNavFromMasterNodes);
  useEffect(() => {
    replaceCustomNavFromMasterNodesRef.current = replaceCustomNavFromMasterNodes;
  }, [replaceCustomNavFromMasterNodes]);

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (tx) => {
          replaceCustomNavFromMasterNodesRef.current(tx.nextNodes);
        },
      }),
    []
  );

  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: TREE_INSTANCE,
    nodes: layoutMasterNodes,
    adapter,
  });

  const selectedNodeId = controller.selectedNodeId;
  const selectedNode = selectedNodeId ? (layoutNodeStateById.get(selectedNodeId) ?? null) : null;
  const selectedNodeSemantic = selectedNode?.semantic ?? 'group';

  const handleAddRoot = useCallback(
    (kind: 'link' | 'group'): void => {
      const nodeId = handleAddRootNode(kind);
      controller.selectNode(nodeId);
      controller.expandToNode?.(nodeId);
      controller.scrollToNode?.(nodeId);
    },
    [controller, handleAddRootNode]
  );

  const handleAddChild = useCallback(
    (kind: 'link' | 'group'): void => {
      if (!selectedNodeId) return;
      const nodeId = addCustomChildNode(selectedNodeId, kind);
      if (!nodeId) return;
      controller.expandNode(selectedNodeId);
      controller.selectNode(nodeId);
      controller.expandToNode?.(nodeId);
      controller.scrollToNode?.(nodeId);
    },
    [addCustomChildNode, controller, selectedNodeId]
  );

  const renderLayoutNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => {
      const nodeState = layoutNodeStateById.get(input.node.id);
      const semantic = nodeState?.semantic ?? 'group';
      const isBuiltIn = nodeState?.isBuiltIn ?? false;
      const stateClassName = input.isSelected
        ? 'bg-blue-600/30 text-white ring-1 ring-blue-400/40'
        : input.dropPosition === 'before'
          ? 'bg-blue-500/10 text-gray-100 ring-1 ring-blue-500/40'
          : input.dropPosition === 'after'
            ? 'bg-cyan-500/10 text-gray-100 ring-1 ring-cyan-500/40'
            : 'text-gray-300 hover:bg-muted/40';

      return (
        <div
          className={cn(
            'group flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition',
            stateClassName,
            input.isDragging && 'opacity-50'
          )}
          style={{ paddingLeft: `${input.depth * 16 + 8}px` }}
        >
          {input.hasChildren ? (
            <button
              type='button'
              className='inline-flex size-4 items-center justify-center rounded hover:bg-muted/50'
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                event.preventDefault();
                event.stopPropagation();
                input.toggleExpand();
              }}
              aria-label={input.isExpanded ? 'Collapse node' : 'Expand node'}
              aria-expanded={input.isExpanded}
              title={input.isExpanded ? 'Collapse node' : 'Expand node'}>
              {input.isExpanded ? (
                <ChevronDown className='size-3.5 text-gray-400' />
              ) : (
                <ChevronRight className='size-3.5 text-gray-400' />
              )}
            </button>
          ) : (
            <span className='inline-flex size-4 items-center justify-center text-gray-500'>•</span>
          )}

          <button
            type='button'
            onClick={input.select}
            aria-pressed={input.isSelected}
            aria-label={input.node.name}
            className='flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
          >
            <span className='min-w-0 flex-1 truncate'>{input.node.name}</span>

            <StatusBadge
              status={semantic === 'link' ? 'Link' : 'Group'}
              variant='info'
              size='sm'
              className='font-bold'
            />
            <StatusBadge
              status={isBuiltIn ? 'Built-in' : 'Custom'}
              variant={isBuiltIn ? 'warning' : 'success'}
              size='sm'
              className='font-bold'
            />
          </button>
        </div>
      );
    },
    [layoutNodeStateById]
  );

  return (
    <FormSection
      title='Menu Builder'
      description='Manage menu hierarchy with the Master folder tree runtime.'
      className='mt-6 p-6'
      variant='subtle'
    >
      <ToggleRow
        variant='switch'
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
        <Button type='button' size='sm' onClick={() => handleAddRoot('link')}>
          <Plus className='mr-2 size-4' />
          Add root link
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={() => handleAddRoot('group')}>
          <FolderPlus className='mr-2 size-4' />
          Add root group
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!selectedNodeId}
          onClick={() => handleAddChild('link')}
        >
          <Link2 className='mr-2 size-4' />
          Add child link
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!selectedNodeId}
          onClick={() => handleAddChild('group')}
        >
          <FolderPlus className='mr-2 size-4' />
          Add child group
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!selectedNodeId}
          onClick={() => {
            if (!selectedNodeId) return;
            removeCustomNodeById(selectedNodeId);
            controller.selectNode(null);
          }}
        >
          <Trash2 className='mr-2 size-4' />
          Remove selected
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!selectedNodeId}
          onClick={() => {
            if (!selectedNodeId) return;
            void controller.dropNodeToRoot(selectedNodeId);
          }}
        >
          <ArrowDownToLine className='mr-2 size-4' />
          Move selected to root
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={() => handleReset()}>
          Restore default layout
        </Button>
      </div>

      <div
        className={`${UI_GRID_ROOMY_CLASSNAME} mt-6 lg:grid-cols-[minmax(0,1fr)_360px]`}
      >
        <div className='space-y-4'>
          <div>
            <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Layout</h3>
            <p className='mt-1 text-[11px] text-gray-500'>
              Drag and drop nodes to reorder or nest them. Built-in items are read-only.
            </p>
          </div>

          <FolderTreePanel
            masterInstance={TREE_INSTANCE}
            className='h-[340px] rounded-md border border-border/60 bg-card/30 p-2'
          >
            <FolderTreeViewportV2
              controller={controller}
              scrollToNodeRef={scrollToNodeRef}
              rootDropUi={rootDropUi}
              renderNode={renderLayoutNode}
              emptyLabel='No menu items yet. Add links or groups to start building your menu.'
            />
          </FolderTreePanel>

          {selectedNodeId && selectedNode ? (
            <FormSection
              title='Selected Item'
              description='Edit properties for the currently selected menu node.'
              variant='subtle'
              className='p-4'
              actions={
                <StatusBadge
                  status={selectedNode.isBuiltIn ? 'Built-in' : 'Custom'}
                  variant={selectedNode.isBuiltIn ? 'warning' : 'success'}
                  size='sm'
                  className='font-bold'
                />
              }
            >
              <div className='grid gap-3 md:grid-cols-2'>
                <FormField label='Label'>
                  <Input
                    value={selectedNode.label}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      updateCustomNodeLabelById(selectedNodeId, event.target.value)
                    }
                    className='h-8 bg-gray-900/40 text-xs'
                    disabled={selectedNode.isBuiltIn}
                   aria-label='Label' title='Label'/>
                </FormField>

                <FormField label='Type'>
                  <SelectSimple
                    size='sm'
                    value={selectedNodeSemantic}
                    options={NODE_TYPE_OPTIONS}
                    onValueChange={(value: string) =>
                      updateCustomNodeSemanticById(
                        selectedNodeId,
                        value === 'link' ? 'link' : 'group'
                      )
                    }
                    disabled={selectedNode.isBuiltIn}
                    triggerClassName='h-8 text-xs'
                   ariaLabel='Type' title='Type'/>
                </FormField>
              </div>

              {selectedNodeSemantic === 'link' ? (
                <FormField label='Href' className='mt-3'>
                  <Input
                    value={selectedNode.href ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      updateCustomNodeHrefById(selectedNodeId, event.target.value)
                    }
                    placeholder='/admin/...'
                    className='h-8 bg-gray-900/40 text-xs'
                    disabled={selectedNode.isBuiltIn}
                   aria-label='/admin/...' title='/admin/...'/>
                </FormField>
              ) : null}

              {selectedNode.isBuiltIn ? (
                <p className='mt-3 text-[11px] text-amber-200/80'>
                  Built-in node metadata is locked. You can still move or remove this node from the
                  custom layout.
                </p>
              ) : null}
            </FormSection>
          ) : null}
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
              <p
                className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} border-border text-xs text-gray-400`}
              >
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
    <div className='page-section'>
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

      <div className={`${UI_GRID_ROOMY_CLASSNAME} mt-8 lg:grid-cols-2`}>
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
