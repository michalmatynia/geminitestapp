/*
 * StudiQ Kangur alias page (dynamic slug)
 *
 * Accessibility: Dynamic alias that defers rendering to the Kangur shell inside
 * a Suspense boundary. Note:
 * - The Suspense fallback is null to avoid focus traps; ensure the shell
 *   provides a visible focus target as soon as it mounts.
 * - Keep aria attributes and landmarks in the shell to make testing reliable.
 */
import { Suspense } from 'react';

import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server/alias-shell-page';

type KangurAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
};

async function KangurAliasPageRuntime({
  params,
}: KangurAliasPageProps) {
  const { slug = [] } = await params;
  return renderAccessibleKangurAliasRoute(slug);
}

export default function Page(props: KangurAliasPageProps): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <KangurAliasPageRuntime {...props} />
    </Suspense>
  );
}
