/*
 * StudiQ Kangur tests alias page
 *
 * Accessibility: Minimal alias entrypoint — real focus/landmark work is
 * performed by the Kangur shell. Avoid adding interactive elements here and
 * ensure the shell exposes a main landmark and descriptive heading.
 */
import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server/alias-shell-page';

export default function Page(): React.JSX.Element {
  return renderAccessibleKangurAliasRoute(['tests']);
}
