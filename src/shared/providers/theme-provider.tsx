'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import * as React from 'react';

import type { ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps): React.ReactNode {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
