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
  SlidersHorizontal,
  X,
} from 'lucide-react';
import React, { useMemo } from 'react';

import {
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
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
  type DocumentRelationFileTypeFilter,
  type DocumentRelationSortMode,
} from '../hooks/useDocumentRelationSearch';
import {
  DocumentRelationSearchProvider,
  useDocumentRelationSearchContext,
  type ResultHeight,
  type CaseRow,
} from '../context/DocumentRelationSearchContext';
import { getCaseResolverDocTooltip } from '../utils/docs';
import {
  type NodeFileDocumentSearchScope,
} from '../../components/CaseResolverNodeFileUtils';

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

const TAG_NONE = '__tag_none__';
const CAT_NONE = '__cat_none__';

// ─── ScopeBar ─────────────────────────────────────────────────────────────────

function ScopeBar({
  showFileTypeFilter,
  showSortControl,
}: {
  showFileTypeFilter: boolean;
  showSortControl: boolean;
}): React.JSX.Element {
  const {
    documentSearchScope,
    setDocumentSearchScope,
    setSelectedDrillCaseId,
    fileTypeFilter,
    setFileTypeFilter,
    sortMode,
    setSortMode,
    resultHeight,
    setResultHeight,
    filtersActiveCount,
    showFiltersBar,
    setShowFiltersBar,
  } = useDocumentRelationSearchContext();

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

      {/* Advanced filters toggle */}
      <Tooltip content={getCaseResolverDocTooltip('advancedFilters')} side='bottom'>
        <button
          type='button'
          onClick={() => setShowFiltersBar((p) => !p)}
          className={cn(
            'relative flex items-center gap-1 rounded border px-2 py-0.5 text-xs transition-colors',
            showFiltersBar
              ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
              : 'border-border/50 text-gray-400 hover:border-border hover:text-gray-200'
          )}
        >
          <SlidersHorizontal className='size-3' />
          Filters
          {filtersActiveCount > 0 && (
            <span className='absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-black'>
              {filtersActiveCount}
            </span>
          )}
        </button>
      </Tooltip>

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

// ─── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar(): React.JSX.Element {
  const {
    caseTagOptions,
    caseCategoryOptions,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    tagIdFilter,
    setTagIdFilter,
    categoryIdFilter,
    setCategoryIdFilter,
    filtersActiveCount,
    resetFilters,
  } = useDocumentRelationSearchContext();

  const tagOpts = useMemo(
    () => [{ value: TAG_NONE, label: 'Any tag' }, ...caseTagOptions],
    [caseTagOptions]
  );
  const catOpts = useMemo(
    () => [{ value: CAT_NONE, label: 'Any category' }, ...caseCategoryOptions],
    [caseCategoryOptions]
  );

  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-border/40 bg-card/10 px-3 py-1.5'>
      <div className='flex items-center gap-1'>
        <span className='text-[10px] text-gray-500'>From:</span>
        <Input
          type='date'
          size='xs'
          className='w-[130px]'
          value={dateFrom ?? ''}
          onChange={(e) => setDateFrom(e.target.value || null)}
        />
      </div>
      <div className='flex items-center gap-1'>
        <span className='text-[10px] text-gray-500'>To:</span>
        <Input
          type='date'
          size='xs'
          className='w-[130px]'
          value={dateTo ?? ''}
          onChange={(e) => setDateTo(e.target.value || null)}
        />
      </div>
      <SelectSimple
        size='xs'
        variant='subtle'
        placeholder='Any tag'
        value={tagIdFilter ?? undefined}
        onValueChange={(v) => setTagIdFilter(v === TAG_NONE ? null : v)}
        options={tagOpts}
        className='w-[130px]'
        ariaLabel='Filter by tag'
      />
      <SelectSimple
        size='xs'
        variant='subtle'
        placeholder='Any category'
        value={categoryIdFilter ?? undefined}
        onValueChange={(v) => setCategoryIdFilter(v === CAT_NONE ? null : v)}
        options={catOpts}
        className='w-[130px]'
        ariaLabel='Filter by category'
      />
      <div className='flex-1' />
      {filtersActiveCount > 0 && (
        <button
          type='button'
          onClick={resetFilters}
          className='flex items-center gap-1 rounded border border-border/40 px-2 py-0.5 text-xs text-gray-400 transition-colors hover:border-border hover:text-gray-200'
        >
          <X className='size-3' />
          Reset
        </button>
      )}
    </div>
  );
}

// ─── SearchBar ────────────────────────────────────────────────────────────────

function SearchBar(): React.JSX.Element {
  const {
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
    currentDocRows,
  } = useDocumentRelationSearchContext();

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
          {currentDocRows.length} {currentDocRows.length !== 1 ? 'docs' : 'doc'}
        </span>
      )}
    </div>
  );
}

