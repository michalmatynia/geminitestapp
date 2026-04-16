/*
 * StudiQ Admin - Kangur AI Tutor content
 *
 * Purpose: Page for managing AI Tutor content sources. Accessibility notes:
 * - Content editing must include alt-text prompts for images and ensure
 *   content blocks have readable structure (headings, paragraphs, lists).
 * - When inserting rich content, surface accessibility checks or prompts to
 *   remind editors about headings and image descriptions.
 */
import { type JSX } from 'react';

import { AdminKangurAiTutorContentPage } from '@/features/kangur/public';

export default function Page(): JSX.Element {
  return <AdminKangurAiTutorContentPage />;
}
