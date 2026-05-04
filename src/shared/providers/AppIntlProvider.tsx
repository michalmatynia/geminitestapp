'use client';

/**
 * Application Internationalization Provider
 * 
 * Wraps the next-intl provider with application-specific configuration.
 * Provides:
 * - Locale-aware message formatting and translation
 * - Timezone handling with environment-based defaults
 * - Type-safe internationalization throughout the app
 * - Consistent date/time formatting across locales
 * 
 * This provider ensures all UI text respects user language
 * preferences and regional formatting conventions.
 */

import { NextIntlClientProvider } from 'next-intl';

import type { ComponentProps } from 'react';

type AppIntlProviderProps = Omit<ComponentProps<typeof NextIntlClientProvider>, 'locale'> & {
  locale: string; // Required locale string for consistent typing
};

/**
 * Enhanced internationalization provider with app-specific defaults.
 * Automatically configures timezone and provides consistent i18n setup.
 */
export function AppIntlProvider({ locale, ...props }: AppIntlProviderProps): React.JSX.Element {
  // Default timezone from environment or fallback to Europe/Warsaw
  const defaultTimeZone = process.env['NEXT_INTL_TIME_ZONE']?.trim() || 'Europe/Warsaw';

  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone={props.timeZone ?? defaultTimeZone}
      {...props}
    />
  );
}
