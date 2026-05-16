'use client';

import type { ComponentType } from 'react';

import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import { FOCUS_TO_COMPONENT } from './lesson-focus-map';

import { alphabetLessons } from './registry/alphabet-registry';
import { webdevLessons } from './registry/webdev-registry';
import { agenticLessons } from './registry/agentic-coding-registry';
import { coreLessons } from './registry/core-registry';

export type LessonProps = {
  onBack?: () => void;
  onReady?: () => void;
  lessonTemplate?: KangurLessonTemplate | null;
};

export const LESSON_COMPONENTS: Record<string, ComponentType<LessonProps>> = {
  ...coreLessons,
  ...alphabetLessons,
  ...webdevLessons,
  ...agenticLessons,
};

export { FOCUS_TO_COMPONENT };
