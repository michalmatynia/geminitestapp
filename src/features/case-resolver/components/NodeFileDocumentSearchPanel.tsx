'use client';

import { Sparkles } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import { FolderTreeSearchBar } from '@/features/foldertree';
import { Button, SelectSimple, SegmentedControl } from '@/shared/ui';
import {
  CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS,
  CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS,
  type AiNode,
  type CaseResolverFile,
} from '@/shared/contracts/case-resolver';
import { useFolderTreeProfile } from '@/shared/hooks/use-folder-tree-profile';
import { resolveFolderTreeSearchConfig } from '@/shared/utils/folder-tree-profiles-v2';

import { buildNode, createNodeId } from './case-resolver-canvas-utils';
import {
  useNodeFileWorkspaceActionsContext,
  useNodeFileWorkspaceStateContext,
} from './NodeFileWorkspaceContext';
import { RelationTreeBrowser } from '../relation-search/components/RelationTreeBrowser';
import { RelationTreeBrowserRuntimeContext } from '../relation-search/components/RelationTreeBrowserRuntimeContext';
import type { RelationTreeLookup } from '../relation-search/types';

export function NodeFileDocumentSearchPanel(): React.JSX.Element {
  const {
    newNodeType,
    documentSearchScope,
    documentSearchQuery,
    relationTreeNodes,
    relationTreeLookup,
    visibleDocumentSearchRows,
    view,
    canvasHostRef,
  } = useNodeFileWorkspaceStateContext();
  const {
    setNewNodeType,
    setDocumentSearchScope,
    setDocumentSearchQuery,
    addNode,
    setNodeFileMeta,
    setIsNodeInspectorOpen,
  } = useNodeFileWorkspaceActionsContext();
  const relationTreeProfile = useFolderTreeProfile('case_resolver_nodefile_relations');
  const relationTreeSearchEnabled = React.useMemo(
    (): boolean => resolveFolderTreeSearchConfig(relationTreeProfile).enabled,
    [relationTreeProfile]
  );
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

  const handleAddExplanatoryNode = useCallback((): void => {
    const node = buildNode(
      {
        type: 'prompt',
        title: 'Explanatory Note',
        description: '',
        outputs: [...CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS],
        inputs: [...CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS],
      },
      resolveCanvasCenter(),
      createNodeId(),
      'Explanatory Note'
    );
    addNode(node);
  }, [addNode, resolveCanvasCenter]);

  React.useEffect((): void => {
    if (relationTreeSearchEnabled) return;
    if (documentSearchQuery.length === 0) return;
    setDocumentSearchQuery('');
  }, [documentSearchQuery, relationTreeSearchEnabled, setDocumentSearchQuery]);

  const relationTreeBrowserRuntimeValue = useMemo(
    () => ({
      instance: 'case_resolver_nodefile_relations' as const,
      nodes: resolvedRelationTreeNodes,
      lookup: resolvedRelationTreeLookup,
      onAddFile: (fileId: string): void => {
        const rowNodeId = resolvedRelationTreeLookup.fileNodeIdByFileId.get(fileId);
        if (!rowNodeId) return;
        const row = resolvedRelationTreeLookup.fileRowByNodeId.get(rowNodeId);
        if (!row) return;
        addDocumentToCanvas(row.file);
      },
      searchQuery: relationTreeSearchEnabled ? documentSearchQuery : '',
    }),
    [
      addDocumentToCanvas,
      documentSearchQuery,
      relationTreeSearchEnabled,
      resolvedRelationTreeLookup,
      resolvedRelationTreeNodes,
    ]
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

        <Button onClick={handleAddExplanatoryNode} variant='success' size='xs' className='h-8'>
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

        <Button
          variant='outline'
          size='xs'
          className='h-8'
          onClick={() => setIsNodeInspectorOpen(true)}
        >
          Node Inspector
        </Button>
      </div>

      <div className='flex items-center gap-2 border-t border-border/40 px-3 py-1.5'>
        <div className='min-w-0 flex-1'>
          {relationTreeSearchEnabled ? (
            <FolderTreeSearchBar
              value={documentSearchQuery}
              onChange={setDocumentSearchQuery}
              placeholder='Search catalogs & documents…'
            />
          ) : (
            <div className='text-xs text-muted-foreground/80'>
              Tree search disabled for this profile.
            </div>
          )}
        </div>
        <span className='shrink-0 text-xs text-gray-500'>
          {visibleDocumentSearchRows.length} doc
          {visibleDocumentSearchRows.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className='max-h-64 overflow-auto border-t border-border/40'>
        <RelationTreeBrowserRuntimeContext.Provider value={relationTreeBrowserRuntimeValue}>
          <RelationTreeBrowser mode='add_to_node_canvas' emptyLabel='No matching documents' />
        </RelationTreeBrowserRuntimeContext.Provider>
      </div>

      {visibleDocumentSearchRows.length > 0 && (
        <div className='border-t border-border/30 px-3 py-1 text-xs text-gray-600'>
          Drag file rows by handle onto the canvas, or click + to add at center.
        </div>
      )}
    </div>
  );
}
