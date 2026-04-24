import { useState, useMemo, useEffect } from 'react';
import { useLessonContentEditorContext } from '../context/LessonContentEditorContext';
import { useKangurLessonMutations } from '../hooks/useKangurLessonMutations';
import { resolveKangurLessonDocumentPages } from '@/features/kangur/lesson-documents';
import { validateKangurLessonPageDraft } from '../content-creator-insights';

export function useKangurLessonEditorController() {
  const { lesson, document: value, onChange } = useLessonContentEditorContext();
  const pages = useMemo(() => resolveKangurLessonDocumentPages(value), [value]);
  const [activePageId, setActivePageId] = useState<string | null>(pages[0]?.id ?? null);
  
  useEffect(() => {
    if (!pages.some((page) => page.id === activePageId)) {
      setActivePageId(pages[0]?.id ?? null);
    }
  }, [activePageId, pages]);

  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0] ?? null;
  const activePageIndex = activePage ? pages.findIndex((page) => page.id === activePage.id) : -1;

  const mutations = useKangurLessonMutations(
    value,
    onChange,
    activePage,
    pages,
    activePageIndex,
    setActivePageId
  );

  const pageDraftReviews = useMemo(() => new Map(pages.map(p => [p.id, validateKangurLessonPageDraft(p)])), [pages]);

  return {
    lesson,
    pages,
    activePage,
    activePageId,
    setActivePageId,
    mutations,
    pageDraftReviews,
  };
}
