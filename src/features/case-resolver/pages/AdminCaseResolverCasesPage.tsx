'use client';

import React, { useMemo } from 'react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import { ConfirmModal } from '@/shared/ui';
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
    handleCreateCase,
    isCreatingCase,
    confirmation,
    setConfirmation,
    parentCaseOptions,
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
        key: 'folder',
        label: 'Folder',
        type: 'select',
        options: [
          { value: '', label: '(Root)' },
          ...folderOptions.map((option) => ({ value: option.value, label: option.label })),
        ],
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
    ],
    [folderOptions, parentCaseOptions]
  );

  return (
    <div className='space-y-6'>
      <SettingsPanelBuilder
        open={isCreateCaseModalOpen}
        onClose={() => setIsCreateCaseModalOpen(false)}
        title='Add Case'
        subtitle='Create a new case with optional hierarchy and folder placement.'
        size='sm'
        fields={createCaseFields}
        values={{
          ...caseDraft,
          name: caseDraft.name ?? '',
          folder: caseDraft.folder ?? '',
          parentCaseId: caseDraft.parentCaseId ?? '',
        }}
        onChange={(values) => {
          setCaseDraft((previous) => ({
            ...previous,
            ...values,
          }));
        }}
        onSave={handleCreateCase}
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
