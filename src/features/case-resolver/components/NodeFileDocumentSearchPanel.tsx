'use client';

import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, Plus, Sparkles } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';

import { 
  Button, 
  SelectSimple, 
  SearchInput,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  StatusBadge,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { AiNode, CaseResolverFile } from '@/shared/contracts/case-resolver';

import {
  buildNode,
  createNodeId,
} from './case-resolver-canvas-utils';
import { useNodeFileWorkspaceContext } from './NodeFileWorkspaceContext';
import {
  normalizeSearchText,
  type NodeFileDocumentSearchRow,
} from './CaseResolverNodeFileUtils';

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
    addNode,
    setNodeFileMeta,
  } = useNodeFileWorkspaceContext();

  // Open by default so the scope toggle and search are immediately accessible
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // ── derived booleans ──────────────────────────────────────────────────────
  const isCurrentCase = documentSearchScope === 'case_scope';
  const isAllCases = documentSearchScope === 'all_cases';
  const isDrillMode = isAllCases && selectedDrillCaseId !== null;
  const showDocTable = isCurrentCase || isDrillMode;

  // ── drill mode: rows for the selected case ────────────────────────────────
  const drillRows = useMemo((): NodeFileDocumentSearchRow[] => {
    if (!selectedDrillCaseId) return [];
    return documentSearchRows.filter(
      (row: NodeFileDocumentSearchRow): boolean =>
        row.file.parentCaseId === selectedDrillCaseId
    );
  }, [documentSearchRows, selectedDrillCaseId]);

  const visibleDrillRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const q = normalizeSearchText(documentSearchQuery);
    if (!q) return drillRows;
    return drillRows.filter((row: NodeFileDocumentSearchRow): boolean =>
      row.searchable.includes(q)
    );
  }, [drillRows, documentSearchQuery]);

  // ── folder chips ──────────────────────────────────────────────────────────
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

  // ── drilled case label ────────────────────────────────────────────────────
  const drillSignatureLabel = useMemo((): string => {
    if (!selectedDrillCaseId) return '';
    const caseRow = visibleCaseRows.find((r) => r.file.id === selectedDrillCaseId);
    if (caseRow) return caseRow.signatureLabel || caseRow.file.name;
    const anyRow = documentSearchRows.find(
      (r) => r.file.parentCaseId === selectedDrillCaseId
    );
    return anyRow?.signatureLabel ?? selectedDrillCaseId;
  }, [selectedDrillCaseId, visibleCaseRows, documentSearchRows]);

  const currentFolderPaths = isDrillMode ? drillTopLevelFolderPaths : topLevelFolderPaths;
  const currentDocRows = isDrillMode ? visibleDrillRows : visibleDocumentSearchRows;

  // ── add document via + button (places at canvas center) ──────────────────
  const addDocumentToCanvas = useCallback(
    (file: CaseResolverFile): void => {
      const center = {
        x: (-view.x + 400) / view.scale,
        y: (-view.y + 300) / view.scale,
      };
      const nodeId = createNodeId();
      const node: AiNode = buildNode(
        {
          type: file.fileType === 'scanfile' ? 'scanfile' : 'document',
          title: file.name,
          description: '',
          outputs: [],
          inputs: [],
        },
        center,
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
    [view, addNode, setNodeFileMeta]
  );

  // ── drag start — carries the file ID to the canvas drop handler ───────────
  const handleRowDragStart = useCallback(
    (e: React.DragEvent<HTMLTableRowElement>, file: CaseResolverFile): void => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData(DRAG_FILE_ID_TYPE, file.id);
    },
    []
  );

  // ── header hint when collapsed ────────────────────────────────────────────
  const collapsedHint = isCurrentCase
    ? 'Current Case'
    : isDrillMode
      ? `↳ ${drillSignatureLabel}`
      : 'All Cases';

  return (
    // relative shrink-0: only the toolbar row is in flex flow; panel body is an absolute overlay
    <div className='relative shrink-0'>

      {/* ── Always-visible header ── */}
      <div className='flex items-center gap-2 border-b border-border/60 bg-card/30 px-3 py-2'>

        {/* Scope toggle */}
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

        {/* Breadcrumb hint when collapsed */}
        {!isPanelOpen && (
          <span className='text-xs text-gray-500'>{collapsedHint}</span>
        )}

        <div className='flex-1' />

        {/* Toolbar buttons */}
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

        {/* Expand / collapse toggle */}
        <button
          type='button'
          title={isPanelOpen ? 'Collapse document search' : 'Expand document search'}
          className='flex items-center justify-center rounded p-1.5 text-gray-400 transition-colors hover:bg-card/60 hover:text-gray-200'
          onClick={() => setIsPanelOpen((v) => !v)}
        >
          {isPanelOpen ? <ChevronUp className='size-3.5' /> : <ChevronDown className='size-3.5' />}
        </button>
      </div>

      {/* ── Collapsible body — absolute overlay so it never compresses the canvas ── */}
      {isPanelOpen && (
        <div className='absolute inset-x-0 top-full z-30 border-b border-border/60 bg-card/95 shadow-lg backdrop-blur-sm'>
          {/* Search / navigation row */}
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

            {/* Active folder chip */}
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

            {/* Result count */}
            {showDocTable && (
              <span className='shrink-0 text-xs text-gray-500'>
                {currentDocRows.length} doc{currentDocRows.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Folder chips */}
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

          {/* ── Results — hard max-h so canvas is never pushed off screen ── */}
          <div className='max-h-48 overflow-auto border-t border-border/40'>

            {/* Document table */}
            {showDocTable && (
              <Table className='text-xs'>
                <TableHeader className='sticky top-0 bg-card/90 backdrop-blur-sm z-10'>
                  <TableRow className='text-left text-gray-500 hover:bg-transparent border-border/40'>
                    <TableHead className='h-8 py-1 pl-3 pr-2 font-medium'>Name</TableHead>
                    <TableHead className='h-8 px-2 py-1 font-medium'>Folder</TableHead>
                    {isAllCases && <TableHead className='h-8 px-2 py-1 font-medium'>Signature</TableHead>}
                    <TableHead className='h-8 px-2 py-1 font-medium'>From</TableHead>
                    <TableHead className='h-8 px-2 py-1 font-medium'>To</TableHead>
                    <TableHead className='h-8 py-1 pl-2 pr-3 font-medium'></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentDocRows.length === 0 ? (
                    <TableRow className='hover:bg-transparent border-border/20'>
                      <TableCell
                        colSpan={isAllCases ? 6 : 5}
                        className='py-3 text-center text-gray-500 h-20'
                      >
                        No documents found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentDocRows.map((row: NodeFileDocumentSearchRow) => (
                      <TableRow
                        key={row.file.id}
                        draggable
                        onDragStart={(e) => handleRowDragStart(e, row.file)}
                        className='cursor-grab border-border/20 transition-colors hover:bg-card/50 active:cursor-grabbing'
                      >
                        <TableCell className='max-w-[180px] py-1 pl-3 pr-2 h-9'>
                          <span className='block truncate text-gray-200' title={row.file.name}>
                            {row.file.name}
                          </span>
                        </TableCell>
                        <TableCell className='max-w-[110px] px-2 py-1 h-9'>
                          <span
                            className='block truncate text-gray-400'
                            title={row.folderPath || '—'}
                          >
                            {row.folderPath || '—'}
                          </span>
                        </TableCell>
                        {isAllCases && (
                          <TableCell className='max-w-[120px] px-2 py-1 h-9'>
                            <span
                              className='block truncate text-cyan-400/80'
                              title={row.signatureLabel || '—'}
                            >
                              {row.signatureLabel || '—'}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className='max-w-[90px] px-2 py-1 h-9'>
                          <span
                            className='block truncate text-gray-400'
                            title={row.addresserLabel || '—'}
                          >
                            {row.addresserLabel || '—'}
                          </span>
                        </TableCell>
                        <TableCell className='max-w-[90px] px-2 py-1 h-9'>
                          <span
                            className='block truncate text-gray-400'
                            title={row.addresseeLabel || '—'}
                          >
                            {row.addresseeLabel || '—'}
                          </span>
                        </TableCell>
                        <TableCell className='py-1 pl-2 pr-3 h-9'>
                          <button
                            type='button'
                            title='Add to canvas center'
                            className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300'
                            onClick={(e) => {
                              e.stopPropagation();
                              addDocumentToCanvas(row.file);
                            }}
                          >
                            <Plus className='size-3.5' />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {/* Cases table (all cases — stage 1) */}
            {isAllCases && !selectedDrillCaseId && (
              <Table className='text-xs'>
                <TableHeader className='sticky top-0 bg-card/90 backdrop-blur-sm z-10'>
                  <TableRow className='text-left text-gray-500 hover:bg-transparent border-border/40'>
                    <TableHead className='h-8 py-1 pl-3 pr-2 font-medium'>Signature ID</TableHead>
                    <TableHead className='h-8 px-2 py-1 font-medium'>Status</TableHead>
                    <TableHead className='h-8 px-2 py-1 font-medium'>Docs</TableHead>
                    <TableHead className='h-8 py-1 pl-2 pr-3 font-medium'></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCaseRows.length === 0 ? (
                    <TableRow className='hover:bg-transparent border-border/20'>
                      <TableCell colSpan={4} className='py-3 text-center text-gray-500 h-20'>
                        No cases found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleCaseRows.map((row) => (
                      <TableRow
                        key={row.file.id}
                        className='border-border/20 transition-colors hover:bg-card/50'
                      >
                        <TableCell className='max-w-[220px] py-1 pl-3 pr-2 h-9'>
                          <span
                            className='block truncate text-gray-200'
                            title={row.signatureLabel || row.file.name}
                          >
                            {row.signatureLabel || row.file.name}
                          </span>
                        </TableCell>
                        <TableCell className='px-2 py-1 h-9'>
                          <StatusBadge 
                            status={row.file.caseStatus ?? 'pending'} 
                            variant={row.file.caseStatus === 'completed' ? 'success' : 'warning'}
                            size='sm'
                          />
                        </TableCell>
                        <TableCell className='px-2 py-1 text-gray-400 h-9'>{row.docCount}</TableCell>
                        <TableCell className='py-1 pl-2 pr-3 h-9'>
                          <button
                            type='button'
                            title='Browse documents in this case'
                            className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300'
                            onClick={() => {
                              setSelectedDrillCaseId(row.file.id);
                              setDocumentSearchQuery('');
                              setSelectedSearchFolderPath(null);
                            }}
                          >
                            <ChevronRight className='size-3.5' />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Drag hint */}
          {showDocTable && currentDocRows.length > 0 && (
            <div className='border-t border-border/30 px-3 py-1 text-xs text-gray-600'>
              Drag rows onto the canvas to place documents, or click + to add at center.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
