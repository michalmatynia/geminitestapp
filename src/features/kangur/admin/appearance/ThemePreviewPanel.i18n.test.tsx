/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import { KANGUR_DEFAULT_DAILY_THEME } from '@/features/kangur/theme-settings';
import { ThemePreviewPanel } from './ThemePreviewPanel';

const buildSlotThemes = () => ({
  daily: KANGUR_DEFAULT_DAILY_THEME,
  dawn: KANGUR_DEFAULT_DAWN_THEME,
  sunset: KANGUR_DEFAULT_SUNSET_THEME,
  nightly: KANGUR_DEFAULT_THEME,
});

import {
  KANGUR_DEFAULT_DAWN_THEME,
  KANGUR_DEFAULT_SUNSET_THEME,
  KANGUR_DEFAULT_THEME,
} from '@/features/kangur/theme-settings';

describe('ThemePreviewPanel i18n', () => {
  it('renders the appearance preview in English when the locale is en', () => {
    render(
      <NextIntlClientProvider locale='en' messages={{}}>
        <ThemePreviewPanel
          draft={KANGUR_DEFAULT_DAILY_THEME}
          selectedId='builtin_daily'
          slotAssignments={{ daily: null, dawn: null, sunset: null, nightly: null }}
          slotThemes={buildSlotThemes()}
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('group', { name: 'Theme preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Page and Navigation/ })).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Lesson 3 - Fractions')).toBeInTheDocument();
    expect(screen.getByText('Write a message...')).toBeInTheDocument();
  });
});
