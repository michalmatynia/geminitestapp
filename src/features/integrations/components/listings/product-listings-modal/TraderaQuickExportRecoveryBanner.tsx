/* eslint-disable max-lines */
import React from 'react';
import Link from 'next/link';

import { Button, Card } from '@/shared/ui/primitives.public';

import { TraderaQuickExportRecoveryDiagnostics } from './TraderaQuickExportRecoveryDiagnostics';
import { TraderaRecoveryContinueButton } from './TraderaRecoveryContinueButton';

type TraderaQuickExportRecoveryBannerProps = {
  mode: 'empty' | 'content';
  status: string | null | undefined;
  requestId?: string | null | undefined;
  runId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
  failureReason?: string | null | undefined;
  canContinue?: boolean;
  variant?: 'compact' | 'full';
};

type RecoveryActionsProps = {
  categoryMapperHref: string | null;
  canContinue: boolean;
  canOpenCategoryMapper: boolean;
  canOpenShippingGroups: boolean;
  connectionId: string | null;
  integrationId: string | null;
  size: 'sm' | 'default';
};

type BannerCopyInput = {
  canContinue: boolean;
  failureReason: string | null;
  mode: TraderaQuickExportRecoveryBannerProps['mode'];
};

type BannerViewModel = {
  canContinue: boolean;
  canOpenCategoryMapper: boolean;
  canOpenShippingGroups: boolean;
  categoryMapperHref: string | null;
  description: React.ReactNode;
  hasRunId: boolean;
  normalizedConnectionId: string | null;
  normalizedIntegrationId: string | null;
  normalizedRunId: string;
  title: string;
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeText = (value: string | null | undefined): string | null =>
  hasText(value) ? value.trim() : null;

const isTraderaCategoryMapperFailure = (failureReason: string | null | undefined): boolean => {
  const normalized = (failureReason ?? '').trim().toLowerCase();
  if (normalized.length === 0) return false;
  return (
    normalized.includes('category mapper') ||
    normalized.includes('category mapping') ||
    normalized.includes('fetch tradera categories')
  );
};

const isTraderaShippingGroupFailure = (failureReason: string | null | undefined): boolean => {
  const normalized = (failureReason ?? '').trim().toLowerCase();
  if (normalized.length === 0) return false;
  return (
    normalized.includes('shipping group') ||
    normalized.includes('shipping price in eur') ||
    normalized.includes('tradera shipping price')
  );
};

const resolveCategoryMapperHref = (connectionId: string | null): string | null =>
  connectionId !== null
    ? `/admin/integrations/marketplaces/category-mapper?connectionId=${encodeURIComponent(connectionId)}`
    : null;

const resolveBannerTitle = ({ mode, canContinue }: BannerCopyInput): string => {
  if (mode === 'empty') return 'Tradera quick export needs recovery';
  if (canContinue) return 'Tradera quick export requires recovery';
  return 'Tradera quick export needs attention';
};

const resolveBannerDescription = ({
  mode,
  canContinue,
  failureReason,
}: BannerCopyInput): React.ReactNode => {
  if (mode === 'empty' && !canContinue && failureReason !== null) {
    return failureReason;
  }
  if (mode === 'empty') {
    return 'The one-click Tradera export did not leave behind a usable listing record yet. Open the Tradera login window if needed, then choose whether to relist or sync from this modal.';
  }
  if (!canContinue && failureReason !== null) {
    return failureReason;
  }
  return (
    <>
      Review the Tradera listing below and use
      <span className='font-semibold text-white'> Login to Tradera </span>
      if the last run needs manual verification. After login, choose relist or sync manually.
    </>
  );
};

function TraderaRecoveryActions({
  categoryMapperHref,
  canContinue,
  canOpenCategoryMapper,
  canOpenShippingGroups,
  connectionId,
  integrationId,
  size,
}: RecoveryActionsProps): React.JSX.Element | null {
  const hasAnyAction = canContinue || canOpenCategoryMapper || canOpenShippingGroups;
  if (!hasAnyAction) return null;

  return (
    <div className='flex flex-wrap justify-center gap-2'>
      <TraderaCategoryMapperAction
        href={categoryMapperHref}
        show={canOpenCategoryMapper}
        size={size}
      />
      <TraderaShippingGroupsAction show={canOpenShippingGroups} size={size} />
      <TraderaContinueAction
        canContinue={canContinue}
        connectionId={connectionId}
        integrationId={integrationId}
        size={size}
      />
    </div>
  );
}

function TraderaCategoryMapperAction({
  href,
  show,
  size,
}: {
  href: string | null;
  show: boolean;
  size: 'sm' | 'default';
}): React.JSX.Element | null {
  if (!show || href === null) return null;
  return (
    <Button asChild type='button' variant='outline' size={size}>
      <Link href={href}>Open Category Mapper</Link>
    </Button>
  );
}

function TraderaShippingGroupsAction({
  show,
  size,
}: {
  show: boolean;
  size: 'sm' | 'default';
}): React.JSX.Element | null {
  if (!show) return null;
  return (
    <Button asChild type='button' variant='outline' size={size}>
      <Link href='/admin/products/settings?section=shipping-groups'>
        Open Shipping Groups
      </Link>
    </Button>
  );
}

function TraderaContinueAction({
  canContinue,
  connectionId,
  integrationId,
  size,
}: {
  canContinue: boolean;
  connectionId: string | null;
  integrationId: string | null;
  size: 'sm' | 'default';
}): React.JSX.Element | null {
  if (!canContinue || integrationId === null || connectionId === null) return null;
  return (
    <TraderaRecoveryContinueButton
      integrationId={integrationId}
      connectionId={connectionId}
      size={size === 'default' ? 'md' : undefined}
    />
  );
}

function TraderaRecoveryIdentifierGrid({
  hasRunId,
  normalizedRunId,
  requestId,
  status,
}: {
  hasRunId: boolean;
  normalizedRunId: string;
  requestId: string | null | undefined;
  status: string | null | undefined;
}): React.JSX.Element {
  return (
    <div className='grid gap-2 text-xs text-gray-300 sm:grid-cols-2'>
      <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2'>
        <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
          Status
        </div>
        <div className='font-mono text-white'>{status ?? 'Unknown'}</div>
      </div>
      <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2'>
        <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
          Queue job
        </div>
        <div className='font-mono text-white'>{requestId ?? 'Unavailable'}</div>
      </div>
      <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2 sm:col-span-2'>
        <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
          Run ID
        </div>
        <div className='break-words font-mono text-white'>
          {hasRunId ? normalizedRunId : 'Unavailable'}
        </div>
      </div>
    </div>
  );
}

function TraderaRecoveryCompactIdentifiers({
  hasRunId,
  normalizedRunId,
  requestId,
}: {
  hasRunId: boolean;
  normalizedRunId: string;
  requestId: string | null | undefined;
}): React.JSX.Element | null {
  const hasRequestId = requestId !== null && requestId !== undefined;
  if (!hasRequestId && !hasRunId) return null;

  return (
    <div className='mt-2 flex min-w-0 flex-wrap gap-3 font-mono text-[11px] text-gray-400'>
      {hasRequestId ? (
        <span>
          Queue job: <span className='text-white'>{requestId}</span>
        </span>
      ) : null}
      {hasRunId ? (
        <span>
          Run ID: <span className='text-white'>{normalizedRunId}</span>
        </span>
      ) : null}
    </div>
  );
}

const buildBannerViewModel = ({
  mode,
  runId,
  integrationId,
  connectionId,
  failureReason,
  canContinue: requestedCanContinue,
}: TraderaQuickExportRecoveryBannerProps): BannerViewModel => {
  const normalizedRunId = normalizeText(runId) ?? '';
  const hasRunId = normalizedRunId.length > 0;
  const normalizedIntegrationId = normalizeText(integrationId);
  const normalizedConnectionId = normalizeText(connectionId);
  const hasContinueTarget = normalizedIntegrationId !== null && normalizedConnectionId !== null;
  const canContinue = requestedCanContinue ?? hasContinueTarget;
  const normalizedFailureReason = normalizeText(failureReason);
  const categoryMapperHref = resolveCategoryMapperHref(normalizedConnectionId);
  const canOpenCategoryMapper =
    !canContinue &&
    categoryMapperHref !== null &&
    isTraderaCategoryMapperFailure(normalizedFailureReason);
  const canOpenShippingGroups =
    !canContinue && isTraderaShippingGroupFailure(normalizedFailureReason);
  const copyInput: BannerCopyInput = {
    mode,
    canContinue,
    failureReason: normalizedFailureReason,
  };
  const title = resolveBannerTitle(copyInput);
  const description = resolveBannerDescription(copyInput);

  return {
    canContinue,
    canOpenCategoryMapper,
    canOpenShippingGroups,
    categoryMapperHref,
    description,
    hasRunId,
    normalizedConnectionId,
    normalizedIntegrationId,
    normalizedRunId,
    title,
  };
};

function TraderaFullRecoveryBanner({
  requestId,
  status,
  view,
}: {
  requestId: string | null | undefined;
  status: string | null | undefined;
  view: BannerViewModel;
}): React.JSX.Element {
  return (
    <Card variant='subtle' padding='lg' className='bg-card/50 space-y-3'>
      <div className='space-y-1 text-center'>
        <div className='text-sm font-semibold text-white'>{view.title}</div>
        <p className='break-words whitespace-normal text-xs leading-relaxed text-gray-300'>
          {view.description}
        </p>
      </div>
      <TraderaRecoveryIdentifierGrid
        hasRunId={view.hasRunId}
        normalizedRunId={view.normalizedRunId}
        requestId={requestId}
        status={status}
      />
      <TraderaRecoveryActions
        categoryMapperHref={view.categoryMapperHref}
        canContinue={view.canContinue}
        canOpenCategoryMapper={view.canOpenCategoryMapper}
        canOpenShippingGroups={view.canOpenShippingGroups}
        connectionId={view.normalizedConnectionId}
        integrationId={view.normalizedIntegrationId}
        size='default'
      />
      {view.hasRunId ? (
        <TraderaQuickExportRecoveryDiagnostics runId={view.normalizedRunId} />
      ) : null}
    </Card>
  );
}

function TraderaCompactRecoveryBanner({
  requestId,
  view,
}: {
  requestId: string | null | undefined;
  view: BannerViewModel;
}): React.JSX.Element {
  return (
    <Card variant='subtle' padding='sm' className='bg-card/60 text-xs text-gray-300'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0 flex-1'>
          <div className='text-sm font-semibold text-white'>{view.title}</div>
          <div className='break-words whitespace-normal leading-relaxed'>
            {view.description}
          </div>
          <TraderaRecoveryCompactIdentifiers
            hasRunId={view.hasRunId}
            normalizedRunId={view.normalizedRunId}
            requestId={requestId}
          />
        </div>
        <div className='flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0'>
          <TraderaRecoveryActions
            categoryMapperHref={view.categoryMapperHref}
            canContinue={view.canContinue}
            canOpenCategoryMapper={view.canOpenCategoryMapper}
            canOpenShippingGroups={view.canOpenShippingGroups}
            connectionId={view.normalizedConnectionId}
            integrationId={view.normalizedIntegrationId}
            size='sm'
          />
        </div>
      </div>
      {view.hasRunId ? (
        <div className='mt-3'>
          <TraderaQuickExportRecoveryDiagnostics runId={view.normalizedRunId} />
        </div>
      ) : null}
    </Card>
  );
}

export function TraderaQuickExportRecoveryBanner(
  props: TraderaQuickExportRecoveryBannerProps
): React.JSX.Element {
  const view = buildBannerViewModel(props);
  if ((props.variant ?? 'compact') === 'full') {
    return (
      <TraderaFullRecoveryBanner
        requestId={props.requestId}
        status={props.status}
        view={view}
      />
    );
  }

  return <TraderaCompactRecoveryBanner requestId={props.requestId} view={view} />;
}
