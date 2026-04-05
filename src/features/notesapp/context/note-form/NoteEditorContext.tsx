import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { internalError } from '@/shared/errors/app-error';

import type { ThemeRecord } from '@/shared/contracts/notes';

export interface NoteEditorData {
  editorMode: 'markdown' | 'wysiwyg' | 'code' | 'rich-text' | 'plain-text';
  setEditorMode: (mode: 'markdown' | 'wysiwyg' | 'code' | 'rich-text' | 'plain-text') => void;
  isEditorModeLocked: boolean;
  isMigrating: boolean;
  handleMigrateToWysiwyg: (content: string) => Promise<string | undefined>;
  handleMigrateToMarkdown: (content: string) => Promise<string | undefined>;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  textColor: string;
  setTextColor: (color: string) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  editorWidth: number | null;
  setEditorWidth: (width: number | null | ((prev: number | null) => number | null)) => void;
  isDraggingSplitter: boolean;
  setIsDraggingSplitter: (isDragging: boolean) => void;
  editorSplitRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLTextAreaElement | null>;
  effectiveTheme: ThemeRecord;
  contentBackground: string;
  contentTextColor: string;
  previewTypographyStyle: React.CSSProperties;
}

const { Context: NoteEditorContext, useStrictContext: useNoteEditorContext } =
  createStrictContext<NoteEditorData>({
    hookName: 'useNoteEditorContext',
    providerName: 'NoteFormProvider',
    displayName: 'NoteEditorContext',
    errorFactory: internalError,
  });

export { NoteEditorContext, useNoteEditorContext };
