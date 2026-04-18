import { describe, expect, it } from 'vitest';

import {
  AMAZON_CANDIDATE_EXTRACTION_OPERATION_LABEL,
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_NAME,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_OPERATION_LABEL,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_NAME,
  AMAZON_REVERSE_IMAGE_SCAN_OPERATION_LABEL,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_NAME,
  resolveAmazonRuntimeActionName,
  resolveAmazonRuntimeOperationLabel,
} from './amazon-runtime-constants';

describe('amazon-runtime-constants', () => {
  it('resolves split runtime action names and keeps the full scan native runtime explicit', () => {
    expect(
      resolveAmazonRuntimeActionName(AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY)
    ).toBe(AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_NAME);
    expect(resolveAmazonRuntimeActionName(AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY)).toBe(
      AMAZON_CANDIDATE_EXTRACTION_RUNTIME_NAME
    );
    expect(resolveAmazonRuntimeActionName(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY)).toBe(
      AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_NAME
    );
  });

  it('falls back to the full-scan runtime label for unknown runtime keys', () => {
    expect(resolveAmazonRuntimeActionName('unknown')).toBe(
      AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_NAME
    );
  });

  it('resolves runtime-specific operation labels for user-facing scan status text', () => {
    expect(
      resolveAmazonRuntimeOperationLabel(AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY)
    ).toBe(AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_OPERATION_LABEL);
    expect(resolveAmazonRuntimeOperationLabel(AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY)).toBe(
      AMAZON_CANDIDATE_EXTRACTION_OPERATION_LABEL
    );
    expect(resolveAmazonRuntimeOperationLabel(AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY)).toBe(
      AMAZON_REVERSE_IMAGE_SCAN_OPERATION_LABEL
    );
    expect(resolveAmazonRuntimeOperationLabel('unknown')).toBe(
      AMAZON_REVERSE_IMAGE_SCAN_OPERATION_LABEL
    );
  });
});
