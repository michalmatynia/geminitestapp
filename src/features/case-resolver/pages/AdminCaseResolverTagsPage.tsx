'use client';

import React from 'react';

import { AdminCaseResolverPageLayout } from '@/shared/ui';

import { useAdminCaseResolverTagsPageRuntime } from './AdminCaseResolverTagsPage.hooks';
import {
  AdminCaseResolverTagsDialogs,
  AdminCaseResolverTagsHeaderAction,
  AdminCaseResolverTagsListSection,
} from './AdminCaseResolverTagsPage.parts';

export function AdminCaseResolverTagsPage(): React.JSX.Element {
  const runtime = useAdminCaseResolverTagsPageRuntime();

  return (
    <AdminCaseResolverPageLayout
      title='Case Resolver Tags'
      current='Tags'
      headerActions={<AdminCaseResolverTagsHeaderAction onCreate={runtime.openCreateModal} />}
      containerClassName='page-section-compact'
    >
      <AdminCaseResolverTagsListSection
        isLoading={runtime.settingsStore.isLoading}
        tags={runtime.tags}
        tagPathById={runtime.tagPathById}
        onEdit={runtime.openEditModal}
        onDelete={runtime.setTagToDelete}
      />
      <AdminCaseResolverTagsDialogs
        editingTag={runtime.editingTag}
        formData={runtime.formData}
        isSaving={runtime.updateSetting.isPending}
        onCloseModal={() => runtime.setShowModal(false)}
        onConfirmDelete={() => {
          void runtime.handleConfirmDelete();
        }}
        onSave={() => {
          void runtime.handleSave();
        }}
        parentTagOptions={runtime.parentTagOptions}
        setFormData={runtime.setFormData}
        setTagToDelete={runtime.setTagToDelete}
        showModal={runtime.showModal}
        tagToDelete={runtime.tagToDelete}
      />
    </AdminCaseResolverPageLayout>
  );
}
