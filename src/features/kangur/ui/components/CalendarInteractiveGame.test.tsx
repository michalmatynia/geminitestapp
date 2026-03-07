/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CalendarInteractiveGame from '@/features/kangur/ui/components/CalendarInteractiveGame';

describe('CalendarInteractiveGame', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders month navigation controls as pill CTA buttons for flip tasks', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.7).mockReturnValueOnce(0.25);

    render(<CalendarInteractiveGame onFinish={() => undefined} />);

    const previousMonthButton = screen.getByRole('button', { name: 'Poprzedni miesiac' });
    const nextMonthButton = screen.getByRole('button', { name: 'Nastepny miesiac' });

    expect(previousMonthButton).toHaveClass('kangur-cta-pill', 'soft-cta');
    expect(nextMonthButton).toHaveClass('kangur-cta-pill', 'soft-cta');
  });
});
