
import { createContext } from 'react';

export interface NoteMetadataData {
  title: string;
  setTitle: (title: string) => void;
  color: string;
  setColor: (color: string) => void;
  isPinned: boolean;
  setIsPinned: (isPinned: boolean) => void;
  isArchived: boolean;
  setIsArchived: (isArchived: boolean) => void;
  isFavorite: boolean;
  setIsFavorite: (isFavorite: boolean) => void;
  getReadableTextColor: (bgColor: string) => string;
}

export const NoteMetadataContext = createContext<NoteMetadataData | null>(null);
