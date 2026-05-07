import NextTopLoader from 'nextjs-toploader';

import { CmsBuilderShell } from '../../../components/CmsBuilderShell';

import type { JSX, ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <>
      <NextTopLoader
        showSpinner={false}
        color='#38bdf8'
        crawlSpeed={50}
        speed={200}
        initialPosition={0.08}
        crawl={true}
        height={3}
      />
      <CmsBuilderShell>{children}</CmsBuilderShell>
    </>
  );
}
