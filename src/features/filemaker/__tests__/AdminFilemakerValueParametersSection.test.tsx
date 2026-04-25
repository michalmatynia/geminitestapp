import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { ValueParametersSection } from '../pages/AdminFilemakerValueEditPage.parameters';
import type { FilemakerValueParameter } from '../types';

const renderSection = (initialParameters: FilemakerValueParameter[] = []) => {
  function Harness(): React.JSX.Element {
    const [parameters, setParameters] = useState<FilemakerValueParameter[]>(initialParameters);
    const [linkedParameterIds, setLinkedParameterIds] = useState<string[]>([]);

    return (
      <ValueParametersSection
        linkedParameterIds={linkedParameterIds}
        parameters={parameters}
        setLinkedParameterIds={setLinkedParameterIds}
        setParameters={setParameters}
      />
    );
  }

  return render(<Harness />);
};

describe('ValueParametersSection', () => {
  it('creates and links a new value parameter with Enter', () => {
    renderSection();

    const input = screen.getByLabelText('Search value parameters');
    fireEvent.change(input, { target: { value: 'Risk band' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Risk band')).toBeInTheDocument();
  });

  it('links an existing value parameter with Enter instead of creating a duplicate', () => {
    renderSection([
      {
        id: 'value-parameter-existing',
        label: 'Priority',
        createdAt: '2026-04-25T00:00:00.000Z',
        updatedAt: '2026-04-25T00:00:00.000Z',
      },
    ]);

    const input = screen.getByLabelText('Search value parameters');
    fireEvent.change(input, { target: { value: 'priority' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getAllByText('Priority')).toHaveLength(1);
  });
});
