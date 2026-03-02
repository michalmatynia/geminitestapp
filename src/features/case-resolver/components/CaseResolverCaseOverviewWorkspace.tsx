'use client';

import { Network } from 'lucide-react';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  MultiSelect,
  SelectSimple,
} from '@/shared/ui';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import { CaseResolverRelationsWorkspace } from './CaseResolverRelationsWorkspace';

const CASE_STATUS_OPTIONS = [
  {
    value: 'pending',
    label: 'Pending',
    description: 'Case is still in progress.',
  },
  {
    value: 'completed',
    label: 'Completed',
    description: 'Case has been completed.',
  },
] as const;

const NONE_OPTION_VALUE = '__none__';

type CaseMetadataDraft = {
  name: string;
  parentCaseId: string;
  caseStatus: 'pending' | 'completed';
  happeningDate: string;
  referenceCaseIds: string[];
  tagId: string;
  caseIdentifierId: string;
  categoryId: string;
};

const buildCaseMetadataDraft = (caseFile: CaseResolverFile | null): CaseMetadataDraft => ({
  name: caseFile?.name ?? '',
  parentCaseId: caseFile?.parentCaseId ?? NONE_OPTION_VALUE,
  caseStatus: caseFile?.caseStatus === 'completed' ? 'completed' : 'pending',
  happeningDate: caseFile?.happeningDate ?? '',
  referenceCaseIds: caseFile?.referenceCaseIds ?? [],
  tagId: caseFile?.tagId ?? NONE_OPTION_VALUE,
  caseIdentifierId: caseFile?.caseIdentifierId ?? NONE_OPTION_VALUE,
  categoryId: caseFile?.categoryId ?? NONE_OPTION_VALUE,
});

const normalizeOptionalSelectValue = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized || normalized === NONE_OPTION_VALUE) return null;
  return normalized;
};

const normalizeReferenceCaseIds = (values: string[], activeCaseId: string): string[] =>
  Array.from(
    new Set(
      values
        .map((value): string => value.trim())
        .filter((value): boolean => value.length > 0 && value !== activeCaseId)
    )
  );

const areStringArraysEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((value, index): boolean => value === right[index]);

