'use client';

import React from 'react';

import { Label, Textarea } from '@/shared/ui';

import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';
import { ValidationActionButton } from './ValidationActionButton';
import { ValidationPanel } from './ValidationPanel';
import { ValidationPanelHeader } from './ValidationPanelHeader';

export function EntityCollectionMapPanel(): React.JSX.Element {
  const { collectionMapDraft, setCollectionMapDraft, handleApplyCollectionMap } =
    useAdminAiPathsValidationContext();

  return (
    <ValidationPanel>
      <ValidationPanelHeader
        title='Entity Collection Map'
        trailing={
          <ValidationActionButton onClick={handleApplyCollectionMap}>Apply Map</ValidationActionButton>
        }
      />
      <Label className='text-xs text-gray-400'>Format: entity:collection</Label>
      <Textarea
        className='mt-2 min-h-[120px] font-mono text-xs'
        value={collectionMapDraft}
        onChange={(event) => setCollectionMapDraft(event.target.value)}
        aria-label='Entity collection map'
        placeholder='product:ProductCollection&#10;customer:CustomerCollection'
       title='product:ProductCollection&#10;customer:CustomerCollection'/>
    </ValidationPanel>
  );
}
