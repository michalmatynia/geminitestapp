'use client';

import { Eye, EyeOff, RefreshCw, Trash2, X } from 'lucide-react';

import { EditorialArticlePreview } from './EditorialArticlePreview';
import {
  normalizeEditorialArticleDraft,
  type EditorialArticleState,
  type EditorialArticlesController,
} from './editorial-articles-cms.client';
import { Button, Input, Label, Textarea } from '@/shared/ui/primitives.public';

export function EditorialArticleEditor({
  article,
  index,
  controller,
}: {
  article: EditorialArticleState;
  index: number;
  controller: EditorialArticlesController;
}): React.JSX.Element {
  const inputIdBase = `editorial-article-${index}`;
  return (
    <div className='rounded-md border bg-card/40 p-4'>
      <div className='grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]'>
        <EditorialArticlePreview article={article} />
        <div className='space-y-4'>
          <EditorialArticleActions article={article} index={index} controller={controller} />
          <div className='grid gap-3 md:grid-cols-3'>
            <TextField id={`${inputIdBase}-id`} label='Article ID' value={article.id}
              disabled={controller.isSaving}
              onChange={(value) => controller.updateArticle(index, { id: value })} />
            <TextField id={`${inputIdBase}-tag`} label='Article tag' value={article.tag}
              disabled={controller.isSaving}
              onChange={(value) => controller.updateArticle(index, { tag: value })} />
            <TextField id={`${inputIdBase}-href`} label='Article href' value={article.href}
              disabled={controller.isSaving}
              onChange={(value) => controller.updateArticle(index, { href: value })} />
          </div>
          <TextField id={`${inputIdBase}-title`} label='Article title' value={article.title}
            disabled={controller.isSaving}
            onChange={(value) => controller.updateArticle(index, { title: value })} />
          <TextAreaField id={`${inputIdBase}-excerpt`} label='Short form' value={article.excerpt}
            rows={3} disabled={controller.isSaving}
            onChange={(value) => controller.updateArticle(index, { excerpt: value })} />
          <TextAreaField id={`${inputIdBase}-body`} label='Long text' value={article.body}
            rows={8} disabled={controller.isSaving}
            onChange={(value) => controller.updateArticle(index, { body: value })} />
          <EditorialArticleImageField
            article={article}
            index={index}
            controller={controller}
            inputIdBase={inputIdBase}
            isUploading={controller.uploadingIndex === index}
          />
        </div>
      </div>
    </div>
  );
}

function EditorialArticleActions({
  article,
  index,
  controller,
}: {
  article: EditorialArticleState;
  index: number;
  controller: EditorialArticlesController;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap justify-between gap-2'>
      <Button type='button' size='sm' variant={article.visible ? 'success' : 'outline'}
        onClick={() => controller.updateArticle(index, { visible: !article.visible })}
        disabled={controller.isSaving}>
        {article.visible ? <Eye className='mr-2 size-4' /> : <EyeOff className='mr-2 size-4' />}
        {article.visible ? 'Visible' : 'Hidden'}
      </Button>
      <Button type='button' size='sm' variant='outline'
        onClick={() => controller.updateArticle(index, normalizeEditorialArticleDraft(article))}
        disabled={controller.isSaving}>
        Normalize path
      </Button>
      <Button type='button' size='sm' variant='destructive'
        onClick={() => controller.removeArticle(index)}
        disabled={controller.isSaving}>
        <Trash2 className='mr-2 size-4' />
        Remove
      </Button>
    </div>
  );
}

function EditorialArticleImageField({
  article,
  index,
  controller,
  inputIdBase,
  isUploading,
}: {
  article: EditorialArticleState;
  controller: EditorialArticlesController;
  index: number;
  inputIdBase: string;
  isUploading: boolean;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_18rem_auto]'>
      <TextField id={`${inputIdBase}-image-url`} label='Image URL' value={article.imageUrl}
        disabled={controller.isSaving || isUploading}
        onChange={(value) => controller.updateArticle(index, { imageUrl: value })} />
      <div className='space-y-2'>
        <Label htmlFor={`${inputIdBase}-image-file`}>Upload image</Label>
        <Input id={`${inputIdBase}-image-file`} type='file'
          accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
          disabled={controller.isSaving || isUploading}
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0] ?? null;
            if (file !== null) controller.uploadArticleImage(index, file);
            input.value = '';
          }} />
      </div>
      <div className='flex items-end'>
        <Button type='button' variant='outline'
          onClick={() => controller.updateArticle(index, { imageUrl: '' })}
          disabled={controller.isSaving || article.imageUrl.length === 0}
          aria-label='Clear lore article image' title='Clear image'>
          {isUploading ? <RefreshCw className='size-4 animate-spin' /> : <X className='size-4' />}
        </Button>
      </div>
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

function TextAreaField(props: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Textarea id={props.id} value={props.value} rows={props.rows} disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)} />
    </div>
  );
}
