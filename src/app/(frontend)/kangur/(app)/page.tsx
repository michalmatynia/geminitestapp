/*
 * StudiQ app alias page
 *
 * Purpose: Entrypoint for alias-based Kangur routes rendered inside the
 * storefront. The helper ensures accessible routing and shell composition.
 */
import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server/alias-shell-page';

export default function Page(): React.JSX.Element {
  return renderAccessibleKangurAliasRoute([]);
}
