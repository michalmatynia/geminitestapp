'use client';

export const openFilemakerCvPdfPreview = (html: string): void => {
  if (typeof window === 'undefined') return;
  const previewBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const previewUrl = URL.createObjectURL(previewBlob);
  const previewWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');
  if (!previewWindow) {
    URL.revokeObjectURL(previewUrl);
    throw new Error('Preview popup was blocked by the browser.');
  }
  window.setTimeout((): void => {
    URL.revokeObjectURL(previewUrl);
  }, 120_000);
};
