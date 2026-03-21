export type CaseResolverNamedColorParentFormData = {
  name: string;
  color: string;
  parentId: string | null;
};

export type CaseResolverCategoryFormData = CaseResolverNamedColorParentFormData & {
  description: string;
};

export type CaseResolverIdentifierFormData = CaseResolverNamedColorParentFormData;
export type CaseResolverTagFormData = CaseResolverNamedColorParentFormData;
