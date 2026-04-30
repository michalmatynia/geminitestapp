'use client';

import { Plus } from 'lucide-react';
import React from 'react';

import type { ProductTag } from '@/shared/contracts/products/tags';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/layout';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Tag as UiTag } from '@/shared/ui/tag';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';

import type { TagFormData, TagsSettingsController } from './TagsSettings.controller';

const DEFAULT_TAG_COLOR = '#38bdf8';

const resolveTagColor = (color: string | null): string =>
  color !== null && color.length > 0 ? color : DEFAULT_TAG_COLOR;

const updateTagFormField = (
  setFormData: React.Dispatch<React.SetStateAction<TagFormData>>,
  fieldName: keyof TagFormData,
  value: string
): void => {
  setFormData((previous: TagFormData) => ({ ...previous, [fieldName]: value }));
};

export function TagsCatalogSection({
  controller,
}: {
  controller: TagsSettingsController;
}): React.JSX.Element {
  return (
    <FormSection
      title='Select Catalog'
      description='Tags are managed per catalog.'
      className='p-4'
    >
      <div className='w-full max-w-xs mt-4'>
        <SelectSimple
          size='sm'
          value={controller.selectedCatalogId ?? ''}
          onValueChange={controller.onCatalogChange}
          options={controller.catalogOptions}
          placeholder='Select a catalog...'
          ariaLabel='Catalog'
          title='Select a catalog...'
        />
      </div>
    </FormSection>
  );
}

export function TagsListSection({
  controller,
}: {
  controller: TagsSettingsController;
}): React.JSX.Element {
  return (
    <>
      <div className='flex justify-start'>
        <Button
          onClick={controller.openCreateModal}
          className='bg-white text-gray-900 hover:bg-gray-200'
        >
          <Plus className='size-4 mr-2' />
          Add Tag
        </Button>
      </div>

      <FormSection title={`Tags for "${controller.selectedCatalogName}"`} className='p-4'>
        <div className='mt-4'>
          <SimpleSettingsList
            items={controller.tags.map((tag: ProductTag) => ({
              id: tag.id,
              title: <UiTag label={tag.name} color={resolveTagColor(tag.color)} dot />,
              original: tag,
            }))}
            isLoading={controller.loading}
            onEdit={(item) => controller.openEditModal(item.original)}
            onDelete={(item) => controller.handleDelete(item.original)}
            emptyMessage='No tags yet. Tags help you categorize products within a catalog.'
          />
        </div>
      </FormSection>
    </>
  );
}

export function TagsNoCatalogsEmptyState(): React.JSX.Element {
  return (
    <EmptyState
      title='No catalogs found'
      description='Please create a catalog first in the Catalogs section before adding tags.'
    />
  );
}

export function TagsDeleteModal({
  controller,
}: {
  controller: TagsSettingsController;
}): React.JSX.Element {
  return (
    <ConfirmModal
      isOpen={controller.tagToDelete !== null}
      onClose={controller.closeDeleteModal}
      onConfirm={controller.handleConfirmDelete}
      title='Delete Tag'
      message={`Are you sure you want to delete tag "${controller.tagToDelete?.name}"? This action cannot be undone.`}
      confirmText='Delete'
      isDangerous={true}
    />
  );
}

function TagNameField({
  controller,
}: {
  controller: TagsSettingsController;
}): React.JSX.Element {
  return (
    <FormField label='Name'>
      <Input
        className='h-9'
        value={controller.formData.name}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          updateTagFormField(controller.setFormData, 'name', event.target.value);
        }}
        placeholder='Tag name'
        aria-label='Tag name'
        title='Tag name'
      />
    </FormField>
  );
}

function TagCatalogField({
  controller,
}: {
  controller: TagsSettingsController;
}): React.JSX.Element {
  return (
    <FormField label='Catalog'>
      <SelectSimple
        size='sm'
        value={controller.formData.catalogId}
        onValueChange={(value: string): void => {
          updateTagFormField(controller.setFormData, 'catalogId', value);
        }}
        options={controller.catalogOptions}
        placeholder='Select catalog'
        ariaLabel='Select catalog'
        title='Select catalog'
      />
    </FormField>
  );
}

function TagColorField({
  controller,
}: {
  controller: TagsSettingsController;
}): React.JSX.Element {
  return (
    <FormField label='Color'>
      <div className={`${UI_CENTER_ROW_SPACED_CLASSNAME} mt-1`}>
        <Input
          type='color'
          className='h-10 w-20 cursor-pointer rounded border border-border bg-gray-900'
          value={controller.formData.color}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            updateTagFormField(controller.setFormData, 'color', event.target.value);
          }}
          aria-label='Color'
          title='Color'
        />
        <Input
          type='text'
          className='flex-1 h-10 font-mono'
          value={controller.formData.color}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            updateTagFormField(controller.setFormData, 'color', event.target.value);
          }}
          placeholder={DEFAULT_TAG_COLOR}
          aria-label='Tag color hex value'
          title='Tag color hex value'
        />
      </div>
    </FormField>
  );
}

export function TagsFormModal({
  controller,
}: {
  controller: TagsSettingsController;
}): React.JSX.Element {
  return (
    <FormModal
      open={controller.showModal}
      onClose={controller.closeModal}
      title={controller.editingTag !== null ? 'Edit Tag' : 'Create Tag'}
      onSave={(): void => {
        void controller.handleSave();
      }}
      isSaving={controller.isSaving}
      size='md'
    >
      <div className='space-y-4'>
        <TagNameField controller={controller} />
        <TagCatalogField controller={controller} />
        <TagColorField controller={controller} />
      </div>
    </FormModal>
  );
}
