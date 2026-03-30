import type React from 'react';
import type { 
  AddingSynthesisLocalizedStage, 
  AddingSynthesisLocalizedStages, 
  AddingSynthesisState, 
  AddingSynthesisTranslate, 
  AddingSynthesisViewKind 
} from './AddingSynthesisGame.types';
import { 
  getLocalizedAddingSynthesisNoteFocus, 
  getLocalizedAddingSynthesisStage, 
  getLocalizedAddingSynthesisStages 
} from '@/features/kangur/ui/services/adding-synthesis';
import { ADDING_SYNTHESIS_VIEW_KINDS, LANE_STYLES, getFeedbackAccent } from './AddingSynthesisGame.constants';
import type KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import { 
  KangurSummaryPanel, 
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';

export const resolveAddingSynthesisCurrentStage = ({
  currentNote,
  translations,
}: {
  currentNote: AddingSynthesisState['currentNote'];
  translations: AddingSynthesisState['translations'];
}): {
  currentStage: AddingSynthesisLocalizedStage;
  localizedStages: AddingSynthesisLocalizedStages;
} => {
  const localizedStages = getLocalizedAddingSynthesisStages(translations);
  const fallbackStage =
    localizedStages[0] ?? getLocalizedAddingSynthesisStage('warmup', translations);

  return {
    currentStage: currentNote
      ? getLocalizedAddingSynthesisStage(currentNote.stageId, translations)
      : fallbackStage,
    localizedStages,
  };
};

export const resolveAddingSynthesisAccuracy = ({
  currentIndex,
  feedback,
  score,
}: {
  currentIndex: number;
  feedback: AddingSynthesisState['feedback'];
  score: number;
}): number =>
  currentIndex > 0 || feedback
    ? Math.round((score / Math.max(1, currentIndex + (feedback ? 1 : 0))) * 100)
    : 0;

export const resolveAddingSynthesisSummaryMessage = ({
  accuracy,
  t,
}: {
  accuracy: number;
  t: AddingSynthesisTranslate;
}): string => {
  if (accuracy >= 85) {
    return t(
      'addingSynthesis.summary.messages.strong',
      'Bardzo mocna sesja. Dodawanie trzyma rytm i tempo.'
    );
  }

  if (accuracy >= 60) {
    return t(
      'addingSynthesis.summary.messages.good',
      'Dobry wynik. Jeszcze kilka rund i te sumy będą wchodziły automatycznie.'
    );
  }

  return t(
    'addingSynthesis.summary.messages.retry',
    'Masz już bazę. Powtórz sesję i skup się na podpowiedziach przy trudniejszych nutach.'
  );
};

export const resolveAddingSynthesisExitLabels = ({
  finishLabel,
  t,
}: {
  finishLabel: string | undefined;
  t: AddingSynthesisTranslate;
}): {
  exitLabel: string;
  inSessionExitLabel: string;
} => ({
  exitLabel: finishLabel ?? t('addingSynthesis.shared.backToAdding', 'Wróć do Dodawania'),
  inSessionExitLabel:
    finishLabel ?? t('addingSynthesis.playing.endAttempt', 'Zakończ próbę'),
});

export const resolveAddingSynthesisViewKind = ({
  phase,
  summary,
}: {
  phase: AddingSynthesisState['phase'];
  summary: AddingSynthesisState['summary'];
}): AddingSynthesisViewKind => {
  if (phase === 'intro') {
    return ADDING_SYNTHESIS_VIEW_KINDS.intro;
  }

  if (phase === 'summary' && summary) {
    return ADDING_SYNTHESIS_VIEW_KINDS.summary;
  }

  return ADDING_SYNTHESIS_VIEW_KINDS.playing;
};

export const isAddingSynthesisCorrectLane = ({
  feedback,
  laneIndex,
}: {
  feedback: AddingSynthesisState['feedback'];
  laneIndex: number;
}): boolean => feedback?.correctLaneIndex === laneIndex;

export const isAddingSynthesisChosenLane = ({
  feedback,
  laneIndex,
}: {
  feedback: AddingSynthesisState['feedback'];
  laneIndex: number;
}): boolean => feedback?.chosenLaneIndex === laneIndex;

export const isAddingSynthesisErrorLane = ({
  feedback,
  isChosenLane,
  isCorrectLane,
}: {
  feedback: AddingSynthesisState['feedback'];
  isChosenLane: boolean;
  isCorrectLane: boolean;
}): boolean => {
  if (!feedback || !isChosenLane) {
    return false;
  }

  if (feedback.kind === 'miss') {
    return true;
  }

  return feedback.kind === 'wrong' && !isCorrectLane;
};

export const resolveAddingSynthesisLaneAccent = ({
  defaultAccent,
  showErrorState,
  showSuccessState,
}: {
  defaultAccent: React.ComponentProps<typeof KangurAnswerChoiceCard>['accent'];
  showErrorState: boolean;
  showSuccessState: boolean;
}): React.ComponentProps<typeof KangurAnswerChoiceCard>['accent'] => {
  if (showSuccessState) {
    return 'emerald';
  }

  if (showErrorState) {
    return 'rose';
  }

  return defaultAccent;
};

export const resolveAddingSynthesisLaneTextClassName = ({
  showErrorState,
  showSuccessState,
}: {
  showErrorState: boolean;
  showSuccessState: boolean;
}): string | null => {
  if (showSuccessState) {
    return 'text-emerald-700';
  }

  if (showErrorState) {
    return 'text-rose-700';
  }

  return null;
};

export const resolveAddingSynthesisLanePresentation = ({
  feedback,
  isCoarsePointer,
  laneIndex,
}: {
  feedback: AddingSynthesisState['feedback'];
  isCoarsePointer: boolean;
  laneIndex: number;
}): {
  accent: React.ComponentProps<typeof KangurAnswerChoiceCard>['accent'];
  buttonClassName: string;
} => {
  const laneStyle = LANE_STYLES[laneIndex] ?? LANE_STYLES[0];
  const isCorrectLane = isAddingSynthesisCorrectLane({ feedback, laneIndex });
  const isChosenLane = isAddingSynthesisChosenLane({ feedback, laneIndex });
  const showSuccessState = Boolean(feedback) && isCorrectLane;
  const showErrorState = isAddingSynthesisErrorLane({
    feedback,
    isChosenLane,
    isCorrectLane,
  });
  const accent = resolveAddingSynthesisLaneAccent({
    defaultAccent: laneStyle.accent,
    showErrorState,
    showSuccessState,
  });
  const laneTextClassName = resolveAddingSynthesisLaneTextClassName({
    showErrorState,
    showSuccessState,
  });

  return {
    accent,
    buttonClassName: cn(
      'min-h-[80px] touch-manipulation select-none flex-col justify-center rounded-[18px] px-1.5 py-2.5 text-center min-[360px]:min-h-[88px] min-[360px]:px-2 sm:min-h-[96px] sm:rounded-[24px] sm:py-3',
      isCoarsePointer &&
        'min-h-[96px] active:scale-[0.98] min-[360px]:min-h-[104px] sm:min-h-[112px]',
      laneTextClassName
    ),
  };
};

export const resolveAddingSynthesisHintPanel = ({
  currentNote,
  currentStage,
  feedback,
  isCoarsePointer,
  t,
  translations,
}: {
  currentNote: AddingSynthesisState['currentNote'];
  currentStage: AddingSynthesisLocalizedStage;
  feedback: AddingSynthesisState['feedback'];
  isCoarsePointer: boolean;
  t: AddingSynthesisTranslate;
  translations: AddingSynthesisState['translations'];
}): {
  accent: React.ComponentProps<typeof KangurSummaryPanel>['accent'];
  body: string | undefined;
  description: string | undefined;
  title: string | undefined;
  tone: React.ComponentProps<typeof KangurSummaryPanel>['tone'];
} => {
  if (feedback) {
    return {
      accent: getFeedbackAccent(feedback.kind),
      body: feedback.hint,
      description: feedback.description,
      title: feedback.title,
      tone: 'accent',
    };
  }

  if (!currentNote) {
    return {
      accent: currentStage.accent,
      body: undefined,
      description: undefined,
      title: undefined,
      tone: 'neutral',
    };
  }

  return {
    accent: currentStage.accent,
    body: isCoarsePointer
      ? t(
          'addingSynthesis.playing.touchHint',
          'Dotknij tor, gdy nuta dojdzie do linii trafienia.'
        )
      : t(
          'addingSynthesis.playing.keyboardHint',
          'Jeśli wolisz klawiaturę, naciśnij 1, 2, 3 lub 4.'
        ),
    description: getLocalizedAddingSynthesisNoteFocus(currentNote, translations),
    title: t('addingSynthesis.playing.hintTitle', 'Podpowiedź do tej nuty'),
    tone: 'neutral',
  };
};
