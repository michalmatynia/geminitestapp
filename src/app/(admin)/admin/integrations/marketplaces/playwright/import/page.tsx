import { type JSX } from 'react';

import { AdminPlaywrightProgrammableIntegrationPage } from '@/features/playwright/public';

export default function Page(): JSX.Element {
  return <AdminPlaywrightProgrammableIntegrationPage focusSection='import' />;
}
