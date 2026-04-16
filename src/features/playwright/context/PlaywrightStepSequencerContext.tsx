'use client';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { PlaywrightStepSequencerContextType } from './PlaywrightStepSequencerContext.types';

export type { PlaywrightStepSequencerContextType } from './PlaywrightStepSequencerContext.types';

const { Context: PlaywrightStepSequencerContext, useStrictContext: usePlaywrightStepSequencer } =
  createStrictContext<PlaywrightStepSequencerContextType>({
    hookName: 'usePlaywrightStepSequencer',
    providerName: 'PlaywrightStepSequencerProvider',
    displayName: 'PlaywrightStepSequencerContext',
  });

export { PlaywrightStepSequencerContext, usePlaywrightStepSequencer };

type Props = {
  value: PlaywrightStepSequencerContextType;
  children: React.ReactNode;
};

export function PlaywrightStepSequencerProvider({ value, children }: Props): React.JSX.Element {
  return (
    <PlaywrightStepSequencerContext.Provider value={value}>
      {children}
    </PlaywrightStepSequencerContext.Provider>
  );
}
