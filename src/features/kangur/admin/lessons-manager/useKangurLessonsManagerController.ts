import { useCallback, useMemo } from 'react';
import { useAdminKangurLessonsManagerState } from '../AdminKangurLessonsManagerPage.hooks';
import { useToast } from '@/features/kangur/shared/ui';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { buildLessonsManagerErrorReport } from '../AdminKangurLessonsManagerPage.shared';
import { upsertLesson } from '../utils';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';

export function useKangurLessonsManagerController() {
  const state = useAdminKangurLessonsManagerState();
  const { toast } = useToast();

  const handleSave = async () => {
    await withKangurClientError(
      buildLessonsManagerErrorReport('lesson-save', 'Saves lesson metadata.'),
      async () => {
        const lessonId = state.editingLesson?.id ?? Math.random().toString(); // Placeholder
        const nextLessons = upsertLesson(state.lessons, { ...state.formData, id: lessonId });
        await state.updateLessons.mutateAsync(nextLessons);
        toast('Lesson saved', { variant: 'success' });
      }
    );
  };

  const handleDelete = async () => {
    if (!state.lessonToDelete) return;
    await withKangurClientError(
      buildLessonsManagerErrorReport('lesson-delete', 'Deletes a lesson.'),
      async () => {
        await state.updateLessons.mutateAsync(state.lessons.filter(l => l.id !== state.lessonToDelete?.id));
        toast('Lesson deleted', { variant: 'success' });
        state.setLessonToDelete(null);
      }
    );
  };

  return { state, handleSave, handleDelete };
}
