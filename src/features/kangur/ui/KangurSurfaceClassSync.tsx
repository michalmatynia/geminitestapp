'use client';

import { useEffect, type ReactNode } from 'react';

const KANGUR_ACTIVE_SURFACE_CLASSNAME = 'kangur-surface-active';

export function KangurSurfaceClassSync({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const appContent = document.getElementById('app-content');
    document.body.classList.add(KANGUR_ACTIVE_SURFACE_CLASSNAME);
    appContent?.classList.add(KANGUR_ACTIVE_SURFACE_CLASSNAME);

    return () => {
      document.body.classList.remove(KANGUR_ACTIVE_SURFACE_CLASSNAME);
      appContent?.classList.remove(KANGUR_ACTIVE_SURFACE_CLASSNAME);
    };
  }, []);

  return <>{children}</>;
}
