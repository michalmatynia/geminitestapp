import { fireEvent, render, screen } from '@/__tests__/test-utils';
import { describe, expect, it } from 'vitest';

import { AdvancedFilterBuilder } from '@/features/products/components/list/advanced-filter/AdvancedFilterBuilder';
import type { ProductAdvancedFilterGroup } from '@/shared/contracts/products';

function BuilderHarness({ initialGroup }: { initialGroup: ProductAdvancedFilterGroup }) {
  const [group, setGroup] = React.useState<ProductAdvancedFilterGroup>(initialGroup);

  return (
    <>
      <AdvancedFilterBuilder group={group} onChange={setGroup} />
      <pre data-testid='advanced-filter-group'>{JSON.stringify(group)}</pre>
    </>
  );
}

import React from 'react';

const parseRenderedGroup = (): ProductAdvancedFilterGroup => {
  const raw = screen.getByTestId('advanced-filter-group').textContent;
  if (!raw) {
    throw new Error('Missing rendered group payload');
  }
  return JSON.parse(raw) as ProductAdvancedFilterGroup;
};

describe('AdvancedFilterBuilder', () => {
  it('duplicates a rule with a new id', () => {
    const initialGroup: ProductAdvancedFilterGroup = {
      type: 'group',
      id: 'root',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'condition-1',
          field: 'name',
          operator: 'contains',
          value: 'desk',
        },
      ],
    };

    render(<BuilderHarness initialGroup={initialGroup} />);

    fireEvent.click(screen.getByLabelText('Duplicate rule'));

    const next = parseRenderedGroup();
    expect(next.rules).toHaveLength(2);
    const first = next.rules[0];
    const second = next.rules[1];
    if (first?.type !== 'condition' || second?.type !== 'condition') {
      throw new Error('Expected condition rules');
    }

    expect(first.id).toBe('condition-1');
    expect(second.id).not.toBe('condition-1');
    expect(second.value).toBe('desk');
  });

  it('reorders rules when moving a rule up', () => {
    const initialGroup: ProductAdvancedFilterGroup = {
      type: 'group',
      id: 'root',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'condition-1',
          field: 'name',
          operator: 'contains',
          value: 'first',
        },
        {
          type: 'condition',
          id: 'condition-2',
          field: 'name',
          operator: 'contains',
          value: 'second',
        },
      ],
    };

    render(<BuilderHarness initialGroup={initialGroup} />);

    const moveUpButtons = screen.getAllByLabelText('Move rule up');
    fireEvent.click(moveUpButtons[1]!);

    const next = parseRenderedGroup();
    const first = next.rules[0];
    const second = next.rules[1];
    if (first?.type !== 'condition' || second?.type !== 'condition') {
      throw new Error('Expected condition rules');
    }

    expect(first.id).toBe('condition-2');
    expect(second.id).toBe('condition-1');
  });

  it('serializes in-operator input into string arrays', () => {
    const initialGroup: ProductAdvancedFilterGroup = {
      type: 'group',
      id: 'root',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'condition-1',
          field: 'catalogId',
          operator: 'in',
          value: ['cat-1'],
        },
      ],
    };

    render(<BuilderHarness initialGroup={initialGroup} />);

    const input = screen.getByPlaceholderText('Value 1, value 2, ...');
    fireEvent.change(input, { target: { value: 'cat-1, cat-2, cat-3' } });

    const next = parseRenderedGroup();
    const first = next.rules[0];
    if (first?.type !== 'condition') {
      throw new Error('Expected condition rule');
    }

    expect(first.value).toEqual(['cat-1', 'cat-2', 'cat-3']);
  });

  it('shows inline validation for invalid numeric values', () => {
    const initialGroup: ProductAdvancedFilterGroup = {
      type: 'group',
      id: 'root',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'condition-1',
          field: 'price',
          operator: 'eq',
          value: 'not-a-number',
        },
      ],
    };

    render(<BuilderHarness initialGroup={initialGroup} />);

    expect(screen.getByText('Value must be a number.')).toBeInTheDocument();
  });
});
