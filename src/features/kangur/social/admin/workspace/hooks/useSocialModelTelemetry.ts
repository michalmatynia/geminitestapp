'use client';

import { useMemo } from 'react';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { UseSocialModelTelemetryProps } from '../AdminKangurSocialPage.types';

export function useSocialModelTelemetry({
  settings,
  buildSocialContext,
}: UseSocialModelTelemetryProps) {
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
