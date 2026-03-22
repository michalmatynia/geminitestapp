import {
  getKangurCompetitionQuestions,
  isKangurCompetitionExamMode,
  type KangurCompetitionMode,
} from '@kangur/core';
import type { KangurExamQuestion, KangurMode } from '@/features/kangur/ui/types';

export const getKangurQuestions = (mode: KangurMode | null): KangurExamQuestion[] =>
  getKangurCompetitionQuestions((mode ?? 'original_2024') as KangurCompetitionMode);

export const isExamMode = (mode: KangurMode | null): boolean =>
  isKangurCompetitionExamMode((mode ?? 'original_2024') as KangurCompetitionMode);
