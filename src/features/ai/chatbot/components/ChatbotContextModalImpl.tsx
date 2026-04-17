'use client';

import React, { useCallback, useMemo } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui/modals';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Button, Input } from '@/shared/ui/primitives.public';
import { Tag } from '@/shared/ui/forms-and-actions.public';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

import type { ContextDraft } from '../hooks/useChatbotContextState';

interface ChatbotContextModalProps extends EntityModalProps<ContextDraft> {
  modalDraft: ContextDraft | null;
  setModalDraft: React.Dispatch<React.SetStateAction<ContextDraft | null>>;
  tagDraft: string;
  setTagDraft: (value: string) => void;
  isSaving: boolean;
  onSave: () => void | Promise<void>;
}

const EMPTY_CONTEXT_DRAFT: ContextDraft = {
  id: '',
  title: '',
  content: '',
  tags: [],
  source: 'manual',
  createdAt: '',
  active: false,
};

export interface ChatbotContextModalRuntimeValue {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: SettingsPanelField<ContextDraft>[];
  values: ContextDraft;
  onChange: (vals: Partial<ContextDraft>) => void;
  isSaving: boolean;
  onSave: () => Promise<void>;
}

export const {
  Context: ChatbotContextModalRuntimeContext,
  useStrictContext: useChatbotContextModalRuntime,
} = createStrictContext<ChatbotContextModalRuntimeValue>({
  hookName: 'useChatbotContextModalRuntime',
  providerName: 'ChatbotContextModalProvider',
  displayName: 'ChatbotContextModalRuntimeContext',
});

interface ChatbotContextModalProviderProps {
  value: ChatbotContextModalRuntimeValue;
  children: React.ReactNode;
}

export function ChatbotContextModalProvider(
  props: ChatbotContextModalProviderProps
): React.JSX.Element {
  const { value, children } = props;

  return (
    <ChatbotContextModalRuntimeContext.Provider value={value}>
      {children}
    </ChatbotContextModalRuntimeContext.Provider>
  );
}

type ChatbotContextTagsFieldProps = {
  draftTags: string[];
  tagDraft: string;
  setTagDraft: (value: string) => void;
  setModalDraft: React.Dispatch<React.SetStateAction<ContextDraft | null>>;
  isSaving: boolean;
};

const addTagToDraft = (draft: ContextDraft, tag: string): ContextDraft => ({
  ...draft,
  tags: Array.from(new Set([...draft.tags, tag])),
});

const removeTagFromDraft = (draft: ContextDraft, tag: string): ContextDraft => ({
  ...draft,
  tags: draft.tags.filter((existing) => existing !== tag),
});

function ChatbotContextTagList({
  draftTags,
  setModalDraft,
}: Pick<ChatbotContextTagsFieldProps, 'draftTags' | 'setModalDraft'>): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      {draftTags.map((tag: string) => (
        <Tag
          key={tag}
          label={tag}
          onRemove={() => {
            setModalDraft((prev) => (prev ? removeTagFromDraft(prev, tag) : prev));
          }}
        />
      ))}
    </div>
  );
}

function ChatbotContextTagInput({
  tagDraft,
  setTagDraft,
  setModalDraft,
  isSaving,
}: Omit<ChatbotContextTagsFieldProps, 'draftTags'>): React.JSX.Element {
  const addCurrentTag = (): void => {
    const nextTag = tagDraft.trim();
    if (nextTag.length === 0) return;
    setModalDraft((prev) => (prev ? addTagToDraft(prev, nextTag) : prev));
    setTagDraft('');
  };

  return (
    <div className='flex gap-2'>
      <Input
        placeholder='Add tag'
        value={tagDraft}
        onChange={(event) => setTagDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            addCurrentTag();
          }
        }}
        disabled={isSaving}
        className='h-9'
        aria-label='Add tag'
        title='Add tag'
      />
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={addCurrentTag}
        disabled={isSaving}
        className='h-9'
      >
        Add
      </Button>
    </div>
  );
}

function ChatbotContextTagsField(props: ChatbotContextTagsFieldProps): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <ChatbotContextTagList draftTags={props.draftTags} setModalDraft={props.setModalDraft} />
      <ChatbotContextTagInput
        tagDraft={props.tagDraft}
        setTagDraft={props.setTagDraft}
        setModalDraft={props.setModalDraft}
        isSaving={props.isSaving}
      />
    </div>
  );
}

