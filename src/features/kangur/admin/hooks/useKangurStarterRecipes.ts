'use client';

import { useMemo } from 'react';

import {
  createKangurLessonActivityBlock,
  createKangurLessonCalloutBlock,
  createKangurLessonGridBlockFromTemplate,
  createKangurLessonImageBlock,
  createKangurLessonQuizBlock,
  createKangurLessonSvgBlock,
  type KangurLessonDocumentTemplateId,
} from '@/features/kangur/lesson-documents';
import type {
  KangurLesson,
  KangurLessonPage,
  KangurLessonRootBlock,
} from '@/features/kangur/shared/contracts/kangur';

import { getLessonRecipeFamily } from '../utils';

export type StarterRecipe = {
  id: string;
  label: string;
  description: string;
  onClick: () => void;
};

export function useKangurStarterRecipes(
  lesson: KangurLesson | null,
  activePage: KangurLessonPage | null,
  updateDocument: (nextBlocks: KangurLessonRootBlock[]) => void,
  addPageFromTemplate: (templateId: KangurLessonDocumentTemplateId) => void
): StarterRecipe[] {
  return useMemo<StarterRecipe[]>(() => {
    const family = getLessonRecipeFamily(lesson?.componentId);
    if (family === 'time') {
      return [
        {
          id: 'time-intro',
          label: 'Add guided intro page',
          description: 'Start with an explanation page that can hold text and one reference visual.',
          onClick: (): void => addPageFromTemplate('text-with-figure'),
        },
        {
          id: 'time-practice',
          label: 'Add practice activity',
          description: 'Create the interactive learner task for clock or calendar practice.',
          onClick: (): void =>
            updateDocument([...(activePage?.blocks ?? []), createKangurLessonActivityBlock()]),
        },
        {
          id: 'time-reference',
          label: 'Add reference illustration',
          description: 'Insert an SVG image block for a worked example or annotated reference.',
          onClick: (): void =>
            updateDocument([...(activePage?.blocks ?? []), createKangurLessonImageBlock()]),
        },
      ];
    }
    if (family === 'arithmetic') {
      return [
        {
          id: 'arithmetic-intro',
          label: 'Start with worked example',
          description: 'Use a text-and-figure page to explain the method before practice.',
          onClick: (): void => addPageFromTemplate('text-with-figure'),
        },
        {
          id: 'arithmetic-practice',
          label: 'Add practice activity',
          description: 'Drop in an interactive task for repeated learner practice.',
          onClick: (): void =>
            updateDocument([...(activePage?.blocks ?? []), createKangurLessonActivityBlock()]),
        },
        {
          id: 'arithmetic-check',
          label: 'Check with a quiz',
          description: 'Finish the page with a short comprehension check.',
          onClick: (): void =>
            updateDocument([...(activePage?.blocks ?? []), createKangurLessonQuizBlock()]),
        },
      ];
    }
    if (family === 'geometry') {
      return [
        {
          id: 'geometry-visual',
          label: 'Add visual explainer page',
          description: 'Open with a diagram-friendly page for definitions and examples.',
          onClick: (): void => addPageFromTemplate('svg-gallery-page'),
        },
        {
          id: 'geometry-diagram',
          label: 'Insert SVG diagram',
          description: 'Add an inline SVG block for a labelled shape or construction.',
          onClick: (): void =>
            updateDocument([...(activePage?.blocks ?? []), createKangurLessonSvgBlock()]),
        },
        {
          id: 'geometry-gallery',
          label: 'Build example gallery',
          description: 'Use a gallery layout to compare multiple shapes or worked examples.',
          onClick: (): void =>
            updateDocument([
              ...(activePage?.blocks ?? []),
              createKangurLessonGridBlockFromTemplate('svg-gallery'),
            ]),
        },
      ];
    }
    return [
      {
        id: 'logic-intro',
        label: 'Start with reasoning prompt',
        description: 'Introduce the pattern or rule with a compact explanation page.',
        onClick: (): void => addPageFromTemplate('article'),
      },
      {
        id: 'logic-hint',
        label: 'Add hint callout',
        description: 'Give learners a scaffold or clue without revealing the answer.',
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonCalloutBlock()]),
      },
      {
        id: 'logic-quiz',
        label: 'Add reasoning quiz',
        description: 'Check whether the learner can apply the rule in a new situation.',
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonQuizBlock()]),
      },
    ];
  }, [activePage?.blocks, addPageFromTemplate, lesson?.componentId, updateDocument]);
}
