import 'server-only';

import type {
  ProductScanProvider,
  ProductScanRecord,
  ProductScanType,
} from '@/shared/contracts/product-scans';
import { AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY } from '@/shared/lib/browser-execution/amazon-runtime-constants';
import { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY } from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';
import {
  resolve1688ScanDisplayName,
  resolve1688ScanImageCandidates,
} from './product-scan-1688.helpers';
import {
  resolveProductScanDisplayName,
  resolveProductScanImageCandidates,
} from './product-scan-shared.helpers';
import {
  buildAmazonScanRequestInput,
  build1688ScanRequestInput,
  createAmazonProductScanBaseRecord,
  create1688ProductScanBaseRecord,
} from './product-scans-service.helpers';

type ProductScanBaseRecordInput = {
  productId: string;
  productName: string;
  integrationId?: string | null;
  connectionId?: string | null;
  userId?: string | null;
  imageCandidates: ProductScanRecord['imageCandidates'];
  status: ProductScanRecord['status'];
  error?: string | null;
};

type ProductScanProviderRuntimeBase = {
  buildRequestInput: (input: Record<string, unknown>) => Record<string, unknown>;
  createBaseRecord: (input: ProductScanBaseRecordInput) => ProductScanRecord;
  resolveDisplayName: typeof resolveProductScanDisplayName;
  resolveImageCandidates: typeof resolveProductScanImageCandidates;
};

export type ProductScanScriptProviderRuntime = ProductScanProviderRuntimeBase & {
  executionMode: 'script';
  script: string;
  resolveScript?: (input?: { selectorProfile?: string | null }) => Promise<string> | string;
  runtimeKey?: never;
};

export type ProductScanNativeProviderRuntime = ProductScanProviderRuntimeBase & {
  executionMode: 'native';
  runtimeKey: string;
  script?: never;
};

export type ProductScanProviderRuntime =
  | ProductScanScriptProviderRuntime
  | ProductScanNativeProviderRuntime;

export type ProductScanProviderDefinition = {
  provider: ProductScanProvider;
  defaultScanType: ProductScanType;
  label: string;
  resultKind: 'marketplace' | 'supplier';
  supportsBatchQueue: boolean;
  runtime: ProductScanProviderRuntime | null;
};

export const PRODUCT_SCAN_PROVIDER_DEFINITIONS: Record<
  ProductScanProvider,
  ProductScanProviderDefinition
> = {
  amazon: {
    provider: 'amazon',
    defaultScanType: 'google_reverse_image',
    label: 'Amazon reverse image',
    resultKind: 'marketplace',
    supportsBatchQueue: true,
    runtime: {
      buildRequestInput: (input) =>
        buildAmazonScanRequestInput(input as Parameters<typeof buildAmazonScanRequestInput>[0]),
      createBaseRecord: createAmazonProductScanBaseRecord,
      resolveDisplayName: resolveProductScanDisplayName,
      resolveImageCandidates: resolveProductScanImageCandidates,
      executionMode: 'native',
      runtimeKey: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
    },
  },
  '1688': {
    provider: '1688',
    defaultScanType: 'supplier_reverse_image',
    label: '1688 supplier reverse image',
    resultKind: 'supplier',
    supportsBatchQueue: true,
    runtime: {
      buildRequestInput: (input) =>
        build1688ScanRequestInput(input as Parameters<typeof build1688ScanRequestInput>[0]),
      createBaseRecord: create1688ProductScanBaseRecord,
      resolveDisplayName: resolve1688ScanDisplayName,
      resolveImageCandidates: resolve1688ScanImageCandidates,
      executionMode: 'native',
      runtimeKey: SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
    },
  },
};

export const getProductScanProviderDefinition = (
  provider: ProductScanProvider
): ProductScanProviderDefinition => PRODUCT_SCAN_PROVIDER_DEFINITIONS[provider];

const createMissingProductScanRuntimeError = (
  definition: ProductScanProviderDefinition,
  executionMode: ProductScanProviderRuntime['executionMode']
): Error => new Error(`${definition.label} ${executionMode} runtime is not configured.`);

export const requireProductScanScriptRuntime = (
  definition: ProductScanProviderDefinition
): ProductScanScriptProviderRuntime => {
  const runtime = definition.runtime;
  if (runtime === null || runtime.executionMode !== 'script') {
    throw createMissingProductScanRuntimeError(definition, 'script');
  }
  return runtime;
};

export const requireProductScanNativeRuntime = (
  definition: ProductScanProviderDefinition
): ProductScanNativeProviderRuntime => {
  const runtime = definition.runtime;
  if (runtime === null || runtime.executionMode !== 'native') {
    throw createMissingProductScanRuntimeError(definition, 'native');
  }
  return runtime;
};

export const AMAZON_PRODUCT_SCAN_PROVIDER = PRODUCT_SCAN_PROVIDER_DEFINITIONS.amazon;
