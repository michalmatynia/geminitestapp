'use client';

import { Layers } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { PageSummary } from '@/shared/contracts/cms';
import { useUserPreferences, useUpdateUserPreferences } from '@/shared/hooks/useUserPreferences';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { useCmsDomainSelection } from '../../hooks/useCmsDomainSelection';
import { useCmsPages, useCmsPage } from '../../hooks/useCmsQueries';
import { usePageBuilderState, usePageBuilderDispatch } from '../../hooks/usePageBuilderContext';

type PageSelectorBarProps = {
  variant?: 'bar' | 'toolbar';
};

export function PageSelectorBar({ variant = 'bar' }: PageSelectorBarProps): React.ReactNode {
  const isToolbar = variant === 'toolbar';
  const state = usePageBuilderState();
  const dispatch = usePageBuilderDispatch();
  const { activeDomainId } = useCmsDomainSelection();
  const pagesQuery = useCmsPages(activeDomainId);
  const searchParams = useSearchParams();
  const pageIdParam = searchParams.get('pageId');
  const lastSavedPageIdRef = useRef<string | null>(null);
  const hasUserSelectedPageRef = useRef(false);

  const preferencesQuery = useUserPreferences();
  const userPreferences = preferencesQuery.data;
  const updatePreferencesMutation = useUpdateUserPreferences();

  const initialPageId = useMemo((): string => {
    if (pageIdParam && pagesQuery.data?.some((page: PageSummary) => page.id === pageIdParam)) {
      return pageIdParam;
    }
    if (state.currentPage?.id) {
      return state.currentPage.id;
    }
    const preferredId = userPreferences?.cmsLastPageId ?? null;
    if (preferredId && pagesQuery.data?.some((page: PageSummary) => page.id === preferredId)) {
      return preferredId;
    }
    if (pagesQuery.data && pagesQuery.data.length > 0) {
      return pagesQuery.data[0]!.id;
    }
    return '';
  }, [pageIdParam, pagesQuery.data, state.currentPage?.id, userPreferences?.cmsLastPageId]);

  const [userPageId, setUserPageId] = useState<string | null>(null);
  const selectedPageId = useMemo((): string => {
    const candidate = userPageId ?? initialPageId;
    if (!candidate) return '';
    if (!pagesQuery.data) return candidate;
    return pagesQuery.data.some((page: PageSummary) => page.id === candidate) ? candidate : '';
  }, [initialPageId, pagesQuery.data, userPageId]);

  const pageQuery = useCmsPage(selectedPageId || undefined);

  useEffect((): void => {
    if (selectedPageId) return;
    if (!state.currentPage) return;
    dispatch({ type: 'CLEAR_CURRENT_PAGE' });
  }, [dispatch, selectedPageId, state.currentPage]);

  useEffect((): void => {
    if (!pageQuery.data) return;
    if (pageQuery.data.id !== selectedPageId) return;
    if (state.currentPage?.id === pageQuery.data.id) return;
    dispatch({ type: 'SET_CURRENT_PAGE', page: pageQuery.data });
  }, [pageQuery.data, selectedPageId, state.currentPage?.id, dispatch]);

  useEffect((): void => {
    if (!preferencesQuery.isFetched) return;
    if (!selectedPageId) return;
    if (!hasUserSelectedPageRef.current && !pageIdParam) {
      if (
        typeof userPreferences?.cmsLastPageId === 'string' &&
        userPreferences.cmsLastPageId.trim()
      ) {
        lastSavedPageIdRef.current = userPreferences.cmsLastPageId;
      }
      return;
    }
    if (selectedPageId === userPreferences?.cmsLastPageId) {
      lastSavedPageIdRef.current = selectedPageId;
      return;
    }
    if (lastSavedPageIdRef.current === selectedPageId) return;
    lastSavedPageIdRef.current = selectedPageId;
    updatePreferencesMutation.mutate({ cmsLastPageId: selectedPageId });
  }, [
    pageIdParam,
    preferencesQuery.isFetched,
    selectedPageId,
    updatePreferencesMutation,
    userPreferences?.cmsLastPageId,
  ]);

  const handlePageChange = useCallback((value: string): void => {
    hasUserSelectedPageRef.current = true;
    setUserPageId((prev: string | null) => (prev === value ? prev : value));
  }, []);
  const pageOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      (pagesQuery.data ?? []).map((page: PageSummary) => ({
        value: page.id,
        label: page.name,
      })),
    [pagesQuery.data]
  );

  return (
    <div
      className={
        isToolbar ? 'flex items-center gap-2' : 'flex w-full items-center justify-center gap-3'
      }
    >
      {!isToolbar && (
        <div className='flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400'>
          <Layers className='size-3.5' />
          <span>Page</span>
        </div>
      )}
      <SelectSimple
        size='sm'
        value={selectedPageId}
        onValueChange={handlePageChange}
        options={pageOptions}
        placeholder='Select a page...'
        ariaLabel='Select a page...'
        className={isToolbar ? 'w-56' : 'w-64'}
        triggerClassName={isToolbar ? 'h-8' : undefined}
       title='Select a page...'/>
    </div>
  );
}
