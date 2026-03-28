/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import { KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY } from '@/shared/contracts/kangur-lesson-templates.shared';
import enMessages from '@/i18n/messages/en.json';
import LogicalAnalogiesRelationGame from '@/features/kangur/ui/components/LogicalAnalogiesRelationGame';

describe('LogicalAnalogiesRelationGame i18n', () => {
  it('renders the English game shell and localized relation data', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <LogicalAnalogiesRelationGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('button', { name: 'Calm mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bridge Rush' })).toBeInTheDocument();
    expect(screen.getByText('Relationship bridge')).toBeInTheDocument();
    expect(screen.getByText('Start with opposites and categories.')).toBeInTheDocument();
    expect(screen.getByText('Relation icons')).toBeInTheDocument();
    expect(screen.getByText('opposite')).toBeInTheDocument();
    expect(screen.getByText('category -> example')).toBeInTheDocument();
    expect(screen.getByText('Hot -> cold')).toBeInTheDocument();
    expect(screen.getByText('Fruit -> apple')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
  });

  it(`prefers the title locale key over the legacy ${KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY} key`, () => {
    const customMessages = structuredClone(enMessages) as Record<string, any>;
    customMessages.KangurMiniGames.logicalAnalogies.game.title = 'Custom relationship bridge';

    render(
      <NextIntlClientProvider locale='en' messages={customMessages}>
        <LogicalAnalogiesRelationGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText('Custom relationship bridge')).toBeInTheDocument();
  });
});
