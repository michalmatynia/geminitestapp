'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  FolderPlus, 
  FilePlus, 
  FileImage, 
  FileCode2 
} from 'lucide-react';

import { Button, Switch } from '@/shared/ui';
import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import { useCaseResolverFolderTreeContext } from '../context/CaseResolverFolderTreeContext';

export function CaseResolverTreeHeader(): React.JSX.Element {
  const router = useRouter();
  const {
    activeCaseId,
    requestedCaseStatus,
    canCreateInActiveCase,
    onCreateFolder,
    onCreateFile,
    onCreateScanFile,
    onCreateNodeFile,
    caseResolverIdentifiers,
  } = useCaseResolverPageContext();

  const {
    activeCaseFile,
    activeCaseChildCount,
    showChildCaseFolders,
    setShowChildCaseFolders,
    selectedFolderForFolderCreate,
    selectedFolderForCreate,
  } = useCaseResolverFolderTreeContext();

  const hasActiveCaseChildren = activeCaseChildCount > 0;

  const createContextTooltip = React.useMemo((): string | null => {
    if (canCreateInActiveCase) return null;
    if (requestedCaseStatus === 'loading') return 'Loading case context...';
    if (requestedCaseStatus === 'missing')
      return 'Case context unavailable. Click to retry.';
    if (!activeCaseId) return 'Select a case first.';
    return 'Case context is not ready.';
  }, [activeCaseId, canCreateInActiveCase, requestedCaseStatus]);

  const disableCreateActions =
    !canCreateInActiveCase && requestedCaseStatus !== 'missing';

  const activeCaseIdentifierLabel = React.useMemo((): string | null => {
    const identifierId = activeCaseFile?.caseIdentifierId ?? null;
    if (!identifierId) return null;
    const match = caseResolverIdentifiers.find(
      (identifier) => identifier.id === identifierId,
    );
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
      {hasActiveCaseChildren ? (
        <div className='flex items-center justify-between rounded border border-border/60 bg-card/35 px-2 py-1.5'>
          <div className='text-[11px] text-gray-300'>
            Show children folders ({activeCaseChildCount})
          </div>
          <Switch
            checked={showChildCaseFolders}
            onCheckedChange={(checked): void => {
              setShowChildCaseFolders(checked === true);
            }}
            aria-label='Show children case folders'
            className='h-5 w-9'
          />
        </div>
      ) : null}
      {createContextTooltip ? (
        <div className='rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200'>
          {createContextTooltip}
        </div>
      ) : null}
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
