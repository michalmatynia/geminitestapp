'use client';

import React from 'react';

import { 
  Button, 
  Input, 
  Textarea, 
  FormModal, 
  Checkbox, 
  Tag, 
  FormField,
} from '@/shared/ui';
import type { EntityModalProps } from '@/shared/types/modal-props';
import type { ContextDraft } from '../hooks/useChatbotContextState';

interface ChatbotContextModalProps extends EntityModalProps<ContextDraft> {
  modalDraft: ContextDraft;
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
  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit context' : 'New context'}
      onSave={onSave}
      isSaving={isSaving}
      saveText='Save context'
      size='lg'
    >
      <div className='space-y-4'>
        <FormField label='Title'>
          <Input
            value={modalDraft.title}
            onChange={(event) =>
              setModalDraft((prev) =>
                prev ? { ...prev, title: event.target.value } : prev
              )
            }
            disabled={isSaving}
          />
        </FormField>

        <FormField label='Tags'>
          <div className='flex flex-wrap gap-2 mb-2'>
            {(modalDraft.tags || []).map((tag: string) => (
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
            />
            <Button
              type='button'
              variant='outline'
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
            >
              Add
            </Button>
          </div>
        </FormField>

        <FormField label='Content'>
          <Textarea
            placeholder='Add instructions...'
            value={modalDraft.content}
            onChange={(event) =>
              setModalDraft((prev) =>
                prev ? { ...prev, content: event.target.value } : prev
              )
            }
            className='min-h-[240px] font-mono text-xs'
            disabled={isSaving}
          />
        </FormField>

        <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>
          <Checkbox
            checked={modalDraft.active}
            onCheckedChange={(checked) =>
              setModalDraft((prev) =>
                prev ? { ...prev, active: Boolean(checked) } : prev
              )
            }
          />
          Active in global context
        </label>
      </div>
    </FormModal>
  );
}
