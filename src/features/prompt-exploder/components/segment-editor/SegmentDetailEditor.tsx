'use client';

import React from 'react';
import { Card, Button, FormField, SelectSimple, StatusToggle, Textarea } from '@/shared/ui';
import { useDocumentState, useDocumentActions } from '../../context/hooks/useDocument';
import { useSegmentEditorActions } from '../../context/hooks/useSegmentEditor';
import { ParameterBlockEditor } from './ParameterBlockEditor';
import { ListItemsEditor } from './ListItemsEditor';
import { PromptExploderHierarchyTreeProvider } from '../PromptExploderHierarchyTreeContext';
import { PromptExploderHierarchyTreeEditor } from '../PromptExploderHierarchyTreeEditor';
import { SegmentEditorSubsectionsPanel } from '../SegmentEditorSubsectionsPanel';
import { SegmentEditorInsightsPanel } from '../SegmentEditorInsightsPanel';
import { SegmentEditorListItemLogicalEditor } from '../SegmentEditorListItemLogicalEditor';
import type { PromptExploderSegment, PromptExploderSegmentType } from '../../types';

const promptExploderSupportsSegmentTextSplit = (
  segment: PromptExploderSegment | null
): boolean =>
  Boolean(
    segment &&
      (segment.type === 'assigned_text' ||
        segment.type === 'metadata' ||
        segment.type === 'parameter_block')
  );

export function SegmentDetailEditor(): React.JSX.Element {
  const { documentState, selectedSegmentId, selectedSegment } = useDocumentState();
  const { updateSegment } = useDocumentActions();
  const {
    addSegmentRelative,
    removeSegment,
    splitSegment,
    mergeSegmentWithPrevious,
    mergeSegmentWithNext,
  } = useSegmentEditorActions();

  if (!selectedSegment) {
    return (
      <Card variant='subtle' padding='md' className='max-h-[65vh] bg-card/20'>
        <div className='text-sm text-gray-500'>Select a segment to edit.</div>
      </Card>
    );
  }

  const segments = documentState?.segments || [];
  const selectedSegmentIndex = segments.findIndex((s) => s.id === selectedSegmentId);
  const canMergeSelectedWithPrevious = selectedSegmentIndex > 0;
  const canMergeSelectedWithNext = selectedSegmentIndex >= 0 && selectedSegmentIndex < segments.length - 1;
  const canSplitSelectedSegment = promptExploderSupportsSegmentTextSplit(selectedSegment);

  const segment = selectedSegment;

  return (
    <Card variant='subtle' padding='md' className='max-h-[65vh] space-y-3 overflow-auto bg-card/20'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button variant='outline' size='sm' onClick={() => addSegmentRelative(segment.id, 'before')}>Add Above</Button>
        <Button variant='outline' size='sm' onClick={() => addSegmentRelative(segment.id, 'after')}>Add Below</Button>
        <Button variant='outline' size='sm' disabled={!canSplitSelectedSegment} onClick={() => splitSegment(segment.id, (segment.text ?? '').length, (segment.text ?? '').length)}>Split at End</Button>
        <Button variant='outline' size='sm' disabled={!canMergeSelectedWithPrevious} onClick={() => mergeSegmentWithPrevious(segment.id)}>Merge Prev</Button>
        <Button variant='outline' size='sm' disabled={!canMergeSelectedWithNext} onClick={() => mergeSegmentWithNext(segment.id)}>Merge Next</Button>
        <Button variant='destructive' size='sm' onClick={() => removeSegment(segment.id)}>Remove</Button>
      </div>

      <div className='grid gap-3 md:grid-cols-2'>
        <FormField label='Type'>
          <SelectSimple size='sm' value={segment.type} onValueChange={(val) => {
            updateSegment(segment.id, (c: PromptExploderSegment) => ({ ...c, type: val as PromptExploderSegmentType }));
          }} options={[
            { value: 'metadata', label: 'Metadata' },
            { value: 'assigned_text', label: 'Assigned Text' },
            { value: 'list', label: 'List' },
            { value: 'parameter_block', label: 'Parameter Block' },
            { value: 'referential_list', label: 'Referential List' },
            { value: 'sequence', label: 'Sequence' },
            { value: 'hierarchical_list', label: 'Hierarchical List' },
            { value: 'conditional_list', label: 'Conditional List' },
            { value: 'qa_matrix', label: 'QA Matrix' },
          ]} />
        </FormField>
        <FormField label='Include In Output'>
          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
            <StatusToggle enabled={segment.includeInOutput} onToggle={() => {
              updateSegment(segment.id, (c: PromptExploderSegment) => ({ ...c, includeInOutput: !c.includeInOutput }));
            }} />
          </div>
        </FormField>
      </div>

      {segment.type === 'parameter_block' && <ParameterBlockEditor />}
      
      {['list', 'referential_list', 'conditional_list'].includes(segment.type) && <ListItemsEditor />}

      {segment.type === 'hierarchical_list' && (
        <PromptExploderHierarchyTreeProvider value={{
          items: segment.listItems,
          onChange: (next) => updateSegment(segment.id, (c: PromptExploderSegment) => ({ ...c, listItems: next })),
          renderLogicalEditor: ({ item, onChange }) => <SegmentEditorListItemLogicalEditor item={item} onChange={onChange} />,
          emptyLabel: 'No hierarchy items detected.',
        }}>
          <PromptExploderHierarchyTreeEditor />
        </PromptExploderHierarchyTreeProvider>
      )}

      {(segment.type === 'sequence' || segment.type === 'qa_matrix') && <SegmentEditorSubsectionsPanel />}

      {segment.type === 'assigned_text' && (
        <FormField label='Body'>
          <Textarea className='min-h-[180px] font-mono text-[12px]' value={segment.text ?? ''} onChange={(e) => updateSegment(segment.id, (c: PromptExploderSegment) => ({ ...c, text: e.target.value, raw: e.target.value }))} />
        </FormField>
      )}

      <SegmentEditorInsightsPanel />
    </Card>
  );
}
