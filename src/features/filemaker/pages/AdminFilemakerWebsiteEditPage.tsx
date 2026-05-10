'use client';

import { useParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition, useMemo } from 'react';

import type { MongoFilemakerWebsiteLink } from '../filemaker-websites.types';
import { decodeRouteParam } from './filemaker-page-utils';
import {
  getWebsitePartyHref,
  useWebsiteDetail,
  WebsiteDetailView,
  WebsiteEmptyState,
} from './AdminFilemakerWebsiteEditPage.parts';

export function AdminFilemakerWebsiteEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const websiteId = useMemo(() => decodeRouteParam(params['websiteId']), [params]);
  const state = useWebsiteDetail(websiteId);

  const handleBack = (): void => {
    startTransition(() => {
      router.push('/admin/filemaker/websites');
    });
  };

  const handleOpenLinkedRecord = (link: MongoFilemakerWebsiteLink): void => {
    startTransition(() => {
      router.push(getWebsitePartyHref(link));
    });
  };

  if (state.website === null) {
    return <WebsiteEmptyState state={state} onBack={handleBack} />;
  }

  return (
    <WebsiteDetailView
      website={state.website}
      onBack={handleBack}
      onOpenLinkedRecord={handleOpenLinkedRecord}
    />
  );
}
