'use client';

import { ChevronRight, Pin, Star } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import type {
  ThemeRecord,
  RelatedNote,
  NoteRelationWithTarget,
  NoteRelationWithSource,
  NoteFileRecord,
  NoteWithRelations,
} from '@/shared/types/domain/notes';
import { BreadcrumbScroller, Button, CopyButton, Tag, Badge } from '@/shared/ui';
import { cn, setNoteDragData, sanitizeHtml } from '@/shared/utils';



import { buildBreadcrumbPath, darkenColor, renderMarkdownToHtml } from '../utils';

// Hardcoded dark mode fallback theme - consistent with page styling
const FALLBACK_THEME: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt' | 'name' | 'notebookId'> = {
  textColor: '#e5e7eb',                // gray-200
  backgroundColor: '#111827',          // gray-900
  markdownHeadingColor: '#ffffff',     // white
  markdownLinkColor: '#60a5fa',        // blue-400
  markdownCodeBackground: '#1f2937',   // gray-800
  markdownCodeText: '#e5e7eb',         // gray-200
  relatedNoteBorderWidth: 1,
  relatedNoteBorderColor: '#374151',   // gray-700
  relatedNoteBackgroundColor: '#1f2937', // gray-800
  relatedNoteTextColor: '#e5e7eb',     // gray-200
};

type NoteCardProps = {
  note: NoteWithRelations;
};

