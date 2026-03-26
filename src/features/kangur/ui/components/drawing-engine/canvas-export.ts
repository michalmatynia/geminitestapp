'use client';

import { useCallback } from 'react';

export type KangurDrawingExportOptions = {
  mimeType?: string;
  quality?: number;
};

type KangurDrawingDownloadActionOptions = {
  canExport?: boolean;
  documentRef?: Document | null;
  downloadDataUrl?: typeof downloadKangurDataUrl;
  exportDataUrl: (options?: KangurDrawingExportOptions) => string | null;
  exportOptions?: KangurDrawingExportOptions;
  filename: string;
};

export const exportKangurCanvasDataUrl = (
  canvas: HTMLCanvasElement | null,
  options: KangurDrawingExportOptions = {}
): string | null => {
  if (!canvas) {
    return null;
  }

  const { mimeType = 'image/png', quality } = options;
  return typeof quality === 'number'
    ? canvas.toDataURL(mimeType, quality)
    : canvas.toDataURL(mimeType);
};

export const downloadKangurDataUrl = (
  dataUrl: string,
  filename: string,
  documentRef: Document | null = typeof document !== 'undefined' ? document : null
): boolean => {
  if (!documentRef || !dataUrl || !filename) {
    return false;
  }

  const anchor = documentRef.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  documentRef.body.append(anchor);
  anchor.click();
  anchor.remove();
  return true;
};

export const downloadKangurCanvasExport = ({
  canExport = true,
  documentRef,
  downloadDataUrl = downloadKangurDataUrl,
  exportDataUrl,
  exportOptions,
  filename,
}: KangurDrawingDownloadActionOptions): boolean => {
  if (!canExport) {
    return false;
  }

  const dataUrl = exportDataUrl(exportOptions);
  if (!dataUrl) {
    return false;
  }

  return typeof documentRef === 'undefined'
    ? downloadDataUrl(dataUrl, filename)
    : downloadDataUrl(dataUrl, filename, documentRef);
};

export const useKangurDrawingDownloadAction = ({
  canExport = true,
  downloadDataUrl = downloadKangurDataUrl,
  exportDataUrl,
  exportOptions,
  filename,
}: Omit<KangurDrawingDownloadActionOptions, 'documentRef'>) =>
  useCallback(
    (): boolean =>
      downloadKangurCanvasExport({
        canExport,
        downloadDataUrl,
        exportDataUrl,
        exportOptions,
        filename,
      }),
    [canExport, downloadDataUrl, exportDataUrl, exportOptions, filename]
  );
