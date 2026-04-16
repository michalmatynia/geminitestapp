/*
 * StudiQ Admin - Kangur admin landing
 *
 * Purpose: Admin Kangur landing that mounts the admin page shell.
 * Accessibility notes:
 * - The admin shell should present a clear H1 and a single main landmark.
 * - Ensure skip links from the global layout map to the admin shell's main
 *   content area via the skipLinkTargetId prop.
 */
import { type JSX } from 'react';

import { AdminKangurPageShell } from '@/features/kangur/public';

export default function AdminKangurPage(): JSX.Element {
  return <AdminKangurPageShell slug={[]} />;
}
