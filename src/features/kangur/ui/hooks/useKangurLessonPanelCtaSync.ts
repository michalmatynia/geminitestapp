'use client';

import { useCallback } from 'react';

import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurProgressUpdateContext } from '@/features/kangur/services/ports';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { loadProgress } from '@/features/kangur/ui/services/progress';

const kangurPlatform = getKangurPlatform();

const CTA_PROGRESS_CONTEXT: Required<Pick<KangurProgressUpdateContext, 'source'>> = {
  source: 'lesson_panel_navigation',
};

export const useKangurLessonPanelCtaSync = (): ((ctaId: string) => void) => {
  const { isAuthenticated, user } = useKangurAuth();

  return useCallback(
    (ctaId: string): void => {
      if (!isAuthenticated) {
        return;
      }
      if (!user || user.actorType !== 'learner') {
        return;
      }
      if (!user.ownerUserId) {
        return;
      }

      const progress = loadProgress();
      void kangurPlatform.progress
        .update(progress, { ...CTA_PROGRESS_CONTEXT, cta: ctaId })
        .catch(() => {
          // Avoid throwing on CTA-triggered sync failures.
        });
    },
    [isAuthenticated, user]
  );
};
