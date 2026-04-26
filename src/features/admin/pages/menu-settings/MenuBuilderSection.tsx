'use client';

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  FolderPlus,
  Link2,
  Trash2,
  ArrowDownToLine,
} from 'lucide-react';
import { useAdminMenuSettings } from '../../context/AdminMenuSettingsContext';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { FolderTreePanel, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/shared/lib/foldertree/public';
import { SelectedNodeEditor } from './components/SelectedNodeEditor';
import { LibraryItemsList } from './components/LibraryItemsList';
import { LayoutNode } from './components/LayoutNode';

const TREE_INSTANCE = 'admin_menu_layout';

export function MenuBuilderSection(): React.JSX.Element {
  const {
    customEnabled,
    setCustomEnabled,
    layoutMasterNodes,
    replaceCustomNavFromMasterNodes,
    handleAddRootNode,
    addCustomChildNode,
    removeCustomNodeById,
    updateCustomNodeLabelById,
    updateCustomNodeSemanticById,
    updateCustomNodeHrefById,
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
        onApply: (tx) => {
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
  const selectedNode =
    selectedNodeId !== null && selectedNodeId !== ''
      ? (layoutNodeStateById.get(selectedNodeId) ?? null)
      : null;
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
      if (selectedNodeId === null || selectedNodeId === '') return;
      const nodeId = addCustomChildNode(selectedNodeId, kind);
      if (nodeId === null || nodeId === '') return;
      controller.expandNode(selectedNodeId);
      controller.selectNode(nodeId);
      controller.expandToNode?.(nodeId);
      controller.scrollToNode?.(nodeId);
    },
    [addCustomChildNode, controller, selectedNodeId]
  );

  const renderLayoutNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <LayoutNode input={input} layoutNodeStateById={layoutNodeStateById} />
    ),
    [layoutNodeStateById]
  );

  const isSelectedNodeValid = selectedNodeId !== null && selectedNodeId !== '' && selectedNode !== null;

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

      {customEnabled === false ? (
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
          disabled={selectedNodeId === null || selectedNodeId === ''}
          onClick={() => handleAddChild('link')}
        >
          <Link2 className='mr-2 size-4' />
          Add child link
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={selectedNodeId === null || selectedNodeId === ''}
          onClick={() => handleAddChild('group')}
        >
          <FolderPlus className='mr-2 size-4' />
          Add child group
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={selectedNodeId === null || selectedNodeId === ''}
          onClick={() => {
            if (selectedNodeId === null || selectedNodeId === '') return;
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
          disabled={selectedNodeId === null || selectedNodeId === ''}
          onClick={() => {
            if (selectedNodeId === null || selectedNodeId === '') return;
            controller.dropNodeToRoot(selectedNodeId).catch(() => {});
          }}
        >
          <ArrowDownToLine className='mr-2 size-4' />
          Move selected to root
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={() => handleReset()}>
          Restore default layout
        </Button>
      </div>

      <div className={`${UI_GRID_ROOMY_CLASSNAME} mt-6 lg:grid-cols-[minmax(0,1fr)_360px]`}>
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

          {isSelectedNodeValid ? (
            <SelectedNodeEditor
              selectedNodeId={selectedNodeId}
              selectedNode={selectedNode}
              selectedNodeSemantic={selectedNodeSemantic}
              updateCustomNodeLabelById={updateCustomNodeLabelById}
              updateCustomNodeSemanticById={updateCustomNodeSemanticById}
              updateCustomNodeHrefById={updateCustomNodeHrefById}
            />
          ) : null}
        </div>

        <LibraryItemsList
          libraryQuery={libraryQuery}
          setLibraryQuery={setLibraryQuery}
          filteredLibraryItems={filteredLibraryItems}
          customIds={customIds}
          onAdd={addBuiltInNode}
        />
      </div>
    </FormSection>
  );
}
