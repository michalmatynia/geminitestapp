'use client';

import { ArrowLeft, Sparkles } from 'lucide-react';
import React, { useMemo, useCallback } from 'react';

import { Button, SelectSimple, SearchInput, DataTable } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { AiNode, CaseResolverFile } from '@/shared/contracts/case-resolver';

import { buildNode, createNodeId } from './case-resolver-canvas-utils';
import { useNodeFileWorkspaceContext } from './NodeFileWorkspaceContext';
import { normalizeSearchText, type NodeFileDocumentSearchRow } from './CaseResolverNodeFileUtils';
import { getNodeFileDocumentColumns, getNodeFileCaseColumns } from './CaseResolverNodeFileColumns';

const DRAG_FILE_ID_TYPE = 'application/case-resolver-file-id';

type NodeFileDocumentSearchPanelProps = {
  newNodeType: 'prompt' | 'model' | 'template' | 'database' | 'viewer';
  setNewNodeType: (t: 'prompt' | 'model' | 'template' | 'database' | 'viewer') => void;
  onExplanatoryClick: () => void;
  onNodeInspectorClick: () => void;
};

export function NodeFileDocumentSearchPanel({
  newNodeType,
  setNewNodeType,
  onExplanatoryClick,
  onNodeInspectorClick,
}: NodeFileDocumentSearchPanelProps): React.JSX.Element {
  const {
    documentSearchScope,
    setDocumentSearchScope,
    documentSearchQuery,
    setDocumentSearchQuery,
    selectedSearchFolderPath,
    setSelectedSearchFolderPath,
    folderTree,
    documentSearchRows,
    visibleDocumentSearchRows,
    caseSearchQuery,
    setCaseSearchQuery,
    selectedDrillCaseId,
    setSelectedDrillCaseId,
    visibleCaseRows,
    view,
    viewportRef,
    addNode,
    setNodeFileMeta,
  } = useNodeFileWorkspaceContext();

  const isCurrentCase = documentSearchScope === 'case_scope';
  const isAllCases = documentSearchScope === 'all_cases';
  const isDrillMode = isAllCases && selectedDrillCaseId !== null;
  const showDocTable = isCurrentCase || isDrillMode;

  const drillRows = useMemo((): NodeFileDocumentSearchRow[] => {
    if (!selectedDrillCaseId) return [];
    return documentSearchRows.filter(
      (row: NodeFileDocumentSearchRow): boolean => row.file.parentCaseId === selectedDrillCaseId
    );
  }, [documentSearchRows, selectedDrillCaseId]);

  const visibleDrillRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const q = normalizeSearchText(documentSearchQuery);
    if (!q) return drillRows;
    return drillRows.filter((row: NodeFileDocumentSearchRow): boolean =>
      row.searchable.includes(q)
    );
  }, [drillRows, documentSearchQuery]);

  const topLevelFolderPaths = useMemo((): string[] => {
    return folderTree.childPathsByParent.get(null) ?? [];
  }, [folderTree]);

  const drillTopLevelFolderPaths = useMemo((): string[] => {
    if (!selectedDrillCaseId) return [];
    const seen = new Set<string>();
    drillRows.forEach((row: NodeFileDocumentSearchRow): void => {
      const topSegment = row.folderSegments[0];
      if (topSegment) seen.add(topSegment);
    });
    return Array.from(seen).sort();
  }, [drillRows, selectedDrillCaseId]);

  const drillSignatureLabel = useMemo((): string => {
    if (!selectedDrillCaseId) return '';
    const caseRow = visibleCaseRows.find((r) => r.file.id === selectedDrillCaseId);
    if (caseRow) return caseRow.signatureLabel || caseRow.file.name;
    const anyRow = documentSearchRows.find((r) => r.file.parentCaseId === selectedDrillCaseId);
    return anyRow?.signatureLabel ?? selectedDrillCaseId;
  }, [selectedDrillCaseId, visibleCaseRows, documentSearchRows]);

  const currentFolderPaths = isDrillMode ? drillTopLevelFolderPaths : topLevelFolderPaths;
  const currentDocRows = isDrillMode ? visibleDrillRows : visibleDocumentSearchRows;

  const resolveCanvasCenter = useCallback((): { x: number; y: number } => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.width / 2 : 400;
    const centerY = rect ? rect.height / 2 : 300;
    const safeScale = view.scale || 1;
    return {
      x: (centerX - view.x) / safeScale,
      y: (centerY - view.y) / safeScale,
    };
  }, [viewportRef, view]);

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

  const handleRowDragStart = useCallback(
    (e: React.DragEvent<HTMLTableRowElement>, file: CaseResolverFile): void => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData(DRAG_FILE_ID_TYPE, file.id);
    },
    []
  );

  const docColumns = useMemo(
    () => getNodeFileDocumentColumns({ isAllCases, onAddDocument: addDocumentToCanvas }),
    [isAllCases, addDocumentToCanvas]
  );

  const caseColumns = useMemo(
    () =>
      getNodeFileCaseColumns({
        onDrillInto: (id) => {
          setSelectedDrillCaseId(id);
          setDocumentSearchQuery('');
          setSelectedSearchFolderPath(null);
        },
      }),
    [setSelectedDrillCaseId, setDocumentSearchQuery, setSelectedSearchFolderPath]
  );

  return (
    <div className='shrink-0 border-b border-border/60 bg-card/30'>
      <div className='flex items-center gap-2 px-3 py-2'>
        <div className='flex items-center rounded-md border border-border/60 bg-card/40 p-0.5'>
          <button
            type='button'
            onClick={() => {
              setDocumentSearchScope('case_scope');
              setSelectedDrillCaseId(null);
            }}
            className={cn(
              'rounded px-3 py-1 text-xs font-medium transition-colors',
              isCurrentCase ? 'bg-cyan-500/20 text-cyan-200' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            Current Case
          </button>
          <button
            type='button'
            onClick={() => setDocumentSearchScope('all_cases')}
            className={cn(
              'rounded px-3 py-1 text-xs font-medium transition-colors',
              isAllCases ? 'bg-cyan-500/20 text-cyan-200' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            All Cases
          </button>
        </div>

        <div className='flex-1' />

        <Button onClick={onExplanatoryClick} variant='success' size='sm'>
          <Sparkles className='mr-1 size-3.5' />
          Explanatory Node
        </Button>

        <SelectSimple
          size='sm'
          value={newNodeType}
          onValueChange={(val) =>
            setNewNodeType(val as 'prompt' | 'model' | 'template' | 'database' | 'viewer')
          }
          options={[
            { value: 'prompt', label: 'Prompt Node' },
            { value: 'model', label: 'Model Node' },
            { value: 'template', label: 'Template Node' },
            { value: 'database', label: 'Database Node' },
            { value: 'viewer', label: 'Result Viewer Node' },
          ]}
          className='w-[160px]'
          triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
        />

        <Button variant='outline' size='sm' onClick={onNodeInspectorClick}>
          Node Inspector
        </Button>
      </div>

      <div className='flex items-center gap-2 border-t border-border/40 px-3 py-1.5'>
        {isDrillMode && (
          <button
            type='button'
            className='flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-cyan-300 transition-colors hover:bg-card/60 hover:text-cyan-100'
            onClick={() => {
              setSelectedDrillCaseId(null);
              setDocumentSearchQuery('');
              setSelectedSearchFolderPath(null);
            }}
          >
            <ArrowLeft className='size-3' />
            {drillSignatureLabel}
          </button>
        )}

        <div className='min-w-0 flex-1'>
          {showDocTable ? (
            <SearchInput
              value={documentSearchQuery}
              onChange={(e) => setDocumentSearchQuery(e.target.value)}
              onClear={() => setDocumentSearchQuery('')}
              placeholder={
                isDrillMode ? `Search in ${drillSignatureLabel}...` : 'Search documents...'
              }
              className='h-7 border-border bg-card/60 text-xs text-white'
            />
          ) : (
            <SearchInput
              value={caseSearchQuery}
              onChange={(e) => setCaseSearchQuery(e.target.value)}
              onClear={() => setCaseSearchQuery('')}
              placeholder='Search by Signature ID...'
              className='h-7 border-border bg-card/60 text-xs text-white'
            />
          )}
        </div>

        {showDocTable && selectedSearchFolderPath && (
          <div className='flex shrink-0 items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200'>
            <span className='max-w-[120px] truncate'>{selectedSearchFolderPath}</span>
            <button
              type='button'
              className='ml-1 text-cyan-400 hover:text-cyan-100'
              onClick={() => setSelectedSearchFolderPath(null)}
              aria-label='Clear folder filter'
            >
              ×
            </button>
          </div>
        )}

        {showDocTable && (
          <span className='shrink-0 text-xs text-gray-500'>
            {currentDocRows.length} doc{currentDocRows.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {showDocTable && currentFolderPaths.length > 0 && (
        <div className='flex items-center gap-1.5 overflow-x-auto px-3 pb-1.5'>
          <button
            type='button'
            onClick={() => setSelectedSearchFolderPath(null)}
            className={cn(
              'shrink-0 rounded border px-2 py-0.5 text-xs transition-colors',
              selectedSearchFolderPath === null
                ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                : 'border-border/50 text-gray-400 hover:border-border hover:text-gray-200'
            )}
          >
            All
          </button>
          {currentFolderPaths.map((path: string) => (
            <button
              key={path}
              type='button'
              onClick={() =>
                setSelectedSearchFolderPath(selectedSearchFolderPath === path ? null : path)
              }
              className={cn(
                'shrink-0 rounded border px-2 py-0.5 text-xs transition-colors',
                selectedSearchFolderPath === path
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                  : 'border-border/50 text-gray-400 hover:border-border hover:text-gray-200'
              )}
            >
              {path.split('/').pop() ?? path}
            </button>
          ))}
        </div>
      )}

      <div className='max-h-56 overflow-auto border-t border-border/40'>
        {showDocTable && (
          <DataTable
            columns={docColumns}
            data={currentDocRows}
            className='border-none'
            getRowId={(row) => row.file.id}
            getRowClassName={() =>
              'cursor-grab border-border/20 transition-colors hover:bg-card/50 active:cursor-grabbing'
            }
            stickyHeader
            meta={{
              onDragStart: handleRowDragStart,
            }}
          />
        )}

        {isAllCases && !selectedDrillCaseId && (
          <DataTable
            columns={caseColumns}
            data={visibleCaseRows}
            className='border-none'
            getRowId={(row) => row.file.id}
            getRowClassName={() => 'border-border/20 transition-colors hover:bg-card/50'}
            stickyHeader
          />
        )}
      </div>

      {showDocTable && currentDocRows.length > 0 && (
        <div className='border-t border-border/30 px-3 py-1 text-xs text-gray-600'>
          Drag rows onto the canvas to place documents, or click + to add at center.
        </div>
      )}
    </div>
  );
}
