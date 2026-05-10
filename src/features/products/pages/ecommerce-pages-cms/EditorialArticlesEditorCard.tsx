'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { EditorialArticleCreateModal } from './EditorialArticleCreateModal';
import { EditorialArticlePreview } from './EditorialArticlePreview';
import { EditorialArticlesTreePanel, useEditorialArticlesTree } from './EditorialArticlesTree';
import {
  normalizeEditorialArticleDraft,
  type EditorialArticleState,
  type EditorialArticlesController,
} from './editorial-articles-cms.client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/ui/primitives.public';

const formatUpdatedAt = (value: string | null): string => {
  if (value === null) return 'Never saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function EditorialArticlesEditorCard({
  controller,
}: {
  controller: EditorialArticlesController;
}): React.JSX.Element {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const treeModel = useEditorialArticlesTree(controller.articles);
  const selectedArticle =
    treeModel.selectedIndex === null ? null : controller.articles[treeModel.selectedIndex] ?? null;

  const handleCreateArticle = (article: EditorialArticleState): void => {
    const nextIndex = controller.articles.length;
    controller.addArticle(article);
    treeModel.selectArticleIndex(nextIndex);
    setIsCreateOpen(false);
  };

  return (
    <Card>
      <CardHeader className='space-y-2'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <CardTitle className='text-base'>Lore & Drops Articles</CardTitle>
            <div className='mt-1 text-xs text-muted-foreground'>
              Updated: {formatUpdatedAt(controller.editorialArticles?.updatedAt ?? null)}
            </div>
          </div>
          <EditorialArticlesActions
            controller={controller}
            onOpenCreateModal={() => setIsCreateOpen(true)}
          />
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {controller.error !== null ? <Alert variant='error'>{controller.error}</Alert> : null}
        <EditorialArticlesStatus controller={controller} />
        <div className='grid gap-4 xl:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]'>
          <EditorialArticlesTreePanel
            articleCount={controller.articles.length}
            tree={treeModel.tree}
          />
          {selectedArticle !== null && treeModel.selectedIndex !== null ? (
            <EditorialArticleEditor
              key={`${selectedArticle.id}-${treeModel.selectedIndex}`}
              article={selectedArticle}
              index={treeModel.selectedIndex}
              controller={controller}
            />
          ) : (
            <EditorialArticleSelectionEmpty hasArticles={controller.articles.length > 0} />
          )}
        </div>
        <EditorialArticleCreateModal
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreateArticle}
          isSaving={controller.isSaving}
        />
      </CardContent>
    </Card>
  );
}

function EditorialArticlesActions({
  controller,
  onOpenCreateModal,
}: {
  controller: EditorialArticlesController;
  onOpenCreateModal: () => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button type='button' variant='outline' onClick={controller.handleRefreshClick}
        disabled={controller.isLoading || controller.isSaving}>
        <RefreshCw className={`mr-2 size-4 ${controller.isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button type='button' variant='outline' onClick={onOpenCreateModal}
        disabled={controller.isSaving || controller.articles.length >= 12}>
        <Plus className='mr-2 size-4' />
        Add article
      </Button>
      <Button type='button' onClick={controller.handleSaveClick} disabled={controller.isSaving}>
        {controller.isSaving ? (
          <RefreshCw className='mr-2 size-4 animate-spin' />
        ) : (
          <Save className='mr-2 size-4' />
        )}
        Save articles
      </Button>
    </div>
  );
}

function EditorialArticleSelectionEmpty({
  hasArticles,
}: {
  hasArticles: boolean;
}): React.JSX.Element {
  return (
    <div className='flex min-h-80 items-center justify-center rounded-md border border-dashed bg-card/20 p-6 text-center text-sm text-muted-foreground'>
      {hasArticles ? 'No article selected' : 'No Lore & Drops articles yet'}
    </div>
  );
}

function EditorialArticlesStatus({
  controller,
}: {
  controller: EditorialArticlesController;
}): React.JSX.Element {
  const cloudConfigured = controller.editorialArticles?.cloudConfigured === true;
  const visibleCount = controller.articles.filter((article) => article.visible).length;
  return (
    <div className='grid gap-2 text-sm md:grid-cols-3'>
      <StatusBox label='Visible articles' value={`${visibleCount} / ${controller.articles.length}`} />
      <StatusBox label='Storefront path' value='/lore-drops/[article]' />
      <div className='rounded-md border p-3'>
        <div className='text-xs text-muted-foreground'>Cloud mirror</div>
        <div className='mt-1 flex items-center gap-2'>
          {cloudConfigured ? (
            <CheckCircle2 className='size-4 text-emerald-500' />
          ) : (
            <AlertTriangle className='size-4 text-amber-500' />
          )}
          <span>{cloudConfigured ? 'Configured' : 'Not configured'}</span>
        </div>
      </div>
    </div>
  );
}

function StatusBox({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className='rounded-md border p-3'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className='mt-1 truncate'>{value}</div>
    </div>
  );
}

function EditorialArticleEditor({
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
