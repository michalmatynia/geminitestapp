import { useEffect, useRef } from 'react';

import { trackSocialPublishingClientEvent } from '@/features/filemaker/social/client-observability';

import type { SocialEditorSyncDeps } from './useSocialEditorSync.types';

export const useSocialEditorTracking = ({
  activePostId,
  deps,
}: {
  activePostId: string | null;
  deps: SocialEditorSyncDeps;
}): void => {
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (hasTrackedViewRef.current === true) {
      return;
    }
    hasTrackedViewRef.current = true;
    trackSocialPublishingClientEvent('social_publishing_page_view', {
      hasActivePostSelection: activePostId !== null,
      hasPublishingIntegration: deps.publishingConnectionId !== null,
      connectionCount: deps.linkedinConnections.length,
      brainModelId: deps.brainModelId,
      visionModelId: deps.visionModelId,
    });
  }, [
    activePostId,
    deps.brainModelId,
    deps.linkedinConnections.length,
    deps.publishingConnectionId,
    deps.visionModelId,
  ]);
};
