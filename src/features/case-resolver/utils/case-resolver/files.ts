import { CaseResolverFile, CaseResolverScanSlot } from '@/shared/contracts/case-resolver';

const IMAGE_FILE_EXTENSION_PATTERN = /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i;
const PDF_FILE_EXTENSION_PATTERN = /\.pdf$/i;

export const isLikelyImageFile = (file: File): boolean => {
  const mimeType = file.type.trim().toLowerCase();
  if (mimeType.startsWith('image/')) return true;
  return IMAGE_FILE_EXTENSION_PATTERN.test(file.name.trim());
};

export const isLikelyPdfFile = (file: File): boolean => {
  const mimeType = file.type.trim().toLowerCase();
  if (mimeType === 'application/pdf') return true;
  return PDF_FILE_EXTENSION_PATTERN.test(file.name.trim());
};

export const isLikelyScanInputFile = (file: File): boolean =>
  isLikelyImageFile(file) || isLikelyPdfFile(file);

export const createUniqueDocumentName = (
  existingFiles: CaseResolverFile[],
  baseName: string
): string => {
  const normalizedBase = baseName.trim() || 'Exploded Document';
  const existingNames = new Set(
    existingFiles.map((file: CaseResolverFile): string => file.name.trim().toLowerCase())
  );
  if (!existingNames.has(normalizedBase.toLowerCase())) {
    return normalizedBase;
  }

  let index = 2;
  while (index < 10000) {
    const candidate = `${normalizedBase} ${index}`;
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
    index += 1;
  }

  return `${normalizedBase} ${Date.now()}`;
};

export const buildCombinedOcrText = (slots: CaseResolverScanSlot[]): string => {
  const parts = slots
    .map((slot: CaseResolverScanSlot): string => {
      const text = (slot.ocrText || '').trim();
      if (!text) return '';
      return text;
    })
    .filter((value: string): boolean => value.length > 0);
  return parts.join('\n\n');
};
