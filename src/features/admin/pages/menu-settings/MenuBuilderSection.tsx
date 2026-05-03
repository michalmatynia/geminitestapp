'use client';

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { Plus, FolderPlus, Link2, Trash2, ArrowDownToLine } from 'lucide-react';
import { useAdminMenuSettings } from '../../context/AdminMenuSettingsContext';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { FolderTreePanel, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { createMasterFolderTreeTransactionAdapter, FolderTreeViewportV2, useMasterFolderTreeShell, type FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { SelectedNodeEditor } from './components/SelectedNodeEditor';
import { LibraryItemsList } from './components/LibraryItemsList';
import { LayoutNode } from './components/LayoutNode';
import type { AdminMenuLayoutNodeEntry, AdminMenuLayoutNodeSemantic } from '../admin-menu-layout-types';
import type { AdminNavNodeEntry } from '@/shared/contracts/admin';

const TREE_INSTANCE = 'admin_menu_layout';
type FTController = ReturnType<typeof useMasterFolderTreeShell>['controller'];

interface ToolbarProps {
  selectedNodeId: string | null; handleAddRoot: (k: AdminMenuLayoutNodeSemantic) => void; handleAddChild: (k: AdminMenuLayoutNodeSemantic) => void;
  removeCustomNodeById: (id: string) => void; controller: FTController; handleReset: () => void;
}
function MenuBuilderToolbar({ selectedNodeId, handleAddRoot, handleAddChild, removeCustomNodeById, controller, handleReset }: ToolbarProps): React.JSX.Element {
  const isS = selectedNodeId !== null && selectedNodeId !== '';
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button type='button' size='sm' onClick={() => handleAddRoot('link')}><Plus className='mr-2 size-4' />Add root link</Button>
      <Button type='button' variant='outline' size='sm' onClick={() => handleAddRoot('group')}><FolderPlus className='mr-2 size-4' />Add root group</Button>
      <Button type='button' variant='outline' size='sm' disabled={!isS} onClick={() => handleAddChild('link')}><Link2 className='mr-2 size-4' />Add child link</Button>
      <Button type='button' variant='outline' size='sm' disabled={!isS} onClick={() => handleAddChild('group')}><FolderPlus className='mr-2 size-4' />Add child group</Button>
      <Button type='button' variant='outline' size='sm' disabled={!isS} onClick={() => { if (selectedNodeId !== null) { removeCustomNodeById(selectedNodeId); controller.selectNode(null); } }}><Trash2 className='mr-2 size-4' />Remove selected</Button>
      <Button type='button' variant='outline' size='sm' disabled={!isS} onClick={() => { if (selectedNodeId !== null) controller.dropNodeToRoot(selectedNodeId).catch(() => {}); }}><ArrowDownToLine className='mr-2 size-4' />Move selected to root</Button>
      <Button type='button' variant='outline' size='sm' onClick={() => handleReset()}>Restore default layout</Button>
    </div>
  );
}
interface LayoutColumnProps {
  controller: FTController; scrollToNodeRef: React.RefObject<HTMLDivElement>; rootDropUi: React.ReactNode; renderLayoutNode: (i: FolderTreeViewportRenderNodeInput) => React.ReactNode;
  isSelectedNodeValid: boolean; selectedNodeId: string | null; selectedNode: AdminMenuLayoutNodeEntry | null; selectedNodeSemantic: AdminMenuLayoutNodeSemantic;
  updateCustomNodeLabelById: (id: string, val: string) => void; updateCustomNodeSemanticById: (id: string, val: AdminMenuLayoutNodeSemantic) => void; updateCustomNodeHrefById: (id: string, val: string) => void;
}
function LayoutColumn({ controller, scrollToNodeRef, rootDropUi, renderLayoutNode, isSelectedNodeValid, selectedNodeId, selectedNode, selectedNodeSemantic, updateCustomNodeLabelById, updateCustomNodeSemanticById, updateCustomNodeHrefById }: LayoutColumnProps): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div><h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400'>Layout</h3><p className='mt-1 text-[11px] text-gray-500'>Drag and drop nodes to reorder or nest them. Built-in items are read-only.</p></div>
      <FolderTreePanel masterInstance={TREE_INSTANCE} className='h-[340px] rounded-md border border-border/60 bg-card/30 p-2'>
        <FolderTreeViewportV2 controller={controller} scrollToNodeRef={scrollToNodeRef} rootDropUi={rootDropUi} renderNode={renderLayoutNode} emptyLabel='No menu items yet. Add links or groups to start building your menu.' />
      </FolderTreePanel>
      {isSelectedNodeValid && selectedNodeId !== null && selectedNode !== null && <SelectedNodeEditor selectedNodeId={selectedNodeId} selectedNode={selectedNode} selectedNodeSemantic={selectedNodeSemantic} updateCustomNodeLabelById={updateCustomNodeLabelById} updateCustomNodeSemanticById={updateCustomNodeSemanticById} updateCustomNodeHrefById={updateCustomNodeHrefById} />}
    </div>
  );
}
interface ContentProps {
  customEnabled: boolean; setCustomEnabled: (v: boolean) => void; selectedNodeId: string | null; handleAddRoot: (k: AdminMenuLayoutNodeSemantic) => void; handleAddChild: (k: AdminMenuLayoutNodeSemantic) => void;
  removeCustomNodeById: (id: string) => void; controller: FTController; handleReset: () => void; scrollToNodeRef: React.RefObject<HTMLDivElement>; rootDropUi: React.ReactNode;
  renderLayoutNode: (i: FolderTreeViewportRenderNodeInput) => React.ReactNode; isV: boolean; selectedNode: AdminMenuLayoutNodeEntry | null; selectedNodeSemantic: AdminMenuLayoutNodeSemantic;
  updateCustomNodeLabelById: (id: string, val: string) => void; updateCustomNodeSemanticById: (id: string, val: AdminMenuLayoutNodeSemantic) => void; updateCustomNodeHrefById: (id: string, val: string) => void;
  libraryQuery: string; setLibraryQuery: (v: string) => void; filteredLibraryItems: AdminNavNodeEntry[]; customIds: Set<string>; addBuiltInNode: (e: AdminNavNodeEntry) => void;
}
function MenuBuilderContent(p: ContentProps): React.JSX.Element {
  return (
    <FormSection title='Menu Builder' description='Manage menu hierarchy.' className='mt-6 p-6' variant='subtle'>
      <ToggleRow variant='switch' label='Use custom layout' description='Enable this.' checked={p.customEnabled} onCheckedChange={p.setCustomEnabled} className='mb-6' />
      {!p.customEnabled && <div className='mb-4 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-xs text-gray-400'>Custom layout is disabled.</div>}
      <MenuBuilderToolbar selectedNodeId={p.selectedNodeId} handleAddRoot={p.handleAddRoot} handleAddChild={p.handleAddChild} removeCustomNodeById={p.removeCustomNodeById} controller={p.controller} handleReset={p.handleReset} />
      <div className={`${UI_GRID_ROOMY_CLASSNAME} mt-6 lg:grid-cols-[minmax(0,1fr)_360px]`}>
        <LayoutColumn controller={p.controller} scrollToNodeRef={p.scrollToNodeRef} rootDropUi={p.rootDropUi} renderLayoutNode={p.renderLayoutNode} isSelectedNodeValid={p.isV} selectedNodeId={p.selectedNodeId} selectedNode={p.selectedNode} selectedNodeSemantic={p.selectedNodeSemantic} updateCustomNodeLabelById={p.updateCustomNodeLabelById} updateCustomNodeSemanticById={p.updateCustomNodeSemanticById} updateCustomNodeHrefById={p.updateCustomNodeHrefById} />
        <LibraryItemsList libraryQuery={p.libraryQuery} setLibraryQuery={p.setLibraryQuery} filteredLibraryItems={p.filteredLibraryItems} customIds={p.customIds} onAdd={p.addBuiltInNode} />
      </div>
    </FormSection>
  );
}
export function MenuBuilderSection(): React.JSX.Element {
  const { customEnabled, setCustomEnabled, layoutMasterNodes, replaceCustomNavFromMasterNodes, handleAddRootNode, addCustomChildNode, removeCustomNodeById, updateCustomNodeLabelById, updateCustomNodeSemanticById, updateCustomNodeHrefById, layoutNodeStateById, libraryQuery, setLibraryQuery, filteredLibraryItems, customIds, addBuiltInNode, handleReset } = useAdminMenuSettings();
  const rRef = useRef(replaceCustomNavFromMasterNodes); useEffect(() => { rRef.current = replaceCustomNavFromMasterNodes; }, [replaceCustomNavFromMasterNodes]);
  const adapter = useMemo(() => createMasterFolderTreeTransactionAdapter({ onApply: (tx) => { rRef.current(tx.nextNodes); } }), []);
  const { appearance: { rootDropUi }, controller, viewport: { scrollToNodeRef } } = useMasterFolderTreeShell({ instance: TREE_INSTANCE, nodes: layoutMasterNodes, adapter });
  const sId = controller.selectedNodeId; const sNode = (sId !== null && sId !== '') ? (layoutNodeStateById.get(sId) ?? null) : null;
  const handleAddRoot = useCallback((k: AdminMenuLayoutNodeSemantic) => { const id = handleAddRootNode(k); controller.selectNode(id); controller.expandToNode?.(id); controller.scrollToNode?.(id); }, [controller, handleAddRootNode]);
  const handleAddChild = useCallback((k: AdminMenuLayoutNodeSemantic) => { if (sId === null || sId === '') return; const id = addCustomChildNode(sId, k); if (id === null || id === '') return; controller.expandNode(sId); controller.selectNode(id); controller.expandToNode?.(id); controller.scrollToNode?.(id); }, [addCustomChildNode, controller, sId]);
  const renderLayoutNode = useCallback((i: FolderTreeViewportRenderNodeInput) => <LayoutNode input={i} layoutNodeStateById={layoutNodeStateById} />, [layoutNodeStateById]);
  const isV = (sId !== null && sId !== '') && sNode !== null;
  return <MenuBuilderContent customEnabled={customEnabled} setCustomEnabled={setCustomEnabled} selectedNodeId={sId} handleAddRoot={handleAddRoot} handleAddChild={handleAddChild} removeCustomNodeById={removeCustomNodeById} controller={controller} handleReset={handleReset} scrollToNodeRef={scrollToNodeRef} rootDropUi={rootDropUi} renderLayoutNode={renderLayoutNode} isV={isV} selectedNode={sNode} selectedNodeSemantic={sNode?.semantic ?? 'group'} updateCustomNodeLabelById={updateCustomNodeLabelById} updateCustomNodeSemanticById={updateCustomNodeSemanticById} updateCustomNodeHrefById={updateCustomNodeHrefById} libraryQuery={libraryQuery} setLibraryQuery={setLibraryQuery} filteredLibraryItems={filteredLibraryItems} customIds={customIds} addBuiltInNode={addBuiltInNode} />;
}
