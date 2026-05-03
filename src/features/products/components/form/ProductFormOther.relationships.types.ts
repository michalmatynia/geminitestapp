import type { UseFormSetValue } from 'react-hook-form';

import type { FieldValidatorIssue } from '@/features/products/validation-engine/core';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';

export type ProductFormOtherRelationshipsSectionProps = {
  catalogsError: string | null;
  hasCatalogs: boolean;
  validatorEnabled: boolean;
  visibleFieldIssues: Record<string, FieldValidatorIssue[] | undefined>;
  selectedCatalogIds: string[];
  categories: ProductCategory[];
  producers: Array<{ id: string; name: string }>;
  selectedCategoryId: string | null;
  selectedProducerIds: string[];
  setCategoryId: (categoryId: string | null) => void;
  shippingGroups: ProductShippingGroup[];
  shippingGroupsLoading: boolean;
  selectedShippingGroupId: string;
  setValue: UseFormSetValue<ProductFormData>;
};
