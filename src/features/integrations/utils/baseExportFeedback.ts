import type { ExportResponse } from '@/shared/contracts/integrations';

type BaseExportFeedbackMode = 'default' | 'images_only';

const resolveBaseExportLabel = (mode: BaseExportFeedbackMode): string =>
  mode === 'images_only' ? 'Base.com image export' : 'Base.com export';

export const resolveBaseExportSuccessMessage = (
  response: ExportResponse,
  options?: {
    mode?: BaseExportFeedbackMode;
  }
): string => {
  const label = resolveBaseExportLabel(options?.mode ?? 'default');
  const jobId = response.jobId?.trim() || '';

  if (response.status === 'queued') {
    return jobId ? `${label} queued (job ${jobId}).` : `${label} queued.`;
  }

  if (response.status === 'completed') {
    return `${label} completed.`;
  }

  return `${label} started.`;
};
