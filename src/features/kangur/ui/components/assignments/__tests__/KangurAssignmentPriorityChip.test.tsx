/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurAssignmentPriorityChip } from '../KangurAssignmentPriorityChip';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';

describe('KangurAssignmentPriorityChip', () => {
  it('renders the shared priority label with the semantic accent by default', () => {
    render(
      <KangurAssignmentPriorityChip
        data-testid='assignment-priority-chip'
        labelStyle='compact'
        priority='medium'
      />
    );

    expect(screen.getByTestId('assignment-priority-chip')).toHaveTextContent('Priorytet średni');
    expect(screen.getByTestId('assignment-priority-chip')).toHaveClass(
      ...KANGUR_ACCENT_STYLES.amber.badge.split(' ')
    );
  });

  it('keeps the shared label when a widget overrides the accent', () => {
    render(
      <KangurAssignmentPriorityChip
        accent='rose'
        data-testid='assignment-priority-chip'
        priority='low'
        size='sm'
      />
    );

    expect(screen.getByTestId('assignment-priority-chip')).toHaveTextContent('Priorytet niski');
    expect(screen.getByTestId('assignment-priority-chip')).toHaveClass(
      ...KANGUR_ACCENT_STYLES.rose.badge.split(' ')
    );
  });
});
