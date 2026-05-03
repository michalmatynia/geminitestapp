import { useState, useMemo, useCallback, useRef } from 'react';
import { usePageBuilderState, usePageBuilderDispatch, useVectorOverlay } from '@/features/cms/hooks/usePageBuilderContext';
import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useCmsSlugs, useUpdatePage } from '@/features/cms/hooks/useCmsQueries';
import { useThemeSettingsValue } from '../ThemeSettingsContext';
import { normalizePageSlugValues } from '@/features/cms/utils/slug-utils';

export function usePreviewPanelController() {
  const state = usePageBuilderState();
  const dispatch = usePageBuilderDispatch();
  const { vectorOverlay, closeVectorOverlay } = useVectorOverlay();
  const theme = useThemeSettingsValue();
  const { activeDomainId, activeDomain } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const updatePage = useUpdatePage();
  
  const [mediaTarget, setMediaTarget] = useState<any | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const domainSlugSet = useMemo(() => (slugsQuery.data ?? []).length ? new Set((slugsQuery.data ?? []).map((s: any) => s.slug)) : null, [slugsQuery.data]);
  
  const zoneSlugValues = useMemo(() => {
    if (!state.currentPage || !domainSlugSet) return [];
    return normalizePageSlugValues(state.currentPage.slugs).filter((s: string) => domainSlugSet.has(s));
  }, [state.currentPage, domainSlugSet]);

  const handleSelectNode = useCallback((nodeId: string | null) => dispatch({ type: 'SELECT_NODE', nodeId }), [dispatch]);
  const handleHoverNode = useCallback((nodeId: string | null) => {
    if (state.inspectorEnabled) setHoveredNodeId(nodeId);
  }, [state.inspectorEnabled]);

  return {
    state,
    dispatch,
    vectorOverlay,
    closeVectorOverlay,
    theme,
    activeDomain,
    slugsQuery,
    updatePage,
    zoneSlugValues,
    handleSelectNode,
    handleHoverNode,
    mediaOpen,
    setMediaOpen,
    mediaTarget,
    setMediaTarget
  };
}
