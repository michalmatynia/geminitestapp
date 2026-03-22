/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import plMessages from '@/i18n/messages/pl.json';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';

describe('KangurLessonDocumentRenderer touch mode', () => {
  it('uses larger touch-friendly quiz answers on coarse pointers', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <KangurLessonDocumentRenderer
          document={{
            version: 1,
            pages: [
              {
                id: 'page-quiz',
                sectionKey: 'quiz',
                sectionTitle: 'Quiz',
                title: 'Quiz page',
                blocks: [
                  {
                    id: 'quiz-1',
                    type: 'quiz',
                    question: '<p>Wybierz poprawną odpowiedź.</p>',
                    correctChoiceId: 'choice-1',
                    choices: [
                      { id: 'choice-1', text: 'Opcja A' },
                      { id: 'choice-2', text: 'Opcja B' },
                    ],
                    explanation: 'Wyjaśnienie.',
                  },
                ],
              },
            ],
            blocks: [],
          }}
        />
      </NextIntlClientProvider>
    );

    const firstChoice = screen.getByTestId('lesson-quiz-choice-choice-1');

    expect(firstChoice).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[4rem]',
      'rounded-2xl'
    );

    fireEvent.click(firstChoice);

    expect(firstChoice).toHaveAttribute('aria-pressed', 'true');
  });
});
