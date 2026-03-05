'use client';

import { Sparkles } from 'lucide-react';
import React, { useCallback } from 'react';

import { FolderTreeSearchBar } from '@/features/foldertree/v2/search';
import { Button, SelectSimple, SegmentedControl } from '@/shared/ui';
import type { AiNode, CaseResolverFile } from '@/shared/contracts/case-resolver';

import { buildNode, createNodeId } from './case-resolver-canvas-utils';
import {
  useNodeFileWorkspaceActionsContext,
  useNodeFileWorkspaceStateContext,
} from './NodeFileWorkspaceContext';
import { RelationTreeBrowser } from '../relation-search/components/RelationTreeBrowser';
import type { RelationTreeLookup } from '../relation-search/types';

type NodeFileDocumentSearchPanelProps = {
  newNodeType: 'prompt' | 'model' | 'database' | 'viewer';
  setNewNodeType: (t: 'prompt' | 'model' | 'database' | 'viewer') => void;
  onExplanatoryClick: () => void;
  onNodeInspectorClick: () => void;
};

export function NodeFileDocumentSearchPanel(
  props: NodeFileDocumentSearchPanelProps
): React.JSX.Element {
  const { newNodeType, setNewNodeType, onExplanatoryClick, onNodeInspectorClick } = props;

  const {
    documentSearchScope,
    documentSearchQuery,
    relationTreeNodes,
    relationTreeLookup,
    visibleDocumentSearchRows,
    view,
    canvasHostRef,
  } = useNodeFileWorkspaceStateContext();
  const { setDocumentSearchScope, setDocumentSearchQuery, addNode, setNodeFileMeta } =
    useNodeFileWorkspaceActionsContext();
  const resolvedRelationTreeNodes = relationTreeNodes ?? [];
  const resolvedRelationTreeLookup: RelationTreeLookup = relationTreeLookup ?? {
    fileRowByNodeId: new Map(),
    fileNodeIdByFileId: new Map(),
    caseMetaByNodeId: new Map(),
    folderMetaByNodeId: new Map(),
  };

  const resolveCanvasCenter = useCallback((): { x: number; y: number } => {
    const rect = canvasHostRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.width / 2 : 400;
    const centerY = rect ? rect.height / 2 : 300;
    const safeScale = view.scale || 1;
    return {
      x: (centerX - view.x) / safeScale,
      y: (centerY - view.y) / safeScale,
    };
  }, [canvasHostRef, view]);

  const addDocumentToCanvas = useCallback(
    (file: CaseResolverFile): void => {
      const nodeId = createNodeId();
      const node: AiNode = buildNode(
        {
          type: file.fileType === 'scanfile' ? 'scanfile' : 'document',
          title: file.name,
          description: '',
          outputs: [],
          inputs: [],
        },
        resolveCanvasCenter(),
        nodeId,
        file.name
      );
      addNode(node);
      setNodeFileMeta(nodeId, {
        fileId: file.id,
        fileType: file.fileType,
        fileName: file.name,
      });
    },
    [addNode, resolveCanvasCenter, setNodeFileMeta]
  );

  return (
    <div className='shrink-0 border-b border-border/60 bg-card/30'>
      <div className='flex items-center gap-2 px-3 py-2'>
        <SegmentedControl
          size='xs'
          value={documentSearchScope}
          onChange={(value) => {
            setDocumentSearchScope(value);
          }}
          options={[
            { value: 'case_scope', label: 'Current Case' },
            { value: 'all_cases', label: 'All Cases' },
          ]}
          className='bg-card/40'
        />

        <div className='flex-1' />

        <Button onClick={onExplanatoryClick} variant='success' size='xs' className='h-8'>
          <Sparkles className='mr-1 size-3.5' />
          Explanatory Node
        </Button>

        <SelectSimple
          size='sm'
          value={newNodeType}
          onValueChange={(val) => setNewNodeType(val as 'prompt' | 'model' | 'database' | 'viewer')}
          options={[
            { value: 'prompt', label: 'Prompt Node' },
            { value: 'model', label: 'Model Node' },
            { value: 'database', label: 'Database Node' },
            { value: 'viewer', label: 'Result Viewer Node' },
          ]}
          className='w-[160px]'
          triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
        />

        <Button variant='outline' size='xs' className='h-8' onClick={onNodeInspectorClick}>
          Node Inspector
        </Button>
      </div>

      <div className='flex items-center gap-2 border-t border-border/40 px-3 py-1.5'>
        <div className='min-w-0 flex-1'>
          <FolderTreeSearchBar
            value={documentSearchQuery}
            onChange={setDocumentSearchQuery}
            placeholder='Search catalogs & documents…'
          />
        </div>
        <span className='shrink-0 text-xs text-gray-500'>
          {visibleDocumentSearchRows.length} doc
          {visibleDocumentSearchRows.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className='max-h-64 overflow-auto border-t border-border/40'>
        <RelationTreeBrowser
          instance='case_resolver_nodefile_relations'
          mode='add_to_node_canvas'
          nodes={resolvedRelationTreeNodes}
          lookup={resolvedRelationTreeLookup}
          onAddFile={(fileId): void => {
            const rowNodeId = resolvedRelationTreeLookup.fileNodeIdByFileId.get(fileId);
            if (!rowNodeId) return;
            const row = resolvedRelationTreeLookup.fileRowByNodeId.get(rowNodeId);
            if (!row) return;
            addDocumentToCanvas(row.file);
          }}
          searchQuery={documentSearchQuery}
          emptyLabel='No matching documents'
        />
      </div>

      {visibleDocumentSearchRows.length > 0 && (
        <div className='border-t border-border/30 px-3 py-1 text-xs text-gray-600'>
          Drag file rows by handle onto the canvas, or click + to add at center.
        </div>
      )}
    </div>
  );
}
