'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import type { AiBrainCatalogEntry } from '../settings';
import { BrainCatalogTree } from './BrainCatalogTree';

interface CatalogSectionProps {
  catalogEntries: AiBrainCatalogEntry[];
  saving: boolean;
  onSyncPlaywrightPersonas: () => void;
  onOpenCreateEditor: () => void;
  onSetCatalogEntries: (entries: AiBrainCatalogEntry[]) => void;
  onOpenEditEditor: (entry: AiBrainCatalogEntry) => void;
  onRemoveEntry: (entry: AiBrainCatalogEntry) => void;
}

export function CatalogSection({
  catalogEntries,
  saving,
  onSyncPlaywrightPersonas,
  onOpenCreateEditor,
  onSetCatalogEntries,
  onOpenEditEditor,
  onRemoveEntry,
}: CatalogSectionProps): React.JSX.Element {
  return (
    <FormSection
      title='Model and Agent Catalog'
      description='Flat Brain catalog list across all pools. Drag to reorder, click edit to update ID/pool.'
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button variant='outline' size='sm' onClick={onSyncPlaywrightPersonas}>
            Sync Playwright Personas
          </Button>
          <Button variant='outline' size='sm' onClick={onOpenCreateEditor}>
            <Plus className='mr-1.5 size-3.5' />
            Add Item
          </Button>
        </div>
      }
      className='p-4'
    >
      <div className='mt-2 text-[11px] text-gray-500'>
        {catalogEntries.length} catalog item{catalogEntries.length === 1 ? '' : 's'}.
      </div>
      <div className='mt-3'>
        <BrainCatalogTree
          entries={catalogEntries}
          onChange={onSetCatalogEntries}
          onEdit={onOpenEditEditor}
          onRemove={onRemoveEntry}
          isPending={saving}
        />
      </div>
    </FormSection>
  );
}
