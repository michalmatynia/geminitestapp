'use client';

import { Network } from 'lucide-react';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  CompactEmptyState,
  FormField,
  Input,
  MultiSelect,
  SelectSimple,
} from '@/shared/ui';

import { CaseResolverRelationsWorkspace } from './CaseResolverRelationsWorkspace';
import {
  useCaseResolverPageActions,
  useCaseResolverPageState,
} from '../context/CaseResolverPageContext';

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
    activeCaseFile,
    activeCaseMetadataDraft,
    isActiveCaseMetadataDirty,
    caseTagOptions,
    caseIdentifierOptions,
    caseCategoryOptions,
    caseReferenceOptions,
    parentCaseOptions,
  } = useCaseResolverPageState();
  const { onUpdateActiveCaseDraft, onSaveActiveCase } = useCaseResolverPageActions();
  const [isRelationsVisible, setIsRelationsVisible] = React.useState(false);

  React.useEffect(() => {
    setIsRelationsVisible(false);
  }, [activeCaseFile?.id]);
  const draft = activeCaseMetadataDraft;

  if (!activeCaseFile) {
    return (
      <Card
        variant='subtle'
        padding='lg'
        className='flex flex-1 items-center justify-center border-dashed'
      >
        <CompactEmptyState
          icon={<Network className='size-12 text-gray-600' />}
          title='No case context'
          description='Select a case in the folder tree to see case-specific options.'
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
  const draftHasChanges = isActiveCaseMetadataDirty;

  if (!draft) {
    return <div className='flex-1' />;
  }

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
            <div className='flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-end'>
              <div className='w-full md:w-auto md:shrink-0'>
                <Button
                  variant={draftHasChanges ? 'success' : 'outline'}
                  size='sm'
                  className='h-8 w-full min-w-[100px] md:w-auto'
                  disabled={isCaseLocked || !draftHasChanges}
                  onClick={onSaveActiveCase}
                >
                  Update
                </Button>
              </div>
              <div className='min-w-0 flex-1'>
                <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
                  Case Name
                </div>
                <Input
                  value={draft.name}
                  size='sm'
                  variant='subtle'
                  disabled={isCaseLocked}
                  className='bg-card/50 text-white'
                  aria-label='Case Name'
                  onChange={(event): void => {
                    onUpdateActiveCaseDraft({
                      name: event.target.value,
                    });
                  }}
                  onKeyDown={(event): void => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    onSaveActiveCase();
                  }}
                 title='Input field'/>
              </div>

              <div className='w-full md:w-[240px]'>
                <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
                  Signature ID
                </div>
                <SelectSimple
                  size='sm'
                  value={draft.caseIdentifierId}
                  disabled={isCaseLocked}
                  ariaLabel='Signature ID'
                  onValueChange={(value: string): void => {
                    onUpdateActiveCaseDraft({
                      caseIdentifierId: value,
                    });
                  }}
                  options={caseIdentifierOptions}
                  placeholder='Select signature ID'
                  triggerClassName='h-8 bg-card/50 text-white'
                  variant='subtle'
                 title='Select signature ID'/>
              </div>
            </div>
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

          <FormField label='Parent Case'>
            <SelectSimple
              size='sm'
              value={draft.parentCaseId}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                onUpdateActiveCaseDraft({
                  parentCaseId: value,
                });
              }}
              options={filteredParentOptions}
              placeholder='Parent case'
              triggerClassName='h-9'
             ariaLabel='Parent case' title='Parent case'/>
          </FormField>

          <FormField label='Case Status'>
            <SelectSimple
              size='sm'
              value={draft.caseStatus}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                onUpdateActiveCaseDraft({
                  caseStatus: value === 'completed' ? 'completed' : 'pending',
                });
              }}
              options={CASE_STATUS_OPTIONS}
              placeholder='Select case status'
              triggerClassName='h-9'
             ariaLabel='Select case status' title='Select case status'/>
          </FormField>

          <FormField label='Happening Date'>
            <Input
              value={draft.happeningDate}
              disabled={isCaseLocked}
              placeholder='YYYY-MM-DD or custom date'
              onChange={(event): void => {
                onUpdateActiveCaseDraft({
                  happeningDate: event.target.value,
                });
              }}
              onKeyDown={(event): void => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                onSaveActiveCase();
              }}
             aria-label='YYYY-MM-DD or custom date' title='YYYY-MM-DD or custom date'/>
          </FormField>

          <FormField label='Reference Cases'>
            <MultiSelect
              options={filteredReferenceOptions}
              selected={draft.referenceCaseIds.filter(
                (caseId: string): boolean => caseId !== activeCaseFile.id
              )}
              disabled={isCaseLocked}
              onChange={(values: string[]): void => {
                onUpdateActiveCaseDraft({
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
              value={draft.tagId}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                onUpdateActiveCaseDraft({
                  tagId: value,
                });
              }}
              options={caseTagOptions}
              placeholder='Select tag'
              triggerClassName='h-9'
             ariaLabel='Select tag' title='Select tag'/>
          </FormField>

          <FormField label='Category'>
            <SelectSimple
              size='sm'
              value={draft.categoryId}
              disabled={isCaseLocked}
              onValueChange={(value: string): void => {
                onUpdateActiveCaseDraft({
                  categoryId: value,
                });
              }}
              options={caseCategoryOptions}
              placeholder='Select category'
              triggerClassName='h-9'
             ariaLabel='Select category' title='Select category'/>
          </FormField>
        </div>
      </Card>

      {isRelationsVisible ? <CaseResolverRelationsWorkspace /> : null}
    </div>
  );
}
