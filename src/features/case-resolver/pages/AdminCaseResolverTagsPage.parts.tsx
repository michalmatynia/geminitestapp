'use client';

import { Plus } from 'lucide-react';
import React from 'react';

import type { CaseResolverTag } from '@/shared/contracts/case-resolver';
import {
  Button,
  FormSection,
  Skeleton,
  SimpleSettingsList,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import type { CaseResolverTagFormData } from '../entity-form-data';
import { CaseResolverTagModal } from '../components/modals/CaseResolverEntityModalVariants';
import { buildCaseResolverTagListItems } from './AdminCaseResolverTagsPage.helpers';

export function AdminCaseResolverTagsHeaderAction(props: {
  onCreate: () => void;
}): React.JSX.Element {
  const { onCreate } = props;

  return (
    <Button
      onClick={onCreate}
      variant='outline'
      className='border-border/70 bg-transparent text-white hover:bg-muted/40'
    >
      <Plus className='mr-2 size-4' />
      Add Tag
    </Button>
  );
}

export function AdminCaseResolverTagsListSection(props: {
  isLoading: boolean;
  onDelete: (tag: CaseResolverTag) => void;
  onEdit: (tag: CaseResolverTag) => void;
  tagPathById: Map<string, string>;
  tags: CaseResolverTag[];
}): React.JSX.Element {
  const { isLoading, onDelete, onEdit, tagPathById, tags } = props;

  return (
    <FormSection title='Tags' className='p-4'>
      <div className='mt-4'>
        {isLoading ? (
          <div className='space-y-2'>
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-8 w-full' />
          </div>
        ) : (
          <SimpleSettingsList
            items={buildCaseResolverTagListItems(tags, tagPathById)}
            isLoading={isLoading}
            onEdit={(item) => onEdit(item.original)}
            onDelete={(item) => onDelete(item.original)}
            emptyMessage='No tags yet. Create tags to classify Case Resolver documents.'
            columns={2}
          />
        )}
      </div>
    </FormSection>
  );
}

export function AdminCaseResolverTagsDialogs(props: {
  editingTag: CaseResolverTag | null;
  formData: CaseResolverTagFormData;
  isSaving: boolean;
  onCloseModal: () => void;
  onConfirmDelete: () => void;
  onSave: () => void;
  parentTagOptions: Array<{ value: string; label: string }>;
  setFormData: React.Dispatch<React.SetStateAction<CaseResolverTagFormData>>;
  setTagToDelete: (tag: CaseResolverTag | null) => void;
  showModal: boolean;
  tagToDelete: CaseResolverTag | null;
}): React.JSX.Element {
  const {
    editingTag,
    formData,
    isSaving,
    onCloseModal,
    onConfirmDelete,
    onSave,
    parentTagOptions,
    setFormData,
    setTagToDelete,
    showModal,
    tagToDelete,
  } = props;

  return (
    <>
      <ConfirmModal
        isOpen={Boolean(tagToDelete)}
        onClose={() => setTagToDelete(null)}
        onConfirm={onConfirmDelete}
        title='Delete Tag'
        message={`Delete tag "${tagToDelete?.label ?? ''}"? This action cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      <CaseResolverTagModal
        isOpen={showModal}
        onClose={onCloseModal}
        onSuccess={(): void => {}}
        item={editingTag}
        formData={formData}
        setFormData={setFormData}
        parentTagOptions={parentTagOptions}
        isSaving={isSaving}
        onSave={onSave}
      />
    </>
  );
}
