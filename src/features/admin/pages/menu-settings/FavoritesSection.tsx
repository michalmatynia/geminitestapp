'use client';

import React from 'react';
import { Star, ArrowDownToLine, Trash2 } from 'lucide-react';
import { useAdminMenuSettings } from '../../context/AdminMenuSettingsContext';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection, FormField, SearchInput } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';
import type { AdminNavLeaf } from '@/shared/contracts/admin';

function FavoriteItemActions({
  id,
  index,
  isLast,
  onMove,
  onToggle,
}: {
  id: string;
  index: number;
  isLast: boolean;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onToggle: (id: string, checked: boolean) => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-1'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-7 w-7 p-0'
        onClick={() => onMove(id, 'up')}
        disabled={index === 0}
        aria-label='Move favorite up'
        title='Move up'
      >
        <ArrowDownToLine className='size-3 rotate-180' />
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-7 w-7 p-0'
        onClick={() => onMove(id, 'down')}
        disabled={isLast}
        aria-label='Move favorite down'
        title='Move down'
      >
        <ArrowDownToLine className='size-3' />
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='h-7 w-7 p-0 text-red-400 hover:bg-red-400/10 hover:text-red-300'
        onClick={() => onToggle(id, false)}
        aria-label='Remove from favorites'
        title='Remove'
      >
        <Trash2 className='size-3' />
      </Button>
    </div>
  );
}

function FavoriteItem({
  entry,
  index,
  isLast,
  onMove,
  onToggle,
}: {
  entry: AdminNavLeaf;
  index: number;
  isLast: boolean;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onToggle: (id: string, checked: boolean) => void;
}): React.JSX.Element {
  const { id, label, parents } = entry;
  return (
    <div className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-gray-900/40 p-3'>
      <SectionHeader
        title={label}
        subtitle={parents.length > 0 ? parents.join(' / ') : undefined}
        size='xs'
        className='flex-1'
        actions={
          <FavoriteItemActions
            id={id}
            index={index}
            isLast={isLast}
            onMove={onMove}
            onToggle={onToggle}
          />
        }
      />
    </div>
  );
}

function FilteredItem({
  item,
  favoritesSet,
  handleToggleFavorite,
}: {
  item: AdminNavLeaf;
  favoritesSet: Set<string>;
  handleToggleFavorite: (id: string, checked: boolean) => void;
}): React.JSX.Element {
  const isFavorite = favoritesSet.has(item.id);
  const hrefLabel =
    item.href !== undefined && item.href !== null && item.href !== '' ? (
      <div className='truncate text-[11px] text-gray-600'>{item.href}</div>
    ) : null;

  return (
    <label
      key={item.id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-md border border-border/60 bg-card/30 px-3 py-2 transition hover:bg-card/50',
        isFavorite && 'border-amber-500/40 bg-amber-500/5'
      )}
    >
      <div className='mt-0.5 pt-0.5'>
        <Star
          className={cn(
            'size-3.5 transition-colors',
            isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-600'
          )}
        />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='truncate text-xs font-medium text-gray-200'>{item.label}</span>
        </div>
        {hrefLabel}
      </div>
      <div className='flex h-5 items-center'>
        <input
          type='checkbox'
          className='size-3.5 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500/40'
          checked={isFavorite}
          onChange={(e) => handleToggleFavorite(item.id, e.target.checked)}
          aria-label={`Favorite ${item.label}`}
        />
      </div>
    </label>
  );
}

function AddFavoriteSection({
  query,
  setQuery,
  filteredItems,
  favoritesSet,
  handleToggleFavorite,
}: {
  query: string;
  setQuery: (q: string) => void;
  filteredItems: AdminNavLeaf[];
  favoritesSet: Set<string>;
  handleToggleFavorite: (id: string, checked: boolean) => void;
}): React.JSX.Element {
  return (
    <div className='pt-2'>
      <FormField label='Add favorite'>
        <SearchInput
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          placeholder='Search menu items…'
          className='h-9 bg-gray-900/40'
          size='sm'
        />
      </FormField>
      <div className='mt-3 max-h-72 space-y-2 overflow-auto pr-2'>
        {filteredItems.map((item: AdminNavLeaf) => (
          <FilteredItem
            key={item.id}
            item={item}
            favoritesSet={favoritesSet}
            handleToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

export function FavoritesSection(): React.JSX.Element {
  const {
    favoritesList,
    favoritesSet,
    query,
    setQuery,
    filteredItems,
    handleToggleFavorite,
    moveFavorite,
  } = useAdminMenuSettings();

  return (
    <FormSection
      title='Favorites'
      description='Pin menu items to appear at the top.'
      actions={<Star className='size-4 text-amber-300' />}
      className='p-6'
      variant='subtle'
    >
      <div className='space-y-3'>
        {favoritesList.length === 0 ? (
          <div className='rounded-md border border-border/40 bg-gray-900/20 p-3 text-xs text-gray-400'>
            No favorites yet. Select items below to pin them here.
          </div>
        ) : (
          <div className='space-y-2'>
            {favoritesList.map((entry: AdminNavLeaf | undefined, index: number) => {
              if (entry === undefined || entry === null) return null;
              return (
                <FavoriteItem
                  key={entry.id}
                  entry={entry}
                  index={index}
                  isLast={index === favoritesList.length - 1}
                  onMove={moveFavorite}
                  onToggle={handleToggleFavorite}
                />
              );
            })}
          </div>
        )}

        <AddFavoriteSection
          query={query}
          setQuery={setQuery}
          filteredItems={filteredItems}
          favoritesSet={favoritesSet}
          handleToggleFavorite={handleToggleFavorite}
        />
      </div>
    </FormSection>
  );
}
