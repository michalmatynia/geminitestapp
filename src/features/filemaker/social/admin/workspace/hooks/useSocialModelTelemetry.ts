/**
 * Social Model Telemetry Hook
 * 
 * React hook for tracking AI model usage in social media publishing.
 * Provides:
 * - Brain model selection tracking
 * - Vision model usage analytics
 * - Publishing connection monitoring
 * - Client-side telemetry event dispatch
 * - Model performance and usage insights
 */

'use client';

import { useMemo } from 'react';
import { trackSocialPublishingClientEvent } from '@/features/filemaker/social/client-observability';
import type { UseSocialModelTelemetryProps } from '../SocialPublishingPage.types';

/** Telemetry handlers for social model interactions */
type SocialModelTelemetry = {
  handleBrainModelChange: (value: string) => void;
  handleVisionModelChange: (value: string) => void;
  handlePublishingConnectionChange: (value: string) => void;
};

export function useSocialModelTelemetry({
  settings,
  buildSocialContext,
}: UseSocialModelTelemetryProps): SocialModelTelemetry {
  const handleBrainModelChange = useMemo(() => {
    const original = settings.handleBrainModelChange;
    return (value: string): void => {
      original(value);
      trackSocialPublishingClientEvent('social_publishing_post_model_select', {
        ...buildSocialContext({ nextModelId: value }),
      });
    };
  }, [settings.handleBrainModelChange, buildSocialContext]);

  const handleVisionModelChange = useMemo(() => {
    const original = settings.handleVisionModelChange;
    return (value: string): void => {
      original(value);
      trackSocialPublishingClientEvent('social_publishing_post_vision_model_select', {
        ...buildSocialContext({ nextVisionModelId: value }),
      });
    };
  }, [settings.handleVisionModelChange, buildSocialContext]);

  const handlePublishingConnectionChange = useMemo(() => {
    const original = settings.handlePublishingConnectionChange;
    return (value: string): void => {
      original(value);
      trackSocialPublishingClientEvent('social_publishing_post_connection_select', {
        ...buildSocialContext({ nextConnectionId: value }),
      });
    };
  }, [settings.handlePublishingConnectionChange, buildSocialContext]);

  return {
    handleBrainModelChange,
    handleVisionModelChange,
    handlePublishingConnectionChange,
  };
}
