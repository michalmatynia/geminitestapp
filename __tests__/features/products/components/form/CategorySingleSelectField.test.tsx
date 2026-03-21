import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategorySingleSelectField } from '@/features/products/components/form/CategorySingleSelectField';

const multiSelectSpy = vi.fn();

vi.mock('@/features/products/components/form/ProductMetadataMultiSelectField', () => ({
  ProductMetadataMultiSelectField: (props: unknown) => {
    multiSelectSpy(props);
    return null;
  },
}));

describe('CategorySingleSelectField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not override selected IDs when selectedCategoryId prop is omitted', () => {
    render(<CategorySingleSelectField />);
    expect(multiSelectSpy).toHaveBeenCalledTimes(1);
    const props = multiSelectSpy.mock.calls[0]?.[0] as { selectedIds?: string[] };
    expect(props.selectedIds).toBeUndefined();
  });

  it('maps selectedCategoryId to single selectedIds entry', () => {
    render(<CategorySingleSelectField selectedCategoryId='cat-123' />);
    expect(multiSelectSpy).toHaveBeenCalledTimes(1);
    const props = multiSelectSpy.mock.calls[0]?.[0] as { selectedIds?: string[] };
    expect(props.selectedIds).toEqual(['cat-123']);
  });
});
