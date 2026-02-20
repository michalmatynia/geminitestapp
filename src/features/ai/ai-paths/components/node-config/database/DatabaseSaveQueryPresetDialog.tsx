'use client';

import { Button, Input, Textarea, FormField } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

import { useDatabaseSaveQueryPresetDialogContext } from './DatabaseSaveQueryPresetDialogContext';

export function DatabaseSaveQueryPresetDialog(): React.JSX.Element {
  const {
    open,
    onOpenChange,
    newQueryPresetName,
    setNewQueryPresetName,
    queryTemplateValue,
    onCancel,
    onSave,
  } = useDatabaseSaveQueryPresetDialogContext();
  return (
    <DetailModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title='Save Query Preset'
      subtitle='Name this query to reuse it in other database nodes.'
      size='sm'
      footer={
        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={(): void => onCancel()}
          >
            Cancel
          </Button>
          <Button
            type='button'
            variant='default'
            onClick={(): void => onSave()}
          >
            Save preset
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        <FormField label='Preset name' id='preset-name'>
          <Input
            id='preset-name'
            value={newQueryPresetName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setNewQueryPresetName(event.target.value)}
            placeholder='My query preset'
          />
        </FormField>
        <FormField label='Query preview'>
          <Textarea
            readOnly
            className='min-h-[120px] text-xs'
            value={queryTemplateValue}
          />
        </FormField>
      </div>
    </DetailModal>
  );
}
