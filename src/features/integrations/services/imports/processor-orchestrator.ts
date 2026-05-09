import { type BaseImportRunRecord } from '@/shared/contracts/integrations/base-com';
import { getBaseImportRun, updateBaseImportRunStatus } from './base-import-run-repository';
import { notFoundError } from '@/shared/errors/app-error';

export const processBaseImportRun = async (runId: string): Promise<BaseImportRunRecord> => {
  const run = await getBaseImportRun(runId);
  if (!run) {
    throw notFoundError('Base import run not found.', { runId });
  }

  // Final terminal states check
  if (run.status === 'completed' || run.status === 'failed' || run.status === 'canceled') {
    return run;
  }

  return run;
};