export function CaseResolverCaseOverviewWorkspace(): React.JSX.Element {
  const {
    workspace,
    activeCaseId,
    activeFile,
    caseTagOptions,
    caseIdentifierOptions,
    caseCategoryOptions,
    caseReferenceOptions,
    parentCaseOptions,
    onUpdateActiveCase,
  } = useCaseResolverPageContext();
  const activeCaseFile = React.useMemo((): typeof activeFile | null => {
    if (activeFile?.fileType === 'case') return activeFile;
    if (!activeCaseId) return null;
    return (
      workspace.files.find(
        (file): boolean => file.id === activeCaseId && file.fileType === 'case'
      ) ?? null
    );
  }, [activeCaseId, activeFile, workspace.files]);

  const [draft, setDraft] = React.useState<CaseMetadataDraft>(() =>
    buildCaseMetadataDraft(activeCaseFile)
  );
  const [isRelationsVisible, setIsRelationsVisible] = React.useState(false);

  React.useEffect(() => {
    setDraft(buildCaseMetadataDraft(activeCaseFile));
  }, [
    activeCaseFile?.id,
    activeCaseFile?.name,
    activeCaseFile?.parentCaseId,
    activeCaseFile?.caseStatus,
    activeCaseFile?.happeningDate,
    activeCaseFile?.tagId,
    activeCaseFile?.caseIdentifierId,
    activeCaseFile?.categoryId,
    activeCaseFile?.referenceCaseIds,
  ]);

  React.useEffect(() => {
    setIsRelationsVisible(false);
  }, [activeCaseFile?.id]);

  const normalizedDraft = React.useMemo(() => {
    if (!activeCaseFile) return null;
    return {
      name: draft.name.trim() || activeCaseFile.name || 'Untitled Case',
      parentCaseId: (() => {
        const nextParentCaseId = normalizeOptionalSelectValue(draft.parentCaseId);
        return nextParentCaseId === activeCaseFile.id ? null : nextParentCaseId;
      })(),
      caseStatus: draft.caseStatus === 'completed' ? 'completed' : 'pending',
      happeningDate: draft.happeningDate.trim() || null,
      referenceCaseIds: normalizeReferenceCaseIds(draft.referenceCaseIds, activeCaseFile.id),
      tagId: normalizeOptionalSelectValue(draft.tagId),
      caseIdentifierId: normalizeOptionalSelectValue(draft.caseIdentifierId),
      categoryId: normalizeOptionalSelectValue(draft.categoryId),
    };
  }, [activeCaseFile, draft]);

  const pendingPatch = React.useMemo(() => {
    if (!activeCaseFile || !normalizedDraft) return null;
    const patch: Partial<
      Pick<
        CaseResolverFile,
        | 'name'
        | 'parentCaseId'
        | 'referenceCaseIds'
        | 'tagId'
        | 'caseIdentifierId'
        | 'categoryId'
        | 'caseStatus'
        | 'happeningDate'
      >
    > = {};

    if (normalizedDraft.name !== activeCaseFile.name) {
      patch.name = normalizedDraft.name;
    }
    if (normalizedDraft.parentCaseId !== (activeCaseFile.parentCaseId?.trim() || null)) {
      patch.parentCaseId = normalizedDraft.parentCaseId;
    }
    if (
      normalizedDraft.caseStatus !==
      (activeCaseFile.caseStatus === 'completed' ? 'completed' : 'pending')
    ) {
      patch.caseStatus = normalizedDraft.caseStatus as 'pending' | 'completed';
    }
    if (normalizedDraft.happeningDate !== (activeCaseFile.happeningDate?.trim() || null)) {
      patch.happeningDate = normalizedDraft.happeningDate;
    }
    if (
      !areStringArraysEqual(
        normalizedDraft.referenceCaseIds,
        normalizeReferenceCaseIds(activeCaseFile.referenceCaseIds ?? [], activeCaseFile.id)
      )
    ) {
      patch.referenceCaseIds = normalizedDraft.referenceCaseIds;
    }
    if (normalizedDraft.tagId !== (activeCaseFile.tagId?.trim() || null)) {
      patch.tagId = normalizedDraft.tagId;
    }
    if (
      normalizedDraft.caseIdentifierId !== (activeCaseFile.caseIdentifierId?.trim() || null)
    ) {
      patch.caseIdentifierId = normalizedDraft.caseIdentifierId;
    }
    if (normalizedDraft.categoryId !== (activeCaseFile.categoryId?.trim() || null)) {
      patch.categoryId = normalizedDraft.categoryId;
    }

    return Object.keys(patch).length > 0 ? patch : null;
  }, [activeCaseFile, normalizedDraft]);

  const handleApplyDraft = React.useCallback((): void => {
    if (!activeCaseFile || activeCaseFile.isLocked || !pendingPatch) return;
    onUpdateActiveCase(pendingPatch);
  }, [activeCaseFile, onUpdateActiveCase, pendingPatch]);

  if (!activeCaseFile) {
    return (
      <Card
        variant='subtle'
        padding='lg'
        className='flex flex-1 items-center justify-center border-dashed'
      >
        <EmptyState
          icon={<Network className='size-12 text-gray-600' />}
          title='No case context'
          description='Select a case in the folder tree to see case-specific options.'
          variant='compact'
          className='border-none p-0'
        />
      </Card>
    );
  }

  const isCaseLocked = activeCaseFile.isLocked === true;
  const filteredReferenceOptions = caseReferenceOptions.filter(
    (option): boolean => option.value !== activeCaseFile.id
  );
  const filteredParentOptions = parentCaseOptions.filter(
    (option): boolean => option.value === '__none__' || option.value !== activeCaseFile.id
  );
  const draftHasChanges = pendingPatch !== null;

  return (
    <div
      className={`grid h-full min-h-0 gap-3 ${isRelationsVisible ? 'xl:grid-cols-[380px_minmax(0,1fr)]' : 'grid-cols-1'}`}
    >
      <Card
        variant='subtle'
        padding='md'
        className='min-h-0 overflow-auto border-border/60 bg-card/25'
      >
        <div className='space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <div className='text-sm font-semibold text-gray-100'>Case-specific options</div>
            <div className='flex items-center gap-2'>
              {isCaseLocked ? (
                <Badge variant='outline' className='border-amber-500/40 text-amber-200'>
                  Locked
                </Badge>
              ) : null}
              <Button
                variant='outline'
                size='sm'
                className='h-8'
                disabled={isCaseLocked || !draftHasChanges}
                onClick={handleApplyDraft}
              >
                Update
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='h-8'
                onClick={(): void => {
                  setIsRelationsVisible((current): boolean => !current);
                }}
              >
                {isRelationsVisible ? 'Hide Relations' : 'Show Relations'}
              </Button>
            </div>
          </div>
          <p className='text-xs text-gray-400'>
            Relations are optional in case view. Use Show Relations to inspect the case graph.
          </p>

          <FormField label='Case Name'>
            <Input
              value={draft.name}
              disabled={isCaseLocked}
              onChange={(event): void => {
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }));
              }}
              onKeyDown={(event): void => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                handleApplyDraft();
              }}
            />
          </FormField>

          <FormField label='Parent Case'>
            <SelectSimple
              size='sm'
              value={draft.parentCaseId}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                setDraft((current) => ({
                  ...current,
                  parentCaseId: value,
                }));
              }}
              options={filteredParentOptions}
              placeholder='Parent case'
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Case Status'>
            <SelectSimple
              size='sm'
              value={draft.caseStatus}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                setDraft((current) => ({
                  ...current,
                  caseStatus: value === 'completed' ? 'completed' : 'pending',
                }));
              }}
              options={CASE_STATUS_OPTIONS}
              placeholder='Select case status'
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Happening Date'>
            <Input
              value={draft.happeningDate}
              disabled={isCaseLocked}
              placeholder='YYYY-MM-DD or custom date'
              onChange={(event): void => {
                setDraft((current) => ({
                  ...current,
                  happeningDate: event.target.value,
                }));
              }}
              onKeyDown={(event): void => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                handleApplyDraft();
              }}
            />
          </FormField>

          <FormField label='Reference Cases'>
            <MultiSelect
              options={filteredReferenceOptions}
              selected={draft.referenceCaseIds.filter(
                (caseId: string): boolean => caseId !== activeCaseFile.id
              )}
              disabled={isCaseLocked}
              onChange={(values: string[]): void => {
                setDraft((current) => ({
                  ...current,
                  referenceCaseIds: values.filter(
                    (referenceId: string): boolean => referenceId !== activeCaseFile.id
                  ),
                }));
              }}
              placeholder='Select reference cases'
              searchPlaceholder='Search cases...'
              emptyMessage='No cases available.'
              className='w-full'
            />
          </FormField>

          <FormField label='Tag'>
            <SelectSimple
              size='sm'
              value={draft.tagId}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                setDraft((current) => ({
                  ...current,
                  tagId: value,
                }));
              }}
              options={caseTagOptions}
              placeholder='Select tag'
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Case Identifier'>
            <SelectSimple
              size='sm'
              value={draft.caseIdentifierId}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                setDraft((current) => ({
                  ...current,
                  caseIdentifierId: value,
                }));
              }}
              options={caseIdentifierOptions}
              placeholder='Select case identifier'
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Category'>
            <SelectSimple
              size='sm'
              value={draft.categoryId}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                setDraft((current) => ({
                  ...current,
                  categoryId: value,
                }));
              }}
              options={caseCategoryOptions}
              placeholder='Select category'
              triggerClassName='h-9'
            />
          </FormField>
        </div>
      </Card>

      {isRelationsVisible ? (
        <CaseResolverRelationsWorkspace focusCaseId={activeCaseFile.id} />
      ) : null}
    </div>
  );
}
