import { useMemo } from 'react';
import type { OrganizationAdvancedFilterCondition, OrganizationAdvancedFilterField } from '../../filemaker-organization-advanced-filters';
import { 
  getOrganizationAdvancedFieldConfig, 
  isOrganizationAdvancedMultiValueOperator 
} from './organization-advanced-filter-utils';

export const useConditionMetadata = (condition: OrganizationAdvancedFilterCondition) => {
  const fieldConfig = useMemo(() => getOrganizationAdvancedFieldConfig(condition.field), [condition.field]);
  const useMultiValueInput = useMemo(() => isOrganizationAdvancedMultiValueOperator(condition.operator), [condition.operator]);
  
  return { fieldConfig, useMultiValueInput };
};
