import React from 'react';

import { Input, Label, Textarea, Checkbox } from '@/shared/ui';

import { useCatalogModalContext } from './context/CatalogModalContext';

export function CatalogFormFields(): React.JSX.Element {
  const { form, setForm } = useCatalogModalContext();
  return (
    <div className='grid gap-4'>
      <div className='space-y-2'>
        <Label htmlFor='catalog-name'>Name</Label>
        <Input
          id='catalog-name'
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder='e.g. Main Store'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='catalog-desc'>Description</Label>
        <Textarea
          id='catalog-desc'
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder='Optional description...'
          rows={2}
        />
      </div>
      <Label className='flex items-center gap-2 text-gray-300'>
        <Checkbox
          checked={form.isDefault}
          onCheckedChange={(v) => {
            setForm((p) => ({ ...p, isDefault: Boolean(v) }));
          }}
        />
        Set as default catalog
      </Label>
    </div>
  );
}
