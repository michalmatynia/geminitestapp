'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CollectionCardPreview } from './CollectionCardEditorFields';
import {
  SELECTOR_TYPE_OPTIONS,
  createBlankCollectionCard,
  splitSelectorValues,
  type CollectionCardSelectorType,
  type CollectionCardState,
} from './collection-cards-cms.client';
import { Checkbox, Input, Label, Textarea } from '@/shared/ui/primitives.public';
import { FormModal } from '@/shared/ui/FormModal';

type DraftUpdate = (patch: Partial<CollectionCardState>) => void;

const createInitialUniverseCardDraft = (): CollectionCardState =>
  createBlankCollectionCard({
    id: '',
    label: '',
    selectorType: 'theme',
  });

const toCardId = (label: string): string => {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `collection-card-${base.length > 0 ? base : Date.now()}`;
};

const normalizeCardDraft = (draft: CollectionCardState): CollectionCardState => {
  const label = draft.label.trim();
  const id = draft.id.trim().length > 0 ? draft.id.trim() : toCardId(label);
  return {
    ...draft,
    fallbackCount: Math.max(0, Math.trunc(draft.fallbackCount)),
    href: draft.href.trim().length > 0 ? draft.href.trim() : '/products',
    id,
    imageUrl: draft.imageUrl.trim(),
    label,
    sublabel: draft.sublabel.trim(),
    tag: draft.tag.trim(),
  };
};

export function UniverseCardCreateModal({
  isSaving,
  onClose,
  onCreate,
  open,
}: {
  isSaving: boolean;
  onClose: () => void;
  onCreate: (card: CollectionCardState) => void;
  open: boolean;
}): React.JSX.Element {
  const [draft, setDraft] = useState<CollectionCardState>(createInitialUniverseCardDraft);
  const canSave = draft.label.trim().length > 0;

  useEffect(() => {
    if (open) setDraft(createInitialUniverseCardDraft());
  }, [open]);

  const updateDraft: DraftUpdate = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSave = (): void => {
    if (!canSave) return;
    onCreate(normalizeCardDraft(draft));
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title='Add Universe Card'
      saveText='Add card'
      saveIcon={<Plus className='size-4' />}
      isSaving={isSaving}
      isSaveDisabled={!canSave || isSaving}
      size='xl'
    >
      <div className='grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]'>
        <CollectionCardPreview card={draft} />
        <div className='space-y-4'>
          <UniverseCardDraftTextFields draft={draft} onUpdate={updateDraft} />
          <UniverseCardDraftSelectorFields draft={draft} onUpdate={updateDraft} />
          <UniverseCardDraftImageFields draft={draft} onUpdate={updateDraft} />
        </div>
      </div>
    </FormModal>
  );
}

function UniverseCardDraftTextFields({
  draft,
  onUpdate,
}: {
  draft: CollectionCardState;
  onUpdate: DraftUpdate;
}): React.JSX.Element {
  return (
    <>
      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        <DraftTextField id='new-universe-card-id' label='Card ID' value={draft.id}
          onChange={(value) => onUpdate({ id: value })} />
        <DraftTextField id='new-universe-card-label' label='Label' value={draft.label}
          onChange={(value) => onUpdate({ label: value })} />
        <DraftTextField id='new-universe-card-tag' label='Tag' value={draft.tag}
          onChange={(value) => onUpdate({ tag: value })} />
        <DraftNumberField id='new-universe-card-fallback-count' label='Fallback count'
          value={draft.fallbackCount} onChange={(value) => onUpdate({ fallbackCount: value })} />
      </div>
      <DraftTextField id='new-universe-card-sublabel' label='Sublabel' value={draft.sublabel}
        onChange={(value) => onUpdate({ sublabel: value })} />
      <DraftVisibleField visible={draft.visible} onChange={(visible) => onUpdate({ visible })} />
    </>
  );
}

function UniverseCardDraftSelectorFields({
  draft,
  onUpdate,
}: {
  draft: CollectionCardState;
  onUpdate: DraftUpdate;
}): React.JSX.Element {
  return (
    <>
      <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]'>
        <DraftTextField id='new-universe-card-href' label='Custom href' value={draft.href}
          onChange={(value) => onUpdate({ href: value })} />
        <DraftSelectorTypeField value={draft.selectorType}
          onChange={(value) => onUpdate({ selectorType: value })} />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='new-universe-card-selector-values'>Selector values</Label>
        <Textarea
          id='new-universe-card-selector-values'
          value={draft.selectorValues.join('\n')}
          onChange={(event) => onUpdate({
            selectorValues: splitSelectorValues(event.target.value),
          })}
          placeholder='One category or universe per line'
          rows={3}
        />
      </div>
    </>
  );
}

function UniverseCardDraftImageFields({
  draft,
  onUpdate,
}: {
  draft: CollectionCardState;
  onUpdate: DraftUpdate;
}): React.JSX.Element {
  return (
    <DraftTextField id='new-universe-card-image-url' label='Image URL' value={draft.imageUrl}
      onChange={(value) => onUpdate({ imageUrl: value })} />
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

function DraftNumberField(props: {
  id: string;
  label: string;
  onChange: (value: number) => void;
  value: number;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type='number'
        min={0}
        value={String(props.value)}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          props.onChange(Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0);
        }}
      />
    </div>
  );
}

function DraftSelectorTypeField(props: {
  onChange: (value: CollectionCardSelectorType) => void;
  value: CollectionCardSelectorType;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='new-universe-card-selector-type'>Selector</Label>
      <select
        id='new-universe-card-selector-type'
        className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
        value={props.value}
        onChange={(event) => props.onChange(event.target.value as CollectionCardSelectorType)}
      >
        {SELECTOR_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
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
      <Checkbox id='new-universe-card-visible' checked={visible}
        onCheckedChange={(checked) => onChange(checked === true)} />
      <Label htmlFor='new-universe-card-visible'>Visible on home</Label>
    </div>
  );
}
