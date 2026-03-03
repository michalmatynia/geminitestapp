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
import React, { useCallback, useRef, useState } from 'react';

import type { CaseResolverFile, CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { MasterTreeSettingsButton, Button, StatusBadge, Badge } from '@/shared/ui';

import { CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF, formatCaseTimestamp } from '../case-list-utils';
import {
  useCaseListSearch,
  type CaseListSearchEntry,
  type CaseListSearchMatchedFile,
} from './useCaseListSearch';

export type CaseListSearchPanelProps = {
  workspace: CaseResolverWorkspace;
  identifierLabelById: Map<string, string>;
  query: string;
  onPrefetchCase: (caseId: string) => void;
  onPrefetchFile: (file: CaseResolverFile) => void;
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
  onPrefetchFile,
  onOpenFile,
}: {
  matched: CaseListSearchMatchedFile;
  onPrefetchFile: (file: CaseResolverFile) => void;
  onOpenFile: (file: CaseResolverFile) => void;
}): React.JSX.Element {
  const { file, folderPath } = matched;
  const dateLabel = formatCaseTimestamp(file.updatedAt ?? file.createdAt);

  return (
    <div className='flex items-center gap-2 rounded px-2 py-1 pl-8 text-[12px] text-gray-400 hover:bg-muted/30'>
      {resolveFileIcon(file.fileType)}
      <Button
        variant='link'
        className='h-auto min-w-0 flex-1 justify-start p-0 truncate text-left text-gray-300 hover:text-white hover:no-underline focus:outline-none'
        onMouseEnter={(): void => {
          onPrefetchFile(file);
        }}
        onFocus={(): void => {
          onPrefetchFile(file);
        }}
        onClick={(event): void => {
          event.preventDefault();
          event.stopPropagation();
          onOpenFile(file);
        }}
        title={`Open case for: ${file.name}`}
      >
        <span className='truncate'>{file.name}</span>
      </Button>
      {file.isLocked === true ? <Lock className='size-3 shrink-0 text-amber-300' /> : null}
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
  onPrefetchCase,
  onPrefetchFile,
  onOpenCase,
  onOpenFile,
}: {
  entry: CaseListSearchEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onPrefetchCase: (caseId: string) => void;
  onPrefetchFile: (file: CaseResolverFile) => void;
  onOpenCase: (caseId: string) => void;
  onOpenFile: (file: CaseResolverFile) => void;
}): React.JSX.Element {
  const { caseFile, matchedFiles } = entry;
  const caseStatus = caseFile.caseStatus ?? 'pending';
  const hasFiles = matchedFiles.length > 0;

  return (
    <div>
      <div className='group flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-muted/50'>
        <Button
          variant='ghost'
          size='sm'
          className='size-4 shrink-0 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-300'
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
        </Button>

        {isExpanded ? (
          <FolderOpen className='size-4 shrink-0 text-amber-300/70' />
        ) : (
          <Folder className='size-4 shrink-0 text-amber-300/70' />
        )}

        <Button
          variant='link'
          className='h-auto min-w-0 flex-1 justify-start p-0 truncate text-left font-medium text-gray-200 hover:text-white hover:no-underline focus:outline-none'
          onMouseEnter={(): void => {
            onPrefetchCase(caseFile.id);
          }}
          onFocus={(): void => {
            onPrefetchCase(caseFile.id);
          }}
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            onOpenCase(caseFile.id);
          }}
          title={`Open case: ${caseFile.name}`}
        >
          <span className='truncate'>{caseFile.name}</span>
        </Button>

        <StatusBadge
          status={caseStatus}
          size='sm'
          className='h-5 font-bold uppercase'
        />

        {hasFiles ? (
          <Badge variant='outline' className='bg-sky-500/5 text-sky-300 border-sky-500/20 text-[10px] h-5 px-1.5'>
            {matchedFiles.length} {matchedFiles.length === 1 ? 'file' : 'files'}
          </Badge>
        ) : null}

        <Button
          variant='ghost'
          size='sm'
          className='shrink-0 opacity-0 transition-opacity group-hover:opacity-100 size-5 p-0 text-gray-400 hover:text-gray-200 hover:bg-white/10'
          onMouseEnter={(): void => {
            onPrefetchCase(caseFile.id);
          }}
          onFocus={(): void => {
            onPrefetchCase(caseFile.id);
          }}
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            onOpenCase(caseFile.id);
          }}
          title='Open case'
          aria-label='Open case'
        >
          <ExternalLink className='size-3.5' />
        </Button>
      </div>

      {isExpanded && hasFiles ? (
        <div className='mt-0.5 space-y-0.5'>
          {matchedFiles.map((matched: CaseListSearchMatchedFile) => (
            <FileSubRow
              key={matched.file.id}
              matched={matched}
              onPrefetchFile={onPrefetchFile}
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
  onPrefetchCase,
  onPrefetchFile,
  onOpenCase,
  onOpenFile,
}: CaseListSearchPanelProps): React.JSX.Element {
  const { entries } = useCaseListSearch(workspace.files, identifierLabelById, query);

  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<string>>(() => new Set());

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
    setExpandedCaseIds(new Set(entriesRef.current.map((e) => e.caseFile.id)));
  }, []);

  const collapseAll = useCallback((): void => {
    setExpandedCaseIds(new Set());
  }, []);

  const totalFiles = entries.reduce((sum, e) => sum + e.matchedFiles.length, 0);
  const allExpanded =
    entries.length > 0 && entries.every((e) => expandedCaseIds.has(e.caseFile.id));

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
          <Button
            variant='link'
            className='h-auto p-0 text-[11px] text-sky-400 hover:text-sky-300 hover:no-underline'
            onClick={allExpanded ? collapseAll : expandAll}
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </Button>
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
                onPrefetchCase={onPrefetchCase}
                onPrefetchFile={onPrefetchFile}
                onOpenCase={onOpenCase}
                onOpenFile={onOpenFile}
              />
            ))}
          </div>
        )}
      </div>

      {/* 'm' instance logo */}
      <MasterTreeSettingsButton
        instance='case_resolver_cases'
        href={CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF}
      />
    </div>
  );
}
