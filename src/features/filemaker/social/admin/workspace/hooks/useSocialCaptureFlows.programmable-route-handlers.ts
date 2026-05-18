'use client';

import { useCallback } from 'react';

import {
  buildSocialPublishingProgrammableCaptureRoutesFromPresetIds,
  createEmptySocialPublishingProgrammableCaptureRoute,
  SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
} from '@/features/filemaker/social/shared/social-playwright-capture';
import type { SocialPublishingProgrammableCaptureRoute } from '@/shared/contracts/social-publishing-image-addons';

import type {
  SocialCaptureFlowsProps,
  SocialProgrammableCaptureControls,
  SocialProgrammableCaptureState,
} from './useSocialCaptureFlows.types';

export const useProgrammableCaptureRouteHandlers = ({
  settings,
  state,
}: {
  settings: SocialCaptureFlowsProps['settings'];
  state: SocialProgrammableCaptureState;
}): Pick<
  SocialProgrammableCaptureControls,
  | 'handleAddProgrammableCaptureRoute'
  | 'handleUpdateProgrammableCaptureRoute'
  | 'handleRemoveProgrammableCaptureRoute'
  | 'handleSeedProgrammableCaptureRoutesFromPresets'
  | 'handleResetProgrammableCaptureScript'
> => {
  const handleAddProgrammableCaptureRoute = useCallback((): void => {
    state.setProgrammableCaptureRoutes((current) => [
      ...current,
      createEmptySocialPublishingProgrammableCaptureRoute(current.length + 1),
    ]);
  }, [state]);

  const handleUpdateProgrammableCaptureRoute = useCallback(
    (routeId: string, patch: Partial<SocialPublishingProgrammableCaptureRoute>): void => {
      state.setProgrammableCaptureRoutes((current) =>
        current.map((route) => (route.id === routeId ? { ...route, ...patch } : route))
      );
    },
    [state]
  );

  const handleRemoveProgrammableCaptureRoute = useCallback((routeId: string): void => {
    state.setProgrammableCaptureRoutes((current) =>
      current.filter((route) => route.id !== routeId)
    );
  }, [state]);

  const handleSeedProgrammableCaptureRoutesFromPresets = useCallback((): void => {
    state.setProgrammableCaptureRoutes(
      buildSocialPublishingProgrammableCaptureRoutesFromPresetIds(settings.batchCapturePresetIds)
    );
  }, [settings.batchCapturePresetIds, state]);

  const handleResetProgrammableCaptureScript = useCallback((): void => {
    state.setProgrammableCaptureScript(SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT);
  }, [state]);

  return {
    handleAddProgrammableCaptureRoute,
    handleUpdateProgrammableCaptureRoute,
    handleRemoveProgrammableCaptureRoute,
    handleSeedProgrammableCaptureRoutesFromPresets,
    handleResetProgrammableCaptureScript,
  };
};
