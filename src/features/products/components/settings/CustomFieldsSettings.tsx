'use client';

import { Plus } from 'lucide-react';

import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import { Button } from '@/shared/ui/button';

import {
  CustomFieldDeleteModal,
  CustomFieldFormModal,
  CustomFieldsListSection,
} from './CustomFieldsSettings.components';
import { useCustomFieldsController } from './CustomFieldsSettings.controller';

type CustomFieldsSettingsProps = {
  loading: boolean;
  customFields: ProductCustomFieldDefinition[];
  onRefresh: () => void;
};

export function CustomFieldsSettings(props: CustomFieldsSettingsProps): React.JSX.Element {
  const controller = useCustomFieldsController(props.onRefresh);

  return (
    <div className='space-y-5'>
      <div className='flex justify-start'>
        <Button onClick={controller.openCreateModal} className='bg-white text-gray-900 hover:bg-gray-200'>
          <Plus className='mr-2 size-4' />
          Add Custom Field
        </Button>
      </div>
      <CustomFieldsListSection
        customFields={props.customFields}
        loading={props.loading}
        onDelete={controller.handleDelete}
        onEdit={controller.openEditModal}
      />
      <CustomFieldFormModal controller={controller} />
      <CustomFieldDeleteModal controller={controller} />
    </div>
  );
}
