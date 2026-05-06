import { useMemo } from 'react';
import type { OrganizationAdvancedFilterCondition } from '../../filemaker-organization-advanced-filters';
import { 
  getOrganizationAdvancedFieldConfig, 
  isOrganizationAdvancedMultiValueOperator 
} from './organization-advanced-filter-utils';
import type { OrganizationAdvancedFilterFieldConfig } from './organization-advanced-filter-utils';

type ConditionMetadata = {
  fieldConfig: OrganizationAdvancedFilterFieldConfig;
  useMultiValueInput: boolean;
};

export const useConditionMetadata = (
  condition: OrganizationAdvancedFilterCondition
): ConditionMetadata => {
  const fieldConfig = useMemo(() => getOrganizationAdvancedFieldConfig(condition.field), [condition.field]);
  const useMultiValueInput = useMemo(() => isOrganizationAdvancedMultiValueOperator(condition.operator), [condition.operator]);
  
  return { fieldConfig, useMultiValueInput };
};
