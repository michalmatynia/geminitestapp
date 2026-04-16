/*
 * StudiQ Admin - Kangur Settings
 *
 * Purpose: Global settings for Kangur. Accessibility notes:
 * - Settings forms must include clear labels, grouping and validation messaging.
 * - Use aria-describedby for field-level helper text and ensure validation
 *   messages are associated programmatically with inputs.
 */
import { type JSX } from 'react';

import { AdminKangurSettingsPage } from '@/features/kangur/public';

export default function Page(): JSX.Element {
  return <AdminKangurSettingsPage />;
}
