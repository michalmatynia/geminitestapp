/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import React from 'react';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurDailyQuestHighlightCardContent } from '@/features/kangur/ui/components/KangurDailyQuestHighlightCardContent';

describe('KangurDailyQuestHighlightCardContent', () => {
  it('renders quest chips, content, footer, and optional action', () => {
    render(
      <KangurDailyQuestHighlightCardContent
        action={<button type='button'>Uruchom trening</button>}
        chipLabelStyle='compact'
        description='Podtrzymaj rytm nauki krotszym treningiem mieszanym.'
        descriptionRelaxed
        descriptionSize='sm'
        footer={<div>1/1 runda dzisiaj</div>}
        progressAccent='amber'
        progressLabel='100%'
        questLabel='Misja dnia'
        rewardAccent='amber'
        rewardLabel='Nagroda gotowa +36 XP'
        title='Trening mieszany'
      />
    );

    expect(screen.getByText('Misja dnia')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Nagroda gotowa +36 XP')).toBeInTheDocument();
    expect(screen.getByText('Trening mieszany')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(
      screen.getByText('Podtrzymaj rytm nauki krotszym treningiem mieszanym.')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByText('1/1 runda dzisiaj')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uruchom trening' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });
});
