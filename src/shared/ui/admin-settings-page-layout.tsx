import * as React from 'react';

import { AdminSettingsBreadcrumbs } from './admin-settings-breadcrumbs';
import { PageLayout } from './PageLayout';

type AdminSettingsPageLayoutProps = Omit<React.ComponentProps<typeof PageLayout>, 'eyebrow'> & {
  current: string;
};

export function AdminSettingsPageLayout({
  current,
  ...props
}: AdminSettingsPageLayoutProps): React.JSX.Element {
  return <PageLayout eyebrow={<AdminSettingsBreadcrumbs current={current} />} {...props} />;
}
