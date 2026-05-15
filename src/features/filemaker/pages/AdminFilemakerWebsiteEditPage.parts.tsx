'use client';

import { Building2, CalendarDays, ExternalLink, UserRound } from 'lucide-react';
import React from 'react';

import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { FormActions, FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, Card, Input } from '@/shared/ui/primitives.public';

import type {
  FilemakerWebsitePartyKind,
  MongoFilemakerWebsiteDetail,
  MongoFilemakerWebsiteLink,
} from '../filemaker-websites.types';
import { formatTimestamp } from './filemaker-page-utils';

export type WebsiteDetailState = {
  error: string | null;
  isLoading: boolean;
  website: MongoFilemakerWebsiteDetail | null;
};

const resolveWebsiteHref = (url: string): string | null => {
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const getPartyIcon = (kind: FilemakerWebsitePartyKind): React.ReactNode => {
  if (kind === 'organization') return <Building2 className='mt-0.5 size-3.5 text-blue-300' />;
  if (kind === 'person') return <UserRound className='mt-0.5 size-3.5 text-emerald-300' />;
  return <CalendarDays className='mt-0.5 size-3.5 text-amber-300' />;
};

const formatOwnerName = (link: MongoFilemakerWebsiteLink): string => {
  const name = link.ownerName?.trim() ?? '';
  return name.length > 0 ? name : link.partyId;
};

export const getWebsitePartyHref = (link: MongoFilemakerWebsiteLink): string => {
  if (link.partyKind === 'organization') {
    return `/admin/filemaker/organizations/${encodeURIComponent(link.partyId)}`;
  }
  if (link.partyKind === 'person') {
    return `/admin/filemaker/persons/${encodeURIComponent(link.partyId)}`;
  }
  return `/admin/filemaker/events/${encodeURIComponent(link.partyId)}`;
};

const readWebsiteDetail = async (
  websiteId: string,
  signal: AbortSignal
): Promise<MongoFilemakerWebsiteDetail> => {
  const response = await fetch(`/api/filemaker/websites/${encodeURIComponent(websiteId)}`, {
    signal,
  });
  if (!response.ok) throw new Error(`Failed to load website (${response.status}).`);
  const payload = (await response.json()) as { website: MongoFilemakerWebsiteDetail };
  return payload.website;
};

export function useWebsiteDetail(websiteId: string): WebsiteDetailState {
  const queryKey = ['filemaker', 'websites', 'detail', websiteId] as const;
  const websiteQuery = createSingleQueryV2<MongoFilemakerWebsiteDetail, MongoFilemakerWebsiteDetail, typeof queryKey>({
    queryKey,
    queryFn: async ({ signal }) => readWebsiteDetail(websiteId, signal),
    enabled: websiteId.trim().length > 0,
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerWebsiteEditPage.useWebsiteDetail',
      operation: 'detail',
      resource: 'filemaker.website',
      domain: 'files',
      description: 'Load imported Filemaker website detail for the admin website page.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      hasWebsiteId: websiteId.trim().length > 0,
    },
  });

  return {
    error: websiteQuery.error === null ? null : websiteQuery.error.message,
    isLoading: websiteQuery.isFetching,
    website: websiteQuery.data ?? null,
  };
}

function WebsiteBreadcrumbs(): React.JSX.Element {
  return (
    <AdminFilemakerBreadcrumbs
      parent={{ label: 'Websites', href: '/admin/filemaker/websites' }}
      current='Details'
      className='mb-2'
    />
  );
}

function WebsiteHeader(props: {
  description: string;
  onBack: () => void;
}): React.JSX.Element {
  return (
    <SectionHeader
      title='Website'
      description={props.description}
      eyebrow={<WebsiteBreadcrumbs />}
      actions={<FormActions onCancel={props.onBack} cancelText='Back to Websites' />}
    />
  );
}

export function WebsiteEmptyState(props: {
  onBack: () => void;
  state: WebsiteDetailState;
}): React.JSX.Element {
  return (
    <div className='page-section-compact space-y-6'>
      <WebsiteHeader
        onBack={props.onBack}
        description={
          props.state.isLoading
            ? 'Loading imported website record.'
            : props.state.error ?? 'Website not found.'
        }
      />
    </div>
  );
}

