'use client';

import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  Lock,
  ScanText,
} from 'lucide-react';
import React, { useCallback, useState } from 'react';

import type { CaseResolverFile, CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import {
  CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF,
  formatCaseTimestamp,
} from '../case-list-utils';
import { useCaseListSearch, type CaseListSearchEntry, type CaseListSearchMatchedFile } from './useCaseListSearch';

export type CaseListSearchPanelProps = {
  workspace: CaseResolverWorkspace;
  identifierLabelById: Map<string, string>;
  query: string;
  onOpenCase: (caseId: string) => void;
  onOpenFile: (file: CaseResolverFile) => void;
};

function resolveFileIcon(fileType: CaseResolverFile['fileType']): React.JSX.Element {
  if (fileType === 'scanfile') {
    return <ScanText className='size-3.5 shrink-0 text-cyan-400/70' />;
  }
  return <FileText className='size-3.5 shrink-0 text-sky-400/70' />;
}

function FileSubRow({
  matched,
  onOpenFile,
}: {
  matched: CaseListSearchMatchedFile;
  onOpenFile: (file: CaseResolverFile) => void;
}): React.JSX.Element {
  const { file, folderPath } = matched;
  const dateLabel = formatCaseTimestamp(file.updatedAt ?? file.createdAt);

  return (
    <div className='flex items-center gap-2 rounded px-2 py-1 pl-8 text-[12px] text-gray-400 hover:bg-muted/30'>
      {resolveFileIcon(file.fileType)}
      <button
        type='button'
        className='min-w-0 flex-1 truncate text-left text-gray-300 hover:underline focus:outline-none'
        onClick={(event): void => {
          event.preventDefault();
          event.stopPropagation();
          onOpenFile(file);
        }}
        title={`Open case for: ${file.name}`}
      >
        {file.name}
      </button>
      {file.isLocked === true ? (
        <Lock className='size-3 shrink-0 text-amber-300' />
      ) : null}
      {folderPath ? (
        <span className='max-w-[160px] shrink-0 truncate text-[10px] text-gray-500'>
          {folderPath}
        </span>
      ) : null}
      <span className='shrink-0 text-[10px] text-gray-500'>{dateLabel}</span>
    </div>
  );
}

function CaseAccordionRow({
  entry,
  isExpanded,
  onToggle,
  onOpenCase,
  onOpenFile,
}: {
  entry: CaseListSearchEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenCase: (caseId: string) => void;
  onOpenFile: (file: CaseResolverFile) => void;
}): React.JSX.Element {
  const { caseFile, matchedFiles } = entry;
  const caseStatus = caseFile.caseStatus ?? 'pending';
  const hasFiles = matchedFiles.length > 0;

  return (
    <div>
      <div className='group flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-muted/50'>
        <button
          type='button'
          className='inline-flex size-4 shrink-0 items-center justify-center rounded hover:bg-muted/60'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            onToggle();
          }}
          aria-label={isExpanded ? 'Collapse case' : 'Expand case'}
        >
          {isExpanded ? (
            <ChevronDown className='size-3.5' />
          ) : (
            <ChevronRight className='size-3.5' />
          )}
        </button>

        {isExpanded ? (
          <FolderOpen className='size-4 shrink-0 text-amber-300/70' />
        ) : (
          <Folder className='size-4 shrink-0 text-amber-300/70' />
        )}

        <button
          type='button'
          className='min-w-0 flex-1 truncate text-left font-medium text-gray-200 hover:underline focus:outline-none'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            onOpenCase(caseFile.id);
          }}
          title={`Open case: ${caseFile.name}`}
        >
          {caseFile.name}
        </button>

        <span
          className={`shrink-0 inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${
            caseStatus === 'completed'
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
              : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
          }`}
        >
          {caseStatus}
        </span>

        {hasFiles ? (
          <span className='shrink-0 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-300'>
            {matchedFiles.length} {matchedFiles.length === 1 ? 'file' : 'files'}
          </span>
        ) : null}

        <button
          type='button'
          className='shrink-0 opacity-0 transition-opacity group-hover:opacity-100 inline-flex size-5 items-center justify-center rounded hover:bg-muted/60 text-gray-400 hover:text-gray-200'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            onOpenCase(caseFile.id);
          }}
          title='Open case'
          aria-label='Open case'
        >
          <ExternalLink className='size-3.5' />
        </button>
      </div>

      {isExpanded && hasFiles ? (
        <div className='mt-0.5 space-y-0.5'>
          {matchedFiles.map((matched) => (
            <FileSubRow
              key={matched.file.id}
              matched={matched}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CaseListSearchPanel({
  workspace,
  identifierLabelById,
  query,
  onOpenCase,
  onOpenFile,
}: CaseListSearchPanelProps): React.JSX.Element {
  const { entries } = useCaseListSearch(
    workspace.files,
    identifierLabelById,
    query,
  );

  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleCase = useCallback((caseId: string): void => {
    setExpandedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback((): void => {
    setExpandedCaseIds(new Set(entries.map((e) => e.caseFile.id)));
  }, [entries]);

  const collapseAll = useCallback((): void => {
    setExpandedCaseIds(new Set());
  }, []);

  const totalFiles = entries.reduce((sum, e) => sum + e.matchedFiles.length, 0);
  const allExpanded = entries.length > 0 && entries.every((e) => expandedCaseIds.has(e.caseFile.id));

  return (
    <div className='relative flex min-h-0 flex-1 flex-col'>
      {/* Summary row */}
      <div className='flex items-center justify-between border-b border-border/40 px-3 py-2 text-[12px] text-gray-400'>
        <span>
          <span className='font-medium text-gray-200'>{entries.length}</span>{' '}
          {entries.length === 1 ? 'case' : 'cases'}
          {totalFiles > 0 ? (
            <>
              {' · '}
              <span className='font-medium text-gray-200'>{totalFiles}</span>{' '}
              {totalFiles === 1 ? 'file' : 'files'} matching
            </>
          ) : null}
        </span>
        {entries.length > 0 ? (
          <button
            type='button'
            className='text-[11px] text-sky-400 hover:underline'
            onClick={allExpanded ? collapseAll : expandAll}
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        ) : null}
      </div>

      {/* Accordion list */}
      <div className='min-h-0 flex-1 overflow-auto p-2'>
        {entries.length === 0 ? (
          <div className='flex items-center justify-center py-8 text-[13px] text-gray-500'>
            No cases or files match your search.
          </div>
        ) : (
          <div className='space-y-0.5'>
            {entries.map((entry) => (
              <CaseAccordionRow
                key={entry.caseFile.id}
                entry={entry}
                isExpanded={expandedCaseIds.has(entry.caseFile.id)}
                onToggle={() => toggleCase(entry.caseFile.id)}
                onOpenCase={onOpenCase}
                onOpenFile={onOpenFile}
              />
            ))}
          </div>
        )}
      </div>

      {/* 'm' instance logo */}
      <button
        type='button'
        className='absolute bottom-2 right-2 z-20 inline-flex size-6 items-center justify-center rounded-full border border-border bg-muted/80 text-[11px] font-semibold lowercase text-gray-300 shadow-sm transition hover:bg-muted hover:text-white'
        title='Open master tree instance settings'
        aria-label='Open master tree instance settings'
        onMouseDown={(event): void => {
          event.stopPropagation();
        }}
        onClick={(event): void => {
          event.preventDefault();
          event.stopPropagation();
          if (typeof window === 'undefined') return;
          window.location.assign(CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF);
        }}
      >
        m
      </button>
    </div>
  );
}
