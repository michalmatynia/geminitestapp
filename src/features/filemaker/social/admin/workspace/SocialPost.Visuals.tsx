'use client';

import React from 'react';

import { SocialPostImagesPanel } from './SocialPost.ImagesPanel';
import { SocialPostImageAddonsSection } from './SocialPost.ImageAddonsSection';
import { SocialPostVisualAnalysisResultSection } from './SocialPost.VisualAnalysisResultSection';
import { useSocialPostContext } from './SocialPostContext';
import {
  hasBlockingVisualMutationJob,
  visualMutationBlockTitle,
} from './SocialPost.VisualsRuntime';

type SocialPostVisualsProps = {
  showImagesPanel?: boolean;
};

function SocialPostImagesSection(): React.JSX.Element {
  const context = useSocialPostContext();
  const isInteractionBlocked = hasBlockingVisualMutationJob(context);

  return (
    <SocialPostImagesPanel
      imageAssets={context.imageAssets}
      handleRemoveImage={context.handleRemoveImage}
      setShowMediaLibrary={context.setShowMediaLibrary}
      showMediaLibrary={context.showMediaLibrary}
      handleAddImages={context.handleAddImages}
      isInteractionBlocked={isInteractionBlocked}
      interactionTitle={visualMutationBlockTitle(isInteractionBlocked)}
    />
  );
}

export function SocialPostVisuals({
  showImagesPanel = true,
}: SocialPostVisualsProps): React.JSX.Element {
  return (
    <>
      <SocialPostVisualAnalysisResultSection />
      <SocialPostImageAddonsSection />
      {showImagesPanel ? <SocialPostImagesSection /> : null}
    </>
  );
}
