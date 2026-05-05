import { useCaseResolverState } from '../useCaseResolverState';

export function useAdminCaseResolverPageMetadata() {
  const state = useCaseResolverState();

  return {
    caseResolverTags: state.caseResolverTags,
    caseResolverIdentifiers: state.caseResolverIdentifiers,
    caseResolverCategories: state.caseResolverCategories,
    caseResolverSettings: state.caseResolverSettings,
    filemakerDatabase: state.filemakerDatabase,
  };
}
