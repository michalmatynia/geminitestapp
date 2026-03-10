'use client';

import React from 'react';

import { FormField } from '@/shared/ui';

import { useDocumentActions, useDocumentState } from '../../context/hooks/useDocument';
import { PromptExploderHierarchyTreeProvider } from '../PromptExploderHierarchyTreeContext';
import { PromptExploderHierarchyTreeEditor } from '../PromptExploderHierarchyTreeEditor';
import { SegmentEditorListItemLogicalEditor } from '../SegmentEditorListItemLogicalEditor';

import type { PromptExploderSegment } from '../../types';

export function ListItemsEditor(): React.JSX.Element {
  const { selectedSegment } = useDocumentState();
  const { updateSegment } = useDocumentActions();

  if (!selectedSegment) return <></>;

  return (
    <FormField label='List Items'>
      <PromptExploderHierarchyTreeProvider
        value={{
          items: selectedSegment.listItems,
          onChange: (next) =>
            updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
              ...current,
              listItems: next,
            })),
          renderLogicalEditor: ({ item, onChange }) => (
            <SegmentEditorListItemLogicalEditor item={item} onChange={onChange} />
          ),
          emptyLabel: 'No list items detected.',
        }}
      >
        <PromptExploderHierarchyTreeEditor />
      </PromptExploderHierarchyTreeProvider>
    </FormField>
  );
}
