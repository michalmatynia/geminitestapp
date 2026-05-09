'use client';

import React from 'react';
import { useKangurStarterRecipes } from '../hooks/useKangurStarterRecipes';
import { Button } from '@/features/kangur/shared/ui';
import type { KangurLesson, KangurLessonPage, KangurLessonRootBlock, KangurLessonDocumentTemplateId } from '@/features/kangur/shared/contracts/kangur';

interface KangurLessonStarterRecipesProps {
  lesson: KangurLesson | null;
  activePage: KangurLessonPage | null;
  updateDocument: (nextBlocks: KangurLessonRootBlock[]) => void;
  addPageFromTemplate: (templateId: KangurLessonDocumentTemplateId) => void;
}

export function KangurLessonStarterRecipes({
  lesson,
  activePage,
  updateDocument,
  addPageFromTemplate,
}: KangurLessonStarterRecipesProps): React.JSX.Element | null {
  const recipes = useKangurStarterRecipes(lesson, activePage, updateDocument, addPageFromTemplate);

  if (!lesson || !activePage || activePage.blocks.length > 0) return null;

  return (
    <div className='rounded-2xl border border-primary/20 bg-primary/5 p-6'>
      <div className='text-sm font-semibold text-foreground'>
        Starter recipes for {lesson.title} Lesson
      </div>
      <div className='mt-2 text-sm text-muted-foreground'>
        Quickly build common lesson patterns for this subject.
      </div>
      <div className='mt-4 flex flex-wrap gap-2'>
        {recipes.map((recipe) => (
          <Button
            key={recipe.id}
            type='button'
            size='sm'
            variant='outline'
            className='h-8 px-3'
            onClick={recipe.onClick}
          >
            {recipe.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
