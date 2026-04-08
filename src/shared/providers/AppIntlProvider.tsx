'use client';

import { NextIntlClientProvider } from 'next-intl';

import type { ComponentProps } from 'react';

type AppIntlProviderProps = Omit<ComponentProps<typeof NextIntlClientProvider>, 'locale'> & {
  locale: string;
};

export function AppIntlProvider({ locale, ...props }: AppIntlProviderProps): React.JSX.Element {
  return <NextIntlClientProvider locale={locale} {...props} />;
}
