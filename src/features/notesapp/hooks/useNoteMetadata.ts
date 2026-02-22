import { useState } from 'react';

// Why: Note metadata (title, color, status flags) has synchronized state:
// - Title syncs when note changes
// - Color requires normalization and contrast calculation
// - Pins/archives/favorites need reactive updates
// Extracting prevents prop drilling and makes metadata updates testable.
export function useNoteMetadata(note: { id?: string; title?: string; color?: string | null; isPinned?: boolean; isArchived?: boolean; isFavorite?: boolean; [key: string]: unknown } | null): {
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
  getReadableTextColor: (hex: string) => string;
} {
  const [title, setTitle] = useState(note?.title || '');
  const [color, setColor] = useState(note?.color?.toLowerCase().trim() || '#ffffff');
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isArchived, setIsArchived] = useState(note?.isArchived || false);
  const [isFavorite, setIsFavorite] = useState(note?.isFavorite || false);

  const [prevNoteId, setPrevNoteId] = useState(note?.id);

  // Sync when note changes - adjusting state during render
  if (note?.id !== prevNoteId) {
    setPrevNoteId(note?.id);
    setTitle(note?.title || '');
    setColor(note?.color?.toLowerCase().trim() || '#ffffff');
    setIsPinned(note?.isPinned || false);
    setIsArchived(note?.isArchived || false);
    setIsFavorite(note?.isFavorite || false);
  }

  const getReadableTextColor = (hex: string): string => {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) return '#f8fafc';
    const num = parseInt(normalized, 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.7 ? '#0f172a' : '#f8fafc';
  };

  return {
    title,
    setTitle,
    color,
    setColor,
    isPinned,
    setIsPinned,
    isArchived,
    setIsArchived,
    isFavorite,
    setIsFavorite,
    getReadableTextColor,
  };
}
