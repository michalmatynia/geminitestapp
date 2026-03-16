/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EnglishSubjectVerbAgreementGame from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame';

describe('EnglishSubjectVerbAgreementGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('advances to the next round after a selection', () => {
    render(<EnglishSubjectVerbAgreementGame onFinish={() => undefined} />);

    const checkButton = screen.getByTestId('english-agreement-check');
    expect(checkButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'goes' }));
    expect(checkButton).not.toBeDisabled();

    fireEvent.click(checkButton);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText(/My friends/i, { selector: 'p' })).toBeInTheDocument();
  });
});
