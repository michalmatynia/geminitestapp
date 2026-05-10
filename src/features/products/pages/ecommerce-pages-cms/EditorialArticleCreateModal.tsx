'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EditorialArticlePreview } from './EditorialArticlePreview';
import {
  createBlankEditorialArticle,
  normalizeEditorialArticleDraft,
  toEditorialArticleSlug,
  type EditorialArticleState,
} from './editorial-articles-cms.client';
import { Checkbox, Input, Label, Textarea } from '@/shared/ui/primitives.public';
import { FormModal } from '@/shared/ui/FormModal';

type DraftUpdate = (patch: Partial<EditorialArticleState>) => void;

const createInitialArticleDraft = (): EditorialArticleState =>
  createBlankEditorialArticle({ id: '', href: '', tag: 'Universe Report' });

export function EditorialArticleCreateModal({
  isSaving,
  onClose,
  onCreate,
  open,
}: {
  isSaving: boolean;
  onClose: () => void;
  onCreate: (article: EditorialArticleState) => void;
  open: boolean;
}): React.JSX.Element {
  const [draft, setDraft] = useState<EditorialArticleState>(createInitialArticleDraft);
  const canSave = draft.title.trim().length > 0;

  useEffect(() => {
    if (open) setDraft(createInitialArticleDraft());
  }, [open]);

  const updateDraft: DraftUpdate = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleTitleChange = (title: string): void => {
    const currentTitleSlug = toEditorialArticleSlug(draft.title);
    const currentId = draft.id.trim().length > 0 ? draft.id : currentTitleSlug;
    const currentAutoHref = `/lore-drops/${toEditorialArticleSlug(currentId)}`;
    const nextId = draft.id.trim().length > 0 ? draft.id : toEditorialArticleSlug(title);
    const shouldUpdateHref = draft.href.trim().length === 0 || draft.href === currentAutoHref;
    const nextHref = shouldUpdateHref ? `/lore-drops/${toEditorialArticleSlug(nextId)}` : draft.href;
    updateDraft({ href: nextHref, title });
  };

  const handleSave = (): void => {
    if (!canSave) return;
    onCreate(normalizeEditorialArticleDraft(draft));
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title='Add Lore Article'
      saveText='Add article'
      saveIcon={<Plus className='size-4' />}
      isSaving={isSaving}
      isSaveDisabled={!canSave || isSaving}
      size='xl'
    >
      <div className='grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]'>
        <EditorialArticlePreview article={draft} />
        <ArticleDraftFields
          draft={draft}
          onTitleChange={handleTitleChange}
          onUpdate={updateDraft}
        />
      </div>
    </FormModal>
  );
}

function ArticleDraftFields({
  draft,
  onTitleChange,
  onUpdate,
}: {
  draft: EditorialArticleState;
  onTitleChange: (title: string) => void;
  onUpdate: DraftUpdate;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='grid gap-3 md:grid-cols-3'>
        <DraftTextField id='new-lore-article-id' label='Article ID' value={draft.id}
          onChange={(value) => onUpdate({ id: value })} />
        <DraftTextField id='new-lore-article-tag' label='Article tag' value={draft.tag}
          onChange={(value) => onUpdate({ tag: value })} />
        <DraftTextField id='new-lore-article-href' label='Article href' value={draft.href}
          onChange={(value) => onUpdate({ href: value })} />
      </div>
      <DraftTextField id='new-lore-article-title' label='Article title' value={draft.title}
        onChange={onTitleChange} />
      <DraftTextareaField id='new-lore-article-excerpt' label='Short form'
        value={draft.excerpt} rows={3} onChange={(value) => onUpdate({ excerpt: value })} />
      <DraftTextareaField id='new-lore-article-body' label='Long text'
        value={draft.body} rows={7} onChange={(value) => onUpdate({ body: value })} />
      <DraftVisibleField visible={draft.visible} onChange={(visible) => onUpdate({ visible })} />
    </div>
  );
}

function DraftTextField(props: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input id={props.id} value={props.value}
        onChange={(event) => props.onChange(event.target.value)} />
    </div>
  );
}

function DraftTextareaField(props: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Textarea id={props.id} value={props.value} rows={props.rows}
        onChange={(event) => props.onChange(event.target.value)} />
    </div>
  );
}

function DraftVisibleField({
  onChange,
  visible,
}: {
  onChange: (visible: boolean) => void;
  visible: boolean;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <Checkbox id='new-lore-article-visible' checked={visible}
        onCheckedChange={(checked) => onChange(checked === true)} />
      <Label htmlFor='new-lore-article-visible'>Visible on home</Label>
    </div>
  );
}
