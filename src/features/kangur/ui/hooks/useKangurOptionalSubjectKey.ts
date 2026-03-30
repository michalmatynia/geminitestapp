import * as KangurSubjectFocusContext from '@/features/kangur/ui/context/KangurSubjectFocusContext';

const useLegacySubjectFocusState = (): { subjectKey: string | null } | null => {
  const legacyFocus = KangurSubjectFocusContext.useKangurSubjectFocus?.();
  return legacyFocus ? { subjectKey: legacyFocus.subjectKey ?? null } : null;
};

const useResolvedSubjectFocusState = Object.prototype.hasOwnProperty.call(
  KangurSubjectFocusContext,
  'useOptionalKangurSubjectFocusState'
)
  ? (KangurSubjectFocusContext as {
      useOptionalKangurSubjectFocusState: () => { subjectKey: string | null } | null;
    }).useOptionalKangurSubjectFocusState
  : useLegacySubjectFocusState;

export const useKangurOptionalSubjectKey = (): string | null => {
  const subjectFocusState = useResolvedSubjectFocusState();
  return subjectFocusState?.subjectKey ?? null;
};
