/*
 * StudiQ Admin - Kangur Documentation
 *
 * Purpose: Documentation hub for Kangur. Accessibility notes:
 * - Ensure code samples and documentation blocks use semantic markup (<pre>, <code>)
 *   and that language attributes are present for assistive technologies.
 * - Provide a table of contents with skip-to-section links for long docs.
 */
import { type JSX } from 'react';

import { AdminKangurDocumentationPage } from '@/features/kangur/public';

export default function Page(): JSX.Element {
  return <AdminKangurDocumentationPage />;
}
