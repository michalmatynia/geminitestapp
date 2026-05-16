import {
  buildEffectiveProductSyncFieldRules,
  getProductSyncAppFieldLabel,
} from '@/shared/contracts/product-sync';
import type {
  ProductSyncFieldPreview,
  ProductSyncFieldRule,
  ProductSyncProfile,
  ProductSyncPreview,
  ProductSyncTargetSource,
  ProductSyncRunStats,
} from '@/shared/contracts/product-sync';
import type { ProductWithImages, ProductParameterValue } from '@/shared/contracts/products/product';

import { toTrimmedString } from './utils';
import {
  getProductFieldValue,
  resolveBaseValueByRule,
  normalizeFieldValue,
  valuesEqual,
  buildLocalPatchValue,
  setPathValue,
} from './field-resolution';
import { getEffectiveBaseFieldPresentation } from './presentation';
import type {
  LinkedProductSyncPlan,
  ProductSyncBaseFieldPresentationMetadata,
} from './types';

export const buildLinkedProductSyncPlan = (input: {
  product: ProductWithImages;
  baseRecord: Record<string, unknown> | null;
  profile: ProductSyncProfile;
  baseProductId: string;
  persistBaseProductId: boolean;
  baseFieldPresentationMetadata?: ProductSyncBaseFieldPresentationMetadata;
  resolvedBaseParameterValues?: ProductParameterValue[] | null;
}): LinkedProductSyncPlan => {
  const rules = buildEffectiveProductSyncFieldRules(input.profile.fieldRules);
  const localPatch: Record<string, unknown> = {};
  const basePayload: Record<string, unknown> = {};
  const localChanges: string[] = [];
  const baseChanges: string[] = [];

  const fields = rules.map((rule: ProductSyncFieldRule): ProductSyncFieldPreview => {
    const rawAppValue = getProductFieldValue(input.product, rule.appField);
    const rawBaseValue =
      rule.appField === 'parameters' && input.resolvedBaseParameterValues != null
        ? input.resolvedBaseParameterValues
        : input.baseRecord != null
          ? resolveBaseValueByRule(rule, input.baseRecord)
          : null;
    const appValue = normalizeFieldValue(rule.appField, rawAppValue);
    const baseValue = input.baseRecord != null
      ? normalizeFieldValue(rule.appField, rawBaseValue)
      : null;
    const baseFieldPresentation = getEffectiveBaseFieldPresentation(
      rule,
      input.baseFieldPresentationMetadata
    );
    const hasDifference =
      input.baseRecord !== null ? !valuesEqual(rule.appField, appValue, baseValue) : false;
    const willWriteToApp =
      rule.direction === 'base_to_app' &&
      input.baseRecord !== null &&
      hasDifference;
    const willWriteToBase =
      rule.direction === 'app_to_base' &&
      input.baseRecord !== null &&
      hasDifference;

    if (willWriteToApp) {
      localPatch[rule.appField] = buildLocalPatchValue(rule.appField, rawBaseValue, baseValue);
      localChanges.push(rule.appField);
    }

    if (willWriteToBase) {
      setPathValue(basePayload, rule.baseField, rawAppValue);
      baseChanges.push(rule.baseField);
    }

    return {
      appField: rule.appField,
      appFieldLabel: getProductSyncAppFieldLabel(rule.appField),
      baseField: rule.baseField,
      baseFieldLabel: baseFieldPresentation.label,
      baseFieldDescription: baseFieldPresentation.description,
      direction: rule.direction,
      appValue,
      baseValue,
      hasDifference,
      willWriteToApp,
      willWriteToBase,
    };
  });

  if (input.persistBaseProductId && toTrimmedString(input.product.baseProductId) === '') {
    localPatch['baseProductId'] = input.baseProductId;
    localChanges.push('baseProductId');
  }

  return {
    fields,
    localPatch,
    basePayload,
    localChanges,
    baseChanges,
  };
};

export const buildBlockedSyncPreview = (input: {
  status: ProductSyncPreview['status'];
  disabledReason: string;
  profile: ProductSyncProfile | null;
  product: ProductWithImages;
  linkedBaseProductId?: string | null;
  connectionName?: string | null;
  resolvedTargetSource?: ProductSyncTargetSource;
}): ProductSyncPreview => ({
  status: input.status,
  canSync: false,
  disabledReason: input.disabledReason,
  profile: input.profile != null
    ? {
        id: input.profile.id,
        name: input.profile.name,
        isDefault: input.profile.isDefault,
        enabled: input.profile.enabled,
        connectionId: input.profile.connectionId,
        connectionName: input.connectionName ?? null,
        inventoryId: input.profile.inventoryId,
        catalogId: input.profile.catalogId,
        lastRunAt: input.profile.lastRunAt,
      }
    : null,
  linkedBaseProductId: toTrimmedString(input.linkedBaseProductId) !== '' ? toTrimmedString(input.linkedBaseProductId) : null,
  resolvedTargetSource: input.resolvedTargetSource ?? 'none',
  fields: input.profile != null
    ? buildLinkedProductSyncPlan({
        product: input.product,
        baseRecord: null,
        profile: input.profile,
        baseProductId: toTrimmedString(input.linkedBaseProductId) !== '' ? toTrimmedString(input.linkedBaseProductId) : '',
        persistBaseProductId: false,
      }).fields
    : [],
});

export const toProductSyncPreviewProfile = (
  profile: ProductSyncProfile,
  options?: { connectionName?: string | null }
): ProductSyncPreview['profile'] => ({
  id: profile.id,
  name: profile.name,
  isDefault: profile.isDefault,
  enabled: profile.enabled,
  connectionId: profile.connectionId,
  connectionName: options?.connectionName ?? null,
  inventoryId: profile.inventoryId,
  catalogId: profile.catalogId,
  lastRunAt: profile.lastRunAt,
});

export const summarizeRun = (stats: ProductSyncRunStats): string => {
  return `Processed ${stats.processed}/${stats.total} Base-targeted products. Success: ${stats.success}, skipped: ${stats.skipped}, failed: ${stats.failed}, local updates: ${stats.localUpdated}, Base updates: ${stats.baseUpdated}.`;
};
