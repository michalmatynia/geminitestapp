'use client';

import { useCallback, useState } from 'react';

import type { Toast } from '@/shared/contracts/ui/base';
import { api } from '@/shared/lib/api-client';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

interface BackfillProjectResult {
  projectId: string;
  updatedCards: number;
  slotLinkBackfilled: number;
  maskFolderBackfilled: number;
  inferredGenerationBackfilled: number;
  errors: string[];
}

interface BackfillResult {
  dryRun: boolean;
  projectCount: number;
  scannedSlots: number;
  scannedLinks: number;
  updatedCards: number;
  slotLinkBackfilled: number;
  maskFolderBackfilled: number;
  inferredGenerationBackfilled: number;
  projects: BackfillProjectResult[];
}

export function useMaintenanceActions({
  backfillProjectId,
  backfillDryRun,
  backfillIncludeHeuristicGenerationLinks,
  toast,
}: {
  backfillProjectId: string;
  backfillDryRun: boolean;
  backfillIncludeHeuristicGenerationLinks: boolean;
  toast: Toast;
}) {
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResultText, setBackfillResultText] = useState('');

  const runCardBackfill = useCallback(async () => {
    setBackfillRunning(true);
    setBackfillResultText('');

    try {
      const response = await api.post<{ result: BackfillResult }>(
        '/api/image-studio/cards/backfill',
        {
          projectId: backfillProjectId.trim() || null,
          dryRun: backfillDryRun,
          includeHeuristicGenerationLinks: backfillIncludeHeuristicGenerationLinks,
        }
      );

      const result = response.result;
      const summary = [
        `Mode: ${result.dryRun ? 'dry-run' : 'write'}`,
        `Projects: ${result.projectCount}`,
        `Scanned slots: ${result.scannedSlots}`,
        `Scanned links: ${result.scannedLinks}`,
        `Updated cards: ${result.updatedCards}`,
        `Slot-link backfilled: ${result.slotLinkBackfilled}`,
        `Mask-folder backfilled: ${result.maskFolderBackfilled}`,
        `Generation inferred: ${result.inferredGenerationBackfilled}`,
      ].join('\n');

      const projectErrorCount = result.projects.reduce(
        (count: number, project: BackfillProjectResult) => {
          return count + (project.errors.length > 0 ? 1 : 0);
        },
        0
      );

      if (projectErrorCount > 0) {
        toast(`Backfill finished with errors in ${projectErrorCount} project(s).`, {
          variant: 'error',
        });
      } else {
        toast(
          result.dryRun
            ? 'Backfill dry-run completed.'
            : `Backfill completed. Updated ${result.updatedCards} card(s).`,
          { variant: 'success' }
        );
      }

      const perProject = result.projects
        .map((project) => {
          const errors =
            project.errors.length > 0 ? `\n  errors: ${project.errors.join(' | ')}` : '';
          return `- ${project.projectId}: updated=${project.updatedCards}, link=${project.slotLinkBackfilled}, mask=${project.maskFolderBackfilled}, inferred=${project.inferredGenerationBackfilled}${errors}`;
        })
        .join('\n');

      setBackfillResultText(`${summary}\n\nPer project:\n${perProject || '- none'}`);
    } catch (error) {
      logClientCatch(error, {
        source: 'AdminImageStudioSettingsPage',
        action: 'runCardBackfill',
      });
      toast(error instanceof Error ? error.message : 'Failed to run card backfill.', {
        variant: 'error',
      });
    } finally {
      setBackfillRunning(false);
    }
  }, [backfillDryRun, backfillIncludeHeuristicGenerationLinks, backfillProjectId, toast]);

  return {
    backfillRunning,
    backfillResultText,
    runCardBackfill,
  };
}
