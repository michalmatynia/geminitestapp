import type {
  ProductBatchEditFieldChange,
  ProductBatchEditOperation,
} from '@/shared/contracts/products/batch-edit';
import { getProductBatchEditFieldDefinition } from '@/shared/contracts/products/batch-edit';
import type { ProductUpdateInput } from '@/shared/contracts/products/io';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { applyOperationByKind } from './batch-edit/operations';
import {
  isLocalizedLogicalField,
  readProductFieldValue,
  resolveLocalizedFieldNames,
} from './batch-edit/product-fields';
import { areValuesEqual } from './batch-edit/value-utils';

type ProductBatchEditPatch = ProductUpdateInput & Record<string, unknown>;

export type ProductBatchEditPatchResult = {
  patch: ProductBatchEditPatch;
  changes: ProductBatchEditFieldChange[];
};

const applyOperation = (
  input: {
    product: ProductWithImages;
    patch: ProductBatchEditPatch;
    changes: ProductBatchEditFieldChange[];
  },
  operation: ProductBatchEditOperation
): void => {
  const definition = getProductBatchEditFieldDefinition(operation.field);
  const fields = isLocalizedLogicalField(operation.field)
    ? resolveLocalizedFieldNames(operation.field, operation.language)
    : [operation.field];

  fields.forEach((field) => {
    const { patch, changes, product } = input;
    const currentValue = Object.prototype.hasOwnProperty.call(patch, field)
      ? patch[field]
      : readProductFieldValue(product, field);
    const nextValue = applyOperationByKind(
      definition.kind,
      currentValue,
      operation,
      definition.label
    );

    if (areValuesEqual(currentValue, nextValue)) return;

    patch[field] = nextValue;
    changes.push({
      field,
      oldValue: currentValue ?? null,
      newValue: nextValue ?? null,
    });
  });
};

export const buildProductBatchEditPatch = (
  product: ProductWithImages,
  operations: ProductBatchEditOperation[]
): ProductBatchEditPatchResult => {
  const result: ProductBatchEditPatchResult = {
    patch: {},
    changes: [],
  };

  operations.forEach((operation) => {
    applyOperation({ product, patch: result.patch, changes: result.changes }, operation);
  });

  return result;
};