// ─── FolderChips ──────────────────────────────────────────────────────────────

function FolderChips(): React.JSX.Element | null {
  const {
    currentFolderPaths,
    selectedSearchFolderPath,
    setSelectedSearchFolderPath,
  } = useDocumentRelationSearchContext();

  if (currentFolderPaths.length === 0) return null;
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
      {currentFolderPaths.map((path) => (
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

// ─── BulkActionBar ────────────────────────────────────────────────────────────

function BulkActionBar(): React.JSX.Element | null {
  const {
    selectedFileIds,
    isLocked,
    handleLinkAll,
    clearSelection,
  } = useDocumentRelationSearchContext();

  const selectedCount = selectedFileIds.size;
  if (selectedCount === 0) return null;
  return (
    <div className='flex items-center gap-3 border-b border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs'>
      <span className='text-cyan-200'>{selectedCount} selected</span>
      <button
        type='button'
        disabled={isLocked}
        onClick={handleLinkAll}
        className='flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:pointer-events-none disabled:opacity-40'
      >
        <ListPlus className='size-3' />
        Link All Selected
      </button>
      <button
        type='button'
        onClick={clearSelection}
        className='text-gray-400 transition-colors hover:text-gray-200'
      >
        Clear
      </button>
    </div>
  );
}

// ─── DocumentTableBody ────────────────────────────────────────────────────────

function DocumentTableBody(): React.JSX.Element {
  const {
    currentDocRows: rows,
    isAllCases,
    isLocked,
    onLinkFile,
    selectedFileIds,
    toggleFileSelection,
    selectAllVisible,
    clearSelection,
    allVisibleSelected,
    someVisibleSelected,
    setPreviewFileId,
  } = useDocumentRelationSearchContext();

  const colSpan = isAllCases ? 10 : 9;
  return (
    <Table className='text-xs'>
      <TableHeader className='sticky top-0 z-10 bg-card/90 backdrop-blur-sm'>
        <TableRow className='border-border/40 text-left text-gray-500 hover:bg-transparent'>
          <TableHead className='h-8 w-6 py-1 pl-3 pr-1'>
            <Checkbox
              checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
              onCheckedChange={(checked) => {
                if (checked) selectAllVisible();
                else clearSelection();
              }}
              className='h-3.5 w-3.5'
              aria-label='Select all visible'
            />
          </TableHead>
          <TableHead className='h-8 w-8 py-1 pl-1 pr-1 font-medium'></TableHead>
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
              {/* Checkbox */}
              <TableCell className='h-9 w-6 py-1 pl-3 pr-1'>
                <Checkbox
                  checked={selectedFileIds.has(row.file.id)}
                  onCheckedChange={() => toggleFileSelection(row.file.id)}
                  className='h-3.5 w-3.5'
                  aria-label={`Select ${row.file.name}`}
                />
              </TableCell>

              {/* Type icon */}
              <TableCell className='h-9 w-8 py-1 pl-1 pr-1'>
                <FileTypeIcon fileType={row.file.fileType} />
              </TableCell>

              {/* Name with tooltip — click opens preview */}
              <TableCell className='h-9 max-w-[160px] py-1 pr-2'>
                <Tooltip content={row.file.name} side='top'>
                  <span
                    className='block cursor-pointer truncate text-gray-200 hover:text-cyan-300 hover:underline'
                    onClick={() => setPreviewFileId(row.file.id)}
                  >
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
                  <Tooltip content={getCaseResolverDocTooltip('lockedIndicator')} side='left'>
                    <Lock className='size-3 text-amber-400/70' />
                  </Tooltip>
                )}
              </TableCell>

              {/* Link button */}
              <TableCell className='h-9 py-1 pl-2 pr-3'>
                <Tooltip content={getCaseResolverDocTooltip('linkDocument')} side='left'>
                  <button
                    type='button'
                    disabled={isLocked}
                    className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-40'
                    onClick={(e) => {
                      e.stopPropagation();
                      onLinkFile(row.file.id);
                    }}
                  >
                    <Plus className='size-3.5' />
                  </button>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

// ─── CaseTableBody ────────────────────────────────────────────────────────────

function CaseTableBody(): React.JSX.Element {
  const {
    visibleCaseRows: rows,
    setSelectedDrillCaseId,
    setDocumentSearchQuery,
    setSelectedSearchFolderPath,
  } = useDocumentRelationSearchContext();

  const onDrillInto = (caseId: string) => {
    setSelectedDrillCaseId(caseId);
    setDocumentSearchQuery('');
    setSelectedSearchFolderPath(null);
  };

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
          rows.map((row: CaseRow) => (
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
                <Tooltip content={getCaseResolverDocTooltip('browseCaseDocs')} side='left'>
                  <button
                    type='button'
                    className='flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-cyan-500/15 hover:text-cyan-300'
                    onClick={() => onDrillInto(row.file.id)}
                  >
                    <ChevronRight className='size-3.5' />
                  </button>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

// ─── DocumentPreviewDialog ────────────────────────────────────────────────────

function DocumentPreviewDialog(): React.JSX.Element {
  const {
    previewFile: file,
    previewRow,
    isLocked,
    onLinkFile,
    setPreviewFileId,
  } = useDocumentRelationSearchContext();

  const onClose = () => setPreviewFileId(null);
  const onLink = (fileId: string) => {
    onLinkFile(fileId);
    onClose();
  };

  const snippet = file
    ? (file.documentContentPlainText || file.documentContent || '').slice(0, 600)
    : '';

  return (
    <Dialog open={file !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className='max-w-xl'>
        {file && (
          <>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-sm font-semibold'>
                <FileTypeIcon fileType={file.fileType} className='size-4' />
                <span className='min-w-0 truncate'>{file.name}</span>
                {file.isLocked && (
                  <span className='ml-auto shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300'>
                    LOCKED
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className='sr-only'>
                Document preview for {file.name}
              </DialogDescription>
            </DialogHeader>

            {/* Metadata grid */}
            <div className='grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs'>
              <div>
                <span className='text-gray-500'>Folder: </span>
                <span className='text-gray-300'>{file.folder || 'Root'}</span>
              </div>
              <div>
                <span className='text-gray-500'>Date: </span>
                <span className='text-gray-300'>{formatShortDate(file.documentDate?.isoDate)}</span>
              </div>
              {previewRow?.addresserLabel && (
                <div>
                  <span className='text-gray-500'>From: </span>
                  <span className='text-gray-300'>{previewRow.addresserLabel}</span>
                </div>
              )}
              {previewRow?.addresseeLabel && (
                <div>
                  <span className='text-gray-500'>To: </span>
                  <span className='text-gray-300'>{previewRow.addresseeLabel}</span>
                </div>
              )}
              {previewRow?.signatureLabel && (
                <div>
                  <span className='text-gray-500'>Signature: </span>
                  <span className='text-cyan-400/80'>{previewRow.signatureLabel}</span>
                </div>
              )}
              {file.categoryId && (
                <div>
                  <span className='text-gray-500'>Category: </span>
                  <span className='text-gray-300'>{file.categoryId}</span>
                </div>
              )}
            </div>

            {/* Content preview */}
            <div className='mt-3 max-h-[200px] overflow-auto rounded border border-border/40 bg-card/20 p-3 font-mono text-[11px] leading-relaxed text-gray-400 whitespace-pre-wrap'>
              {snippet || '(No content preview)'}
            </div>

            <DialogFooter>
              <button
                type='button'
                onClick={onClose}
                className='rounded border border-border/50 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-200'
              >
                Cancel
              </button>
              <button
                type='button'
                disabled={isLocked}
                onClick={() => { onLink(file.id); }}
                className='flex items-center gap-1.5 rounded bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cyan-500 disabled:pointer-events-none disabled:opacity-40'
              >
                Link this document
                <ChevronRight className='size-3' />
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── DocumentRelationSearchInner ─────────────────────────────────────────────

function DocumentRelationSearchInner({
  showSortControl = true,
  showFileTypeFilter = true,
}: {
  showSortControl?: boolean;
  showFileTypeFilter?: boolean;
}): React.JSX.Element {
  const {
    showFiltersBar,
    showDocTable,
    resultHeight,
  } = useDocumentRelationSearchContext();

  return (
    <>
      <div className='flex flex-col overflow-hidden rounded-md border border-border/60 bg-card/20'>
        <ScopeBar
          showFileTypeFilter={showFileTypeFilter}
          showSortControl={showSortControl}
        />

        {showFiltersBar && <FilterBar />}

        <SearchBar />

        {showDocTable && <FolderChips />}

        <BulkActionBar />

        <div className={cn('overflow-auto', RESULT_HEIGHT_MAP[resultHeight])}>
          {showDocTable ? (
            <DocumentTableBody />
          ) : (
            <CaseTableBody />
          )}
        </div>
      </div>

      <DocumentPreviewDialog />
    </>
  );
}

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
  return (
    <DocumentRelationSearchProvider
      draftFileId={draftFileId}
      isLocked={isLocked}
      onLinkFile={onLinkFile}
      defaultScope={defaultScope}
      defaultSort={defaultSort}
    >
      <DocumentRelationSearchInner
        showSortControl={showSortControl}
        showFileTypeFilter={showFileTypeFilter}
      />
    </DocumentRelationSearchProvider>
  );
}
