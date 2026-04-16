'use client';

import React from 'react';

import type { 
  ProductScanRecord, 
  ProductScanSupplierDetails, 
  ProductScanSupplierProbe 
} from '@/shared/contracts/product-scans';
import {
  hasProductScan1688Details,
  resolveSupplierCandidateUrls,
  buildInlineSummary,
} from './ProductScan1688Details.helpers';
import { ProductScan1688QualitySummary } from './ProductScan1688QualitySummary';
import { ProductScan1688DetailRow } from './ProductScan1688DetailRow';
import { ProductScan1688CandidateUrlsList } from './ProductScan1688CandidateUrlsList';
import { ProductScan1688PricesList } from './ProductScan1688PricesList';
import { ProductScan1688ImagesList } from './ProductScan1688ImagesList';
import { ProductScan1688EvaluationSummary } from './ProductScan1688EvaluationSummary';

export {
  buildProductScan1688SectionId,
  formatProductScan1688ComparisonCountLabel,
  formatProductScan1688RankLabel,
  hasNewerApproved1688Scan,
  hasProductScan1688Details,
  resolve1688ScanRecommendationReason,
  resolvePreferred1688SupplierScans,
  resolveProductScan1688ApplyPolicySummary,
  resolveProductScan1688ComparisonTargets,
  resolveProductScan1688RankingSummary,
  resolveProductScan1688RecommendationSignal,
  resolveProductScan1688ResultLabel,
} from './ProductScan1688Details.helpers';

type ProductScan1688DetailsProps = {
  scan: Pick<
    ProductScanRecord,
    | 'id'
    | 'title'
    | 'url'
    | 'supplierDetails'
    | 'supplierProbe'
    | 'supplierEvaluation'
    | 'rawResult'
  >;
  scanId?: string | null;
  connectionLabel?: string | null;
};

function resolvePriceSummary(details: ProductScanSupplierDetails | null): string | null {
  if (details === null) return null;
  
  const text = details.priceText;
  if (typeof text === 'string' && text !== '') return text;

  const range = details.priceRangeText;
  if (typeof range === 'string' && range !== '') return range;

  const f = details.prices?.[0];
  const moq = (typeof f?.moq === 'string' && f.moq !== '') ? `MOQ ${f.moq}` : null;
  return buildInlineSummary(f?.amount, f?.currency, moq);
}

type GridRow = { label: string; value?: string | null; href?: string | null };

function resolveBasicRows(details: ProductScanSupplierDetails | null, scanUrl: string | null | undefined): GridRow[] {
  const url = (typeof details?.supplierProductUrl === 'string' && details.supplierProductUrl !== '') ? details.supplierProductUrl : (scanUrl ?? null);
  const store = (typeof details?.supplierStoreUrl === 'string' && details.supplierStoreUrl !== '') ? details.supplierStoreUrl : null;
  return [
    { label: 'Supplier product', value: url, href: url },
    { label: 'Supplier store', value: store, href: store },
  ];
}

function resolveLeftRows(details: ProductScanSupplierDetails | null, scanUrl: string | null | undefined): GridRow[] {
  const basic = resolveBasicRows(details, scanUrl);
  const loc = (typeof details?.supplierLocation === 'string' && details.supplierLocation !== '') ? details.supplierLocation : null;
  const rat = (typeof details?.supplierRating === 'string' && details.supplierRating !== '') ? details.supplierRating : null;
  const pid = (typeof details?.platformProductId === 'string' && details.platformProductId !== '') ? details.platformProductId : null;

  return [
    ...basic,
    { label: 'Supplier location', value: loc },
    { label: 'Supplier rating', value: rat },
    { label: 'Platform product id', value: pid },
  ];
}

function resolveImageCountInfo(details: ProductScanSupplierDetails | null, probe: ProductScanSupplierProbe | null): { extracted: number, probe: number | null } {
  return {
    extracted: Array.isArray(details?.images) ? details.images.length : 0,
    probe: probe?.imageCount ?? null
  };
}

function resolveBaseRightRows(probe: ProductScanSupplierProbe | null, scanTitle: string | null | undefined, connectionLabel: string | null): GridRow[] {
  const title = (typeof probe?.pageTitle === 'string' && probe.pageTitle !== '') ? probe.pageTitle : (scanTitle ?? null);
  const cand = (typeof probe?.candidateUrl === 'string' && probe.candidateUrl !== '') ? probe.candidateUrl : null;
  const canon = (typeof probe?.canonicalUrl === 'string' && probe.canonicalUrl !== '') ? probe.canonicalUrl : null;

  return [
    { label: 'Browser profile', value: connectionLabel },
    { label: 'Current page title', value: title },
    { label: 'Candidate URL', value: cand, href: cand },
    { label: 'Canonical URL', value: canon, href: canon },
  ];
}

function resolveProbeRows(probe: ProductScanSupplierProbe | null, info: { extracted: number, probe: number | null }, pCount: number): GridRow[] {
  const lang = (typeof probe?.pageLanguage === 'string' && probe.pageLanguage !== '') ? probe.pageLanguage : null;
  const art = (typeof probe?.artifactKey === 'string' && probe.artifactKey !== '') ? probe.artifactKey : null;

  return [
    { label: 'Probe language', value: lang },
    { label: 'Probe artifact key', value: art },
    { label: 'Probe image count', value: typeof info.probe === 'number' ? String(info.probe) : null },
    { label: 'Extracted image count', value: info.extracted > 0 ? String(info.extracted) : null },
    { label: 'Extracted price tiers', value: pCount > 0 ? String(pCount) : null },
  ];
}

