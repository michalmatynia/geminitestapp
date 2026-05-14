'use client';

import React from 'react';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';
import { BRAIN_CATALOG_POOL_LABELS, BRAIN_CATALOG_POOL_VALUES } from '@/shared/lib/ai-brain/catalog-entries';
import type { CatalogEntryEditorState } from './useCatalogEditor';

const CATALOG_ENTRY_EDITOR_FIELDS: SettingsPanelField<CatalogEntryEditorState>[] = [
  {
    key: 'value',
    label: 'Item ID',
    type: 'text',
    placeholder: 'gpt-4.1-mini',
    required: true,
  },
  {
    key: 'pool',
    label: 'Pool',
    type: 'select',
    options: BRAIN_CATALOG_POOL_VALUES.map((pool) => ({
      label: BRAIN_CATALOG_POOL_LABELS[pool],
      value: pool,
    })),
  },
];

interface CatalogEntryEditorProps {
  editorOpen: boolean;
  editorMode: 'create' | 'edit';
  editorState: CatalogEntryEditorState;
  onClose: () => void;
  onChange: (patch: Partial<CatalogEntryEditorState>) => void;
  onSave: () => void;
}

export function CatalogEntryEditor({
  editorOpen,
  editorMode,
  editorState,
  onClose,
  onChange,
  onSave,
}: CatalogEntryEditorProps): React.JSX.Element {
  return (
    <SettingsPanelBuilder<CatalogEntryEditorState>
      open={editorOpen}
      onClose={onClose}
      title={editorMode === 'edit' ? 'Edit Catalog Item' : 'Add Catalog Item'}
      subtitle='Update item ID and pool. Save Brain settings to persist changes.'
      fields={CATALOG_ENTRY_EDITOR_FIELDS}
      values={editorState}
      onChange={onChange}
      onSave={onSave}
      size='sm'
    />
  );
}