const createChatbotContextFields = (
  props: ChatbotContextTagsFieldProps
): SettingsPanelField<ContextDraft>[] => [
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
    render: () => <ChatbotContextTagsField {...props} />,
  },
  {
    key: 'content',
    label: 'Content',
    type: 'textarea',
    placeholder: 'Add instructions...',
  },
  {
    key: 'active',
    label: 'Active in global context',
    type: 'checkbox',
  },
];

function useChatbotContextFields(
  props: ChatbotContextTagsFieldProps
): SettingsPanelField<ContextDraft>[] {
  const { draftTags, tagDraft, isSaving, setModalDraft, setTagDraft } = props;

  return useMemo(
    () => createChatbotContextFields(props),
    [draftTags, tagDraft, isSaving, setModalDraft, setTagDraft, props]
  );
}

type ChatbotContextModalRuntimeInput = {
  isOpen: boolean;
  modalDraft: ContextDraft | null;
  editingItem: ContextDraft | null | undefined;
  onClose: () => void;
  fields: SettingsPanelField<ContextDraft>[];
  effectiveDraft: ContextDraft;
  handleChange: (vals: Partial<ContextDraft>) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
};

const buildChatbotContextModalRuntimeValue = ({
  isOpen,
  modalDraft,
  editingItem,
  onClose,
  fields,
  effectiveDraft,
  handleChange,
  onSave,
  isSaving,
}: ChatbotContextModalRuntimeInput): ChatbotContextModalRuntimeValue => ({
  open: isOpen && modalDraft !== null,
  onClose,
  title: editingItem !== null && editingItem !== undefined ? 'Edit Context' : 'New Context',
  fields,
  values: effectiveDraft,
  onChange: handleChange,
  onSave,
  isSaving,
});

export function ChatbotContextModalPanel(): React.JSX.Element {
  const { open, onClose, title, fields, values, onChange, onSave, isSaving } =
    useChatbotContextModalRuntime();

  return (
    <SettingsPanelBuilder
      open={open}
      onClose={onClose}
      title={title}
      fields={fields}
      values={values}
      onChange={onChange}
      onSave={onSave}
      isSaving={isSaving}
      size='lg'
    />
  );
}

function useChatbotContextModalRuntimeValue(
  props: ChatbotContextModalProps
): ChatbotContextModalRuntimeValue {
  const {
    isOpen,
    onClose,
    item: editingItem,
    modalDraft,
    setModalDraft,
    tagDraft,
    setTagDraft,
    isSaving,
    onSave,
  } = props;

  const effectiveDraft = useMemo<ContextDraft>(
    () => modalDraft ?? EMPTY_CONTEXT_DRAFT,
    [modalDraft]
  );
  const handleSave = useCallback(async (): Promise<void> => {
    await Promise.resolve(onSave());
  }, [onSave]);
  const draftTags = effectiveDraft.tags;

  const fields = useChatbotContextFields({
    draftTags,
    tagDraft,
    setTagDraft,
    setModalDraft,
    isSaving,
  });

  const handleChange = useCallback(
    (vals: Partial<ContextDraft>): void => {
      setModalDraft((prev) => (prev ? { ...prev, ...vals } : prev));
    },
    [setModalDraft]
  );

  const runtimeValue = useMemo<ChatbotContextModalRuntimeValue>(
    () =>
      buildChatbotContextModalRuntimeValue({
        isOpen,
        modalDraft,
        editingItem,
        onClose,
        fields,
        effectiveDraft,
        handleChange,
        onSave: handleSave,
        isSaving,
      }),
    [
      editingItem,
      effectiveDraft,
      fields,
      handleChange,
      handleSave,
      isOpen,
      isSaving,
      modalDraft,
      onClose,
    ]
  );
  return runtimeValue;
}

export function ChatbotContextModal(props: ChatbotContextModalProps): React.JSX.Element | null {
  const runtimeValue = useChatbotContextModalRuntimeValue(props);
  return (
    <ChatbotContextModalProvider value={runtimeValue}>
      <ChatbotContextModalPanel />
    </ChatbotContextModalProvider>
  );
}
