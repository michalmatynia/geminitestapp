import type { ReactNode } from 'react';

export default function LocalizedKangurAppLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <div className='kangur-alias-app'>
      <a className='kangur-skip-link sr-only focus:not-sr-only' href='#kangur-alias-main'>
        Skip to content
      </a>
      <main id='kangur-alias-main'>{children}</main>
    </div>
  );
}
