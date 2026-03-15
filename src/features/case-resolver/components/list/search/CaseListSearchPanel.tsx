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
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { searchMasterTreeNodes } from '@/features/foldertree';
import type { CaseResolverFile, CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { MasterTreeSettingsButton, Button, StatusBadge, Badge } from '@/shared/ui';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  normalizeSearchText,
  resolveSearchableDocumentContent,
  resolveIdentifierSearchLabel,
} from '../../CaseResolverNodeFileUtils';
import {
  CASE_RESOLVER_CASES_MASTER_INSTANCE,
  CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF,
  formatCaseTimestamp,
} from '../case-list-utils';
import { useOptionalCaseListPanelControlsContext } from '../CaseListPanelControlsContext';
import {
  CaseListSearchActionsProvider,
  useCaseListSearchActionsContext,
} from './CaseListSearchActionsContext';

type CaseListSearchMatchedFile = {
  file: CaseResolverFile;
  folderPath: string;
  signatureLabel: string;
};

type CaseListSearchEntry = {
  caseFile: CaseResolverFile;
  signatureLabel: string;
  caseMatched: boolean;
  matchedFiles: CaseListSearchMatchedFile[];
};

type CaseNodeSearchMeta = {
  nodeType: 'case';
  caseId: string;
  signatureLabel: string;
  searchable: string;
};

type FileNodeSearchMeta = {
  nodeType: 'file';
  fileId: string;
  parentCaseId: string | null;
  folderPath: string;
  signatureLabel: string;
  searchable: string;
};

const CASE_NODE_PREFIX = 'case::';
const FILE_NODE_PREFIX = 'file::';

const toCaseNodeId = (caseId: string): string => `${CASE_NODE_PREFIX}${caseId}`;
const toFileNodeId = (fileId: string): string => `${FILE_NODE_PREFIX}${fileId}`;

const isCaseNodeSearchMeta = (value: unknown): value is CaseNodeSearchMeta => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const meta = value as Partial<CaseNodeSearchMeta>;
  return meta.nodeType === 'case' && typeof meta.caseId === 'string';
};

const isFileNodeSearchMeta = (value: unknown): value is FileNodeSearchMeta => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const meta = value as Partial<FileNodeSearchMeta>;
  return meta.nodeType === 'file' && typeof meta.fileId === 'string';
};

const resolveCaseOrderValue = (
  caseFile: CaseResolverFile,
  caseOrderById: Map<string, number> | null | undefined
): number => {
  const explicitOrder = caseOrderById?.get(caseFile.id);
  if (typeof explicitOrder === 'number') return explicitOrder;
  const caseTreeOrder = caseFile.caseTreeOrder;
  if (typeof caseTreeOrder === 'number' && Number.isFinite(caseTreeOrder)) {
    return Math.max(0, Math.floor(caseTreeOrder));
  }
  return Number.MAX_SAFE_INTEGER;
};

