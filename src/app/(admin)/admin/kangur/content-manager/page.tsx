/*
 * StudiQ Admin - Kangur Content Manager
 *
 * Purpose: Renders the content manager page shell. Accessibility notes:
 * - Ensure lists and cards expose proper list semantics (role=list / role=listitem)
 *   or use native <ul>/<li> semantics for collections.
 * - Provide meaningful aria-labels for drag-and-drop handles and ensure
 *   keyboard-accessible reorder controls are available.
 */
import { type JSX } from 'react';

import { AdminKangurContentManagerPage } from '@/features/kangur/public';

export default function Page(): JSX.Element {
  return <AdminKangurContentManagerPage />;
}
