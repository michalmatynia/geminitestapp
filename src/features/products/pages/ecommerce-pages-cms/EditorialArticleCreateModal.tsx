'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EditorialArticleAiPathGenerator } from './EditorialArticleAiPathGenerator';
import { EditorialArticlePreview } from './EditorialArticlePreview';
import {
  createBlankEditorialArticle,
  normalizeEditorialArticleDraft,
  toEditorialArticleSlug,
  type EditorialArticleState,
  type GeneratedEditorialArticleState,
} from './editorial-articles-cms.client';
import { Checkbox, Input, Label, Textarea } from '@/shared/ui/primitives.public';
import { FormModal } from '@/shared/ui/FormModal';

type DraftUpdate = (patch: Partial<EditorialArticleState>) => void;

const createInitialArticleDraft = (): EditorialArticleState =>
  createBlankEditorialArticle({ id: '', href: '', tag: 'Universe Report' });

const buildTitlePatch = (
  current: EditorialArticleState,
  title: string
): Pick<EditorialArticleState, 'href' | 'title'> => {
  const currentTitleSlug = toEditorialArticleSlug(current.title);
  const currentId = current.id.trim().length > 0 ? current.id : currentTitleSlug;
  const currentAutoHref = `/lore-drops/${toEditorialArticleSlug(currentId)}`;
  const nextId = current.id.trim().length > 0 ? current.id : toEditorialArticleSlug(title);
  const shouldUpdateHref = current.href.trim().length === 0 || current.href === currentAutoHref;
  return {
    href: shouldUpdateHref ? `/lore-drops/${toEditorialArticleSlug(nextId)}` : current.href,
    title,
  };
};

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
    setDraft((current) => ({ ...current, ...buildTitlePatch(current, title) }));
  };

  const handleGeneratedArticle = (article: GeneratedEditorialArticleState): void => {
    setDraft((current) => ({
      ...current,
      ...buildTitlePatch(current, article.title),
      body: article.body,
      excerpt: article.excerpt.trim().length > 0 ? article.excerpt : current.excerpt,
    }));
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
          isSaving={isSaving}
          onGeneratedArticle={handleGeneratedArticle}
          onTitleChange={handleTitleChange}
          onUpdate={updateDraft}
        />
      </div>
    </FormModal>
  );
}

function ArticleDraftFields({
  draft,
  isSaving,
  onGeneratedArticle,
  onTitleChange,
  onUpdate,
}: {
  draft: EditorialArticleState;
  isSaving: boolean;
  onGeneratedArticle: (article: GeneratedEditorialArticleState) => void;
  onTitleChange: (title: string) => void;
  onUpdate: DraftUpdate;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <EditorialArticleAiPathGenerator
        disabled={isSaving}
        draft={draft}
        onGenerated={onGeneratedArticle}
      />
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
