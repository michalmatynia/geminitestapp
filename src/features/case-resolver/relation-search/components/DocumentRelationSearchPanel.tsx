'use client';

import {
  AlignJustify,
  ArrowLeft,
  ChevronRight,
  File,
  FileText,
  List,
  ListPlus,
  Lock,
  Plus,
  ScanText,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import {
  SearchInput,
  SelectSimple,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  normalizeSearchText,
  type NodeFileDocumentSearchRow,
  type NodeFileDocumentSearchScope,
} from '../../components/CaseResolverNodeFileUtils';
import { useCaseResolverViewContext } from '../../components/CaseResolverViewContext';
import {
  useDocumentRelationSearch,
  type DocumentRelationFileTypeFilter,
  type DocumentRelationSortMode,
} from '../hooks/useDocumentRelationSearch';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FileTypeIcon({
  fileType,
  className,
}: {
  fileType: string;
  className?: string | undefined;
}): React.JSX.Element {
  if (fileType === 'document') {
    return <FileText className={cn('size-3.5 text-blue-400/70', className)} />;
  }
  if (fileType === 'scanfile') {
    return <ScanText className={cn('size-3.5 text-amber-400/70', className)} />;
  }
  return <File className={cn('size-3.5 text-gray-500', className)} />;
}

function formatShortDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

type ResultHeight = 'compact' | 'normal' | 'expanded';

const RESULT_HEIGHT_MAP: Record<ResultHeight, string> = {
  compact: 'max-h-40',
  normal: 'max-h-64',
  expanded: 'max-h-[28rem]',
};

const SORT_OPTIONS: { value: DocumentRelationSortMode; label: string }[] = [
  { value: 'name_asc', label: 'Name A→Z' },
  { value: 'date_desc', label: 'Date (newest)' },
  { value: 'date_asc', label: 'Date (oldest)' },
  { value: 'folder_asc', label: 'Folder A→Z' },
];

const FILE_TYPE_CHIPS: { key: DocumentRelationFileTypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'document', label: 'Documents' },
  { key: 'scanfile', label: 'Scans' },
];

// ─── ScopeBar ─────────────────────────────────────────────────────────────────

type ScopeBarProps = {
  documentSearchScope: NodeFileDocumentSearchScope;
  setDocumentSearchScope: (s: NodeFileDocumentSearchScope) => void;
  setSelectedDrillCaseId: (id: string | null) => void;
  fileTypeFilter: DocumentRelationFileTypeFilter;
  setFileTypeFilter: (f: DocumentRelationFileTypeFilter) => void;
  sortMode: DocumentRelationSortMode;
  setSortMode: (m: DocumentRelationSortMode) => void;
  resultHeight: ResultHeight;
  setResultHeight: (h: ResultHeight) => void;
  showFileTypeFilter: boolean;
  showSortControl: boolean;
};

