'use client';

import { RefreshCw, X } from 'lucide-react';

import {
  SELECTOR_TYPE_OPTIONS,
  splitSelectorValues,
  type CollectionCardSelectorType,
  type CollectionCardState,
  type CollectionCardsController,
} from './collection-cards-cms.client';
import { Button, Input, Label, Textarea } from '@/shared/ui/primitives.public';

type CollectionCardFormSectionProps = {
  card: CollectionCardState;
  controller: CollectionCardsController;
  index: number;
  inputIdBase: string;
};

export function CollectionCardTextFields({
  card,
  index,
  controller,
  inputIdBase,
}: CollectionCardFormSectionProps): React.JSX.Element {
  return (
    <>
      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        <TextField id={`${inputIdBase}-id`} label='Card ID' value={card.id}
          disabled={controller.isSaving} onChange={(value) => controller.updateCard(index, { id: value })} />
        <TextField id={`${inputIdBase}-label`} label='Label' value={card.label}
          disabled={controller.isSaving} onChange={(value) => controller.updateCard(index, { label: value })} />
        <TextField id={`${inputIdBase}-tag`} label='Tag' value={card.tag}
          disabled={controller.isSaving} onChange={(value) => controller.updateCard(index, { tag: value })} />
        <NumberField id={`${inputIdBase}-fallback-count`} label='Fallback count' value={card.fallbackCount}
          disabled={controller.isSaving} onChange={(value) => controller.updateCard(index, { fallbackCount: value })} />
      </div>
      <TextField id={`${inputIdBase}-sublabel`} label='Sublabel' value={card.sublabel}
        disabled={controller.isSaving} onChange={(value) => controller.updateCard(index, { sublabel: value })} />
    </>
  );
}

export function CollectionCardSelectorFields({
  card,
  index,
  controller,
  inputIdBase,
}: CollectionCardFormSectionProps): React.JSX.Element {
  return (
    <>
      <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]'>
        <TextField id={`${inputIdBase}-href`} label='Custom href' value={card.href}
          disabled={controller.isSaving} onChange={(value) => controller.updateCard(index, { href: value })} />
        <SelectorTypeField id={`${inputIdBase}-selector-type`} value={card.selectorType}
          disabled={controller.isSaving} onChange={(value) => controller.updateCard(index, { selectorType: value })} />
      </div>
      <SelectorValuesField id={`${inputIdBase}-selector-values`} value={card.selectorValues.join('\n')}
        disabled={controller.isSaving}
        onChange={(value) => controller.updateCard(index, { selectorValues: splitSelectorValues(value) })} />
    </>
  );
}

export function CollectionCardPreview({ card }: { card: CollectionCardState }): React.JSX.Element {
  const tag = card.tag.length > 0 ? card.tag : 'Tag';
  const label = card.label.length > 0 ? card.label : 'Card label';
  const sublabel = card.sublabel.length > 0 ? card.sublabel : 'Sublabel';
  return (
    <div className='relative min-h-72 overflow-hidden rounded-md border bg-muted/30'
      aria-label={`${label} collection card preview`}>
      {card.imageUrl.trim().length > 0 ? (
        <img src={card.imageUrl} alt='' className='absolute inset-0 h-full w-full object-cover' />
      ) : (
        <div className='absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950' />
      )}
      <div className='absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/75' />
      <div className='absolute inset-0 p-4 text-white'>
        <div className='flex h-full flex-col justify-between'>
          <span className='w-fit rounded border border-white/25 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide'>
            {tag}
          </span>
          <div>
            <h3 className='text-2xl font-semibold leading-none'>{label}</h3>
            <p className='mt-2 text-xs uppercase tracking-wide text-white/70'>{sublabel}</p>
            <p className='mt-2 text-xs uppercase tracking-wide text-white/45'>
              {card.fallbackCount.toLocaleString()}+ items
            </p>
          </div>
        </div>
      </div>
      {!card.visible ? (
        <div className='absolute inset-x-3 top-3 rounded bg-black/70 px-2 py-1 text-center text-xs uppercase tracking-wide text-white'>
          Hidden
        </div>
      ) : null}
    </div>
  );
}

function TextField(props: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input id={props.id} value={props.value} disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)} />
    </div>
  );
}

function NumberField(props: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: number) => void;
  value: number;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input id={props.id} type='number' min={0} value={String(props.value)}
        disabled={props.disabled}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          props.onChange(Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0);
        }} />
    </div>
  );
}

function SelectorTypeField(props: {
  disabled: boolean;
  id: string;
  onChange: (value: CollectionCardSelectorType) => void;
  value: CollectionCardSelectorType;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={props.id}>Selector</Label>
      <select
        id={props.id}
        className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value as CollectionCardSelectorType)}
      >
        {SELECTOR_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function SelectorValuesField(props: {
  disabled: boolean;
  id: string;
  onChange: (value: string) => void;
  value: string;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={props.id}>Selector values</Label>
      <Textarea id={props.id} value={props.value} disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder='One category or universe per line' rows={3} />
    </div>
  );
}

export function CollectionCardImageField({
  card,
  index,
  controller,
  inputIdBase,
  isUploading,
}: CollectionCardFormSectionProps & { isUploading: boolean }): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_18rem_auto]'>
      <TextField id={`${inputIdBase}-image-url`} label='Image URL' value={card.imageUrl}
        disabled={controller.isSaving} onChange={(value) => controller.updateCard(index, { imageUrl: value })} />
      <div className='space-y-2'>
        <Label htmlFor={`${inputIdBase}-image-file`}>Upload image</Label>
        <Input id={`${inputIdBase}-image-file`} type='file'
          accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
          disabled={controller.isSaving || isUploading}
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0] ?? null;
            if (file !== null) controller.uploadCardImage(index, file);
            input.value = '';
          }} />
      </div>
      <div className='flex items-end'>
        <Button type='button' variant='outline'
          onClick={() => controller.updateCard(index, { imageUrl: '' })}
          disabled={controller.isSaving || card.imageUrl.length === 0}
          aria-label='Clear collection card image' title='Clear image'>
          {isUploading ? <RefreshCw className='size-4 animate-spin' /> : <X className='size-4' />}
        </Button>
      </div>
    </div>
  );
}
