'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useState } from 'react';

import { EditorialArticleCreateModal } from './EditorialArticleCreateModal';
import { EditorialArticleEditor } from './EditorialArticleEditorFields';
import { EditorialArticlesTreePanel, useEditorialArticlesTree } from './EditorialArticlesTree';
import {
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

function StatusBox({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className='rounded-md border p-3'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className='mt-1 truncate'>{value}</div>
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
