'use client';

import { useMemo } from 'react';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { UseSocialModelTelemetryProps } from '../AdminKangurSocialPage.types';

type SocialModelTelemetry = {
  handleBrainModelChange: (value: string) => void;
  handleVisionModelChange: (value: string) => void;
  handleLinkedInConnectionChange: (value: string) => void;
};

export function useSocialModelTelemetry({
  settings,
  buildSocialContext,
}: UseSocialModelTelemetryProps): SocialModelTelemetry {
  const handleBrainModelChange = useMemo(() => {
    const original = settings.handleBrainModelChange;
    return (value: string): void => {
      original(value);
      trackKangurClientEvent('kangur_social_post_model_select', {
        ...buildSocialContext({ nextModelId: value }),
      });
    };
  }, [settings.handleBrainModelChange, buildSocialContext]);

  const handleVisionModelChange = useMemo(() => {
    const original = settings.handleVisionModelChange;
    return (value: string): void => {
      original(value);
      trackKangurClientEvent('kangur_social_post_vision_model_select', {
        ...buildSocialContext({ nextVisionModelId: value }),
      });
    };
  }, [settings.handleVisionModelChange, buildSocialContext]);

  const handleLinkedInConnectionChange = useMemo(() => {
    const original = settings.handleLinkedInConnectionChange;
    return (value: string): void => {
      original(value);
      trackKangurClientEvent('kangur_social_post_connection_select', {
        ...buildSocialContext({ nextConnectionId: value }),
      });
    };
  }, [settings.handleLinkedInConnectionChange, buildSocialContext]);

  return {
    handleBrainModelChange,
    handleVisionModelChange,
    handleLinkedInConnectionChange,
  };
}
