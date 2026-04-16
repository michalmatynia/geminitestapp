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
  
  const text = (typeof details.priceText === 'string' && details.priceText !== '') ? details.priceText : null;
  if (text !== null) return text;

  const range = (typeof details.priceRangeText === 'string' && details.priceRangeText !== '') ? details.priceRangeText : null;
  if (range !== null) return range;

  const f = details.prices?.[0];
  const moq = f?.moq ? `MOQ ${f.moq}` : null;
  return buildInlineSummary(f?.amount, f?.currency, moq);
}

type GridRow = { label: string; value?: string | null; href?: string | null };

function resolveLeftRows(details: ProductScanSupplierDetails | null, scanUrl: string | null | undefined): GridRow[] {
  const url = (typeof details?.supplierProductUrl === 'string' && details.supplierProductUrl !== '') ? details.supplierProductUrl : (scanUrl ?? null);
  const store = (typeof details?.supplierStoreUrl === 'string' && details.supplierStoreUrl !== '') ? details.supplierStoreUrl : null;
  return [
    { label: 'Supplier product', value: url, href: url },
    { label: 'Supplier store', value: store, href: store },
    { label: 'Supplier location', value: details?.supplierLocation ?? null },
    { label: 'Supplier rating', value: details?.supplierRating ?? null },
    { label: 'Platform product id', value: details?.platformProductId ?? null },
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

function resolveRightRows(probe: ProductScanSupplierProbe | null, scanTitle: string | null | undefined, connectionLabel: string | null, details: ProductScanSupplierDetails | null): GridRow[] {
  const info = resolveImageCountInfo(details, probe);
  const pCount = Array.isArray(details?.prices) ? details.prices.length : 0;
  const base = resolveBaseRightRows(probe, scanTitle, connectionLabel);

  return [
    ...base,
    { label: 'Probe language', value: probe?.pageLanguage ?? null },
    { label: 'Probe artifact key', value: probe?.artifactKey ?? null },
    { label: 'Probe image count', value: typeof info.probe === 'number' ? String(info.probe) : null },
    { label: 'Extracted image count', value: info.extracted > 0 ? String(info.extracted) : null },
    { label: 'Extracted price tiers', value: pCount > 0 ? String(pCount) : null },
  ];
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

type SummaryBaseInfo = { name: string | null, moq: string | null, lang: string | null };

function resolveSummaryBaseInfo(details: ProductScanSupplierDetails | null): SummaryBaseInfo {
  const name = (typeof details?.supplierName === 'string' && details.supplierName !== '') ? details.supplierName : null;
  const moq = (typeof details?.moqText === 'string' && details.moqText !== '') ? details.moqText : null;
  const lang = (typeof details?.sourceLanguage === 'string' && details.sourceLanguage !== '') ? details.sourceLanguage : null;
  return { name, moq, lang };
}

type SummaryTextItems = { name: string | null, moq: string | null, lang: string | null, imgCount: number, pCount: number };

function resolveSummaryTextItems(details: ProductScanSupplierDetails | null): SummaryTextItems {
  const base = resolveSummaryBaseInfo(details);
  return {
    name: base.name,
    moq: base.moq,
    lang: base.lang,
    imgCount: Array.isArray(details?.images) ? details.images.length : 0,
    pCount: Array.isArray(details?.prices) ? details.prices.length : 0,
  };
}

function ProductScan1688SummaryLine({ details, connectionLabel, priceSummary }: { details: ProductScanSupplierDetails | null, connectionLabel: string | null, priceSummary: string | null }): React.JSX.Element {
  const items = resolveSummaryTextItems(details);

  return (
    <div className='flex flex-wrap items-center gap-2 text-xs'>
      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>1688 supplier details</span>
      {items.name && <span className='font-medium text-foreground'>{items.name}</span>}
      {connectionLabel !== null && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>Profile {connectionLabel}</span>}
      {priceSummary !== null && <span className='text-muted-foreground'>{priceSummary}</span>}
      {items.moq && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{items.moq}</span>}
      {items.lang && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{items.lang}</span>}
      {items.imgCount > 0 && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{items.imgCount} extracted images</span>}
      {items.pCount > 0 && <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>{items.pCount} price tiers</span>}
    </div>
  );
}

function resolveResolvedScanId(scanId: string | null | undefined, scan: any): string | null {
  if (typeof scanId === 'string' && scanId !== '') return scanId;
  if (typeof scan.id === 'string' && scan.id !== '') return scan.id;
  return null;
}

export function ProductScan1688Details(props: ProductScan1688DetailsProps): React.JSX.Element | null {
  const { scan } = props;
  if (!hasProductScan1688Details(scan)) return null;

  const resScanId = resolveResolvedScanId(props.scanId, scan);
  const details = scan.supplierDetails;
  const priceSum = resolvePriceSummary(details);
  const cLab = (typeof props.connectionLabel === 'string' && props.connectionLabel.trim() !== '') ? props.connectionLabel.trim() : null;

  return (
    <div className='space-y-3 rounded-md border border-border/50 bg-background/70 px-3 py-3'>
      <ProductScan1688QualitySummary scan={scan} />
      <ProductScan1688SummaryLine details={details} connectionLabel={cLab} priceSummary={priceSum} />
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
