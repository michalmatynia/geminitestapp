export type NormalizeProductNameCategoryLeaf = {
  id: string | null;
  label: string;
  fullPath: string | null;
  parentId: string | null;
  isCurrent: boolean | null;
};

export type NormalizeProductNameCategoryContext = {
  catalogId: string | null;
  currentCategoryId: string | null;
  leafCategories: NormalizeProductNameCategoryLeaf[];
  allowedLeafLabels: string[];
  totalCategories: number | null;
  totalLeafCategories: number | null;
  fetchedAt: string | null;
};

export type NormalizeProductNameAiPathResult = {
  normalizedName: string | null;
  title: string | null;
  size: string | null;
  material: string | null;
  category: string | null;
  theme: string | null;
  isValid: boolean | null;
  validationError: string | null;
  confidence: number | null;
  categoryContext?: NormalizeProductNameCategoryContext | null;
};

export type NormalizeDbSchemaCollectionState = {
  name: string;
  documentsCount: number | null;
  error: string | null;
};

export type NormalizeDbSchemaContextState = {
  query: string | null;
  collections: NormalizeDbSchemaCollectionState[];
};
