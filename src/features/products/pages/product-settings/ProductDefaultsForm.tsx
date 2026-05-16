import type { ChangeEvent, JSX } from 'react';

import { FormSection, Input, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Button } from '@/shared/ui/primitives.public';

type ProductDefaultsSettings = Record<string, unknown>;

interface ProductDefaultsFormProps {
  settings: ProductDefaultsSettings;
  onUpdate: (settings: ProductDefaultsSettings) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

const readStringSetting = (
  settings: ProductDefaultsSettings,
  key: string,
  fallback = ''
): string => {
  const value = settings[key];
  return typeof value === 'string' ? value : fallback;
};

export function ProductDefaultsForm({
  settings,
  onUpdate,
  onSave,
  isSaving,
}: ProductDefaultsFormProps): JSX.Element {
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onUpdate({ defaultName: event.target.value });
  };
  const handleSaveClick = (): void => {
    onSave().catch((): undefined => undefined);
  };

  return (
    <FormSection title='Catalog Defaults' className='p-4 space-y-4'>
      <Input
        aria-label='Default Product Name'
        placeholder='Default Product Name'
        value={readStringSetting(settings, 'defaultName')}
        onChange={handleNameChange}
      />
      <SelectSimple
        ariaLabel='Default Status'
        value={readStringSetting(settings, 'defaultStatus', 'draft')}
        onValueChange={(value: string): void => onUpdate({ defaultStatus: value })}
        options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]}
      />
      <Button onClick={handleSaveClick} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Defaults'}
      </Button>
    </FormSection>
  );
}
