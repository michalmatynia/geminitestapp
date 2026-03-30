import {
  collectProductImageDiagnostics,
  getProductImagesAsBase64,
  type ImageBase64Mode,
  type ImageExportLogger,
  type ImageTransformOptions,
} from '@/features/integrations/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const normalizeSearchText = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const isBaseImageError = (message: string | undefined): boolean => {
  if (!message) return false;
  const normalized = normalizeSearchText(message.toLowerCase());
  return (
    normalized.includes('zdjec') || normalized.includes('image') || normalized.includes('photo')
  );
};

export const buildImageDiagnosticsLogger = (
  context: Record<string, unknown>
): ImageExportLogger => ({
  log: (message: string, data?: Record<string, unknown>) => {
    void ErrorSystem.logWarning(`[export-to-base][images] ${message}`, {
      ...context,
      ...(data ?? {}),
    });
  },
});

export const logImageDiagnostics = async ({
  product,
  imageBaseUrl,
  includeBase64,
  base64Mode,
  transform,
  context,
}: {
  product: Parameters<typeof collectProductImageDiagnostics>[0];
  imageBaseUrl: string | null;
  includeBase64: boolean;
  base64Mode: ImageBase64Mode;
  transform?: ImageTransformOptions | null;
  context: Record<string, unknown>;
}): Promise<void> => {
  const urlDiagnostics = collectProductImageDiagnostics(product, imageBaseUrl);
  void ErrorSystem.logWarning('[export-to-base][images] Image candidates', {
    ...context,
    images: urlDiagnostics,
  });

  if (!includeBase64) return;

  try {
    const diagnostics = buildImageDiagnosticsLogger(context);
    await getProductImagesAsBase64(product, {
      diagnostics,
      outputMode: base64Mode,
      transform: transform ?? null,
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('[export-to-base][images] Failed to gather base64 diagnostics', {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
