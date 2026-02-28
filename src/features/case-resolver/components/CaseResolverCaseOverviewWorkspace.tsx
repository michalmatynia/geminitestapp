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

  const [caseNameDraft, setCaseNameDraft] = React.useState(activeCaseFile?.name ?? '');
  const [happeningDateDraft, setHappeningDateDraft] = React.useState(
    activeCaseFile?.happeningDate ?? ''
  );
  const [isRelationsVisible, setIsRelationsVisible] = React.useState(false);

  React.useEffect(() => {
    setCaseNameDraft(activeCaseFile?.name ?? '');
  }, [activeCaseFile?.id, activeCaseFile?.name]);

  React.useEffect(() => {
    setHappeningDateDraft(activeCaseFile?.happeningDate ?? '');
  }, [activeCaseFile?.happeningDate, activeCaseFile?.id]);

  React.useEffect(() => {
    setIsRelationsVisible(false);
  }, [activeCaseFile?.id]);

  const commitCaseName = React.useCallback((): void => {
    if (!activeCaseFile || activeCaseFile.isLocked) return;
    const normalizedName = caseNameDraft.trim();
    const nextName = normalizedName || activeCaseFile.name || 'Untitled Case';
    if (nextName === activeCaseFile.name) return;
    onUpdateActiveCase({ name: nextName });
  }, [activeCaseFile, caseNameDraft, onUpdateActiveCase]);

  const commitHappeningDate = React.useCallback((): void => {
    if (!activeCaseFile || activeCaseFile.isLocked) return;
    const nextHappeningDate = happeningDateDraft.trim() || null;
    const currentHappeningDate = activeCaseFile.happeningDate?.trim() || null;
    if (nextHappeningDate === currentHappeningDate) return;
    onUpdateActiveCase({ happeningDate: nextHappeningDate });
  }, [activeCaseFile, happeningDateDraft, onUpdateActiveCase]);

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
  const selectedReferenceCaseIds = (activeCaseFile.referenceCaseIds ?? []).filter(
    (caseId: string): boolean => caseId !== activeCaseFile.id
  );

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
              value={caseNameDraft}
              disabled={isCaseLocked}
              onChange={(event): void => {
                setCaseNameDraft(event.target.value);
              }}
              onBlur={(): void => {
                commitCaseName();
              }}
              onKeyDown={(event): void => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                commitCaseName();
              }}
            />
          </FormField>

          <FormField label='Parent Case'>
            <SelectSimple
              size='sm'
              value={activeCaseFile.parentCaseId ?? '__none__'}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                onUpdateActiveCase({
                  parentCaseId: value === '__none__' ? null : value,
                });
              }}
              options={filteredParentOptions}
              placeholder='Parent case'
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Case Status'>
            <SelectSimple
              size='sm'
              value={activeCaseFile.caseStatus === 'completed' ? 'completed' : 'pending'}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                onUpdateActiveCase({
                  caseStatus: value === 'completed' ? 'completed' : 'pending',
                });
              }}
              options={CASE_STATUS_OPTIONS}
              placeholder='Select case status'
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Happening Date'>
            <Input
              value={happeningDateDraft}
              disabled={isCaseLocked}
              placeholder='YYYY-MM-DD or custom date'
              onChange={(event): void => {
                setHappeningDateDraft(event.target.value);
              }}
              onBlur={(): void => {
                commitHappeningDate();
              }}
              onKeyDown={(event): void => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                commitHappeningDate();
              }}
            />
          </FormField>

          <FormField label='Reference Cases'>
            <MultiSelect
              options={filteredReferenceOptions}
              selected={selectedReferenceCaseIds}
              disabled={isCaseLocked}
              onChange={(values: string[]): void => {
                onUpdateActiveCase({
                  referenceCaseIds: values.filter(
                    (referenceId: string): boolean => referenceId !== activeCaseFile.id
                  ),
                });
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
              value={activeCaseFile.tagId ?? '__none__'}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                onUpdateActiveCase({
                  tagId: value === '__none__' ? null : value,
                });
              }}
              options={caseTagOptions}
              placeholder='Select tag'
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Case Identifier'>
            <SelectSimple
              size='sm'
              value={activeCaseFile.caseIdentifierId ?? '__none__'}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                onUpdateActiveCase({
                  caseIdentifierId: value === '__none__' ? null : value,
                });
              }}
              options={caseIdentifierOptions}
              placeholder='Select case identifier'
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Category'>
            <SelectSimple
              size='sm'
              value={activeCaseFile.categoryId ?? '__none__'}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                onUpdateActiveCase({
                  categoryId: value === '__none__' ? null : value,
                });
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
