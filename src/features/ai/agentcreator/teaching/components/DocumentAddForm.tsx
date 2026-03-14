'use client';

import { Plus } from 'lucide-react';
import React from 'react';

import { Button, Input, Textarea, FormSection, FormField } from '@/shared/ui';

export type DocumentAddFormProps = {
  title: string;
  setTitle: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  tags: string;
  setTags: (v: string) => void;
  text: string;
  setText: (v: string) => void;
  onAdd: () => void;
  isAdding: boolean;
  isDeleting: boolean;
  collectionId: string | null;
};

export function DocumentAddForm(props: DocumentAddFormProps): React.JSX.Element {
  const {
    title,
    setTitle,
    source,
    setSource,
    tags,
    setTags,
    text,
    setText,
    onAdd,
    isAdding,
    isDeleting,
    collectionId,
  } = props;

  return (
    <FormSection title='Add Document' variant='subtle' className='p-6'>
      <div className='space-y-4'>
        <div className='grid gap-4 md:grid-cols-2'>
          <FormField label='Title (optional)'>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. Product naming rules'
             aria-label="e.g. Product naming rules" title="e.g. Product naming rules"/>
          </FormField>
          <FormField label='Source (optional)'>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder='e.g. internal wiki'
             aria-label="e.g. internal wiki" title="e.g. internal wiki"/>
          </FormField>
        </div>
        <FormField label='Tags (comma separated)'>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder='pricing, listings, seo'
           aria-label="pricing, listings, seo" title="pricing, listings, seo"/>
        </FormField>
        <FormField label='Text Content' description='Raw text to be vectorized and stored.'>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Paste knowledge content here...'
            className='min-h-[120px] font-mono text-xs'
           aria-label="Paste knowledge content here..." title="Paste knowledge content here..."/>
        </FormField>
        <div className='flex justify-end'>
          <Button
            onClick={onAdd}
            loading={isAdding}
            disabled={isDeleting || !collectionId || !text.trim()}
          >
            <Plus className='mr-2 size-4' />
            Add Document
          </Button>
        </div>
      </div>
    </FormSection>
  );
}
