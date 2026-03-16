'use client';

import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import { ConfirmModal, Input, MultiSelect } from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsPanelField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

import { CaseListPanel } from '../components/CaseListPanel';
import {
  AdminCaseResolverCasesProvider,
  useAdminCaseResolverCasesActionsContext,
  useAdminCaseResolverCasesStateContext,
} from '../context/AdminCaseResolverCasesContext';

const EMPTY_PARENT_CASE_OPTION: LabeledOptionDto<string> = { value: '', label: '(No parent)' };
const EMPTY_FOLDER_OPTION: LabeledOptionDto<string> = { value: '', label: '(Root)' };
const CASE_STATUS_OPTIONS: Array<LabeledOptionDto<string>> = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];
const CASE_DOCUMENT_VERSION_OPTIONS: Array<LabeledOptionDto<string>> = [
  { value: 'original', label: 'Original' },
  { value: 'exploded', label: 'Exploded' },
];
const EMPTY_SIGNATURE_OPTION: LabeledOptionDto<string> = { value: '', label: '(No signature)' };
const EMPTY_TAG_OPTION: LabeledOptionDto<string> = { value: '', label: '(No tag)' };
const EMPTY_CATEGORY_OPTION: LabeledOptionDto<string> = { value: '', label: '(No category)' };

