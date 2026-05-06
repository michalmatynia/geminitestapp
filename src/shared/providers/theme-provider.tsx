/**
 * Theme Provider Component
 * 
 * Wrapper component for next-themes theme management.
 * Provides:
 * - Dark/light theme switching
 * - System theme detection
 * - Theme persistence across sessions
 * - SSR-safe theme initialization
 * - Integration with Tailwind CSS theme classes
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import * as React from 'react';

import type { ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps): React.ReactNode {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
