'use client';

import type { KangurMiniGameFinishProps } from '@/features/kangur/ui/types';

import { AddingSynthesisProvider, useAddingSynthesisContext } from './adding-synthesis/AddingSynthesis.context';
import {
  AddingSynthesisIntroView,
  AddingSynthesisPlayingView,
  AddingSynthesisSummaryView,
} from './adding-synthesis/AddingSynthesisGame.sections';

function AddingSynthesisGameContent(): React.JSX.Element {
  const { viewKind } = useAddingSynthesisContext();

  if (viewKind === 'intro') {
    return (
      <AddingSynthesisIntroView />
    );
  }

  if (viewKind === 'summary') {
    return (
      <AddingSynthesisSummaryView />
    );
  }

  return (
    <AddingSynthesisPlayingView />
  );
}

export default function AddingSynthesisGame(props: KangurMiniGameFinishProps): React.JSX.Element {
  return (
    <AddingSynthesisProvider {...props}>
      <AddingSynthesisGameContent />
    </AddingSynthesisProvider>
  );
}
