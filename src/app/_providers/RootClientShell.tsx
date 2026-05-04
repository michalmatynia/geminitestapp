/**
 * Root Client Shell
 * 
 * Top-level client-side provider wrapper for the application.
 * Orchestrates:
 * - Client-side provider initialization
 * - Global state management setup
 * - Theme and styling providers
 * - Authentication and user context
 * - Error boundaries and fallback handling
 */

import type { ReactNode } from 'react';

import { RootProvidersClient } from '@/shared/providers/RootProvidersClient';

export function RootClientShell({ children }: { children: ReactNode }): React.JSX.Element {
  return <RootProvidersClient>{children}</RootProvidersClient>;
}
