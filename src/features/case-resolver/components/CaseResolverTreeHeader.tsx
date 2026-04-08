'use client';

import { FolderPlus, FilePlus, FileImage, FileCode2, ImagePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useMemo, startTransition } from 'react';

import { FolderTreeSearchBar } from '@/shared/lib/foldertree/public';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Button, Switch } from '@/shared/ui/primitives.public';

import {
  useCaseResolverFolderTreeDataContext,
  useCaseResolverFolderTreeUiActionsContext,
  useCaseResolverFolderTreeUiStateContext,
} from '../context/CaseResolverFolderTreeContext';
import {
  useCaseResolverPageActions,
  useCaseResolverPageState,
} from '../context/CaseResolverPageContext';

type CaseResolverTreeHeaderProps = {
  searchQuery?: string | undefined;
  onSearchChange?: ((q: string) => void) | undefined;
  searchEnabled?: boolean | undefined;
};

export type CaseResolverTreeHeaderRuntimeValue = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchEnabled: boolean;
};

const {
  Context: CaseResolverTreeHeaderRuntimeContext,
  useOptionalContext: useOptionalCaseResolverTreeHeaderRuntime,
} = createStrictContext<CaseResolverTreeHeaderRuntimeValue>({
  hookName: 'useCaseResolverTreeHeaderRuntime',
  providerName: 'CaseResolverTreeHeaderProvider',
  displayName: 'CaseResolverTreeHeaderRuntimeContext',
});

type CaseResolverTreeSearchRuntimeValue = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
};

type CaseResolverIdentifierOption = {
  id: string;
  name: string;
};

type CaseResolverCreateActionConfig = {
  key: string;
  label: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
};

const {
  Context: CaseResolverTreeSearchRuntimeContext,
  useStrictContext: useCaseResolverTreeSearchRuntime,
} = createStrictContext<CaseResolverTreeSearchRuntimeValue>({
  hookName: 'useCaseResolverTreeSearchRuntime',
  providerName: 'CaseResolverTreeSearchRuntimeProvider',
  displayName: 'CaseResolverTreeSearchRuntimeContext',
});

function CaseResolverTreeSearchBar(): React.JSX.Element {
  const { searchQuery, onSearchChange } = useCaseResolverTreeSearchRuntime();
  return (
    <FolderTreeSearchBar
      value={searchQuery}
      onChange={onSearchChange}
      placeholder='Search files & folders…'
    />
  );
}

const resolveCaseResolverCreateContextTooltip = ({
  activeCaseId,
  canCreateInActiveCase,
  requestedCaseStatus,
}: {
  activeCaseId: string | null | undefined;
  canCreateInActiveCase: boolean;
  requestedCaseStatus: string | null | undefined;
}): string | null => {
  if (canCreateInActiveCase) {
    return null;
  }
  if (requestedCaseStatus === 'loading') {
    return 'Loading case context...';
  }
  if (requestedCaseStatus === 'missing') {
    return 'Case context unavailable.';
  }
  if (!activeCaseId) {
    return 'Select a case first.';
  }
  return 'Case context is not ready.';
};

const resolveRequestedCaseIssueMessage = (requestedCaseIssue: string | null | undefined): string => {
  if (requestedCaseIssue === 'workspace_unavailable') {
    return 'Could not load workspace context. Retry or reset context.';
  }
  if (requestedCaseIssue === 'requested_file_missing') {
    return 'Requested case context was not found. Retry or reset context.';
  }
  return 'Case context is unavailable. Retry or reset context.';
};

const resolveActiveCaseIdentifierLabel = ({
  activeCaseFile,
  caseResolverIdentifiers,
}: {
  activeCaseFile: { caseIdentifierId?: string | null } | null;
  caseResolverIdentifiers: CaseResolverIdentifierOption[];
}): string | null => {
  const identifierId = activeCaseFile?.caseIdentifierId ?? null;
  if (!identifierId) {
    return null;
  }
  const match = caseResolverIdentifiers.find((identifier) => identifier.id === identifierId);
  return match?.name ?? identifierId;
};

