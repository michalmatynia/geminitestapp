'use client';

import { useEffect, useMemo } from 'react';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

import { processFormatterField } from './ProductFormGeneralFormatter.field';
import {
  buildFormatterInputSignature,
  buildFormatterRuntime,
  compileProductValidationPattern,
} from './ProductFormGeneralFormatter.patterns';
import type {
  CompiledProductValidationPattern,
  ProductFormGeneralFormatterInput,
} from './ProductFormGeneralFormatter.types';

export const useCompiledProductValidationPatterns = (
  validatorPatterns: ProductValidationPattern[]
): CompiledProductValidationPattern[] =>
  useMemo(
    () => validatorPatterns.map((pattern) => compileProductValidationPattern(pattern)),
    [validatorPatterns]
  );

const shouldRunFormatter = (input: ProductFormGeneralFormatterInput): boolean =>
  input.validatorEnabled && input.formatterEnabled && input.compiledPatterns.length > 0;

const collectPendingFieldUpdates = (
  input: ProductFormGeneralFormatterInput
): Map<keyof ProductFormData, ProductFormData[keyof ProductFormData]> => {
  const runtime = buildFormatterRuntime(input);
  const pendingFieldUpdates = new Map<
    keyof ProductFormData,
    ProductFormData[keyof ProductFormData]
  >();
  for (const [fieldName, rawUnknown] of Object.entries(runtime.currentValues)) {
    const update = processFormatterField(runtime, fieldName, rawUnknown);
    if (update !== null) pendingFieldUpdates.set(update.fieldName, update.fieldValue);
  }
  return pendingFieldUpdates;
};

const resetFormatterLoopGuard = (input: ProductFormGeneralFormatterInput): void => {
  const guard = input.formatterLoopGuardRef.current;
  guard.cycleHits = 0;
  guard.recentSignatures = [];
};

const shouldSkipForFormatterLoopGuard = (
  input: ProductFormGeneralFormatterInput,
  formatterInputSignature: string
): boolean => {
  const guard = input.formatterLoopGuardRef.current;
  const seenBefore = guard.recentSignatures.includes(formatterInputSignature);
  guard.cycleHits = seenBefore ? guard.cycleHits + 1 : 0;
  guard.recentSignatures = [...guard.recentSignatures.slice(-7), formatterInputSignature];
  return guard.cycleHits >= 4;
};

const applyPendingFieldUpdates = (
  input: ProductFormGeneralFormatterInput,
  pendingFieldUpdates: Map<keyof ProductFormData, ProductFormData[keyof ProductFormData]>
): void => {
  for (const [fieldName, fieldValue] of pendingFieldUpdates.entries()) {
    input.setValue(fieldName, fieldValue, {
      shouldDirty: true,
      shouldTouch: true,
    });
  }
};

const runProductFormGeneralFormatter = (input: ProductFormGeneralFormatterInput): void => {
  if (shouldRunFormatter(input) === false) return;
  const formatterInputSignature = buildFormatterInputSignature(input);
  const pendingFieldUpdates = collectPendingFieldUpdates(input);
  if (pendingFieldUpdates.size === 0) {
    resetFormatterLoopGuard(input);
    return;
  }
  if (shouldSkipForFormatterLoopGuard(input, formatterInputSignature)) return;
  applyPendingFieldUpdates(input, pendingFieldUpdates);
};

export const useProductFormGeneralFormatter = (
  input: ProductFormGeneralFormatterInput
): void => {
  useEffect(() => {
    runProductFormGeneralFormatter(input);
  }, [
    input.watchedValues.nameEn,
    input.watchedValues.namePl,
    input.watchedValues.nameDe,
    input.watchedValues.descEn,
    input.watchedValues.descPl,
    input.watchedValues.descDe,
    input.watchedValues.sku,
    input.watchedValues.price,
    input.watchedValues.stock,
    input.watchedValues.weight,
    input.focusedFieldName,
    input.watchedValues.sizeLength,
    input.watchedValues.sizeWidth,
    input.watchedValues.fieldLength,
    input.watchedValues.supplierName,
    input.watchedValues.supplierLink,
    input.watchedValues.priceComment,
    input.compiledPatterns,
    input.formatterEnabled,
    input.getValues,
    input.latestProductValues,
    input.setValue,
    input.validationInstanceScope,
    input.validatorEnabled,
  ]);
};
