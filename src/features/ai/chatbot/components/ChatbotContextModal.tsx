'use client';

import React, { useMemo } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { 
  Button, 
  Input, 
  Tag, 
} from '@/shared/ui';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import type { ContextDraft } from '../hooks/useChatbotContextState';

interface ChatbotContextModalProps extends EntityModalProps<ContextDraft> {
  modalDraft: ContextDraft | null;
  setModalDraft: React.Dispatch<React.SetStateAction<ContextDraft | null>>;
  tagDraft: string;
  setTagDraft: (value: string) => void;
  isSaving: boolean;
  onSave: () => void;
}

export function ChatbotContextModal({
  isOpen,
  onClose,
  item: editingItem,
  modalDraft,
  setModalDraft,
  tagDraft,
  setTagDraft,
  isSaving,
  onSave,
}: ChatbotContextModalProps): React.JSX.Element | null {
  const effectiveDraft = useMemo<ContextDraft>(() => {
    if (modalDraft) return modalDraft;
    return {
      id: '',
      title: '',
      content: '',
      tags: [],
      source: 'manual',
      createdAt: '',
      active: false,
    };
  }, [modalDraft]);
  const draftTags = effectiveDraft.tags ?? [];

  const fields: SettingsField<ContextDraft>[] = useMemo(() => [
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      placeholder: 'Enter a descriptive title',
      required: true,
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'custom',
      render: () => (
        <div className='space-y-2'>
          <div className='flex flex-wrap gap-2'>
            {draftTags.map((tag: string) => (
              <Tag
                key={tag}
                label={tag}
                onRemove={() => {
                  setModalDraft((prev) =>
                    prev
                      ? {
                        ...prev,
                        tags: (prev.tags || []).filter(
                          (existing) => existing !== tag
                        ),
                      }
                      : prev
                  );
                }}
              />
            ))}
          </div>
          <div className='flex gap-2'>
            <Input
              placeholder='Add tag'
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const nextTag = tagDraft.trim();
                  if (!nextTag) return;
                  setModalDraft((prev) =>
                    prev
                      ? {
                        ...prev,
                        tags: Array.from(
                          new Set([...(prev.tags || []), nextTag])
                        ),
                      }
                      : prev
                  );
                  setTagDraft('');
                }
              }}
              disabled={isSaving}
              className='h-9'
            />
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                const nextTag = tagDraft.trim();
                if (!nextTag) return;
                setModalDraft((prev) =>
                  prev
                    ? {
                      ...prev,
                      tags: Array.from(
                        new Set([...(prev.tags || []), nextTag])
                      ),
                    }
                    : prev
                );
                setTagDraft('');
              }}
              disabled={isSaving}
              className='h-9'
            >
              Add
            </Button>
          </div>
        </div>
      )
    },
    {
      key: 'content',
      label: 'Content',
      type: 'textarea',
      placeholder: 'Add instructions...',
      className: 'min-h-[240px] font-mono text-xs',
    },
    {
      key: 'active',
      label: 'Active in global context',
      type: 'checkbox',
    }
  ], [draftTags, tagDraft, isSaving, setModalDraft, setTagDraft]);

  const handleChange = (vals: Partial<ContextDraft>) => {
    setModalDraft(prev => prev ? ({ ...prev, ...vals }) : prev);
  };

  return (
    <SettingsPanelBuilder
      open={isOpen && Boolean(modalDraft)}
      onClose={onClose}
      title={editingItem ? 'Edit Context' : 'New Context'}
      fields={fields}
      values={effectiveDraft}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
      size='lg'
    />
  );
}