function CaseResolverNestedScopeToggle({
  activeCaseChildCount,
  checked,
  hasCaseContext,
  onCheckedChange,
}: {
  activeCaseChildCount: number;
  checked: boolean;
  hasCaseContext: boolean;
  onCheckedChange: (checked: boolean) => void;
}): React.JSX.Element | null {
  if (!hasCaseContext) {
    return null;
  }

  return (
    <div className='flex items-center justify-between rounded border border-border/60 bg-card/35 px-2 py-1.5'>
      <div className='min-w-0'>
        <div className='text-[11px] text-gray-300'>Show nested folders and files</div>
        <div className='text-[10px] text-muted-foreground/80'>
          {activeCaseChildCount > 0
            ? `${activeCaseChildCount} child case${activeCaseChildCount === 1 ? '' : 's'}`
            : 'Current case only'}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(checked): void => {
          onCheckedChange(checked === true);
        }}
        aria-label='Show nested folders and files'
        className='h-5 w-9'
      />
    </div>
  );
}

function CaseResolverContextNotice({
  createContextTooltip,
  onResetCaseContext,
  onRetryCaseContext,
  requestedCaseIssueMessage,
  requestedCaseStatus,
}: {
  createContextTooltip: string | null;
  onResetCaseContext: () => void;
  onRetryCaseContext: () => void;
  requestedCaseIssueMessage: string;
  requestedCaseStatus: string | null | undefined;
}): React.JSX.Element | null {
  if (requestedCaseStatus === 'missing') {
    return (
      <div className='rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5'>
        <div className='text-[11px] text-amber-200'>{requestedCaseIssueMessage}</div>
        <div className='mt-1.5 flex items-center gap-1'>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-6 border-amber-400/50 px-2 text-[11px] text-amber-100 hover:bg-amber-500/15'
            onClick={onRetryCaseContext}
          >
            Retry
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-6 border-amber-400/40 px-2 text-[11px] text-amber-100 hover:bg-amber-500/10'
            onClick={onResetCaseContext}
          >
            Reset context
          </Button>
        </div>
      </div>
    );
  }

  if (!createContextTooltip) {
    return null;
  }

  return (
    <div className='rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200'>
      {createContextTooltip}
    </div>
  );
}

function CaseResolverCreateActionBar({
  actions,
  createContextTooltip,
  disableCreateActions,
}: {
  actions: CaseResolverCreateActionConfig[];
  createContextTooltip: string | null;
  disableCreateActions: boolean;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-1'>
      {actions.map(({ key, label, title, Icon, onClick }: CaseResolverCreateActionConfig) => (
        <Button
          key={key}
          type='button'
          onClick={onClick}
          size='sm'
          variant='outline'
          className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
          title={createContextTooltip ?? title}
          disabled={disableCreateActions}
          aria-label={createContextTooltip ?? label}
        >
          <Icon className='size-4' />
        </Button>
      ))}
    </div>
  );
}

