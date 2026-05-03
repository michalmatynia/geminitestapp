import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  type ValidatorPatternList,
} from '@/features/admin/pages/validator-scope';
import type { GlobalValidatorView } from './types';

export function useValidatorState(): {
  activeView: GlobalValidatorView;
  patternLists: ValidatorPatternList[];
  activeList: ValidatorPatternList | null;
  activeDescription: string;
  currentBreadcrumbLabel: string;
} {
  const searchParams = useSearchParams();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  
  const activeView: GlobalValidatorView = searchParams.get('view') === 'tooltips' ? 'tooltips' : 'patterns';
  
  const rawPatternLists = settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const patternLists = useMemo(() => parseValidatorPatternLists(rawPatternLists), [rawPatternLists]);
  
  const activeList = useMemo(() => {
    const listParam = searchParams.get('list');
    const found = (listParam !== null && listParam !== '') ? patternLists.find((l) => l.id === listParam) : undefined;
    return found ?? patternLists[0] ?? null;
  }, [patternLists, searchParams]);

  const activeDescription = useMemo(() => {
    if (activeList === null) return '';
    const desc = activeList.description.trim();
    return desc === VALIDATOR_SCOPE_DESCRIPTIONS[activeList.scope] ? '' : desc;
  }, [activeList]);

  const currentBreadcrumbLabel = activeView === 'tooltips' ? 'Settings' : (activeList?.name ?? 'Validation Pattern Lists');

  return {
    activeView,
    patternLists,
    activeList,
    activeDescription,
    currentBreadcrumbLabel,
  };
}
