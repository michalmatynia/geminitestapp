'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Button, Input } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

export interface ParserMappingListProps {
  entries: Array<[string, string]>;
  updateMappingKey: (index: number, value: string) => void;
  updateMappingPath: (index: number, value: string) => void;
  uniqueSuggestedPathOptions: Array<LabeledOptionDto<string>>;
  removeMapping: (index: number) => void;
}

export function ParserMappingList(props: ParserMappingListProps): React.JSX.Element {
  const {
    entries,
    updateMappingKey,
    updateMappingPath,
    uniqueSuggestedPathOptions,
    removeMapping,
  } = props;

  return (
    <div className='space-y-3'>
      {entries.map(([key, path], index) => (
        <div
          key={`${key}-${index}`}
          className='grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-start'
        >
          <Input
            variant='subtle'
            size='sm'
            value={key}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              updateMappingKey(index, event.target.value)
            }
            aria-label='Output key'
            placeholder='output key'
           title='output key'/>
          <div className='space-y-2'>
            <Input
              variant='subtle'
              size='sm'
              value={path}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                updateMappingPath(index, event.target.value)
              }
              aria-label='Output path'
              placeholder='$.path.to.value'
             title='$.path.to.value'/>
            <SelectSimple
              size='sm'
              onValueChange={(value: string) => updateMappingPath(index, value)}
              options={uniqueSuggestedPathOptions}
              placeholder='Pick a suggested path'
              ariaLabel='Suggested output path'
              variant='subtle'
              triggerClassName='h-8 text-[10px]'
              value=''
             title='Pick a suggested path'/>
          </div>
          <Button
            type='button'
            variant='outline'
            disabled={entries.length <= 1}
            className='h-8 px-2 text-[10px]'
            onClick={() => removeMapping(index)}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
