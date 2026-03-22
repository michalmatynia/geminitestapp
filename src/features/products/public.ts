export {
  ProductImageManager,
  type ProductImageManagerController,
  ProductImageManagerControllerProvider,
} from '@/shared/ui';
export { default as ProductCard } from './components/ProductCard';
export * from './components/form/CatalogMultiSelectField';
export * from './components/form/CategorySingleSelectField';
export * from './components/form/ProducerMultiSelectField';
export * from './components/form/ProductImagesTabContent';
export * from './components/form/ProductImagesTabContext';
export * from './components/form/ProductMetadataFieldContext';
export * from './components/form/TagMultiSelectField';
export * from './components/settings/ValidatorSettings';
export * from './components/settings/validator-settings/ValidatorDocsTooltips';
export * from './components/settings/validator-settings/ValidatorDocsTooltipsPanel';
export * from './context/ProductListContext';
export * from './context/ProductFormContext';
export * from './hooks/useCategoryQueries';
export * from './hooks/productCache';
export * from './hooks/useProductImages';
export {
  productMetadataKeys,
  useDeleteProducerMutation,
  useLanguages,
  useMultiTags,
  useProducers,
  useSaveProducerMutation,
} from './hooks/useProductMetadataQueries';
export * from './hooks/useProductSettingsQueries';
export * from './hooks/useProductsQuery';
export * from './api';
export * from '@/shared/contracts/products';
export {
  productCreateSchema as productCreateInputSchemaV1,
  productUpdateSchema as productUpdateInputSchemaV1,
} from '@/shared/lib/products/validations';
