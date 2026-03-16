import type { LabeledOptionDto } from '@/shared/contracts/base';

export const IMAGE_STUDIO_RUN_STATUS_OPTIONS: Array<
  LabeledOptionDto<'all' | 'queued' | 'running' | 'completed' | 'failed'>
> = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];
