/*
 * StudiQ Kangur lessons alias page
 *
 * Accessibility: This alias routes to the Kangur lessons shell. The lessons
 * shell is responsible for headings, landmarks, and keyboard navigation.
 * Keep this module focused on routing only to prevent focus-management drift.
 */
import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server/alias-shell-page';

export default function Page(): React.JSX.Element {
  return renderAccessibleKangurAliasRoute(['lessons']);
}
