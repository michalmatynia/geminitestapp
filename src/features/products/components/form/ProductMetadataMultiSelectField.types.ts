import type { LabeledOptionDto } from '@/shared/contracts/base';

export type MetadataItem = {
  id: string;
  name: string;
  parentId?: string | null;
  sortIndex?: number | null;
};

export interface ProductMetadataMultiSelectFieldProps {
  label: string;
  items?: MetadataItem[] | undefined;
  selectedIds?: string[] | undefined;
  onChange?: ((nextIds: string[]) => void) | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
  searchPlaceholder?: string | undefined;
  emptyMessage?: string | undefined;
  contextItemsKey: 'catalogs' | 'producers' | 'tags' | 'categories';
  contextSelectedKey:
    | 'selectedCatalogIds'
    | 'selectedProducerIds'
    | 'selectedTagIds'
    | 'selectedCategoryId';
  contextLoadingKey: 'catalogsLoading' | 'producersLoading' | 'tagsLoading' | 'categoriesLoading';
  contextOnChangeKey:
    | 'onCatalogsChange'
    | 'onProducersChange'
    | 'onTagsChange'
    | 'onCategoryChange';
  formContextToggleName?: 'toggleCatalog' | 'toggleProducer' | 'toggleTag';
  single?: boolean;
}

export type ProductMetadataMultiSelectFieldResolvedProps = {
  label: string;
  options: Array<LabeledOptionDto<string>>;
  selectedIds: string[];
  resolvedOnChange: (nextIds: string[]) => void;
  resolvedLoading: boolean;
  disabled: boolean;
  resolvedPlaceholder: string;
  resolvedSearchPlaceholder: string;
  emptyMessage?: string;
  single: boolean;
};
