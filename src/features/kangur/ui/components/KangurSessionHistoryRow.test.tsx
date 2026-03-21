/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurSessionHistoryRow } from '@/features/kangur/ui/components/KangurSessionHistoryRow';

describe('KangurSessionHistoryRow', () => {
  it('renders the shared history row shell, icon, score, xp, and duration slots', () => {
    render(
      <KangurSessionHistoryRow
        accent='indigo'
        dataTestId='session-history-row'
        durationText='41s'
        icon='🕐'
        iconTestId='session-history-icon'
        scoreAccent='amber'
        scoreTestId='session-history-score'
        scoreText='5/6'
        subtitle='formatted:2026-03-08T10:00:00.000Z'
        title='Zegar'
        xpTestId='session-history-xp'
        xpText='+28 XP'
      />
    );

    expect(screen.getByTestId('session-history-row')).toHaveClass('soft-card', 'border');
    expect(screen.getByTestId('session-history-icon')).toBeInTheDocument();
    expect(screen.getByText('Zegar')).toHaveClass(
      'text-base',
      'font-extrabold',
      '[color:var(--kangur-page-text)]'
    );
    expect(screen.getByText('formatted:2026-03-08T10:00:00.000Z')).toHaveClass(
      'text-sm',
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByTestId('session-history-score')).toHaveTextContent('5/6');
    expect(screen.getByTestId('session-history-xp')).toHaveTextContent('+28 XP');
    expect(screen.getByText('41s')).toHaveClass('text-xs', '[color:var(--kangur-page-muted-text)]');
  });
});
