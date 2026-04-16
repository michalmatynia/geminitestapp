/*
 * StudiQ Kangur duels alias page
 *
 * Accessibility: This is a minimal alias entrypoint that delegates rendering
 * to the Kangur shell. The shell ensures correct landmarks, headings and
 * focus management for the duels route. Keep this file simple to avoid
 * introducing client-side focus side effects here.
 */
import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server/alias-shell-page';

export default function Page(): React.JSX.Element {
  return renderAccessibleKangurAliasRoute(['duels']);
}
