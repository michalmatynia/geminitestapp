/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const messages: Record<string, string> = {
      'timeLimitModal.title': 'Limit czasu',
      'timeLimitModal.description': 'Ustaw limit czasu dla zadania.',
      'timeLimitModal.closeAriaLabel': 'Zamknij limit czasu',
      'timeLimitModal.eyebrow': 'Limit',
      'timeLimitModal.inputAriaLabel': 'Minuty',
      'timeLimitModal.inputTitle': 'Liczba minut',
      'timeLimitModal.placeholder': 'np. 30',
      'actions.cancel': 'Anuluj',
    };

    if (key === 'timeLimitModal.current') {
      return `Aktualnie: ${values?.value}`;
    }

    if (key === 'timeLimitModal.helper') {
      return `Zakres: ${values?.minMinutes}-${values?.maxMinutes} minut`;
    }

    return messages[key] ?? key;
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurAssignmentManagerTimeLimitModal } from '../KangurAssignmentManagerTimeLimitModal';
import { useKangurAssignmentManagerContext } from '../KangurAssignmentManager.context';

vi.mock('../KangurAssignmentManager.context', () => ({
  useKangurAssignmentManagerContext: vi.fn(),
}));

describe('KangurAssignmentManagerTimeLimitModal', () => {
  it('uses touch-friendly cancel and save actions', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTimeLimitDraftChange = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(useKangurAssignmentManagerContext).mockReturnValue({
      isTimeLimitModalOpen: true,
      handleCloseTimeLimitModal: onClose,
      handleSaveTimeLimit: onSave,
      timeLimitDraft: '30',
      setTimeLimitDraft: onTimeLimitDraftChange,
      timeLimitTarget: {
        title: 'Powtórka: Dzielenie',
        description: 'Ukończ jedną sesję dzielenia.',
      },
      timeLimitPreview: '30 min',
      timeLimitParsedError: null,
      isTimeLimitSaveDisabled: false,
      timeLimitSaveLabel: 'Zapisz limit',
    } as any);

    try {
      render(<KangurAssignmentManagerTimeLimitModal />);

      expect(screen.getByRole('button', { name: 'Anuluj' })).toHaveClass(
        'min-h-11',
        'px-4',
        'touch-manipulation'
      );
      expect(screen.getByRole('button', { name: 'Zapisz limit' })).toHaveClass(
        'min-h-11',
        'px-4',
        'touch-manipulation'
      );

      fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
      expect(onClose).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Zapisz limit' }));
      expect(onSave).toHaveBeenCalledTimes(1);

      const loggedOutput = consoleErrorSpy.mock.calls
        .flatMap((call) => call.map((value) => String(value)))
        .join('\n');
      expect(loggedOutput).not.toContain('`DialogContent` requires a `DialogTitle`');
      expect(loggedOutput).not.toContain('Missing `Description`');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