function WebsiteMetadataBadges(props: {
  website: MongoFilemakerWebsiteDetail;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        ID: {props.website.id}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Legacy UUID: {props.website.legacyUuid ?? 'n/a'}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Links: {props.website.linkCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Updated: {formatTimestamp(props.website.updatedAt)}
      </Badge>
    </div>
  );
}

function WebsiteDetailsSection(props: {
  website: MongoFilemakerWebsiteDetail;
}): React.JSX.Element {
  const href = resolveWebsiteHref(props.website.url);
  return (
    <FormSection title='Website Details' className='space-y-4 p-4'>
      <div className='grid gap-3 md:grid-cols-2'>
        <FormField label='URL' className='md:col-span-2'>
          <div className='flex gap-2'>
            <Input value={props.website.url} readOnly className='h-9' />
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='size-9'
              aria-label={`Open website ${props.website.url}`}
              title={`Open website ${props.website.url}`}
              disabled={href === null}
              onClick={(): void => {
                if (href !== null) window.open(href, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className='size-3.5' />
            </Button>
          </div>
        </FormField>
        <FormField label='Host'>
          <Input value={props.website.host ?? ''} readOnly className='h-9' />
        </FormField>
        <FormField label='Normalized URL'>
          <Input value={props.website.normalizedUrl ?? ''} readOnly className='h-9' />
        </FormField>
        <FormField label='Legacy Type'>
          <Input value={props.website.legacyTypeRaw ?? ''} readOnly className='h-9' />
        </FormField>
        <FormField label='Updated By'>
          <Input value={props.website.updatedBy ?? ''} readOnly className='h-9' />
        </FormField>
      </div>
    </FormSection>
  );
}

function LinkedWebsiteRecordCard(props: {
  link: MongoFilemakerWebsiteLink;
  onOpen: (link: MongoFilemakerWebsiteLink) => void;
}): React.JSX.Element {
  const ownerName = formatOwnerName(props.link);
  return (
    <Card variant='subtle-compact' className='bg-card/20'>
      <div className='flex items-start justify-between gap-3 p-3'>
        <div className='flex min-w-0 gap-2'>
          {getPartyIcon(props.link.partyKind)}
          <div className='min-w-0'>
            <div className='truncate text-sm font-semibold text-white'>{ownerName}</div>
            <div className='truncate text-xs capitalize text-gray-300'>{props.link.partyKind}</div>
            <div className='truncate text-[10px] text-gray-600'>
              Owner UUID: {props.link.legacyOwnerUuid} | Join UUID:{' '}
              {props.link.legacyJoinUuid ?? 'n/a'}
            </div>
          </div>
        </div>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-7'
          aria-label={`Open linked ${props.link.partyKind} ${ownerName}`}
          title={`Open linked ${props.link.partyKind} ${ownerName}`}
          onClick={(): void => props.onOpen(props.link)}
        >
          <ExternalLink className='size-3.5' />
        </Button>
      </div>
    </Card>
  );
}

function LinkedWebsiteRecordsSection(props: {
  links: MongoFilemakerWebsiteLink[];
  onOpenLinkedRecord: (link: MongoFilemakerWebsiteLink) => void;
}): React.JSX.Element {
  return (
    <FormSection title='Linked Records' className='space-y-2 p-4'>
      {props.links.length === 0 ? (
        <div className='text-xs text-gray-500'>No linked records.</div>
      ) : (
        <div className='grid gap-2'>
          {props.links.map((link: MongoFilemakerWebsiteLink) => (
            <LinkedWebsiteRecordCard
              key={link.id}
              link={link}
              onOpen={props.onOpenLinkedRecord}
            />
          ))}
        </div>
      )}
    </FormSection>
  );
}

export function WebsiteDetailView(props: {
  onBack: () => void;
  onOpenLinkedRecord: (link: MongoFilemakerWebsiteLink) => void;
  website: MongoFilemakerWebsiteDetail;
}): React.JSX.Element {
  return (
    <div className='page-section-compact space-y-6'>
      <WebsiteHeader
        onBack={props.onBack}
        description='View WebsiteBook metadata and linked FileMaker entities.'
      />
      <WebsiteMetadataBadges website={props.website} />
      <WebsiteDetailsSection website={props.website} />
      <LinkedWebsiteRecordsSection
        links={props.website.links}
        onOpenLinkedRecord={props.onOpenLinkedRecord}
      />
    </div>
  );
}
