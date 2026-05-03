/*
 * StudiQ Admin - Kangur Builder page
 *
 * Purpose: Minimal admin entrypoint that renders the Kangur builder shell.
 * Accessibility notes:
 * - The builder shell must expose clear headings and a main landmark.
 * - All form controls inside the builder should have associated labels and
 *   programmatic names. The shell handles keyboard navigation and editor
 *   focus traps; avoid adding global focus handlers here.
 */
import { AdminKangurBuilderPage } from '@/features/kangur/public';

import type { JSX } from 'react';


export default function Page(): JSX.Element {
  return <AdminKangurBuilderPage />;
}