function AdminCaseResolverCasesInner(): React.JSX.Element {
  const {
    isCreateCaseModalOpen,
    caseDraft,
    editingCaseId,
    isCreatingCase,
    confirmation,
    parentCaseOptions,
    caseReferenceOptions,
    caseResolverTagOptions,
    caseIdentifierOptions,
    caseResolverCategoryOptions,
    folderOptions,
  } = useAdminCaseResolverCasesStateContext();

  const {
    setIsCreateCaseModalOpen,
    setCaseDraft,
    setEditingCaseId,
    handleSaveCaseDraft,
    setConfirmation,
  } = useAdminCaseResolverCasesActionsContext();

  const parentCaseSelectOptions = useMemo(
    () => [EMPTY_PARENT_CASE_OPTION, ...parentCaseOptions],
    [parentCaseOptions]
  );
  const folderSelectOptions = useMemo(
    () => [EMPTY_FOLDER_OPTION, ...folderOptions],
    [folderOptions]
  );
  const caseIdentifierSelectOptions = useMemo(
    () => [EMPTY_SIGNATURE_OPTION, ...caseIdentifierOptions],
    [caseIdentifierOptions]
  );
  const tagSelectOptions = useMemo(
    () => [EMPTY_TAG_OPTION, ...caseResolverTagOptions],
    [caseResolverTagOptions]
  );
  const categorySelectOptions = useMemo(
    () => [EMPTY_CATEGORY_OPTION, ...caseResolverCategoryOptions],
    [caseResolverCategoryOptions]
  );

  const createCaseFields = useMemo(
    (): SettingsPanelField<Partial<CaseResolverFile>>[] => [
      {
        key: 'name',
        label: 'Case Name',
        type: 'text',
        placeholder: 'Enter case name',
        required: true,
      },
      {
        key: 'parentCaseId',
        label: 'Parent Case',
        type: 'select',
        options: parentCaseSelectOptions,
      },
      {
        key: 'folder',
        label: 'Folder',
        type: 'select',
        options: folderSelectOptions,
      },
      {
        key: 'caseStatus',
        label: 'Case Status',
        type: 'select',
        options: CASE_STATUS_OPTIONS,
      },
      {
        key: 'caseIdentifierId',
        label: 'Signature ID',
        type: 'select',
        options: caseIdentifierSelectOptions,
      },
      {
        key: 'tagId',
        label: 'Tag',
        type: 'select',
        options: tagSelectOptions,
      },
      {
        key: 'categoryId',
        label: 'Category',
        type: 'select',
        options: categorySelectOptions,
      },
      {
        key: 'referenceCaseIds',
        label: 'Reference Cases',
        type: 'custom',
        render: ({ value, onChange, disabled }) => (
          <MultiSelect
            options={caseReferenceOptions}
            selected={Array.isArray(value) ? (value as string[]) : []}
            onChange={(ids: string[]): void => {
              onChange(ids);
            }}
            disabled={Boolean(disabled)}
            placeholder='Link related cases...'
            searchPlaceholder='Search cases...'
            emptyMessage='No cases available.'
            className='w-full'
          />
        ),
      },
      {
        key: 'documentContent',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Optional case description',
        helperText: 'Saved as case content and visible in case workspace.',
      },
      {
        key: 'documentCity',
        label: 'City',
        type: 'text',
        placeholder: 'Optional city',
      },
      {
        key: 'documentDate',
        label: 'Date',
        type: 'custom',
        render: ({ value, onChange, disabled }) => {
          const valueRecord =
            value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
          const dateText =
            typeof value === 'string'
              ? value
              : typeof valueRecord?.['isoDate'] === 'string'
                ? valueRecord['isoDate']
                : '';
          return (
            <Input
              value={dateText}
              onChange={(event): void => {
                const nextValue = event.target.value.trim();
                if (!nextValue) {
                  onChange(null);
                  return;
                }
                onChange({
                  isoDate: nextValue,
                  source: 'text',
                  sourceLine: nextValue,
                  cityHint: null,
                  action: 'keepText',
                });
              }}
              placeholder='Optional date (e.g. 2026-02-25)'
              disabled={Boolean(disabled)}
             aria-label='Optional date (e.g. 2026-02-25)' title='Optional date (e.g. 2026-02-25)'/>
          );
        },
      },
      {
        key: 'happeningDate',
        label: 'Happening Date',
        type: 'text',
        placeholder: 'Optional happening date (e.g. 2026-02-25)',
      },
      {
        key: 'isLocked',
        label: 'Lock Case',
        type: 'switch',
        helperText: 'Prevent accidental edits or hierarchy changes.',
      },
      {
        key: 'isSent',
        label: 'Mark as Sent',
        type: 'switch',
        helperText: 'Track sent workflow state.',
      },
      {
        key: 'activeDocumentVersion',
        label: 'Document Version',
        type: 'select',
        options: CASE_DOCUMENT_VERSION_OPTIONS,
      },
    ],
    [
      caseIdentifierSelectOptions,
      caseReferenceOptions,
      categorySelectOptions,
      tagSelectOptions,
      folderSelectOptions,
      parentCaseSelectOptions,
    ]
  );

  const isEditingCase = editingCaseId !== null;

  return (
    <div className='space-y-6'>
      <SettingsPanelBuilder
        open={isCreateCaseModalOpen}
        onClose={() => {
          setIsCreateCaseModalOpen(false);
          setCaseDraft({});
          setEditingCaseId(null);
        }}
        title={isEditingCase ? 'Edit Case' : 'Add Case'}
        subtitle={
          isEditingCase
            ? 'Edit all case fields, including metadata, hierarchy, references, and status.'
            : 'Create a new case with hierarchy, signature, tags, references, and status.'
        }
        size='lg'
        fields={createCaseFields}
        values={{
          ...caseDraft,
          name: caseDraft.name ?? '',
          folder: caseDraft.folder ?? '',
          parentCaseId: caseDraft.parentCaseId ?? '',
          caseStatus: caseDraft.caseStatus ?? 'pending',
          caseIdentifierId: caseDraft.caseIdentifierId ?? '',
          tagId: caseDraft.tagId ?? '',
          categoryId: caseDraft.categoryId ?? '',
          referenceCaseIds: caseDraft.referenceCaseIds ?? [],
          documentContent: caseDraft.documentContent ?? '',
          documentCity: caseDraft.documentCity ?? '',
          documentDate: caseDraft.documentDate ?? null,
          happeningDate: caseDraft.happeningDate ?? '',
          isLocked: caseDraft.isLocked === true,
          isSent: caseDraft.isSent === true,
          activeDocumentVersion: caseDraft.activeDocumentVersion ?? 'original',
        }}
        onChange={(values) => {
          setCaseDraft((previous) => ({
            ...previous,
            ...values,
          }));
        }}
        onSave={handleSaveCaseDraft}
        isSaving={isCreatingCase}
      />

      <CaseListPanel />

      <ConfirmModal
        isOpen={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title ?? ''}
        message={confirmation?.message ?? ''}
        confirmText={confirmation?.confirmText ?? 'Confirm'}
        isDangerous={confirmation?.isDangerous ?? false}
        onConfirm={async () => {
          if (confirmation?.onConfirm) await confirmation.onConfirm();
          setConfirmation(null);
        }}
      />
    </div>
  );
}

export function AdminCaseResolverCasesPage(): React.JSX.Element {
  return (
    <AdminCaseResolverCasesProvider>
      <AdminCaseResolverCasesInner />
    </AdminCaseResolverCasesProvider>
  );
}
