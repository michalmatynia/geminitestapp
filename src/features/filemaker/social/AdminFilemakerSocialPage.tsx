'use client';

import React from 'react';

import {
  AdminSocialPublishingPage,
  type SocialPublishingAdminPageCopy,
} from '@/features/filemaker/social/admin/AdminSocialPublishingPage';

const FILEMAKER_SOCIAL_PAGE_COPY: SocialPublishingAdminPageCopy = {
  breadcrumbs: [
    { label: 'Admin', href: '/admin' },
    { label: 'Filemaker', href: '/admin/filemaker' },
    { label: 'Social Publishing' },
  ],
  settingsSubtitle:
    'Choose social publishing models from the AI Brain catalog and manage Filemaker project references.',
  title: 'Social Publishing',
  unpublishLocalScopeLabel: 'Social Publishing',
};

export function AdminFilemakerSocialPage(): React.JSX.Element {
  return <AdminSocialPublishingPage copy={FILEMAKER_SOCIAL_PAGE_COPY} />;
}

