import type { KangurExamQuestion } from '@kangur/contracts';

import {
  getKangurQuestions as getKangurQuestionsData,
  isExamMode as isExamModeData,
} from '../../../src/features/kangur/ui/services/kangur-questions-data.js';

export type KangurCompetitionMode =
  | 'full_test_2024'
  | 'original_2024'
  | 'original_4pt_2024'
  | 'original_5pt_2024'
  | 'training_3pt';

export const KANGUR_COMPETITION_MODES: readonly KangurCompetitionMode[] = [
  'full_test_2024',
  'original_2024',
  'original_4pt_2024',
  'original_5pt_2024',
  'training_3pt',
] as const;

export const getKangurCompetitionQuestions = (
  mode: KangurCompetitionMode | null,
): KangurExamQuestion[] =>
  getKangurQuestionsData(mode ?? '') as KangurExamQuestion[];

export const isKangurCompetitionExamMode = (
  mode: KangurCompetitionMode | null,
): boolean => isExamModeData(mode ?? '');
