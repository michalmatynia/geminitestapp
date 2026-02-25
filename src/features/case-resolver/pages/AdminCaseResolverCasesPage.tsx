'use client';

import React, { useMemo } from 'react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import { ConfirmModal, Input, MultiSelect } from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

import { CaseListPanel } from '../components/CaseListPanel';
import {
  AdminCaseResolverCasesProvider,
  useAdminCaseResolverCases,
} from '../context/AdminCaseResolverCasesContext';

function AdminCaseResolverCasesInner(): React.JSX.Element {
  const {
    isCreateCaseModalOpen,
    setIsCreateCaseModalOpen,
    caseDraft,
    setCaseDraft,
    editingCaseId,
    setEditingCaseId,
    handleSaveCaseDraft,
    isCreatingCase,
    confirmation,
    setConfirmation,
    parentCaseOptions,
    caseReferenceOptions,
    caseResolverTagOptions,
    caseIdentifierOptions,
    caseResolverCategoryOptions,
    folderOptions,
  } = useAdminCaseResolverCases();

  const createCaseFields = useMemo(
    (): SettingsField<Partial<CaseResolverFile>>[] => [
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
        options: [
          { value: '', label: '(No parent)' },
          ...parentCaseOptions.map((option) => ({ value: option.value, label: option.label })),
        ],
      },
      {
        key: 'folder',
        label: 'Folder',
        type: 'select',
        options: [
          { value: '', label: '(Root)' },
          ...folderOptions.map((option) => ({ value: option.value, label: option.label })),
        ],
      },
      {
        key: 'caseStatus',
        label: 'Case Status',
        type: 'select',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' },
        ],
      },
      {
        key: 'caseIdentifierId',
        label: 'Signature ID',
        type: 'select',
        options: [
          { value: '', label: '(No signature)' },
          ...caseIdentifierOptions.map((option) => ({
            value: option.value,
            label: option.label,
          })),
        ],
      },
      {
        key: 'tagId',
        label: 'Tag',
        type: 'select',
        options: [
          { value: '', label: '(No tag)' },
          ...caseResolverTagOptions.map((option) => ({
            value: option.value,
            label: option.label,
          })),
        ],
      },
      {
        key: 'categoryId',
        label: 'Category',
        type: 'select',
        options: [
          { value: '', label: '(No category)' },
          ...caseResolverCategoryOptions.map((option) => ({
            value: option.value,
            label: option.label,
          })),
        ],
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
            value && typeof value === 'object'
              ? (value as Record<string, unknown>)
              : null;
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
            />
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
        options: [
          { value: 'original', label: 'Original' },
          { value: 'exploded', label: 'Exploded' },
        ],
      },
    ],
    [
      caseIdentifierOptions,
      caseReferenceOptions,
      caseResolverCategoryOptions,
      caseResolverTagOptions,
      folderOptions,
      parentCaseOptions,
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