function ScopeBar({
  documentSearchScope,
  setDocumentSearchScope,
  setSelectedDrillCaseId,
  fileTypeFilter,
  setFileTypeFilter,
  sortMode,
  setSortMode,
  resultHeight,
  setResultHeight,
  showFileTypeFilter,
  showSortControl,
}: ScopeBarProps): React.JSX.Element {
  const isCurrentCase = documentSearchScope === 'case_scope';
  const isAllCases = documentSearchScope === 'all_cases';

  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-border/60 bg-card/30 px-3 py-2'>
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

      {/* File type filter chips */}
      {showFileTypeFilter && (
        <div className='flex items-center gap-1'>
          {FILE_TYPE_CHIPS.map(({ key, label }) => (
            <button
              key={key}
              type='button'
              onClick={() => setFileTypeFilter(key)}
              className={cn(
                'rounded border px-2 py-0.5 text-xs transition-colors',
                fileTypeFilter === key
                  ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                  : 'border-border/50 text-gray-400 hover:border-border hover:text-gray-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className='flex-1' />

      {/* Sort dropdown */}
      {showSortControl && (
        <SelectSimple
          size='xs'
          variant='subtle'
          value={sortMode}
          onValueChange={(v) => setSortMode(v as DocumentRelationSortMode)}
          options={SORT_OPTIONS}
          className='w-[130px]'
          ariaLabel='Sort results'
        />
      )}

      {/* Height toggle */}
      <div className='flex items-center gap-0.5 rounded border border-border/40 bg-card/40 p-0.5'>
        {(
          [
            { key: 'compact', Icon: AlignJustify, label: 'Compact view' },
            { key: 'normal', Icon: List, label: 'Normal view' },
            { key: 'expanded', Icon: ListPlus, label: 'Expanded view' },
          ] as { key: ResultHeight; Icon: React.ComponentType<{ className?: string }>; label: string }[]
        ).map(({ key, Icon, label }) => (
          <Tooltip key={key} content={label} side='bottom'>
            <button
              type='button'
              onClick={() => setResultHeight(key)}
              className={cn(
                'flex items-center justify-center rounded p-1 transition-colors',
                resultHeight === key
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-gray-500 hover:bg-card/60 hover:text-gray-300'
              )}
            >
              <Icon className='size-3' />
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

// ─── SearchBar ────────────────────────────────────────────────────────────────

type SearchBarProps = {
  isDrillMode: boolean;
  showDocTable: boolean;
  drillSignatureLabel: string;
  documentSearchQuery: string;
  setDocumentSearchQuery: (q: string) => void;
  caseSearchQuery: string;
  setCaseSearchQuery: (q: string) => void;
  selectedSearchFolderPath: string | null;
  setSelectedSearchFolderPath: (p: string | null) => void;
  setSelectedDrillCaseId: (id: string | null) => void;
  docCount: number;
};

function SearchBar({
  isDrillMode,
  showDocTable,
  drillSignatureLabel,
  documentSearchQuery,
  setDocumentSearchQuery,
  caseSearchQuery,
  setCaseSearchQuery,
  selectedSearchFolderPath,
  setSelectedSearchFolderPath,
  setSelectedDrillCaseId,
  docCount,
}: SearchBarProps): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 border-b border-border/40 bg-card/10 px-3 py-1.5'>
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
          <span className='max-w-[100px] truncate'>{selectedSearchFolderPath}</span>
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
          {docCount} {docCount !== 1 ? 'docs' : 'doc'}
        </span>
      )}
    </div>
  );
}

// ─── FolderChips ──────────────────────────────────────────────────────────────

type FolderChipsProps = {
  folderPaths: string[];
  selectedSearchFolderPath: string | null;
  setSelectedSearchFolderPath: (p: string | null) => void;
};

function FolderChips({
  folderPaths,
  selectedSearchFolderPath,
  setSelectedSearchFolderPath,
}: FolderChipsProps): React.JSX.Element | null {
  if (folderPaths.length === 0) return null;
  return (
    <div className='flex items-center gap-1.5 overflow-x-auto border-b border-border/40 bg-card/10 px-3 py-1.5'>
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
      {folderPaths.map((path) => (
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
  );
}

// ─── DocumentTableBody ────────────────────────────────────────────────────────

type DocumentTableBodyProps = {
  rows: NodeFileDocumentSearchRow[];
  isAllCases: boolean;
  isLocked: boolean;
  onLinkFile: (fileId: string) => void;
};

function DocumentTableBody({
  rows,
  isAllCases,
  isLocked,
  onLinkFile,
}: DocumentTableBodyProps): React.JSX.Element {
  const colSpan = isAllCases ? 9 : 8;
  return (
    <Table className='text-xs'>
      <TableHeader className='sticky top-0 z-10 bg-card/90 backdrop-blur-sm'>
        <TableRow className='border-border/40 text-left text-gray-500 hover:bg-transparent'>
          <TableHead className='h-8 w-8 py-1 pl-3 pr-1 font-medium'></TableHead>
          <TableHead className='h-8 py-1 pr-2 font-medium'>Name</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>Folder</TableHead>
          {isAllCases && (
            <TableHead className='h-8 px-2 py-1 font-medium'>Signature</TableHead>
          )}
          <TableHead className='h-8 px-2 py-1 font-medium'>Date</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>From</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>To</TableHead>
          <TableHead className='h-8 w-6 px-1 py-1 font-medium'></TableHead>
          <TableHead className='h-8 py-1 pl-2 pr-3 font-medium'></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow className='border-border/20 hover:bg-transparent'>
            <TableCell colSpan={colSpan} className='h-20 py-3 text-center text-gray-500'>
              No documents found.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.file.id}
              className='border-border/20 transition-colors hover:bg-card/50'
            >
              {/* Type icon */}
              <TableCell className='h-9 w-8 py-1 pl-3 pr-1'>
                <FileTypeIcon fileType={row.file.fileType} />
              </TableCell>

              {/* Name with tooltip */}
              <TableCell className='h-9 max-w-[160px] py-1 pr-2'>
                <Tooltip content={row.file.name} side='top'>
                  <span className='block cursor-default truncate text-gray-200'>
                    {row.file.name}
                  </span>
                </Tooltip>
              </TableCell>

              {/* Folder */}
              <TableCell className='h-9 max-w-[100px] px-2 py-1'>
                <span
                  className='block truncate text-gray-400'
                  title={row.folderPath || '—'}
                >
                  {row.folderPath || '—'}
                </span>
              </TableCell>

              {/* Signature (All Cases mode only) */}
              {isAllCases && (
                <TableCell className='h-9 max-w-[100px] px-2 py-1'>
                  <span
                    className='block truncate text-cyan-400/80'
                    title={row.signatureLabel || '—'}
                  >
                    {row.signatureLabel || '—'}
                  </span>
                </TableCell>
              )}

              {/* Date */}
              <TableCell className='h-9 w-[68px] px-2 py-1'>
                <span className='text-gray-400'>
                  {formatShortDate(row.file.documentDate?.isoDate)}
                </span>
              </TableCell>

              {/* From */}
              <TableCell className='h-9 max-w-[80px] px-2 py-1'>
                <span
                  className='block truncate text-gray-400'
                  title={row.addresserLabel || '—'}
                >
                  {row.addresserLabel || '—'}
                </span>
              </TableCell>

              {/* To */}
              <TableCell className='h-9 max-w-[80px] px-2 py-1'>
                <span
                  className='block truncate text-gray-400'
                  title={row.addresseeLabel || '—'}
                >
                  {row.addresseeLabel || '—'}
                </span>
              </TableCell>

              {/* Lock indicator */}
              <TableCell className='h-9 w-6 px-1 py-1'>
                {row.file.isLocked && (
                  <Tooltip content='Locked' side='left'>
                    <Lock className='size-3 text-amber-400/70' />
                  </Tooltip>
                )}
              </TableCell>

              {/* Link button */}
              <TableCell className='h-9 py-1 pl-2 pr-3'>
                <button
                  type='button'
                  title='Link this document'
                  disabled={isLocked}
                  className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-40'
                  onClick={(e) => {
                    e.stopPropagation();
                    onLinkFile(row.file.id);
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
  );
}

// ─── CaseTableBody ────────────────────────────────────────────────────────────

type CaseRow = {
  file: Pick<CaseResolverFile, 'id' | 'name' | 'caseStatus'>;
  signatureLabel: string;
  docCount: number;
};

type CaseTableBodyProps = {
  rows: CaseRow[];
  onDrillInto: (caseId: string) => void;
};

function CaseTableBody({ rows, onDrillInto }: CaseTableBodyProps): React.JSX.Element {
  return (
    <Table className='text-xs'>
      <TableHeader className='sticky top-0 z-10 bg-card/90 backdrop-blur-sm'>
        <TableRow className='border-border/40 text-left text-gray-500 hover:bg-transparent'>
          <TableHead className='h-8 py-1 pl-3 pr-2 font-medium'>Signature ID</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>Case</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>Status</TableHead>
          <TableHead className='h-8 px-2 py-1 font-medium'>Docs</TableHead>
          <TableHead className='h-8 py-1 pl-2 pr-3 font-medium'></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow className='border-border/20 hover:bg-transparent'>
            <TableCell colSpan={5} className='h-20 py-3 text-center text-gray-500'>
              No cases found.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.file.id}
              className='border-border/20 transition-colors hover:bg-card/50'
            >
              <TableCell className='h-9 max-w-[160px] py-1 pl-3 pr-2'>
                <span
                  className='block truncate font-medium text-gray-200'
                  title={row.signatureLabel || row.file.name}
                >
                  {row.signatureLabel || '—'}
                </span>
              </TableCell>
              <TableCell className='h-9 max-w-[140px] px-2 py-1'>
                <span
                  className='block truncate text-gray-400'
                  title={row.file.name}
                >
                  {row.file.name}
                </span>
              </TableCell>
              <TableCell className='h-9 px-2 py-1'>
                <StatusBadge
                  status={row.file.caseStatus ?? 'pending'}
                  variant={row.file.caseStatus === 'completed' ? 'success' : 'warning'}
                  size='sm'
                />
              </TableCell>
              <TableCell className='h-9 px-2 py-1'>
                <span className='rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-300'>
                  {row.docCount}
                </span>
              </TableCell>
              <TableCell className='h-9 py-1 pl-2 pr-3'>
                <button
                  type='button'
                  title='Browse documents in this case'
                  className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300'
                  onClick={() => onDrillInto(row.file.id)}
                >
                  <ChevronRight className='size-3.5' />
                </button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

// ─── DocumentRelationSearchPanel ─────────────────────────────────────────────

export type DocumentRelationSearchPanelProps = {
  draftFileId: string;
  isLocked: boolean;
  onLinkFile: (fileId: string) => void;
  /** Initial scope on first mount (default: 'case_scope') */
  defaultScope?: NodeFileDocumentSearchScope | undefined;
  /** Initial sort mode on first mount (default: 'name_asc') */
  defaultSort?: DocumentRelationSortMode | undefined;
  /** Show sort dropdown (default: true) */
  showSortControl?: boolean | undefined;
  /** Show file-type filter chips (default: true) */
  showFileTypeFilter?: boolean | undefined;
};

export function DocumentRelationSearchPanel({
  draftFileId,
  isLocked,
  onLinkFile,
  defaultScope = 'case_scope',
  defaultSort = 'name_asc',
  showSortControl = true,
  showFileTypeFilter = true,
}: DocumentRelationSearchPanelProps): React.JSX.Element {
  const { state } = useCaseResolverViewContext();
  const { workspace, activeCaseId, caseResolverIdentifiers } = state;

  const originalFile = workspace.files.find((f) => f.id === draftFileId);
  const excludeFileIds = useMemo(
    () => [draftFileId, ...(originalFile?.relatedFileIds ?? [])],
    [draftFileId, originalFile?.relatedFileIds]
  );

  const {
    documentSearchScope,
    setDocumentSearchScope,
    documentSearchQuery,
    setDocumentSearchQuery,
    selectedSearchFolderPath,
    setSelectedSearchFolderPath,
    caseSearchQuery,
    setCaseSearchQuery,
    selectedDrillCaseId,
    setSelectedDrillCaseId,
    fileTypeFilter,
    setFileTypeFilter,
    sortMode,
    setSortMode,
    documentSearchRows,
    visibleDocumentSearchRows,
    folderTree,
    visibleCaseRows,
  } = useDocumentRelationSearch({
    workspace,
    activeCaseId,
    caseResolverIdentifiers,
    excludeFileIds,
    initialScope: defaultScope,
    initialSort: defaultSort,
  });

  const [resultHeight, setResultHeight] = useState<ResultHeight>('normal');

  // ── derived booleans ────────────────────────────────────────────────────────
  const isCurrentCase = documentSearchScope === 'case_scope';
  const isAllCases = documentSearchScope === 'all_cases';
  const isDrillMode = isAllCases && selectedDrillCaseId !== null;
  const showDocTable = isCurrentCase || isDrillMode;

  // ── drill rows ──────────────────────────────────────────────────────────────
  const drillRows = useMemo((): NodeFileDocumentSearchRow[] => {
    if (!selectedDrillCaseId) return [];
    return documentSearchRows.filter(
      (row) => row.file.parentCaseId === selectedDrillCaseId
    );
  }, [documentSearchRows, selectedDrillCaseId]);

  const visibleDrillRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const q = normalizeSearchText(documentSearchQuery);
    const rows = q
      ? drillRows.filter((row) => row.searchable.includes(q))
      : [...drillRows];
    if (sortMode === 'name_asc') rows.sort((a, b) => a.file.name.localeCompare(b.file.name));
    else if (sortMode === 'folder_asc')
      rows.sort((a, b) => a.folderPath.localeCompare(b.folderPath));
    else if (sortMode === 'date_desc')
      rows.sort((a, b) =>
        (b.file.documentDate?.isoDate ?? '').localeCompare(a.file.documentDate?.isoDate ?? '')
      );
    else if (sortMode === 'date_asc')
      rows.sort((a, b) =>
        (a.file.documentDate?.isoDate ?? '').localeCompare(b.file.documentDate?.isoDate ?? '')
      );
    return rows;
  }, [drillRows, documentSearchQuery, sortMode]);

  // ── folder chips ────────────────────────────────────────────────────────────
  const topLevelFolderPaths = useMemo(
    () => folderTree.childPathsByParent.get(null) ?? [],
    [folderTree]
  );

  const drillTopLevelFolderPaths = useMemo((): string[] => {
    if (!selectedDrillCaseId) return [];
    const seen = new Set<string>();
    drillRows.forEach((row) => {
      const top = row.folderSegments[0];
      if (top) seen.add(top);
    });
    return Array.from(seen).sort();
  }, [drillRows, selectedDrillCaseId]);

  // ── drill case label ────────────────────────────────────────────────────────
  const drillSignatureLabel = useMemo((): string => {
    if (!selectedDrillCaseId) return '';
    const caseRow = visibleCaseRows.find((r) => r.file.id === selectedDrillCaseId);
    if (caseRow) return caseRow.signatureLabel || caseRow.file.name;
    const anyRow = documentSearchRows.find((r) => r.file.parentCaseId === selectedDrillCaseId);
    return anyRow?.signatureLabel ?? selectedDrillCaseId;
  }, [selectedDrillCaseId, visibleCaseRows, documentSearchRows]);

  const currentFolderPaths = isDrillMode ? drillTopLevelFolderPaths : topLevelFolderPaths;
  const currentDocRows = isDrillMode ? visibleDrillRows : visibleDocumentSearchRows;

  return (
    <div className='flex flex-col overflow-hidden rounded-md border border-border/60 bg-card/20'>
      <ScopeBar
        documentSearchScope={documentSearchScope}
        setDocumentSearchScope={setDocumentSearchScope}
        setSelectedDrillCaseId={setSelectedDrillCaseId}
        fileTypeFilter={fileTypeFilter}
        setFileTypeFilter={setFileTypeFilter}
        sortMode={sortMode}
        setSortMode={setSortMode}
        resultHeight={resultHeight}
        setResultHeight={setResultHeight}
        showFileTypeFilter={showFileTypeFilter}
        showSortControl={showSortControl}
      />

      <SearchBar
        isDrillMode={isDrillMode}
        showDocTable={showDocTable}
        drillSignatureLabel={drillSignatureLabel}
        documentSearchQuery={documentSearchQuery}
        setDocumentSearchQuery={setDocumentSearchQuery}
        caseSearchQuery={caseSearchQuery}
        setCaseSearchQuery={setCaseSearchQuery}
        selectedSearchFolderPath={selectedSearchFolderPath}
        setSelectedSearchFolderPath={setSelectedSearchFolderPath}
        setSelectedDrillCaseId={setSelectedDrillCaseId}
        docCount={currentDocRows.length}
      />

      {showDocTable && (
        <FolderChips
          folderPaths={currentFolderPaths}
          selectedSearchFolderPath={selectedSearchFolderPath}
          setSelectedSearchFolderPath={setSelectedSearchFolderPath}
        />
      )}

      <div className={cn('overflow-auto', RESULT_HEIGHT_MAP[resultHeight])}>
        {showDocTable ? (
          <DocumentTableBody
            rows={currentDocRows}
            isAllCases={isAllCases}
            isLocked={isLocked}
            onLinkFile={onLinkFile}
          />
        ) : (
          <CaseTableBody
            rows={visibleCaseRows}
            onDrillInto={(caseId) => {
              setSelectedDrillCaseId(caseId);
              setDocumentSearchQuery('');
              setSelectedSearchFolderPath(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
