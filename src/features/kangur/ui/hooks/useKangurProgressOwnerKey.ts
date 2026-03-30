import { getProgressOwnerKey } from '@/features/kangur/ui/services/progress';
import { useKangurOptionalSubjectKey } from '@/features/kangur/ui/hooks/useKangurOptionalSubjectKey';

export const useKangurProgressOwnerKey = (): string | null => {
  const subjectKey = useKangurOptionalSubjectKey();
  return subjectKey ?? getProgressOwnerKey();
};
