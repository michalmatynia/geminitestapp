'use client';

import React from 'react';
import { Input } from '@/shared/ui/primitives.public';
import { FormSection, FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AdminMenuLayoutNodeEntry, AdminMenuLayoutNodeSemantic } from '../../admin-menu-layout-types';

const NODE_TYPE_OPTIONS: Array<LabeledOptionDto<AdminMenuLayoutNodeSemantic>> = [
  { value: 'group', label: 'Group' },
  { value: 'link', label: 'Link' },
];

interface SelectedNodeEditorProps {
  selectedNodeId: string;
  selectedNode: AdminMenuLayoutNodeEntry;
  selectedNodeSemantic: AdminMenuLayoutNodeSemantic;
  updateCustomNodeLabelById: (id: string, val: string) => void;
  updateCustomNodeSemanticById: (id: string, val: AdminMenuLayoutNodeSemantic) => void;
  updateCustomNodeHrefById: (id: string, val: string) => void;
}

export function SelectedNodeEditor({ selectedNodeId, selectedNode, selectedNodeSemantic, updateCustomNodeLabelById, updateCustomNodeSemanticById, updateCustomNodeHrefById }: SelectedNodeEditorProps): React.JSX.Element {
  const isBuiltIn = selectedNode.isBuiltIn === true;
  return (
    <FormSection title='Selected Item' description='Edit properties.' variant='subtle' className='p-4' actions={<StatusBadge status={isBuiltIn ? 'Built-in' : 'Custom'} variant={isBuiltIn ? 'warning' : 'success'} size='sm' className='font-bold' />}>
      <div className='grid gap-3 md:grid-cols-2'>
        <FormField label='Label'>
          <Input value={selectedNode.label} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCustomNodeLabelById(selectedNodeId, e.target.value)} className='h-8 bg-gray-900/40 text-xs' disabled={isBuiltIn} aria-label='Label' title='Label' />
        </FormField>
        <FormField label='Type'>
          <SelectSimple size='sm' value={selectedNodeSemantic} options={NODE_TYPE_OPTIONS} onValueChange={(v: string) => updateCustomNodeSemanticById(selectedNodeId, v as AdminMenuLayoutNodeSemantic)} disabled={isBuiltIn} triggerClassName='h-8 text-xs' ariaLabel='Type' title='Type' />
        </FormField>
      </div>
      {selectedNodeSemantic === 'link' && (
        <FormField label='Href' className='mt-3'>
          <Input value={selectedNode.href ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCustomNodeHrefById(selectedNodeId, e.target.value)} placeholder='/admin/...' className='h-8 bg-gray-900/40 text-xs' disabled={isBuiltIn} aria-label='Href' title='Href' />
        </FormField>
      )}
      {isBuiltIn && <p className='mt-3 text-[11px] text-amber-200/80'>Built-in metadata is locked.</p>}
    </FormSection>
  );
}
