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

import { renderKangurAssignmentManagerTimeLimitModal } from './KangurAssignmentManagerTimeLimitModal';

describe('KangurAssignmentManagerTimeLimitModal', () => {
  it('uses touch-friendly cancel and save actions', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const onTimeLimitDraftChange = vi.fn();

    render(
      renderKangurAssignmentManagerTimeLimitModal({
        isOpen: true,
        isSaveDisabled: false,
        maxMinutes: 90,
        minMinutes: 5,
        onClose,
        onSave,
        onTimeLimitDraftChange,
        saveLabel: 'Zapisz limit',
        timeLimitDraft: '30',
        timeLimitParsedError: null,
        timeLimitPreview: '30 min',
        timeLimitTarget: {
          title: 'Powtórka: Dzielenie',
          description: 'Ukończ jedną sesję dzielenia.',
        },
      })
    );

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
  });
});
