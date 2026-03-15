'use client';

import { Input, Textarea, FormField, FormActions } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

import {
  useDatabaseSaveQueryPresetDialogActionsContext,
  useDatabaseSaveQueryPresetDialogStateContext,
} from './DatabaseSaveQueryPresetDialogContext';

export function DatabaseSaveQueryPresetDialog(): React.JSX.Element {
  const { open, newQueryPresetName, queryTemplateValue } =
    useDatabaseSaveQueryPresetDialogStateContext();
  const { onOpenChange, setNewQueryPresetName, onCancel, onSave } =
    useDatabaseSaveQueryPresetDialogActionsContext();
  return (
    <DetailModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title='Save Query Preset'
      subtitle='Name this query to reuse it in other database nodes.'
      size='sm'
      footer={<FormActions onSave={onSave} onCancel={onCancel} saveText='Save preset' />}
    >
      <div className='space-y-4'>
        <FormField label='Preset name' id='preset-name'>
          <Input
            id='preset-name'
            value={newQueryPresetName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              setNewQueryPresetName(event.target.value)
            }
            placeholder='My query preset'
           aria-label='My query preset' title='My query preset'/>
        </FormField>
        <FormField label='Query preview'>
          <Textarea readOnly className='min-h-[120px] text-xs' value={queryTemplateValue}  aria-label='Query preview' title='Query preview'/>
        </FormField>
      </div>
    </DetailModal>
  );
}
