import 'server-only';

import type {
  ProductScanProvider,
  ProductScanRecord,
  ProductScanType,
} from '@/shared/contracts/product-scans';

import { SCAN_1688_REVERSE_IMAGE_SCRIPT } from './product-scan-1688-script';
import { AMAZON_REVERSE_IMAGE_SCAN_SCRIPT } from './product-scan-amazon-script';
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

export type ProductScanProviderRuntime = {
  buildRequestInput: (input: Record<string, unknown>) => Record<string, unknown>;
  createBaseRecord: (input: ProductScanBaseRecordInput) => ProductScanRecord;
  resolveDisplayName: typeof resolveProductScanDisplayName;
  resolveImageCandidates: typeof resolveProductScanImageCandidates;
  script: string;
};

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
      script: AMAZON_REVERSE_IMAGE_SCAN_SCRIPT,
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
      script: SCAN_1688_REVERSE_IMAGE_SCRIPT,
    },
  },
};

export const getProductScanProviderDefinition = (
  provider: ProductScanProvider
): ProductScanProviderDefinition => PRODUCT_SCAN_PROVIDER_DEFINITIONS[provider];

export const AMAZON_PRODUCT_SCAN_PROVIDER = PRODUCT_SCAN_PROVIDER_DEFINITIONS.amazon;
