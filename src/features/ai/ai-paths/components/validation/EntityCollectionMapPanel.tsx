'use client';

import React from 'react';

import { Button, Card, Label, Textarea } from '@/shared/ui';

import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';

export function EntityCollectionMapPanel(): React.JSX.Element {
  const { collectionMapDraft, setCollectionMapDraft, handleApplyCollectionMap } =
    useAdminAiPathsValidationContext();

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold text-white'>Entity Collection Map</h3>
        <Button type='button' variant='outline' size='sm' onClick={handleApplyCollectionMap}>
          Apply Map
        </Button>
      </div>
      <Label className='text-xs text-gray-400'>Format: entity:collection</Label>
      <Textarea
        className='mt-2 min-h-[120px] font-mono text-xs'
        value={collectionMapDraft}
        onChange={(event) => setCollectionMapDraft(event.target.value)}
        aria-label='Entity collection map'
        placeholder='product:ProductCollection&#10;customer:CustomerCollection'
       title='product:ProductCollection&#10;customer:CustomerCollection'/>
    </Card>
  );
}
