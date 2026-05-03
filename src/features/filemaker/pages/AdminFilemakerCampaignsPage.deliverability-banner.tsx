'use client';

import React from 'react';

import type { CampaignRow } from './AdminFilemakerCampaignsPage.types';

export type CampaignDeliverabilitySummary = {
  highBounceCampaigns: CampaignRow[];
  totalDecisions: number;
  totalCold: number;
  avgBounceRatePercent: number | null;
  avgOpenRatePercent: number | null;
  activeWithHistoryCount: number;
};

type CampaignDeliverabilityBannerProps = {
  summary: CampaignDeliverabilitySummary;
  onOpenCampaign: (campaignId: string) => void;
};

type HighBounceCampaignLinksProps = {
  campaigns: CampaignRow[];
  onOpenCampaign: (campaignId: string) => void;
};

export const buildCampaignDeliverabilitySummary = (rows: CampaignRow[]): CampaignDeliverabilitySummary => {
  const highBounceCampaigns = rows.filter((row: CampaignRow): boolean => row.analytics.bounceRatePercent > 5);
  const totalDecisions = rows.reduce((sum: number, row: CampaignRow): number => sum + row.deliverabilityDecisionCount, 0);
  const totalCold = rows.reduce((sum: number, row: CampaignRow): number => sum + row.coldSuppressionCount, 0);
  const activeRowsWithSendHistory = rows.filter(
    (row: CampaignRow): boolean =>
      row.campaign.status === 'active' && row.analytics.sentCount + row.analytics.bouncedCount > 0
  );
  const sumBounceRate = activeRowsWithSendHistory.reduce(
    (sum: number, row: CampaignRow): number => sum + row.analytics.bounceRatePercent,
    0
  );
  const sumOpenRate = activeRowsWithSendHistory.reduce(
    (sum: number, row: CampaignRow): number => sum + row.analytics.openRatePercent,
    0
  );
  const avgBounceRatePercent = resolveAveragePercent(sumBounceRate, activeRowsWithSendHistory.length);
  const avgOpenRatePercent = resolveAveragePercent(sumOpenRate, activeRowsWithSendHistory.length);
  return {
    highBounceCampaigns,
    totalDecisions,
    totalCold,
    avgBounceRatePercent,
    avgOpenRatePercent,
    activeWithHistoryCount: activeRowsWithSendHistory.length,
  };
};

export const shouldShowCampaignDeliverabilityBanner = (summary: CampaignDeliverabilitySummary): boolean =>
  summary.highBounceCampaigns.length > 0 ||
  summary.totalDecisions > 0 ||
  summary.totalCold > 0 ||
  summary.activeWithHistoryCount > 0;

const resolveAveragePercent = (sum: number, count: number): number | null => {
  if (count === 0) return null;
  return Math.round((sum * 10) / count) / 10;
};

const resolveBannerClassName = (summary: CampaignDeliverabilitySummary): string => {
  if (summary.highBounceCampaigns.length > 0) {
    return 'rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200';
  }
  if (summary.totalDecisions > 0 || summary.totalCold > 0) {
    return 'rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200';
  }
  return 'rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200';
};

const resolveBannerTitle = (summary: CampaignDeliverabilitySummary): string => {
  if (summary.highBounceCampaigns.length > 0) return 'Deliverability watch — action recommended';
  if (summary.totalDecisions > 0 || summary.totalCold > 0) return 'Deliverability watch';
  return 'Deliverability summary';
};

const CampaignHistorySummary = ({ summary }: { summary: CampaignDeliverabilitySummary }): React.JSX.Element | null => {
  if (summary.activeWithHistoryCount === 0) return null;
  return (
    <span className='text-[10px] opacity-80'>
      Across {summary.activeWithHistoryCount} active campaign
      {summary.activeWithHistoryCount === 1 ? '' : 's'} with send history: avg open {summary.avgOpenRatePercent ?? 0}%
      {' • '}avg bounce {summary.avgBounceRatePercent ?? 0}%
    </span>
  );
};

const HighBounceCampaignLinks = ({ campaigns, onOpenCampaign }: HighBounceCampaignLinksProps): React.JSX.Element => (
  <>
    {campaigns.slice(0, 3).map((row: CampaignRow, index: number) => (
      <React.Fragment key={row.campaign.id}>
        {index > 0 ? ', ' : null}
        <button
          type='button'
          onClick={(): void => { onOpenCampaign(row.campaign.id); }}
          className='underline-offset-2 hover:underline focus:underline focus:outline-none'
        >
          {row.campaign.name} ({row.analytics.bounceRatePercent}%)
        </button>
      </React.Fragment>
    ))}
    {campaigns.length > 3 ? ', …' : ''}
  </>
);

const HighBounceListItem = ({ summary, onOpenCampaign }: CampaignDeliverabilityBannerProps): React.JSX.Element | null => {
  if (summary.highBounceCampaigns.length === 0) return null;
  return (
    <li>
      {summary.highBounceCampaigns.length} campaign
      {summary.highBounceCampaigns.length === 1 ? '' : 's'} over 5% bounce rate:{' '}
      <HighBounceCampaignLinks campaigns={summary.highBounceCampaigns} onOpenCampaign={onOpenCampaign} />
    </li>
  );
};

const DecisionListItem = ({ summary }: { summary: CampaignDeliverabilitySummary }): React.JSX.Element | null => {
  if (summary.totalDecisions === 0) return null;
  return (
    <li>
      {summary.totalDecisions} runtime deliverability decision
      {summary.totalDecisions === 1 ? '' : 's'} (defers, throttles, circuit breaker) — open the run page to investigate.
    </li>
  );
};

const ColdSuppressionListItem = ({ summary }: { summary: CampaignDeliverabilitySummary }): React.JSX.Element | null => {
  if (summary.totalCold === 0) return null;
  return (
    <li>
      {summary.totalCold} address{summary.totalCold === 1 ? '' : 'es'} auto-suppressed for low engagement (cold).
    </li>
  );
};

export const CampaignDeliverabilityBanner = ({
  summary,
  onOpenCampaign,
}: CampaignDeliverabilityBannerProps): React.JSX.Element => (
  <div role='status' className={resolveBannerClassName(summary)}>
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <span className='font-medium'>{resolveBannerTitle(summary)}</span>
      <CampaignHistorySummary summary={summary} />
    </div>
    <ul className='mt-1 list-disc pl-4'>
      <HighBounceListItem summary={summary} onOpenCampaign={onOpenCampaign} />
      <DecisionListItem summary={summary} />
      <ColdSuppressionListItem summary={summary} />
    </ul>
  </div>
);
