'use client';

import { NextIntlClientProvider } from 'next-intl';

import type { ComponentProps } from 'react';

type AppIntlProviderProps = Omit<ComponentProps<typeof NextIntlClientProvider>, 'locale'> & {
  locale: string;
};

export function AppIntlProvider({ locale, ...props }: AppIntlProviderProps): React.JSX.Element {
  const defaultTimeZone = process.env['NEXT_INTL_TIME_ZONE']?.trim() || 'Europe/Warsaw';

  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone={props.timeZone ?? defaultTimeZone}
      {...props}
    />
  );
}
