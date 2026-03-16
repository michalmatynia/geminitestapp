/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EnglishPronounsGame from '@/features/kangur/ui/components/EnglishPronounsGame';

describe('EnglishPronounsGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('advances to the next round after a click selection', () => {
    render(<EnglishPronounsGame onFinish={() => undefined} />);

    const checkButton = screen.getByTestId('english-pronouns-check');
    expect(checkButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'they' }));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText(/I met Mia and Jordan after school/i)).toBeInTheDocument();
  });
});
