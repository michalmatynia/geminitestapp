import * as React from 'react';

import { PageLayout } from './PageLayout';

type AdminWidePageLayoutProps = React.ComponentProps<typeof PageLayout>;

export function AdminWidePageLayout(props: AdminWidePageLayoutProps): React.JSX.Element {
  return <PageLayout containerClassName='mx-auto w-full max-w-none py-10' {...props} />;
}