const buildCaseListSearchEntries = ({
  files,
  identifierLabelById,
  query,
  caseOrderById,
}: {
  files: CaseResolverFile[];
  identifierLabelById: Map<string, string>;
  query: string;
  caseOrderById?: Map<string, number> | undefined;
}): CaseListSearchEntry[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) return [];

  const caseFiles: CaseResolverFile[] = [];
  const otherFiles: CaseResolverFile[] = [];
  files.forEach((file: CaseResolverFile): void => {
    if (file.fileType === 'case') {
      caseFiles.push(file);
      return;
    }
    otherFiles.push(file);
  });

  const caseById = new Map<string, CaseResolverFile>(
    caseFiles.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  const fileById = new Map<string, CaseResolverFile>(
    otherFiles.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );

  const searchNodes: MasterTreeNode[] = [];
  caseFiles.forEach((caseFile: CaseResolverFile): void => {
    const signatureLabel = resolveIdentifierSearchLabel(
      caseFile.caseIdentifierId,
      identifierLabelById
    );
    const searchable = normalizeSearchText(`${caseFile.name} ${signatureLabel}`);
    const caseNodeId = toCaseNodeId(caseFile.id);
    searchNodes.push({
      id: caseNodeId,
      type: 'folder',
      kind: 'case_search',
      parentId: null,
      name: caseFile.name,
      path: signatureLabel ? `/${signatureLabel}` : `/${caseFile.name}`,
      sortOrder: 0,
      metadata: {
        nodeType: 'case',
        caseId: caseFile.id,
        signatureLabel,
        searchable,
      },
    });
  });

  otherFiles.forEach((file: CaseResolverFile): void => {
    const signatureLabel = resolveIdentifierSearchLabel(file.caseIdentifierId, identifierLabelById);
    const searchable = normalizeSearchText(
      `${file.name} ${file.folder} ${resolveSearchableDocumentContent(file)} ${signatureLabel}`
    );
    const parentCaseId = file.parentCaseId?.trim() || null;
    searchNodes.push({
      id: toFileNodeId(file.id),
      type: 'file',
      kind: 'case_file_search',
      parentId: parentCaseId ? toCaseNodeId(parentCaseId) : null,
      name: file.name,
      path: file.folder ? `${file.folder}/${file.name}` : file.name,
      sortOrder: 0,
      metadata: {
        nodeType: 'file',
        fileId: file.id,
        parentCaseId,
        folderPath: file.folder,
        signatureLabel,
        searchable,
      },
    });
  });

  const nodesById = new Map(
    searchNodes.map((node: MasterTreeNode): [string, MasterTreeNode] => [node.id, node])
  );

  const matches = searchMasterTreeNodes(searchNodes, normalizedQuery, {
    fields: ['name', 'path', 'metadata'],
  });

  const matchedCaseIds = new Set<string>();
  const matchedFileIds = new Set<string>();
  const matchedFilesByCaseId = new Map<string, CaseListSearchMatchedFile[]>();

  matches.forEach((match): void => {
    const node = nodesById.get(match.nodeId);
    if (!node) return;

    if (isCaseNodeSearchMeta(node.metadata)) {
      matchedCaseIds.add(node.metadata.caseId);
      return;
    }

    if (!isFileNodeSearchMeta(node.metadata)) return;
    if (matchedFileIds.has(node.metadata.fileId)) return;
    matchedFileIds.add(node.metadata.fileId);

    const parentCaseId = node.metadata.parentCaseId?.trim() || '';
    if (!parentCaseId) return;
    if (!caseById.has(parentCaseId)) return;

    const file = fileById.get(node.metadata.fileId);
    if (!file) return;

    const currentMatches = matchedFilesByCaseId.get(parentCaseId) ?? [];
    currentMatches.push({
      file,
      folderPath: node.metadata.folderPath,
      signatureLabel: node.metadata.signatureLabel,
    });
    matchedFilesByCaseId.set(parentCaseId, currentMatches);
  });

  const entries: CaseListSearchEntry[] = [];
  caseFiles.forEach((caseFile: CaseResolverFile): void => {
    const caseMatched = matchedCaseIds.has(caseFile.id);
    const matchedFiles = matchedFilesByCaseId.get(caseFile.id) ?? [];
    if (!caseMatched && matchedFiles.length === 0) return;

    matchedFiles.sort((left, right) => {
      const nameDelta = left.file.name.localeCompare(right.file.name);
      if (nameDelta !== 0) return nameDelta;
      return left.file.id.localeCompare(right.file.id);
    });

    entries.push({
      caseFile,
      signatureLabel: resolveIdentifierSearchLabel(caseFile.caseIdentifierId, identifierLabelById),
      caseMatched,
      matchedFiles,
    });
  });

  entries.sort((left, right) => {
    if (left.caseMatched !== right.caseMatched) {
      return left.caseMatched ? -1 : 1;
    }

    const orderDelta =
      resolveCaseOrderValue(left.caseFile, caseOrderById) -
      resolveCaseOrderValue(right.caseFile, caseOrderById);
    if (orderDelta !== 0) return orderDelta;

    const nameDelta = left.caseFile.name.localeCompare(right.caseFile.name);
    if (nameDelta !== 0) return nameDelta;

    return left.caseFile.id.localeCompare(right.caseFile.id);
  });

  return entries;
};

export type CaseListSearchPanelProps = {
  workspace?: CaseResolverWorkspace | undefined;
  identifierLabelById?: Map<string, string> | undefined;
  query?: string | undefined;
  caseOrderById?: Map<string, number> | undefined;
  onPrefetchCase?: ((caseId: string) => void) | undefined;
  onPrefetchFile?: ((file: CaseResolverFile) => void) | undefined;
  onOpenCase?: ((caseId: string) => void) | undefined;
  onOpenFile?: ((file: CaseResolverFile) => void) | undefined;
};

