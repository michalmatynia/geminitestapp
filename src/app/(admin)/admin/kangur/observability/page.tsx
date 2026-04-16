/*
 * StudiQ Admin - Kangur Observability
 *
 * Purpose: Observability dashboard for Kangur. Accessibility notes:
 * - Charts and data visualizations should provide accessible summaries and
 *   data tables or off-screen text alternatives.
 * - Ensure keyboard users can navigate to filters and controls; use aria-labels
 *   and focus-visible styles for all interactive controls.
 */
import { type JSX } from 'react';

import { AdminKangurObservabilityPage } from '@/features/kangur/public';

export default function Page(): JSX.Element {
  return <AdminKangurObservabilityPage />;
}