function resolveRightRows(probe: ProductScanSupplierProbe | null, scanTitle: string | null | undefined, connectionLabel: string | null, details: ProductScanSupplierDetails | null): GridRow[] {
  const info = resolveImageCountInfo(details, probe);
  const pCount = Array.isArray(details?.prices) ? details.prices.length : 0;
  const base = resolveBaseRightRows(probe, scanTitle, connectionLabel);
  const probeRows = resolveProbeRows(probe, info, pCount);

  return [...base, ...probeRows];
}

function ProductScan1688DetailsGrid({ details, probe, scanUrl, scanTitle, connectionLabel }: { details: ProductScanSupplierDetails | null, probe: ProductScanSupplierProbe | null, scanUrl: string | null | undefined, scanTitle: string | null | undefined, connectionLabel: string | null }): React.JSX.Element {
  const left = resolveLeftRows(details, scanUrl);
  const right = resolveRightRows(probe, scanTitle, connectionLabel, details);

  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <div className='space-y-3'>
        {left.map((r, i) => <ProductScan1688DetailRow key={i} label={r.label} value={r.value} href={r.href} />)}
      </div>
      <div className='space-y-3'>
        {right.map((r, i) => <ProductScan1688DetailRow key={i} label={r.label} value={r.value} href={r.href} />)}
      </div>
    </div>
  );
}

type SummaryTextItems = { name: string | null, moq: string | null, lang: string | null, imgCount: number, pCount: number };

function resolveSummaryBaseInfo(details: ProductScanSupplierDetails | null): SummaryTextItems {
  const sn = details?.supplierName;
  const mt = details?.moqText;
  const sl = details?.sourceLanguage;
  
  return {
    name: (typeof sn === 'string' && sn !== '') ? sn : null,
    moq: (typeof mt === 'string' && mt !== '') ? mt : null,
    lang: (typeof sl === 'string' && sl !== '') ? sl : null,
    imgCount: Array.isArray(details?.images) ? details.images.length : 0,
    pCount: Array.isArray(details?.prices) ? details.prices.length : 0,
  };
}

function formatCountLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function resolveProbeImageChipLabel(probe: ProductScanSupplierProbe | null): string | null {
  const probeImageCount = probe?.imageCount;
  if (typeof probeImageCount !== 'number' || !Number.isFinite(probeImageCount) || probeImageCount <= 0) {
    return null;
  }

  return `Probe saw ${formatCountLabel(probeImageCount, 'image')}`;
}

function ProductScan1688SummaryLine({ details, probe, connectionLabel, priceSummary }: { details: ProductScanSupplierDetails | null, probe: ProductScanSupplierProbe | null, connectionLabel: string | null, priceSummary: string | null }): React.JSX.Element {
  const items = resolveSummaryBaseInfo(details);
  const probeImageChipLabel = resolveProbeImageChipLabel(probe);

  return (
    <div className='flex flex-wrap items-center gap-2 text-xs'>
      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>1688 supplier details</span>
      {items.name !== null && <span className='font-medium text-foreground'>{items.name}</span>}
      {connectionLabel !== null && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>Profile {connectionLabel}</span>}
      {priceSummary !== null && <span className='text-muted-foreground'>{priceSummary}</span>}
      {items.moq !== null && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{items.moq}</span>}
      {items.lang !== null && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{items.lang}</span>}
      {items.imgCount > 0 && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{formatCountLabel(items.imgCount, 'extracted image')}</span>}
      {items.pCount > 0 && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{formatCountLabel(items.pCount, 'price tier')}</span>}
      {probeImageChipLabel !== null && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{probeImageChipLabel}</span>}
    </div>
  );
}

function resolveResolvedScanId(scanId: string | null | undefined, scan: ProductScanRecord): string | null {
  if (typeof scanId === 'string' && scanId !== '') return scanId;
  if (typeof scan.id === 'string' && scan.id !== '') return scan.id;
  return null;
}

export function ProductScan1688Details(props: ProductScan1688DetailsProps): React.JSX.Element | null {
  const { scan } = props;
  if (!hasProductScan1688Details(scan)) return null;

  const resScanId = resolveResolvedScanId(props.scanId, scan as ProductScanRecord);
  const details = scan.supplierDetails;
  const priceSum = resolvePriceSummary(details);
  const cLab = (typeof props.connectionLabel === 'string' && props.connectionLabel.trim() !== '') ? props.connectionLabel.trim() : null;

  return (
    <div className='space-y-3 rounded-md border border-border/50 bg-background/70 px-3 py-3'>
      <ProductScan1688QualitySummary scan={scan} />
      <ProductScan1688SummaryLine details={details} probe={scan.supplierProbe} connectionLabel={cLab} priceSummary={priceSum} />
      <ProductScan1688DetailsGrid details={details} probe={scan.supplierProbe} scanUrl={scan.url} scanTitle={scan.title} connectionLabel={cLab} />
      <ProductScan1688CandidateUrlsList scanId={resScanId} urls={resolveSupplierCandidateUrls(scan)} />
      <ProductScan1688PricesList prices={details?.prices ?? []} />
      <div className='grid gap-3 md:grid-cols-2'>
        <ProductScan1688ImagesList images={details?.images ?? []} />
        <ProductScan1688EvaluationSummary scanId={resScanId} evaluation={scan.supplierEvaluation} />
      </div>
    </div>
  );
}
