/*
 * StudiQ Admin - Kangur Tests Manager
 *
 * Purpose: Mounts the tests manager shell. Accessibility notes:
 * - Ensure interactive test controls have accessible names and states.
 * - Use aria-live regions for long-running background test operations so users
 *   are notified of progress and completion.
 */
import { type JSX } from 'react';

import { AdminKangurTestSuitesManagerPage } from '@/features/kangur/public';

export default function Page(): JSX.Element {
  return <AdminKangurTestSuitesManagerPage />;
}
