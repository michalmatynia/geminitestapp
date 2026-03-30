import React from 'react';

import { AdvancedDraggableSection } from './advanced/AdvancedDraggableSection';
import { AdvancedMotionPathSection } from './advanced/AdvancedMotionPathSection';
import { AdvancedSvgEffectsSection } from './advanced/AdvancedSvgEffectsSection';
import { AdvancedTextEffectsSection } from './advanced/AdvancedTextEffectsSection';
import { AdvancedVelocitySection } from './advanced/AdvancedVelocitySection';
import { AdvancedObserverMagnetSection } from './AdvancedObserverMagnetSection';

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
