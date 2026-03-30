import { createContext } from 'react';

export interface NoteContentData {
  content: string;
  setContent: (content: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const NoteContentContext = createContext<NoteContentData | null>(null);
