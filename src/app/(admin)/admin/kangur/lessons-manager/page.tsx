/*
 * StudiQ Admin - Kangur Lessons Manager
 *
 * Purpose: Lessons manager shell. Accessibility notes:
 * - Lessons and question editors must ensure form controls have labels and
 *   that interactive question widgets are keyboard operable.
 * - Use aria-live for progress and save notifications to inform assistive tech.
 */
import { type JSX } from 'react';

import { AdminKangurLessonsManagerPage } from '@/features/kangur/public';

export default function Page(): JSX.Element {
  return <AdminKangurLessonsManagerPage />;
}