function NoteCardBase({ note }: NoteCardProps): React.JSX.Element {
  const {
    folderTree,
    settings,
    isFolderTreeCollapsed,
    setSelectedNote,
    setSelectedFolderId,
    setIsEditing,
    setDraggedNoteId,
    getThemeForNote,
    handleToggleFavorite,
  } = useNotesAppContext();

  const showTimestamps = settings.showTimestamps;
  const showBreadcrumbs = settings.showBreadcrumbs;
  const showRelatedNotes = settings.showRelatedNotes;
  const enableDrag = !isFolderTreeCollapsed;
  const onSelectNote = (next: NoteWithRelations): void => {
    setSelectedNote(next);
    setIsEditing(false);
  };
  const onSelectFolder = (folderId: string | null): void => {
    setSelectedFolderId(folderId);
    setSelectedNote(null);
    setIsEditing(false);
  };
  const onToggleFavorite = (target: NoteWithRelations): void => {
    void handleToggleFavorite(target);
  };
  const onDragStart = (noteId: string): void => setDraggedNoteId(noteId);
  const onDragEnd = (): void => setDraggedNoteId(null);

  // Use provided theme or fall back to dark mode theme
  const effectiveTheme = getThemeForNote(note) ?? FALLBACK_THEME;
  const isCodeNote = note.editorType === 'code';

  const contentHtml = React.useMemo(
    (): string => {
      let html = note.editorType === 'wysiwyg'
        ? note.content
        : renderMarkdownToHtml(note.content);
      // Remove image tags from preview to avoid duplication with thumbnail
      html = html.replace(/<img[^>]*>/g, '');
      // Also remove image paragraphs (markdown renders images in <p> tags)
      html = html.replace(/<p>\s*<\/p>/g, '');
      return sanitizeHtml(html);
    },
    [note.content, note.editorType]
  );
  const normalizedColor = note.color?.toLowerCase().trim();
  // Only use note's custom color if it's not white (default)
  const hasCustomColor = normalizedColor && normalizedColor !== '#ffffff';
  const backgroundColor = hasCustomColor
    ? normalizedColor
    : effectiveTheme.backgroundColor;
  const getReadableTextColor = (hexColor: string): string => {
    const normalized = hexColor.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return '#111827';
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.7 ? '#111827' : '#f8fafc';
  };
  const textColor = hasCustomColor
    ? getReadableTextColor(backgroundColor)
    : effectiveTheme.textColor;
  const relatedNoteStyle = {
    borderWidth: `${effectiveTheme.relatedNoteBorderWidth ?? 1}px`,
    borderColor: effectiveTheme.relatedNoteBorderColor,
    backgroundColor: effectiveTheme.relatedNoteBackgroundColor,
    color: effectiveTheme.relatedNoteTextColor,
  } as const;
  const relatedNotes = ((): RelatedNote[] => {
    if (note.relations && note.relations.length > 0) {
      return note.relations;
    }

    const build = (
      id: string | undefined,
      title: string | undefined,
      color: string | null | undefined
    ): RelatedNote | null => (id ? { id, title: title ?? 'Untitled note', color: color ?? null } : null);

    const fromRelations = (note.relationsFrom ?? [])
      .map((relation: NoteRelationWithTarget) =>
        build(
          relation.targetNote?.id ?? (relation as unknown as { targetNoteId?: string }).targetNoteId,
          relation.targetNote?.title,
          relation.targetNote?.color
        )
      )
      .filter((item: RelatedNote | null): item is RelatedNote => Boolean(item));

    const toRelations = (note.relationsTo ?? [])
      .map((relation: NoteRelationWithSource) =>
        build(
          relation.sourceNote?.id ?? (relation as unknown as { sourceNoteId?: string }).sourceNoteId,
          relation.sourceNote?.title,
          relation.sourceNote?.color
        )
      )
      .filter((item: RelatedNote | null): item is RelatedNote => Boolean(item));

    return [...fromRelations, ...toRelations];
  })();
  const thumbnailFile = note.files?.find(
    (file: NoteFileRecord) => file.mimetype?.startsWith('image/') && file.filepath
  );

  return (
    <div
      key={note.id}
      draggable={enableDrag}
      onDragStart={
        enableDrag
          ? (e: React.DragEvent): void => {
            setNoteDragData(e.dataTransfer, note.id);
            const target = e.currentTarget as HTMLElement;
            target.style.opacity = '0.5';
            onDragStart(note.id);
          }
          : undefined
      }
      onDragEnd={
        enableDrag
          ? (e: React.DragEvent): void => {
            const target = e.currentTarget as HTMLElement;
            target.style.opacity = '1';
            onDragEnd();
          }
          : undefined
      }
      onClick={(): void => onSelectNote(note)}
      style={{
        backgroundColor,
        color: textColor,
        ['--tw-prose-body' as never]: textColor,
        ['--tw-prose-headings' as never]:
          effectiveTheme.markdownHeadingColor ?? textColor,
        ['--note-link-color' as never]: effectiveTheme.markdownLinkColor ?? '#38bdf8',
        ['--note-code-bg' as never]: effectiveTheme.markdownCodeBackground ?? '#0f172a',
        ['--note-code-text' as never]: effectiveTheme.markdownCodeText ?? '#e2e8f0',
        ['--note-inline-code-bg' as never]:
          effectiveTheme.markdownCodeBackground ?? 'rgba(15, 23, 42, 0.12)',
      }}
      className={cn(
        'rounded-lg border border-border/60 p-4 transition',
        enableDrag
          ? 'cursor-grab active:cursor-grabbing hover:shadow-md'
          : 'cursor-pointer hover:shadow-md hover:brightness-90',
      )}
    >
      <div className='mb-2 flex items-start justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <h3 className='font-semibold'>{note.title}</h3>
          {isCodeNote && (
            <Badge variant='success' className='text-[10px] h-4'>
              CODE
            </Badge>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {isCodeNote && (
            <CopyButton 
              value={note.content}
              className='text-gray-500 hover:text-blue-500'
            />
          )}
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-auto w-auto p-0 text-gray-500 hover:bg-transparent hover:text-yellow-500'
            onMouseDown={(event: React.MouseEvent): void => event.preventDefault()}
            onClick={(event: React.MouseEvent): void => {
              event.stopPropagation();
              onToggleFavorite(note);
            }}
            aria-label={note.isFavorite ? 'Unfavorite note' : 'Favorite note'}
            title={note.isFavorite ? 'Remove favorite' : 'Add favorite'}
          >
            <Star
              size={16}
              className={note.isFavorite ? 'fill-yellow-400 text-yellow-500' : ''}
            />
          </Button>
          {note.isPinned && <Pin size={16} className='text-blue-600' />}
        </div>
      </div>
      
      <div className='pt-0'>
        {thumbnailFile && (
          <div className='mb-3 overflow-hidden rounded-md border'>
            <Image
              src={thumbnailFile.filepath}
              alt={thumbnailFile.filename}
              width={320}
              height={180}
              className='h-28 w-full object-cover'
              sizes='(min-width: 1024px) 240px, 100vw'
            />
          </div>
        )}
        <div
          className='mb-3 max-h-36 overflow-hidden text-sm prose prose-sm'
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
        <div className='flex flex-wrap gap-2'>
          {note.tags.map((nt: { tagId: string; tag: { color: string | null; name: string } }) => (
            <Tag
              key={nt.tagId}
              color={nt.tag.color}
              label={nt.tag.name}
            />
          ))}
        </div>
      </div>

      {(showTimestamps || showBreadcrumbs || (showRelatedNotes && relatedNotes.length > 0)) && (
        <div className='flex flex-col items-stretch pt-2 mt-2 border-t border-white/10'>
          {showTimestamps && (
            <div className='flex flex-col gap-0.5 text-[10px] text-gray-500'>
              <span>Created: {new Date(note.createdAt).toLocaleString()}</span>
              <span>Modified: {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : "Never"}</span>
            </div>
          )}
          {showBreadcrumbs && (
            <div className={showTimestamps ? 'mt-3' : ''}>
              <BreadcrumbScroller backgroundColor={darkenColor(backgroundColor, 20)}>
                {buildBreadcrumbPath(
                  note.categories[0]?.categoryId || null,
                  null,
                  folderTree
                ).map((crumb: { id: string | null; name: string; isNote?: boolean }, index: number, array: Array<{ id: string | null; name: string; isNote?: boolean }>) => (
                  <React.Fragment key={index}>
                    <Button
                      variant='link'
                      onClick={(e: React.MouseEvent): void => {
                        e.stopPropagation();
                        if (crumb.id) { 
                          onSelectFolder(crumb.id);
                        }
                      }}
                      className='h-auto p-0 text-xs text-inherit cursor-pointer hover:underline whitespace-nowrap'
                    >
                      {crumb.name}
                    </Button>
                    {index < array.length - 1 && (
                      <ChevronRight size={10} className='flex-shrink-0' />
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbScroller>
            </div>
          )}
          {showRelatedNotes && relatedNotes.length > 0 && (
            <div className='mt-2 flex flex-wrap gap-2'>
              {relatedNotes
                .filter((item: RelatedNote, index: number, array: RelatedNote[]) => array.findIndex((entry: RelatedNote) => entry.id === item.id) === index)
                .slice(0, 4)
                .map((related: RelatedNote) => (
                  <div
                    key={related.id}
                    className='w-24 cursor-pointer rounded-md px-2 py-1 text-[10px]'
                    style={relatedNoteStyle}
                  >
                    <div className='truncate font-semibold'>{related.title}</div>
                    <div className='line-clamp-2 text-[9px] opacity-80'>No content</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const NoteCard = React.memo(NoteCardBase);
NoteCard.displayName = 'NoteCard';
