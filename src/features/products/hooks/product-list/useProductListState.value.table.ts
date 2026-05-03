import type { ProductListStateReturn } from './useProductListState.types';
import type { ProductListValueInput } from './useProductListState.value.types';

export type ProductListTableValue = Pick<
  ProductListStateReturn,
  | 'data'
  | 'getRowClassName'
  | 'getRowId'
  | 'handleProductsTableRender'
  | 'isLoading'
  | 'maxHeight'
  | 'rowSelection'
  | 'setRowSelection'
  | 'skeletonRows'
  | 'stickyHeader'
  | 'tableColumns'
>;

export const buildTableValue = ({
  callbacks,
  data,
  modal,
  runtime,
}: ProductListValueInput): ProductListTableValue => ({
  data: data.visibleData,
  rowSelection: modal.selection.rowSelection,
  setRowSelection: modal.selection.setRowSelection,
  handleProductsTableRender: callbacks.handleProductsTableRender,
  tableColumns: runtime.tableColumns,
  getRowClassName: callbacks.getRowClassName,
  getRowId: callbacks.getProductRowId,
  isLoading: runtime.isMounted !== true || runtime.tableColumnsReady !== true || data.productData.isLoading,
  skeletonRows: callbacks.tableSkeleton,
  maxHeight: 'calc(100vh - 200px)',
  stickyHeader: true,
});
