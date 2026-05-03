import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type {
  ProductScanModalSelectedProduct,
  ScanModalRow,
} from './ProductScanModal.types';

type ProductScanModalRowRefsInput = {
  rows: ScanModalRow[];
  rowsRef: MutableRefObject<ScanModalRow[]>;
  selectedProducts: ProductScanModalSelectedProduct[];
  selectedProductsRef: MutableRefObject<ProductScanModalSelectedProduct[]>;
  setRows: Dispatch<SetStateAction<ScanModalRow[]>>;
};

const buildSelectedProductNameMap = (
  selectedProducts: ProductScanModalSelectedProduct[]
): Map<string, string> =>
  new Map(selectedProducts.map(({ productId, productName }) => [productId, productName]));

const syncRowsWithSelectedProductNames = (
  rows: ScanModalRow[],
  selectedProductNames: Map<string, string>
): { didChange: boolean; nextRows: ScanModalRow[] } => {
  const nextRows = rows.map((row) => {
    const nextProductName = selectedProductNames.get(row.productId);
    if (nextProductName === undefined || nextProductName === row.productName) return row;
    return { ...row, productName: nextProductName };
  });
  const didChange = nextRows.some(
    (row, index) => row.productName !== rows[index]?.productName
  );

  return { didChange, nextRows };
};

export const useProductScanModalRowRefs = (
  input: ProductScanModalRowRefsInput
): void => {
  const { rows, rowsRef, selectedProducts, selectedProductsRef, setRows } = input;

  useEffect((): void => {
    rowsRef.current = rows;
  }, [rows, rowsRef]);

  useEffect((): void => {
    selectedProductsRef.current = selectedProducts;
  }, [selectedProducts, selectedProductsRef]);

  useEffect((): void => {
    const selectedProductNames = buildSelectedProductNameMap(selectedProducts);
    setRows((currentRows) => {
      const { didChange, nextRows } = syncRowsWithSelectedProductNames(
        currentRows,
        selectedProductNames
      );
      if (didChange) rowsRef.current = nextRows;
      return didChange ? nextRows : currentRows;
    });
  }, [rowsRef, selectedProducts, setRows]);
};
