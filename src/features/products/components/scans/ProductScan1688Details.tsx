'use client';

import React from 'react';

import type { 
  ProductScanRecord, 
  ProductScanSupplierDetails, 
  ProductScanSupplierProbe,
  ProductScanSupplierPrice
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

function resolvePriceFromPrices(prices: ProductScanSupplierPrice[]): string | null {
  const f = Array.isArray(prices) ? prices[0] : null;
  if (!f) return null;

  const moq = (typeof f.moq === 'string' && f.moq !== '') ? `MOQ ${f.moq}` : null;
  return buildInlineSummary(f.amount, f.currency, moq);
}

function resolvePriceSummary(details: ProductScanSupplierDetails | null): string | null {
  if (details === null) return null;
  
  const { priceText, priceRangeText, prices } = details;
  if (typeof priceText === 'string' && priceText !== '') return priceText;
  if (typeof priceRangeText === 'string' && priceRangeText !== '') return priceRangeText;

  return resolvePriceFromPrices(prices);
}

type GridRow = { label: string; value?: string | null; href?: string | null };

function resolveBasicRows(details: ProductScanSupplierDetails | null, scanUrl: string | null | undefined): GridRow[] {
  const { supplierProductUrl, supplierStoreUrl } = details ?? {};
  const url = (typeof supplierProductUrl === 'string' && supplierProductUrl !== '') ? supplierProductUrl : (scanUrl ?? null);
  const store = (typeof supplierStoreUrl === 'string' && supplierStoreUrl !== '') ? supplierStoreUrl : null;
  return [
    { label: 'Supplier product', value: url, href: url },
    { label: 'Supplier store', value: store, href: store },
  ];
}

function resolveExtraLeftRows(details: ProductScanSupplierDetails | null): GridRow[] {
  const { supplierLocation, supplierRating, platformProductId } = details ?? {};
  return [
    { label: 'Supplier location', value: supplierLocation ?? null },
    { label: 'Supplier rating', value: supplierRating ?? null },
    { label: 'Platform product id', value: platformProductId ?? null },
  ];
}

function resolveLeftRows(details: ProductScanSupplierDetails | null, scanUrl: string | null | undefined): GridRow[] {
  const basic = resolveBasicRows(details, scanUrl);
  const extra = resolveExtraLeftRows(details);
  return [...basic, ...extra];
}

function resolveImageCountInfo(details: ProductScanSupplierDetails | null, probe: ProductScanSupplierProbe | null): { extracted: number, probe: number | null } {
  const extracted = Array.isArray(details?.images) ? details.images.length : 0;
  return {
    extracted,
    probe: probe?.imageCount ?? null
  };
}

function resolveTitleValue(probeTitle: string | null | undefined, scanTitle: string | null | undefined): string | null {
  return (typeof probeTitle === 'string' && probeTitle !== '') ? probeTitle : (scanTitle ?? null);
}

function resolveUrlValue(probeUrl: string | null | undefined): string | null {
  return (typeof probeUrl === 'string' && probeUrl !== '') ? probeUrl : null;
}

function resolveBaseRightRows(probe: ProductScanSupplierProbe | null, scanTitle: string | null | undefined, connectionLabel: string | null): GridRow[] {
  const title = resolveTitleValue(probe?.pageTitle, scanTitle);
  const cand = resolveUrlValue(probe?.candidateUrl);
  const canon = resolveUrlValue(probe?.canonicalUrl);

  return [
    { label: 'Browser profile', value: connectionLabel },
    { label: 'Current page title', value: title },
    { label: 'Candidate URL', value: cand, href: cand },
    { label: 'Canonical URL', value: canon, href: canon },
  ];
}

function resolveProbeValue(val: string | null | undefined): string | null {
  return (typeof val === 'string' && val !== '') ? val : null;
}

function resolveProbeRows(probe: ProductScanSupplierProbe | null, info: { extracted: number, probe: number | null }, pCount: number): GridRow[] {
  const probeImg = typeof info.probe === 'number' ? String(info.probe) : null;

  return [
    { label: 'Probe language', value: resolveProbeValue(probe?.pageLanguage) },
    { label: 'Probe artifact key', value: resolveProbeValue(probe?.artifactKey) },
    { label: 'Probe image count', value: probeImg },
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

function resolveSummaryBaseInfo(details: ProductScanSupplierDetails | null): { name: string | null, moq: string | null, lang: string | null } {
  const { supplierName, moqText, sourceLanguage } = details ?? {};
  
  return {
    name: (typeof supplierName === 'string' && supplierName !== '') ? supplierName : null,
    moq: (typeof moqText === 'string' && moqText !== '') ? moqText : null,
    lang: (typeof sourceLanguage === 'string' && sourceLanguage !== '') ? sourceLanguage : null,
  };
}

function resolveSummaryTextItems(details: ProductScanSupplierDetails | null): SummaryTextItems {
  const base = resolveSummaryBaseInfo(details);
  return {
    ...base,
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

function SummarySupplierChips({ items }: { items: SummaryTextItems }): React.JSX.Element {
  return (
    <>
      {items.name !== null && <span className='font-medium text-foreground'>{items.name}</span>}
      {items.moq !== null && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{items.moq}</span>}
      {items.lang !== null && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{items.lang}</span>}
    </>
  );
}

function SummaryStatusChips({ items, connectionLabel, priceSummary, probeLabel }: { items: SummaryTextItems, connectionLabel: string | null, priceSummary: string | null, probeLabel: string | null }): React.JSX.Element {
  return (
    <>
      {connectionLabel !== null && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>Profile {connectionLabel}</span>}
      {priceSummary !== null && <span className='text-muted-foreground'>{priceSummary}</span>}
      {items.imgCount > 0 && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{formatCountLabel(items.imgCount, 'extracted image')}</span>}
      {items.pCount > 0 && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{formatCountLabel(items.pCount, 'price tier')}</span>}
      {probeLabel !== null && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{probeLabel}</span>}
    </>
  );
}

function ProductScan1688SummaryLine({ details, probe, connectionLabel, priceSummary }: { details: ProductScanSupplierDetails | null, probe: ProductScanSupplierProbe | null, connectionLabel: string | null, priceSummary: string | null }): React.JSX.Element {
  const items = resolveSummaryTextItems(details);
  const probeLabel = resolveProbeImageChipLabel(probe);

  return (
    <div className='flex flex-wrap items-center gap-2 text-xs'>
      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>1688 supplier details</span>
      <SummarySupplierChips items={items} />
      <SummaryStatusChips items={items} connectionLabel={connectionLabel} priceSummary={priceSummary} probeLabel={probeLabel} />
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
  const connectionLabel = props.connectionLabel;
  const cLab = (typeof connectionLabel === 'string' && connectionLabel.trim() !== '') ? connectionLabel.trim() : null;

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
