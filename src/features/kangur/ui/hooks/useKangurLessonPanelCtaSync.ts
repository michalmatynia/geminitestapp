'use client';

import { useCallback } from 'react';

import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurProgressUpdateContext } from '@kangur/platform';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { loadProgress } from '@/features/kangur/ui/services/progress';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

const kangurPlatform = getKangurPlatform();

const CTA_PROGRESS_CONTEXT: Required<Pick<KangurProgressUpdateContext, 'source'>> = {
  source: 'lesson_panel_navigation',
};

export const useKangurLessonPanelCtaSync = (): ((ctaId: string) => void) => {
  const { isAuthenticated, user } = useKangurAuth();
  const { subjectKey } = useKangurSubjectFocus();

  return useCallback(
    (ctaId: string): void => {
      if (!isAuthenticated) {
        return;
      }
      if (user?.actorType !== 'learner') {
        return;
      }
      if (!user.ownerUserId) {
        return;
      }

      const progress = loadProgress({ ownerKey: subjectKey });
      const normalizedCtaId = ctaId.trim();
      const context =
        normalizedCtaId.length > 0
          ? { ...CTA_PROGRESS_CONTEXT, cta: normalizedCtaId }
          : CTA_PROGRESS_CONTEXT;
      void kangurPlatform.progress
        .update(progress, context)
        .catch((error) => {
          void ErrorSystem.captureException(error);
          // Avoid throwing on CTA-triggered sync failures.
        });
    },
    [isAuthenticated, subjectKey, user]
  );
};
