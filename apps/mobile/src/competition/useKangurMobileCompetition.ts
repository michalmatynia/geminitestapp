import {
  getKangurCompetitionQuestions,
  type KangurCompetitionMode,
} from '@kangur/core';
import type { KangurExamQuestion } from '@kangur/contracts';
import { useMemo } from 'react';

export type KangurMobileCompetitionMode = Exclude<
  KangurCompetitionMode,
  'training_3pt'
>;

export type KangurMobileCompetitionModeItem = {
  mode: KangurMobileCompetitionMode;
  pointTier: '3' | '4' | '5' | 'mixed';
  questionCount: number;
  questions: KangurExamQuestion[];
};

type UseKangurMobileCompetitionResult = {
  focusedMode: KangurMobileCompetitionMode | null;
  modeToken: string | null;
  modes: KangurMobileCompetitionModeItem[];
};

const MODE_ORDER: KangurMobileCompetitionMode[] = [
  'full_test_2024',
  'original_2024',
  'original_4pt_2024',
  'original_5pt_2024',
];

const MODE_POINT_TIERS: Record<KangurMobileCompetitionMode, '3' | '4' | '5' | 'mixed'> = {
  full_test_2024: 'mixed',
  original_2024: '3',
  original_4pt_2024: '4',
  original_5pt_2024: '5',
};

const FOCUS_ALIASES: Record<string, KangurMobileCompetitionMode> = {
  '2024': 'full_test_2024',
  '3': 'original_2024',
  '3pt': 'original_2024',
  '4': 'original_4pt_2024',
  '4pt': 'original_4pt_2024',
  '5': 'original_5pt_2024',
  '5pt': 'original_5pt_2024',
  full: 'full_test_2024',
};

const resolveFocusedMode = (
  modeToken: string,
  items: KangurMobileCompetitionModeItem[],
): KangurMobileCompetitionMode | null => {
  const normalizedToken = modeToken.trim().toLowerCase();
  if (!normalizedToken) {
    return null;
  }

  const aliasedMode = FOCUS_ALIASES[normalizedToken];
  if (aliasedMode) {
    return aliasedMode;
  }

  const byId = items.find((item) => item.mode === normalizedToken);
  if (byId) {
    return byId.mode;
  }

  return null;
};

export const useKangurMobileCompetition = (
  rawModeToken: string | null,
): UseKangurMobileCompetitionResult => {
  const modeToken = rawModeToken?.trim().toLowerCase() || null;

  const modes = useMemo<KangurMobileCompetitionModeItem[]>(
    () =>
      MODE_ORDER.map((mode) => {
        const questions = getKangurCompetitionQuestions(mode) as KangurExamQuestion[];
        return {
          mode,
          pointTier: MODE_POINT_TIERS[mode],
          questionCount: questions.length,
          questions,
        };
      }),
    [],
  );

  return {
    focusedMode:
      modeToken && modes.length > 0 ? resolveFocusedMode(modeToken, modes) : null,
    modeToken,
    modes,
  };
};
