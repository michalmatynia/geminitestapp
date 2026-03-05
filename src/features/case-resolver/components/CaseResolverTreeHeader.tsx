'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, FilePlus, FileImage, FileCode2, ImagePlus } from 'lucide-react';

import { Button, Switch } from '@/shared/ui';
import { FolderTreeSearchBar } from '@/features/foldertree/v2/search';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import {
  useCaseResolverPageActions,
  useCaseResolverPageState,
} from '../context/CaseResolverPageContext';
import {
  useCaseResolverFolderTreeDataContext,
  useCaseResolverFolderTreeUiActionsContext,
  useCaseResolverFolderTreeUiStateContext,
} from '../context/CaseResolverFolderTreeContext';

type CaseResolverTreeHeaderProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
};

type CaseResolverTreeSearchRuntimeValue = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
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

export function CaseResolverTreeHeader({
  searchQuery,
  onSearchChange,
}: CaseResolverTreeHeaderProps): React.JSX.Element {
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

  const createContextTooltip = React.useMemo((): string | null => {
    if (canCreateInActiveCase) return null;
    if (requestedCaseStatus === 'loading') return 'Loading case context...';
    if (requestedCaseStatus === 'missing') return 'Case context unavailable.';
    if (!activeCaseId) return 'Select a case first.';
    return 'Case context is not ready.';
  }, [activeCaseId, canCreateInActiveCase, requestedCaseStatus]);

  const requestedCaseIssueMessage = React.useMemo((): string => {
    if (requestedCaseIssue === 'workspace_unavailable') {
      return 'Could not load workspace context. Retry or reset context.';
    }
    if (requestedCaseIssue === 'requested_file_missing') {
      return 'Requested case context was not found. Retry or reset context.';
    }
    return 'Case context is unavailable. Retry or reset context.';
  }, [requestedCaseIssue]);

  const disableCreateActions = !canCreateInActiveCase;
  const searchRuntimeValue = useMemo(
    () => ({ searchQuery, onSearchChange }),
    [onSearchChange, searchQuery]
  );

  const activeCaseIdentifierLabel = React.useMemo((): string | null => {
    const identifierId = activeCaseFile?.caseIdentifierId ?? null;
    if (!identifierId) return null;
    const match = caseResolverIdentifiers.find((identifier) => identifier.id === identifierId);
    return match?.name ?? identifierId;
  }, [activeCaseFile?.caseIdentifierId, caseResolverIdentifiers]);

  return (
    <div className='space-y-2 border-b border-border/60 px-2 py-2'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold text-gray-100'>
            {activeCaseFile?.name ?? 'Case Resolver'}
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
              router.push('/admin/case-resolver/cases');
            }}
          >
            ALL CASES
          </Button>
        </div>
      </div>
      {hasCaseContext ? (
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
            checked={showChildCaseFolders}
            onCheckedChange={(checked): void => {
              setShowChildCaseFolders(checked === true);
            }}
            aria-label='Show nested folders and files'
            className='h-5 w-9'
          />
        </div>
      ) : null}
      {requestedCaseStatus === 'missing' ? (
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
      ) : createContextTooltip ? (
        <div className='rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200'>
          {createContextTooltip}
        </div>
      ) : null}
      <CaseResolverTreeSearchRuntimeContext.Provider value={searchRuntimeValue}>
        <CaseResolverTreeSearchBar />
      </CaseResolverTreeSearchRuntimeContext.Provider>
      <div className='flex flex-wrap items-center gap-1'>
        <Button
          type='button'
          onClick={(): void => {
            onCreateFolder(selectedFolderForFolderCreate);
          }}
          size='sm'
          variant='outline'
          className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
          title={createContextTooltip ?? 'Add folder'}
          disabled={disableCreateActions}
        >
          <FolderPlus className='size-4' />
        </Button>
        <Button
          type='button'
          onClick={(): void => {
            onCreateFile(selectedFolderForCreate);
          }}
          size='sm'
          variant='outline'
          className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
          title={createContextTooltip ?? 'Add case file'}
          disabled={disableCreateActions}
        >
          <FilePlus className='size-4' />
        </Button>
        <Button
          type='button'
          onClick={(): void => {
            onCreateScanFile(selectedFolderForCreate);
          }}
          size='sm'
          variant='outline'
          className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
          title={createContextTooltip ?? 'Create new image file'}
          disabled={disableCreateActions}
        >
          <FileImage className='size-4' />
        </Button>
        <Button
          type='button'
          onClick={(): void => {
            onCreateImageAsset(selectedFolderForCreate);
          }}
          size='sm'
          variant='outline'
          className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
          title={createContextTooltip ?? 'Create new image asset'}
          disabled={disableCreateActions}
        >
          <ImagePlus className='size-4' />
        </Button>
        <Button
          type='button'
          onClick={(): void => {
            onCreateNodeFile(selectedFolderForCreate);
          }}
          size='sm'
          variant='outline'
          className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
          title={createContextTooltip ?? 'Add node file'}
          disabled={disableCreateActions}
        >
          <FileCode2 className='size-4' />
        </Button>
      </div>
    </div>
  );
}
