'use client';

import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { LazyKangurDocsTooltipEnhancer } from '@/features/kangur/ui/components/LazyKangurDocsTooltipEnhancer';
import type { KangurDocsTooltipSurface } from '@/features/kangur/docs/help-settings';

export default function GameDeferredDocsTooltipEnhancer({
  rootId,
  surface,
}: {
  rootId: string;
  surface: KangurDocsTooltipSurface;
}): React.JSX.Element {
  const { enabled } = useKangurDocsTooltips(surface);

  return <LazyKangurDocsTooltipEnhancer enabled={enabled} rootId={rootId} />;
}
