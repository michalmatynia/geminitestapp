'use client';

import { AnimatePresence } from 'framer-motion';
import type { JSX } from 'react';

import { useKangurAiTutorPortalContext } from './KangurAiTutorPortal.context';
import {
  GuidedCalloutProvider,
} from './ai-tutor-guided/KangurAiTutorGuided.context';
import {
  KangurAiTutorGuidedCalloutShell,
  KangurAiTutorGuidedCalloutBody,
} from './ai-tutor-guided/KangurAiTutorGuidedLayout';

function KangurAiTutorGuidedCalloutContent(): JSX.Element {
  return (
    <KangurAiTutorGuidedCalloutShell>
      <KangurAiTutorGuidedCalloutBody />
    </KangurAiTutorGuidedCalloutShell>
  );
}

export function KangurAiTutorGuidedCallout(): JSX.Element {
  const { guidedCallout } = useKangurAiTutorPortalContext();

  return (
    <AnimatePresence mode='wait'>
      {guidedCallout.shouldRender && guidedCallout.style ? (
        <GuidedCalloutProvider>
          <KangurAiTutorGuidedCalloutContent />
        </GuidedCalloutProvider>
      ) : null}
    </AnimatePresence>
  );
}