function resolveFileIcon(fileType: CaseResolverFile['fileType']): React.JSX.Element {
  if (fileType === 'scanfile') {
    return <ScanText className='size-3.5 shrink-0 text-cyan-400/70' />;
  }
  return <FileText className='size-3.5 shrink-0 text-sky-400/70' />;
}

function FileSubRow(props: { matched: CaseListSearchMatchedFile }): React.JSX.Element {
  const { matched } = props;

  const { onPrefetchFile, onOpenFile } = useCaseListSearchActionsContext();
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

function CaseAccordionRow(props: {
  entry: CaseListSearchEntry;
  isExpanded: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const { entry, isExpanded, onToggle } = props;

  const { onPrefetchCase, onOpenCase } = useCaseListSearchActionsContext();
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
          title={isExpanded ? 'Collapse case' : 'Expand case'}>
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

        <StatusBadge status={caseStatus} size='sm' className='h-5 font-bold uppercase' />

        {hasFiles ? (
          <Badge
            variant='outline'
            className='bg-sky-500/5 text-sky-300 border-sky-500/20 text-[10px] h-5 px-1.5'
          >
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
            <FileSubRow key={matched.file.id} matched={matched} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CaseListSearchPanel(props: CaseListSearchPanelProps): React.JSX.Element {
  const runtime = useOptionalCaseListPanelControlsContext();
  const {
    workspace: propWorkspace,
    identifierLabelById: propIdentifierLabelById,
    query: propQuery,
    caseOrderById: propCaseOrderById,
    onPrefetchCase: propOnPrefetchCase,
    onPrefetchFile: propOnPrefetchFile,
    onOpenCase: propOnOpenCase,
    onOpenFile: propOnOpenFile,
  } = props;
  const workspace = propWorkspace ?? runtime?.workspace;
  const identifierLabelById = propIdentifierLabelById ?? runtime?.identifierLabelById;
  const query = propQuery ?? runtime?.searchQuery ?? '';
  const caseOrderById = propCaseOrderById ?? runtime?.caseOrderById;
  const onPrefetchCase = propOnPrefetchCase ?? runtime?.onPrefetchCase;
  const onPrefetchFile = propOnPrefetchFile ?? runtime?.onPrefetchFile;
  const onOpenCase = propOnOpenCase ?? runtime?.onOpenCase;
  const onOpenFile = propOnOpenFile ?? runtime?.onOpenFile;

  if (
    !workspace ||
    !identifierLabelById ||
    !onPrefetchCase ||
    !onPrefetchFile ||
    !onOpenCase ||
    !onOpenFile
  ) {
    throw new Error(
      'CaseListSearchPanel must be used within CaseListPanelControlsProvider or receive explicit props'
    );
  }

  const entries = useMemo(
    () =>
      buildCaseListSearchEntries({
        files: workspace.files,
        identifierLabelById,
        query,
        caseOrderById,
      }),
    [workspace.files, identifierLabelById, query, caseOrderById]
  );

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
    setExpandedCaseIds(new Set(entriesRef.current.map((entry) => entry.caseFile.id)));
  }, []);

  const collapseAll = useCallback((): void => {
    setExpandedCaseIds(new Set());
  }, []);

  const totalFiles = entries.reduce((sum, entry) => sum + entry.matchedFiles.length, 0);
  const allExpanded =
    entries.length > 0 && entries.every((entry) => expandedCaseIds.has(entry.caseFile.id));
  const searchActionsContextValue = useMemo(
    () => ({
      onPrefetchCase,
      onPrefetchFile,
      onOpenCase,
      onOpenFile,
    }),
    [onOpenCase, onOpenFile, onPrefetchCase, onPrefetchFile]
  );

  return (
    <CaseListSearchActionsProvider value={searchActionsContextValue}>
      <div className='relative flex min-h-0 flex-1 flex-col'>
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
                />
              ))}
            </div>
          )}
        </div>

        <MasterTreeSettingsButton
          instance={CASE_RESOLVER_CASES_MASTER_INSTANCE}
          href={CASE_RESOLVER_CASES_MASTER_SETTINGS_HREF}
        />
      </div>
    </CaseListSearchActionsProvider>
  );
}
