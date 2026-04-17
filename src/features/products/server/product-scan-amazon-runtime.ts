import {
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_PART_1,
  buildAmazonReverseImageScanRuntimePart1,
} from './parts/product-scan-amazon-runtime.part1';
import { AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_PART_2 } from './parts/product-scan-amazon-runtime.part2';
import {
  AMAZON_SELECTOR_REGISTRY_RUNTIME,
  generateAmazonSelectorRegistryRuntimeFromRuntime,
} from '@/shared/lib/browser-execution/selectors/amazon';
import { resolveAmazonSelectorRegistryRuntime } from '@/features/integrations/services/amazon-selector-registry';

export const buildAmazonReverseImageScanRuntime = (
  selectorRegistryRuntime: string = AMAZON_SELECTOR_REGISTRY_RUNTIME
): string =>
  buildAmazonReverseImageScanRuntimePart1(selectorRegistryRuntime) +
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_PART_2;

export const AMAZON_REVERSE_IMAGE_SCAN_RUNTIME =
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_PART_1 + AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_PART_2;

export const resolveAmazonReverseImageScanRuntime = async (options?: {
  selectorProfile?: string | null;
}): Promise<string> => {
  const selectorProfile = options?.selectorProfile?.trim() || 'amazon';
  const resolution = await resolveAmazonSelectorRegistryRuntime({
    profile: selectorProfile,
  }).catch(() => null);

  return buildAmazonReverseImageScanRuntime(
    resolution
      ? generateAmazonSelectorRegistryRuntimeFromRuntime(resolution.selectorRuntime)
      : AMAZON_SELECTOR_REGISTRY_RUNTIME
  );
};
