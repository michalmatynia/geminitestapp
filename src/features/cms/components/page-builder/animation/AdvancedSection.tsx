'use client';

import React from 'react';
import { AdvancedObserverMagnetSection } from './AdvancedObserverMagnetSection';
import { AdvancedMotionPathSection } from './advanced/AdvancedMotionPathSection';
import { AdvancedSvgEffectsSection } from './advanced/AdvancedSvgEffectsSection';
import { AdvancedTextEffectsSection } from './advanced/AdvancedTextEffectsSection';
import { AdvancedVelocitySection } from './advanced/AdvancedVelocitySection';
import { AdvancedDraggableSection } from './advanced/AdvancedDraggableSection';

export function AdvancedSection(): React.ReactNode {
  return (
    <>
      <AdvancedMotionPathSection />
      <AdvancedSvgEffectsSection />
      <AdvancedTextEffectsSection />
      <AdvancedVelocitySection />
      <AdvancedDraggableSection />
      <AdvancedObserverMagnetSection />
    </>
  );
}
