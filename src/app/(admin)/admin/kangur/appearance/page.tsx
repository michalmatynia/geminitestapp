/*
 * StudiQ Admin - Kangur Appearance settings
 *
 * Purpose: Appearance configuration for Kangur. Accessibility notes:
 * - Controls for color, contrast, or theme modes must include live previews and
 *   explicit contrast information. Consider offering a 'high contrast' toggle
 *   with immediate preview so users can verify readability.
 */
import { type JSX } from 'react';

import { AdminKangurAppearancePage } from '@/features/kangur/public';

export default function Page(): JSX.Element {
  return <AdminKangurAppearancePage />;
}
