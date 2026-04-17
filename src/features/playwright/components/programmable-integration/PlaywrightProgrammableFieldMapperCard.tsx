'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import {
  PROGRAMMABLE_FIELD_TARGET_OPTIONS,
  type ProgrammableFieldMapperRow,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Button, Card, Input } from '@/shared/ui/primitives.public';

type Props = Pick<
  PlaywrightProgrammableIntegrationPageModel,
  | 'fieldMapperRows'
  | 'handleAddFieldMapping'
  | 'handleDeleteFieldMapping'
  | 'handleUpdateFieldMapping'
>;

function FieldMapperRowCard({
  handleDeleteFieldMapping,
  handleUpdateFieldMapping,
  row,
}: {
  handleDeleteFieldMapping: Props['handleDeleteFieldMapping'];
  handleUpdateFieldMapping: Props['handleUpdateFieldMapping'];
  row: Props['fieldMapperRows'][number];
}): React.JSX.Element {
  return (
    <div className='grid gap-3 rounded-lg border border-border/50 bg-background/30 p-3 md:grid-cols-[minmax(0,1fr)_220px_auto]'>
      <FormField label='Source Key'>
        <Input
          value={row.sourceKey}
          onChange={(event) =>
            handleUpdateFieldMapping(row.id, { sourceKey: event.target.value })
          }
          placeholder='product.title or data.name'
          aria-label='Field mapper source key'
        />
      </FormField>
      <FormField label='Target Field'>
        <SelectSimple
          value={row.targetField}
          onValueChange={(value) =>
            handleUpdateFieldMapping(row.id, {
              targetField: value as ProgrammableFieldMapperRow['targetField'],
            })
          }
          options={PROGRAMMABLE_FIELD_TARGET_OPTIONS}
          ariaLabel='Field mapper target field'
          title='Field mapper target field'
        />
      </FormField>
      <div className='flex items-end'>
        <Button type='button' variant='ghost' onClick={() => handleDeleteFieldMapping(row.id)}>
          <Trash2 className='mr-1.5 h-3.5 w-3.5' />
          Remove
        </Button>
      </div>
    </div>
  );
}

export function PlaywrightProgrammableFieldMapperCard({
  fieldMapperRows,
  handleAddFieldMapping,
  handleDeleteFieldMapping,
  handleUpdateFieldMapping,
}: Props): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border bg-card/40'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-base font-semibold text-white'>Field Mapper</h2>
          <p className='mt-1 text-sm text-gray-400'>
            Map arbitrary script output keys into normalized product fields before import.
          </p>
        </div>
        <Button type='button' variant='outline' onClick={handleAddFieldMapping}>
          <Plus className='mr-1.5 h-3.5 w-3.5' />
          Add Mapping
        </Button>
      </div>

      <div className='mt-4 space-y-3'>
        {fieldMapperRows.length === 0 ? (
          <div className='rounded-lg border border-dashed border-border/60 px-4 py-6 text-sm text-gray-400'>
            No field mappings configured. Fallback keys like <code>title</code>,
            <code className='ml-1'>description</code>, <code className='ml-1'>price</code>, and
            <code className='ml-1'>images</code> will still be read when present.
          </div>
        ) : (
          fieldMapperRows.map((row) => (
            <FieldMapperRowCard
              key={row.id}
              row={row}
              handleDeleteFieldMapping={handleDeleteFieldMapping}
              handleUpdateFieldMapping={handleUpdateFieldMapping}
            />
          ))
        )}
      </div>
    </Card>
  );
}
