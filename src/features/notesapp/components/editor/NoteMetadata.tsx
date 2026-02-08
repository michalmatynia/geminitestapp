'use client';

import { X } from 'lucide-react';
import React from 'react';

import { useNoteFormContext } from '@/features/notesapp/context/NoteFormContext';
import type { TagRecord, NoteWithRelations } from '@/shared/types/notes';
import { Button, Input, Label, Checkbox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui';


interface NoteMetadataProps {
  showTitle?: boolean;
}

export function NoteMetadata({
  showTitle = true,
}: NoteMetadataProps): React.JSX.Element {
  const {
    note,
    title,
    setTitle,
    selectedFolderId,
    setSelectedFolderId,
    flatFolders,
    color,
    setColor,
    isPinned,
    setIsPinned,
    isArchived,
    setIsArchived,
    isFavorite,
    setIsFavorite,
    selectedTagIds,
    availableTags,
    tagInput,
    setTagInput,
    isTagDropdownOpen,
    setIsTagDropdownOpen,
    filteredTags,
    handleAddTag,
    handleCreateTag,
    handleRemoveTag,
    handleFilterByTag,
    selectedRelatedNotes,
    setSelectedRelatedNotes,
    relatedNoteQuery,
    setRelatedNoteQuery,
    isRelatedDropdownOpen,
    setIsRelatedDropdownOpen,
    relatedNoteResults,
    isRelatedLoading,
    handleSelectRelatedNote,
    effectiveTheme,
  } = useNoteFormContext();

  const noteId = note?.id;
  const tagInputRef = React.useRef<HTMLInputElement>(null);

  const relatedNoteStyle = {
    borderWidth: `${effectiveTheme.relatedNoteBorderWidth ?? 1}px`,
    borderColor: effectiveTheme.relatedNoteBorderColor,
    backgroundColor: effectiveTheme.relatedNoteBackgroundColor,
    color: effectiveTheme.relatedNoteTextColor,
  };

  return (
    <div className='space-y-4'>
      {showTitle ? (
        <div>
          <Label className='mb-2 block text-sm font-medium text-white'>
            Title
          </Label>
          <Input
            type='text'
            placeholder='Enter note title'
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setTitle(e.target.value)}
            className='w-full rounded-lg border bg-gray-800 px-4 py-2 text-white'
            required
          />
        </div>
      ) : null}

      <div>
        <Label className='mb-2 block text-sm font-medium text-white'>Folder</Label>
        <Select
          value={selectedFolderId || '__none__'}
          onValueChange={(value: string): void => setSelectedFolderId(value === '__none__' ? '' : value)}
        >
          <SelectTrigger className='w-full rounded-lg border bg-gray-800 px-4 py-2 text-white'>
            <SelectValue placeholder='Select folder' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__none__'>No Folder</SelectItem>
            {flatFolders.map((folder: { id: string; name: string; level: number }) => (
              <SelectItem key={folder.id} value={folder.id}>
                {'  '.repeat(folder.level)}
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className='mb-2 block text-sm font-medium text-white'>Color</Label>
        <div className='flex items-center gap-2'>
          <Input
            type='color'
            value={color}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setColor(e.target.value)}
            className='h-10 w-full cursor-pointer rounded-lg border bg-gray-800'
          />
          <Button
            type='button'
            onClick={(): void => setColor('#ffffff')}
            className='whitespace-nowrap rounded-lg border px-3 py-2 text-xs text-gray-200 hover:bg-muted/50'
            title='Use folder theme background'
          >
            Use Folder Theme
          </Button>
        </div>
      </div>

      <div className='space-y-2'>
        <div className='flex flex-wrap gap-2'>
          {selectedTagIds.map((tagId: string) => {
            const tag = availableTags.find((t: TagRecord) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tag.id}
                className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30'
              >
                <Button
                  type='button'
                  onClick={(): void => handleFilterByTag(tag.id)}
                  className='hover:text-white'
                >
                  {tag.name}
                </Button>
                <Button
                  type='button'
                  onClick={(): void => handleRemoveTag(tag.id)}
                  className='hover:text-white'
                >
                  <X size={12} />
                </Button>
              </span>
            );
          })}
        </div>
        <div className='relative'>
          <div className='flex gap-2'>
            <Input
              ref={tagInputRef}
              type='text'
              placeholder={selectedTagIds.length === 0 ? 'Tags' : 'Add tag...'}
              value={tagInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                setTagInput(e.target.value);
                setIsTagDropdownOpen(true);
              }}
              onFocus={(): void => setIsTagDropdownOpen(true)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (tagInput.trim()) {
                    void handleCreateTag();
                  }
                }
              }}
              className='flex-1 rounded-none border-x-0 border-t border-b border bg-transparent px-0 py-2 text-white text-sm focus:outline-none focus:border-gray-500 placeholder:text-gray-500'
            />
          </div>

          {isTagDropdownOpen && (tagInput || filteredTags.length > 0) && (
            <div className='absolute z-10 mt-1 w-full rounded-md border bg-gray-800 shadow-lg'>
              <ul className='max-h-60 overflow-auto py-1 text-sm text-gray-300'>
                {filteredTags.map((tag: TagRecord) => (
                  <li
                    key={tag.id}
                    onClick={(): void => handleAddTag(tag)}
                    className='cursor-pointer px-4 py-2 hover:bg-gray-700 hover:text-white'
                  >
                    {tag.name}
                  </li>
                ))}
                {tagInput &&
                  !filteredTags.find(
                    (t: TagRecord) => t.name.toLowerCase() === tagInput.toLowerCase()
                  ) && (
                  <li
                    onClick={(): void => { void handleCreateTag(); }}
                    className='cursor-pointer px-4 py-2 text-blue-400 hover:bg-gray-700'
                  >
                      Create &quot;{tagInput}&quot;
                  </li>
                )}
              </ul>
            </div>
          )}
          {isTagDropdownOpen && (
            <div
              className='fixed inset-0 z-0'
              onClick={(): void => setIsTagDropdownOpen(false)}
            />
          )}
        </div>
      </div>

      <div className='space-y-2'>
        <Label className='mb-2 block text-sm font-medium text-white'>
          Related Notes
        </Label>
        <div className='flex flex-wrap gap-2'>
          {selectedRelatedNotes.map((related: { id: string; title: string; color: string | null; content: string }) => (
            <div
              key={related.id}
              className='relative flex min-w-[180px] max-w-[240px] cursor-pointer flex-col gap-1 rounded-md border p-2 text-left transition'
              style={relatedNoteStyle}
              role='button'
              tabIndex={0}
              onClick={(): void => handleSelectRelatedNote(related.id)}
              onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleSelectRelatedNote(related.id);
                }
              }}
            >
              <div className='text-xs font-semibold truncate'>
                {related.title}
              </div>
              <div className='text-[11px] leading-snug max-h-8 overflow-hidden opacity-80'>
                {related.content ? related.content : 'No content'}
              </div>
              <Button
                type='button'
                onClick={(event: React.MouseEvent): void => {
                  event.stopPropagation();
                  setSelectedRelatedNotes((prev: Array<{ id: string; title: string; color: string | null; content: string }>) =>
                    prev.filter((item: { id: string }) => item.id !== related.id)
                  );
                }}
                className='absolute right-1 top-1 opacity-70 hover:opacity-100'
                aria-label='Remove related note'
              >
                <X size={12} />
              </Button>
            </div>
          ))}
        </div>
        <div className='relative'>
          <div className='flex gap-2'>
            <Input
              type='text'
              placeholder='Search notes to relate...'
              value={relatedNoteQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                setRelatedNoteQuery(e.target.value);
                setIsRelatedDropdownOpen(true);
              }}
              onFocus={(): void => setIsRelatedDropdownOpen(true)}
              className='flex-1 rounded-none border-x-0 border-t border-b border bg-transparent px-0 py-2 text-white text-sm focus:outline-none focus:border-gray-500 placeholder:text-gray-500'
            />
          </div>

          {isRelatedDropdownOpen && relatedNoteQuery && (
            <div className='absolute z-10 mt-1 w-full rounded-md border bg-gray-800 shadow-lg'>
              <ul className='max-h-60 overflow-auto py-1 text-sm text-gray-300'>
                {isRelatedLoading && (
                  <li className='px-4 py-2 text-gray-500'>Searching...</li>
                )}
                {relatedNoteResults
                  .filter((candidate: NoteWithRelations) =>
                    noteId ? candidate.id !== noteId : true
                  )
                  .filter(
                    (candidate: NoteWithRelations) =>
                      candidate.title
                        .toLowerCase()
                        .includes(relatedNoteQuery.toLowerCase()) &&
                      !selectedRelatedNotes.some(
                        (selected: { id: string }) => selected.id === candidate.id
                      )
                  )
                  .map((candidate: NoteWithRelations) => (
                    <li
                      key={candidate.id}
                      onClick={(): void => {
                        setSelectedRelatedNotes((prev: Array<{ id: string; title: string; color: string | null; content: string }>) => [
                          ...prev,
                          {
                            id: candidate.id,
                            title: candidate.title,
                            color: candidate.color ?? null,
                            content: candidate.content ?? '',
                          },
                        ]);
                        setRelatedNoteQuery('');
                        setIsRelatedDropdownOpen(false);
                      }}
                      className='cursor-pointer px-4 py-2 hover:bg-gray-700 hover:text-white'
                    >
                      {candidate.title}
                    </li>
                  ))}
                {!isRelatedLoading &&
                  relatedNoteResults.filter(
                    (candidate: NoteWithRelations) =>
                      (noteId ? candidate.id !== noteId : true) &&
                      candidate.title
                        .toLowerCase()
                        .includes(relatedNoteQuery.toLowerCase()) &&
                      !selectedRelatedNotes.some(
                        (selected: { id: string }) => selected.id === candidate.id
                      )
                  ).length === 0 && (
                  <li className='px-4 py-2 text-gray-500'>No matches</li>
                )}
              </ul>
            </div>
          )}
          {isRelatedDropdownOpen && (
            <div
              className='fixed inset-0 z-0'
              onClick={(): void => setIsRelatedDropdownOpen(false)}
            />
          )}
        </div>
      </div>

      <div className='flex gap-4'>
        <Label className='flex items-center gap-2 text-white'>
          <Checkbox
            checked={isPinned} 
            onCheckedChange={(checked: boolean | 'indeterminate'): void => setIsPinned(Boolean(checked))}
            className='rounded'
          />
          <span className='text-sm'>Pinned</span>
        </Label>
        <Label className='flex items-center gap-2 text-white'>
          <Checkbox
            checked={isArchived} 
            onCheckedChange={(checked: boolean | 'indeterminate'): void => setIsArchived(Boolean(checked))}
            className='rounded'
          />
          <span className='text-sm'>Archived</span>
        </Label>
        <Label className='flex items-center gap-2 text-white'>
          <Checkbox
            checked={isFavorite} 
            onCheckedChange={(checked: boolean | 'indeterminate'): void => setIsFavorite(Boolean(checked))}
            className='rounded'
          />
          <span className='text-sm'>Favorite</span>
        </Label>
      </div>
    </div>
  );
}