export function CaseResolverTreeHeader({
  searchQuery,
  onSearchChange,
  searchEnabled,
}: CaseResolverTreeHeaderProps): React.JSX.Element {
  const runtime = useOptionalCaseResolverTreeHeaderRuntime();
  const resolvedSearchQuery = searchQuery ?? runtime?.searchQuery;
  const resolvedOnSearchChange = onSearchChange ?? runtime?.onSearchChange;
  const resolvedSearchEnabled = searchEnabled ?? runtime?.searchEnabled ?? true;

  if (typeof resolvedSearchQuery !== 'string' || !resolvedOnSearchChange) {
    throw new Error(
      'CaseResolverTreeHeader must be used within CaseResolverTreeHeaderProvider or receive explicit props'
    );
  }

  const router = useRouter();
  const {
    activeCaseId,
    requestedCaseStatus,
    requestedCaseIssue,
    canCreateInActiveCase,
    caseResolverIdentifiers,
  } = useCaseResolverPageState();
  const {
    onRetryCaseContext,
    onResetCaseContext,
    onCreateFolder,
    onCreateFile,
    onCreateScanFile,
    onCreateImageAsset,
    onCreateNodeFile,
  } = useCaseResolverPageActions();

  const {
    activeCaseFile,
    activeCaseChildCount,
    selectedFolderForFolderCreate,
    selectedFolderForCreate,
  } = useCaseResolverFolderTreeDataContext();

  const { showChildCaseFolders } = useCaseResolverFolderTreeUiStateContext();
  const { setShowChildCaseFolders } = useCaseResolverFolderTreeUiActionsContext();

  const hasCaseContext = Boolean(activeCaseId || activeCaseFile);
  const createContextTooltip = React.useMemo(
    () =>
      resolveCaseResolverCreateContextTooltip({
        activeCaseId,
        canCreateInActiveCase,
        requestedCaseStatus,
      }),
    [activeCaseId, canCreateInActiveCase, requestedCaseStatus]
  );
  const requestedCaseIssueMessage = React.useMemo(
    () => resolveRequestedCaseIssueMessage(requestedCaseIssue),
    [requestedCaseIssue]
  );

  const disableCreateActions = !canCreateInActiveCase;
  const searchRuntimeValue = useMemo(
    () => ({ searchQuery: resolvedSearchQuery, onSearchChange: resolvedOnSearchChange }),
    [resolvedOnSearchChange, resolvedSearchQuery]
  );
  const activeCaseIdentifierLabel = React.useMemo(
    () =>
      resolveActiveCaseIdentifierLabel({
        activeCaseFile,
        caseResolverIdentifiers: caseResolverIdentifiers as CaseResolverIdentifierOption[],
      }),
    [activeCaseFile, caseResolverIdentifiers]
  );
  const createActions = React.useMemo(
    (): CaseResolverCreateActionConfig[] => [
      {
        key: 'folder',
        label: 'Add folder',
        title: 'Add folder',
        Icon: FolderPlus,
        onClick: () => onCreateFolder(selectedFolderForFolderCreate),
      },
      {
        key: 'file',
        label: 'Add case file',
        title: 'Add case file',
        Icon: FilePlus,
        onClick: () => onCreateFile(selectedFolderForCreate),
      },
      {
        key: 'scan',
        label: 'Create new image file',
        title: 'Create new image file',
        Icon: FileImage,
        onClick: () => onCreateScanFile(selectedFolderForCreate),
      },
      {
        key: 'asset',
        label: 'Create new image asset',
        title: 'Create new image asset',
        Icon: ImagePlus,
        onClick: () => onCreateImageAsset(selectedFolderForCreate),
      },
      {
        key: 'node-file',
        label: 'Add node file',
        title: 'Add node file',
        Icon: FileCode2,
        onClick: () => onCreateNodeFile(selectedFolderForCreate),
      },
    ],
    [
      onCreateFile,
      onCreateFolder,
      onCreateImageAsset,
      onCreateNodeFile,
      onCreateScanFile,
      selectedFolderForCreate,
      selectedFolderForFolderCreate,
    ]
  );

  return (
    <div className='space-y-2 border-b border-border/60 px-2 py-2'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <h1 className='truncate text-sm font-semibold text-gray-100'>Case Resolver</h1>
          <div className='mt-0.5 truncate text-xs text-gray-300'>
            {activeCaseFile?.name ?? 'No case selected'}
          </div>
          <div className='mt-0.5 text-xs text-muted-foreground/80'>
            {activeCaseIdentifierLabel
              ? `Signature ID: ${activeCaseIdentifierLabel}`
              : 'No signature ID'}
          </div>
        </div>
        <div className='flex shrink-0 items-start gap-1'>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-gray-200 hover:bg-muted/50'
            onClick={(): void => {
              startTransition(() => { router.push('/admin/case-resolver/cases'); });
            }}
          >
            ALL CASES
          </Button>
        </div>
      </div>
      <CaseResolverNestedScopeToggle
        activeCaseChildCount={activeCaseChildCount}
        checked={showChildCaseFolders}
        hasCaseContext={hasCaseContext}
        onCheckedChange={setShowChildCaseFolders}
      />
      <CaseResolverContextNotice
        createContextTooltip={createContextTooltip}
        onResetCaseContext={onResetCaseContext}
        onRetryCaseContext={onRetryCaseContext}
        requestedCaseIssueMessage={requestedCaseIssueMessage}
        requestedCaseStatus={requestedCaseStatus}
      />
      {resolvedSearchEnabled ? (
        <CaseResolverTreeSearchRuntimeContext.Provider value={searchRuntimeValue}>
          <CaseResolverTreeSearchBar />
        </CaseResolverTreeSearchRuntimeContext.Provider>
      ) : null}
      <CaseResolverCreateActionBar
        actions={createActions}
        createContextTooltip={createContextTooltip}
        disableCreateActions={disableCreateActions}
      />
    </div>
  );
}

export { CaseResolverTreeHeaderRuntimeContext };
