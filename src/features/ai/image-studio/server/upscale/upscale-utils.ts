export function guessExtension(mime: string): string {
  const clean = mime.toLowerCase();
  if (clean.includes('jpeg')) return '.jpg';
  if (clean.includes('webp')) return '.webp';
  if (clean.includes('avif')) return '.avif';
  return '.png';
}

export const formatScaleLabel = (scale: number): string => `${Number(scale.toFixed(2))}x`;

export const sanitizeSegment = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

export const sanitizeFilename = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');
