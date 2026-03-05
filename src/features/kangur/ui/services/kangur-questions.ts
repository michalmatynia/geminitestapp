import {
  getKangurQuestions as getKangurQuestionsData,
  isExamMode as isExamModeData,
} from '@/features/kangur/ui/services/kangur-questions-data';
import type { KangurExamQuestion, KangurMode } from '@/features/kangur/ui/types';

export const getKangurQuestions = (mode: KangurMode | null): KangurExamQuestion[] =>
  getKangurQuestionsData(mode ?? '') as KangurExamQuestion[];

export const isExamMode = (mode: KangurMode | null): boolean => isExamModeData(mode ?? '');
