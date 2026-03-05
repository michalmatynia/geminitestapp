'use client';

import { X } from 'lucide-react';
import React from 'react';

import {
  useNoteEditorContext,
  useNoteFoldersContext,
  useNoteFormRuntime,
  useNoteMetadataContext,
  useNoteRelationsContext,
  useNoteTagsContext,
} from '@/features/notesapp/context/NoteFormContext';
import type { TagRecord, NoteWithRelations } from '@/shared/contracts/notes';
import {
  Button,
  Input,
  Label,
  Checkbox,
  FormField,
  Card,
  Chip,
  SearchableSelect,
} from '@/shared/ui';

interface NoteMetadataProps {
  showTitle?: boolean;
}

export function NoteMetadata({ showTitle = true }: NoteMetadataProps): React.JSX.Element {
  const { note } = useNoteFormRuntime();
  const { effectiveTheme } = useNoteEditorContext();
  const { title, setTitle, color, setColor, isPinned, setIsPinned, isArchived, setIsArchived, isFavorite, setIsFavorite } =
    useNoteMetadataContext();
  const { selectedFolderId, setSelectedFolderId, flatFolders } = useNoteFoldersContext();
  const {
    selectedTagIds,
    availableTags,
    tagInput,
    setTagInput,
    isTagDropdownOpen,
    setIsTagDropdownOpen,
    filteredTags,
    handleAddTag,
    handleCreateTag,
    handleFilterByTag,
  } = useNoteTagsContext();
  const {
    selectedRelatedNotes,
    setSelectedRelatedNotes,
    relatedNoteQuery,
    setRelatedNoteQuery,
    isRelatedDropdownOpen,
    setIsRelatedDropdownOpen,
    relatedNoteResults,
    isRelatedLoading,
    handleSelectRelatedNote,
  } = useNoteRelationsContext();

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
        <FormField label='Title'>
          <Input
            type='text'
            placeholder='Enter note title'
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setTitle(e.target.value)}
            className='w-full rounded-lg border bg-card/40 px-4 py-2 text-white'
            required
          />
        </FormField>
      ) : null}

      <FormField label='Folder'>
        <SearchableSelect
          value={selectedFolderId}
          onChange={(value: string | null): void => setSelectedFolderId(value ?? '')}
          options={flatFolders.map((folder: { id: string; name: string; level: number }) => ({
            value: folder.id,
            label: `${'  '.repeat(folder.level)}${folder.name}`,
          }))}
          placeholder='Select folder'
          emptyMessage='No folders found.'
        />
      </FormField>

      <FormField label='Color'>
        <div className='flex items-center gap-2'>
          <Input
            type='color'
            value={color}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setColor(e.target.value)}
            className='h-10 w-full cursor-pointer rounded-lg border bg-card/40 p-1'
          />
          <Button
            type='button'
            variant='outline'
            onClick={(): void => setColor('#ffffff')}
            className='whitespace-nowrap px-3 py-2 text-xs text-gray-200'
            title='Use folder theme background'
          >
            Use Folder Theme
          </Button>
        </div>
      </FormField>

      <div className='space-y-2'>
        <div className='flex flex-wrap gap-2'>
          {selectedTagIds.map((tagId: string) => {
            const tag = availableTags.find((t: TagRecord) => t.id === tagId);
            if (!tag) return null;
            return (
              <Chip
                key={tag.id}
                label={tag.name}
                active
                onClick={(): void => handleFilterByTag(tag.id)}
                icon={X}
                // Custom override for remove action
                className='pr-1'
              />
            );
          })}
        </div>
        <div className='relative'>
          <FormField label={selectedTagIds.length === 0 ? 'Tags' : undefined}>
            <Input
              ref={tagInputRef}
              type='text'
              placeholder={selectedTagIds.length === 0 ? 'Search or create tags...' : 'Add tag...'}
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
          </FormField>

          {isTagDropdownOpen && (tagInput || filteredTags.length > 0) && (
            <Card
              variant='glass'
              padding='none'
              className='absolute z-10 mt-1 w-full border bg-card shadow-lg max-h-60 overflow-hidden'
            >
              <div className='overflow-y-auto max-h-60 divide-y divide-white/5'>
                {filteredTags.map((tag: TagRecord) => (
                  <Button
                    key={tag.id}
                    variant='ghost'
                    onClick={(): void => handleAddTag(tag)}
                    className='w-full justify-start rounded-none px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors font-normal'
                  >
                    {tag.name || 'Unnamed'}
                  </Button>
                ))}
                {tagInput &&
                  !filteredTags.find(
                    (t: TagRecord) => (t.name || '').toLowerCase() === tagInput.toLowerCase()
                  ) && (
                  <Button
                    variant='ghost'
                    onClick={(): void => {
                      void handleCreateTag();
                    }}
                    className='w-full justify-start rounded-none px-4 py-2.5 text-sm text-blue-400 hover:bg-white/5 transition-colors font-normal'
                  >
                      Create &quot;{tagInput}&quot;
                  </Button>
                )}
              </div>
            </Card>
          )}
          {isTagDropdownOpen && (
            <div className='fixed inset-0 z-0' onClick={(): void => setIsTagDropdownOpen(false)} />
          )}
        </div>
      </div>

      <div className='space-y-2'>
        <FormField label='Related Notes'>
          <div className='flex flex-wrap gap-2 mb-2'>
            {selectedRelatedNotes.map(
              (related: { id: string; title: string; color: string | null; content: string }) => (
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
                  <div className='text-xs font-semibold truncate pr-4'>{related.title}</div>
                  <div className='text-[11px] leading-snug max-h-8 overflow-hidden opacity-80'>
                    {related.content ? related.content : 'No content'}
                  </div>
                  <Button
                    type='button'
                    onClick={(event: React.MouseEvent): void => {
                      event.stopPropagation();
                      setSelectedRelatedNotes(
                        (
                          prev: Array<{
                            id: string;
                            title: string;
                            color: string | null;
                            content: string;
                          }>
                        ) => prev.filter((item: { id: string }) => item.id !== related.id)
                      );
                    }}
                    className='absolute right-1 top-1 h-5 w-5 p-0 opacity-70 hover:opacity-100 hover:bg-transparent'
                    variant='ghost'
                    aria-label='Remove related note'
                  >
                    <X size={12} />
                  </Button>
                </div>
              )
            )}
          </div>
          <div className='relative'>
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

            {isRelatedDropdownOpen && relatedNoteQuery && (
              <Card
                variant='glass'
                padding='none'
                className='absolute z-10 mt-1 w-full border bg-card shadow-lg max-h-60 overflow-hidden'
              >
                <div className='overflow-y-auto max-h-60 divide-y divide-white/5'>
                  {isRelatedLoading && (
                    <div className='px-4 py-2.5 text-sm text-gray-500'>Searching...</div>
                  )}
                  {relatedNoteResults
                    .filter((candidate: NoteWithRelations) =>
                      noteId ? candidate.id !== noteId : true
                    )
                    .filter(
                      (candidate: NoteWithRelations) =>
                        candidate.title.toLowerCase().includes(relatedNoteQuery.toLowerCase()) &&
                        !selectedRelatedNotes.some(
                          (selected: { id: string }) => selected.id === candidate.id
                        )
                    )
                    .map((candidate: NoteWithRelations) => (
                      <Button
                        key={candidate.id}
                        variant='ghost'
                        onClick={(): void => {
                          setSelectedRelatedNotes(
                            (
                              prev: Array<{
                                id: string;
                                title: string;
                                color: string | null;
                                content: string;
                              }>
                            ) => [
                              ...prev,
                              {
                                id: candidate.id,
                                title: candidate.title,
                                color: candidate.color ?? null,
                                content: candidate.content ?? '',
                              },
                            ]
                          );
                          setRelatedNoteQuery('');
                          setIsRelatedDropdownOpen(false);
                        }}
                        className='w-full justify-start rounded-none px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors font-normal'
                      >
                        {candidate.title}
                      </Button>
                    ))}
                  {!isRelatedLoading &&
                    relatedNoteResults.filter(
                      (candidate: NoteWithRelations) =>
                        (noteId ? candidate.id !== noteId : true) &&
                        candidate.title.toLowerCase().includes(relatedNoteQuery.toLowerCase()) &&
                        !selectedRelatedNotes.some(
                          (selected: { id: string }) => selected.id === candidate.id
                        )
                    ).length === 0 && (
                    <div className='px-4 py-2.5 text-sm text-gray-500'>No matches</div>
                  )}
                </div>
              </Card>
            )}
            {isRelatedDropdownOpen && (
              <div
                className='fixed inset-0 z-0'
                onClick={(): void => setIsRelatedDropdownOpen(false)}
              />
            )}
          </div>
        </FormField>
      </div>

      <div className='flex gap-6 py-2'>
        <Label className='flex items-center gap-2 text-white cursor-pointer hover:text-blue-200 transition-colors'>
          <Checkbox
            checked={isPinned}
            onCheckedChange={(checked: boolean | 'indeterminate'): void =>
              setIsPinned(Boolean(checked))
            }
            className='rounded border-white/20'
          />
          <span className='text-xs font-bold uppercase tracking-wider'>Pinned</span>
        </Label>
        <Label className='flex items-center gap-2 text-white cursor-pointer hover:text-blue-200 transition-colors'>
          <Checkbox
            checked={isArchived}
            onCheckedChange={(checked: boolean | 'indeterminate'): void =>
              setIsArchived(Boolean(checked))
            }
            className='rounded border-white/20'
          />
          <span className='text-xs font-bold uppercase tracking-wider'>Archived</span>
        </Label>
        <Label className='flex items-center gap-2 text-white cursor-pointer hover:text-blue-200 transition-colors'>
          <Checkbox
            checked={isFavorite}
            onCheckedChange={(checked: boolean | 'indeterminate'): void =>
              setIsFavorite(Boolean(checked))
            }
            className='rounded border-white/20'
          />
          <span className='text-xs font-bold uppercase tracking-wider'>Favorite</span>
        </Label>
      </div>
    </div>
  );
}
