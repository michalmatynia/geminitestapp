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

import {
  CollectionCardImageField,
  CollectionCardPreview,
  CollectionCardSelectorFields,
  CollectionCardTextFields,
} from './CollectionCardEditorFields';
import { UniverseCardCreateModal } from './UniverseCardCreateModal';
import { UniverseCardsTreePanel, useUniverseCardsTree } from './UniverseCardsTree';
import {
  type CollectionCardState,
  type CollectionCardsController,
} from './collection-cards-cms.client';
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

export function CollectionCardsEditorCard({
  controller,
}: {
  controller: CollectionCardsController;
}): React.JSX.Element {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const treeModel = useUniverseCardsTree(controller.cards);
  const selectedCard =
    treeModel.selectedIndex === null ? null : controller.cards[treeModel.selectedIndex] ?? null;

  const handleCreateCard = (card: CollectionCardState): void => {
    const nextIndex = controller.cards.length;
    controller.addCard(card);
    treeModel.selectCardIndex(nextIndex);
    setIsCreateOpen(false);
  };

  return (
    <Card>
      <CardHeader className='space-y-2'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <CardTitle className='text-base'>Browse by Universe Cards</CardTitle>
            <div className='mt-1 text-xs text-muted-foreground'>
              Updated: {formatUpdatedAt(controller.collectionCards?.updatedAt ?? null)}
            </div>
          </div>
          <CollectionCardsActions
            controller={controller}
            onOpenCreateModal={() => setIsCreateOpen(true)}
          />
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {controller.error !== null ? <Alert variant='error'>{controller.error}</Alert> : null}
        <CollectionCardsStatus controller={controller} />
        <div className='grid gap-4 xl:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]'>
          <UniverseCardsTreePanel cardCount={controller.cards.length} tree={treeModel.tree} />
          {selectedCard !== null && treeModel.selectedIndex !== null ? (
            <CollectionCardEditor
              key={`${selectedCard.id}-${treeModel.selectedIndex}`}
              card={selectedCard}
              index={treeModel.selectedIndex}
              controller={controller}
            />
          ) : (
            <UniverseCardSelectionEmpty hasCards={controller.cards.length > 0} />
          )}
        </div>
        <UniverseCardCreateModal
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreateCard}
          isSaving={controller.isSaving}
        />
      </CardContent>
    </Card>
  );
}

function CollectionCardsActions({
  controller,
  onOpenCreateModal,
}: {
  controller: CollectionCardsController;
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
        disabled={controller.isSaving || controller.cards.length >= 8}>
        <Plus className='mr-2 size-4' />
        Add universe card
      </Button>
      <Button type='button' onClick={controller.handleSaveClick}
        disabled={controller.isSaving || controller.cards.length === 0}>
        {controller.isSaving ? (
          <RefreshCw className='mr-2 size-4 animate-spin' />
        ) : (
          <Save className='mr-2 size-4' />
        )}
        Save cards
      </Button>
    </div>
  );
}

function UniverseCardSelectionEmpty({
  hasCards,
}: {
  hasCards: boolean;
}): React.JSX.Element {
  return (
    <div className='flex min-h-80 items-center justify-center rounded-md border border-dashed bg-card/20 p-6 text-center text-sm text-muted-foreground'>
      {hasCards ? 'No universe card selected' : 'No universe cards yet'}
    </div>
  );
}

function CollectionCardsStatus({
  controller,
}: {
  controller: CollectionCardsController;
}): React.JSX.Element {
  const cloudConfigured = controller.collectionCards?.cloudConfigured === true;
  const visibleCount = controller.cards.filter((card) => card.visible).length;
  return (
    <div className='grid gap-2 text-sm md:grid-cols-3'>
      <StatusBox label='Visible cards' value={`${visibleCount} / ${controller.cards.length}`} />
      <StatusBox label='FastComet folder' value='cms/stargater/collection-cards' />
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

function CollectionCardEditor({
  card,
  index,
  controller,
}: {
  card: CollectionCardState;
  index: number;
  controller: CollectionCardsController;
}): React.JSX.Element {
  const inputIdBase = `collection-card-${index}`;
  return (
    <div className='rounded-md border bg-card/40 p-4'>
      <div className='grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]'>
        <CollectionCardPreview card={card} />
        <div className='space-y-4'>
          <CollectionCardActions card={card} index={index} controller={controller} />
          <CollectionCardTextFields card={card} index={index} controller={controller} inputIdBase={inputIdBase} />
          <CollectionCardSelectorFields card={card} index={index} controller={controller} inputIdBase={inputIdBase} />
          <CollectionCardImageField
            card={card}
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

function CollectionCardActions({
  card,
  index,
  controller,
}: {
  card: CollectionCardState;
  index: number;
  controller: CollectionCardsController;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap justify-between gap-2'>
      <Button type='button' size='sm' variant={card.visible ? 'success' : 'outline'}
        onClick={() => controller.updateCard(index, { visible: !card.visible })}
        disabled={controller.isSaving}>
        {card.visible ? <Eye className='mr-2 size-4' /> : <EyeOff className='mr-2 size-4' />}
        {card.visible ? 'Visible' : 'Hidden'}
      </Button>
      <Button type='button' size='sm' variant='destructive'
        onClick={() => controller.removeCard(index)}
        disabled={controller.isSaving || controller.cards.length <= 1}>
        <Trash2 className='mr-2 size-4' />
        Remove
      </Button>
    </div>
  );
}
