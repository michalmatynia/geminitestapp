import {
  KANGUR_SURFACE_HINT_SCRIPT,
  escapeForInlineScript,
  getKangurSurfaceBootstrapFallbackStyle,
} from '@/lib/kangur-surface-bootstrap';

import type { ReactNode } from 'react';

export default function KangurLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const surfaceBootstrapStyle = getKangurSurfaceBootstrapFallbackStyle();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: escapeForInlineScript(KANGUR_SURFACE_HINT_SCRIPT) }} />
      <style
        id='__KANGUR_SURFACE_BOOTSTRAP__'
        dangerouslySetInnerHTML={{ __html: escapeForInlineScript(surfaceBootstrapStyle) }}
      />
      {children}
    </>
  );
}
