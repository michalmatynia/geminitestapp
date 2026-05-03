'use client';

/* eslint-disable complexity, max-lines-per-function */

import { Building2, CalendarDays, ExternalLink, UserRound } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition, useEffect, useMemo, useState } from 'react';

import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { FormActions, FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, Card, Input } from '@/shared/ui/primitives.public';

import type {
  FilemakerWebsitePartyKind,
  MongoFilemakerWebsiteDetail,
  MongoFilemakerWebsiteLink,
} from '../filemaker-websites.types';
import { decodeRouteParam, formatTimestamp } from './filemaker-page-utils';

type WebsiteDetailState = {
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

const getPartyHref = (link: MongoFilemakerWebsiteLink): string => {
  if (link.partyKind === 'organization') {
    return `/admin/filemaker/organizations/${encodeURIComponent(link.partyId)}`;
  }
  if (link.partyKind === 'person') {
    return `/admin/filemaker/persons/${encodeURIComponent(link.partyId)}`;
  }
  return `/admin/filemaker/events/${encodeURIComponent(link.partyId)}`;
};

const formatOwnerName = (link: MongoFilemakerWebsiteLink): string => {
  const name = link.ownerName?.trim() ?? '';
  return name.length > 0 ? name : link.partyId;
};

export function AdminFilemakerWebsiteEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const websiteId = useMemo(() => decodeRouteParam(params['websiteId']), [params]);
  const [state, setState] = useState<WebsiteDetailState>({
    error: null,
    isLoading: true,
    website: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ error: null, isLoading: true, website: null });
    fetch(`/api/filemaker/websites/${encodeURIComponent(websiteId)}`, { signal: controller.signal })
      .then(async (response: Response): Promise<{ website: MongoFilemakerWebsiteDetail }> => {
        if (!response.ok) throw new Error(`Failed to load website (${response.status}).`);
        return (await response.json()) as { website: MongoFilemakerWebsiteDetail };
      })
      .then((response: { website: MongoFilemakerWebsiteDetail }): void => {
        setState({ error: null, isLoading: false, website: response.website });
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        setState({
          error: error instanceof Error ? error.message : 'Failed to load website.',
          isLoading: false,
          website: null,
        });
      });
    return () => {
      controller.abort();
    };
  }, [websiteId]);

  const website = state.website;
  const href = website === null ? null : resolveWebsiteHref(website.url);

  if (website === null) {
    return (
      <div className='page-section-compact space-y-6'>
        <SectionHeader
          title='Website'
          description={
            state.isLoading ? 'Loading imported website record.' : state.error ?? 'Website not found.'
          }
          eyebrow={
            <AdminFilemakerBreadcrumbs
              parent={{ label: 'Websites', href: '/admin/filemaker/websites' }}
              current='Details'
              className='mb-2'
            />
          }
          actions={
            <FormActions
              onCancel={(): void => {
                startTransition(() => {
                  router.push('/admin/filemaker/websites');
                });
              }}
              cancelText='Back to Websites'
            />
          }
        />
      </div>
    );
  }

  return (
    <div className='page-section-compact space-y-6'>
      <SectionHeader
        title='Website'
        description='View WebsiteBook metadata and linked FileMaker entities.'
        eyebrow={
          <AdminFilemakerBreadcrumbs
            parent={{ label: 'Websites', href: '/admin/filemaker/websites' }}
            current='Details'
            className='mb-2'
          />
        }
        actions={
          <FormActions
            onCancel={(): void => {
              startTransition(() => {
                router.push('/admin/filemaker/websites');
              });
            }}
            cancelText='Back to Websites'
          />
        }
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          ID: {website.id}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Legacy UUID: {website.legacyUuid ?? 'n/a'}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Links: {website.linkCount}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Updated: {formatTimestamp(website.updatedAt)}
        </Badge>
      </div>

      <FormSection title='Website Details' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='URL' className='md:col-span-2'>
            <div className='flex gap-2'>
              <Input value={website.url} readOnly className='h-9' />
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='size-9'
                aria-label={`Open website ${website.url}`}
                title={`Open website ${website.url}`}
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
            <Input value={website.host ?? ''} readOnly className='h-9' />
          </FormField>
          <FormField label='Normalized URL'>
            <Input value={website.normalizedUrl ?? ''} readOnly className='h-9' />
          </FormField>
          <FormField label='Legacy Type'>
            <Input value={website.legacyTypeRaw ?? ''} readOnly className='h-9' />
          </FormField>
          <FormField label='Updated By'>
            <Input value={website.updatedBy ?? ''} readOnly className='h-9' />
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Linked Records' className='space-y-2 p-4'>
        {website.links.length === 0 ? (
          <div className='text-xs text-gray-500'>No linked records.</div>
        ) : (
          <div className='grid gap-2'>
            {website.links.map((link: MongoFilemakerWebsiteLink) => {
              const ownerName = formatOwnerName(link);
              return (
                <Card key={link.id} variant='subtle-compact' className='bg-card/20'>
                  <div className='flex items-start justify-between gap-3 p-3'>
                    <div className='flex min-w-0 gap-2'>
                      {getPartyIcon(link.partyKind)}
                      <div className='min-w-0'>
                        <div className='truncate text-sm font-semibold text-white'>
                          {ownerName}
                        </div>
                        <div className='truncate text-xs capitalize text-gray-300'>
                          {link.partyKind}
                        </div>
                        <div className='truncate text-[10px] text-gray-600'>
                          Owner UUID: {link.legacyOwnerUuid} | Join UUID:{' '}
                          {link.legacyJoinUuid ?? 'n/a'}
                        </div>
                      </div>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='size-7'
                      aria-label={`Open linked ${link.partyKind} ${ownerName}`}
                      title={`Open linked ${link.partyKind} ${ownerName}`}
                      onClick={(): void => {
                        startTransition(() => {
                          router.push(getPartyHref(link));
                        });
                      }}
                    >
                      <ExternalLink className='size-3.5' />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );
}
