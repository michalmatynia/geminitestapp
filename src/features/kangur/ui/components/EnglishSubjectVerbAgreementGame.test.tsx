/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@/__tests__/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EnglishSubjectVerbAgreementGame from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame';
import plMessages from '@/i18n/messages/pl.json';

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

  it('renders translated summary labels after the final round', () => {
    render(<EnglishSubjectVerbAgreementGame onFinish={() => undefined} />);

    for (const answer of ['goes', 'try', 'arrives', 'are', 'choose', 'is']) {
      fireEvent.click(screen.getByRole('button', { name: answer }));
      fireEvent.click(screen.getByTestId('english-agreement-check'));
      act(() => {
        vi.runAllTimers();
      });
    }

    expect(screen.getByTestId('english-agreement-summary-title')).toHaveTextContent(
      `${plMessages.KangurMiniGames.shared.scoreLabel}: 6/6`
    );
    expect(
      screen.getByText(plMessages.KangurMiniGames.englishSubjectVerbAgreement.summary.perfect)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: plMessages.KangurMiniGames.shared.restart })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: plMessages.KangurMiniGames.shared.finish.topics })
    ).toBeInTheDocument();
  });
});
