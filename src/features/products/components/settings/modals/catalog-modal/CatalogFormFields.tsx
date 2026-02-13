import React from 'react';
import { Input, Label, Textarea, Checkbox } from '@/shared/ui';

interface CatalogFormFieldsProps {
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  isDefault: boolean;
  onIsDefaultChange: (value: boolean) => void;
}

export function CatalogFormFields({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  isDefault,
  onIsDefaultChange,
}: CatalogFormFieldsProps): React.JSX.Element {
  return (
    <div className='grid gap-4'>
      <div className='space-y-2'>
        <Label htmlFor='catalog-name'>Name</Label>
        <Input
          id='catalog-name'
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder='e.g. Main Store'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='catalog-desc'>Description</Label>
        <Textarea
          id='catalog-desc'
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder='Optional description...'
          rows={2}
        />
      </div>
      <Label className='flex items-center gap-2 text-gray-300'>
        <Checkbox
          checked={isDefault}
          onCheckedChange={(v) => onIsDefaultChange(Boolean(v))}
        />
        Set as default catalog
      </Label>
    </div>
  );
}
