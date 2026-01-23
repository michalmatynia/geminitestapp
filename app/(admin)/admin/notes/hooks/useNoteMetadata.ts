import { useState, useEffect } from "react";

// Why: Note metadata (title, color, status flags) has synchronized state:
// - Title syncs when note changes
// - Color requires normalization and contrast calculation
// - Pins/archives/favorites need reactive updates
// Extracting prevents prop drilling and makes metadata updates testable.
export function useNoteMetadata(note: { id?: string; title?: string; color?: string | null; isPinned?: boolean; isArchived?: boolean; isFavorite?: boolean } | null) {
  const [title, setTitle] = useState(note?.title || "");
  const [color, setColor] = useState(note?.color?.toLowerCase().trim() || "#ffffff");
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isArchived, setIsArchived] = useState(note?.isArchived || false);
  const [isFavorite, setIsFavorite] = useState(note?.isFavorite || false);

  // Sync when note changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(note?.title || "");
  }, [note?.id, note?.title]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColor(note?.color?.toLowerCase().trim() || "#ffffff");
  }, [note?.id, note?.color]);

  // Sync status flags when note changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPinned(note?.isPinned || false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsArchived(note?.isArchived || false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFavorite(note?.isFavorite || false);
  }, [note?.id, note?.isPinned, note?.isArchived, note?.isFavorite]);

  const getReadableTextColor = (hex: string) => {
    const normalized = hex.replace("#", "");
    if (normalized.length !== 6) return "#f8fafc";
    const num = parseInt(normalized, 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.7 ? "#0f172a" : "#f8fafc";
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
