import type { 
  ProductScanRecord, 
  ProductScanSupplierDetails, 
  ProductScanSupplierProbe,
  ProductScanSupplierEvaluation,
} from '@/shared/contracts/product-scans';

export type ProductScan1688QualitySummaryValue = {
  primaryLabel:
    | 'AI-approved supplier match'
    | 'Deterministic supplier match'
    | 'Heuristic supplier match'
    | 'Supplier probe';
  hasPricing: boolean;
  hasImages: boolean;
  hasStoreLink: boolean;
};

export type ProductScan1688ApplyPolicySummaryValue = {
  tone: 'warning' | 'destructive';
  label: 'Apply blocked by AI rejection' | 'Manual review after AI failure' | 'Manual review recommended';
  detail: string;
  blockActions: boolean;
};

export type ProductScan1688RecommendationSignalValue = {
  variant: 'preferred' | 'weaker' | 'default';
  badgeLabel:
    | 'Preferred 1688 supplier result'
    | 'Weaker 1688 supplier result'
    | '1688 supplier result';
  detail:
    | 'Preferred over other 1688 supplier results for this product.'
    | 'A stronger 1688 supplier result is available for this product.'
    | null;
};

export type ProductScan1688RankingSummaryValue = {
  rank: number | null;
  count: number;
  isPreferred: boolean;
  hasStrongerAlternative: boolean;
  preferredScanId: string | null;
  alternativeScanIds: string[];
};

export type ProductScan1688ComparisonTargetValue = {
  id: string;
  label: string;
  rank: number | null;
  labelWithRank: string;
};

export type ProductScan1688PreferenceRank = 0 | 1 | 2 | 3 | null;

export type ProductScan1688SectionKey = 'candidate-urls' | 'match-evaluation';

export function formatConfidence(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${Math.round(value * 100)}%`;
}

export function buildInlineSummary(...values: Array<string | null | undefined>): string | null {
  const entries = values.map((v) => (typeof v === 'string' ? v.trim() : '')).filter((v) => v.length > 0);
  return entries.length > 0 ? entries.join(' · ') : null;
}

function resolveEvaluationDetailFromMismatchOrReason(evalObj: NonNullable<ProductScanRecord['supplierEvaluation']>): string | null {
  return evalObj.mismatches[0] ?? evalObj.reasons[0] ?? null;
}

export function resolveSupplierEvaluationDetail(scan: Pick<ProductScanRecord, 'supplierEvaluation'> | null | undefined): string | null {
  const evalObj = scan?.supplierEvaluation;
  if (!evalObj) return null;

  const mismatchOrReason = resolveEvaluationDetailFromMismatchOrReason(evalObj);
  if (mismatchOrReason !== null) return mismatchOrReason;

  const confidence = typeof evalObj.confidence === 'number' && Number.isFinite(evalObj.confidence) ? `Confidence ${Math.round(evalObj.confidence * 100)}%` : null;

  return evalObj.error ?? confidence ?? 'Review the extracted supplier details before applying them to the product form.';
}

export function formatTimestamp(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function normalizeDomIdFragment(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
  return normalized !== '' ? normalized : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function resolveSupplierCandidateUrls(scan: Pick<ProductScanRecord, 'url' | 'supplierProbe' | 'rawResult'> | null | undefined): string[] {
  if (!scan) return [];
  const urls = new Set<string>();
  const add = (v: unknown): void => {
    if (typeof v === 'string' && v.trim() !== '') urls.add(v.trim());
  };
  add(scan.supplierProbe?.candidateUrl);
  add(scan.supplierProbe?.canonicalUrl);
  add(scan.url);
  const raw = toRecord(scan.rawResult);
  const cand = raw?.['candidateUrls'];
  if (Array.isArray(cand)) cand.forEach(add);
  return Array.from(urls).slice(0, 8);
}

function resolveHasPricing(det: ProductScanSupplierDetails | null): boolean {
  if (!det) return false;
  if (typeof det.priceText === 'string' && det.priceText !== '') return true;
  if (typeof det.priceRangeText === 'string' && det.priceRangeText !== '') return true;
  return Array.isArray(det.prices) && det.prices.length > 0;
}

function resolveQualityPricingImages(det: ProductScanSupplierDetails | null): { hasPricing: boolean; hasImages: boolean; hasStoreLink: boolean } {
  return {
    hasPricing: resolveHasPricing(det),
    hasImages: Array.isArray(det?.images) && det.images.length > 0,
    hasStoreLink: (det?.supplierStoreUrl ?? null) !== null
  };
}

function isHeuristicMatch(det: ProductScanSupplierDetails | null): boolean {
  if (!det) return false;
  if ((det.supplierProductUrl ?? null) !== null || (det.supplierName ?? null) !== null) return true;
  return resolveHasPricing(det) || (Array.isArray(det.images) && det.images.length > 0);
}

function isSupplierProbe(probe: ProductScanSupplierProbe | null): boolean {
  if (!probe) return false;
  return (probe.candidateUrl ?? null) !== null || (probe.canonicalUrl ?? null) !== null || (probe.pageTitle ?? null) !== null;
}

function resolvePrimaryLabel(evalObj: ProductScanSupplierEvaluation | null, det: ProductScanSupplierDetails | null, probe: ProductScanSupplierProbe | null): ProductScan1688QualitySummaryValue['primaryLabel'] | null {
  if (evalObj?.status === 'approved') return 'AI-approved supplier match';
  if (evalObj?.status === 'skipped' && evalObj.proceed) return 'Deterministic supplier match';
  if (isHeuristicMatch(det)) return 'Heuristic supplier match';
  if (isSupplierProbe(probe)) return 'Supplier probe';
  return null;
}

export function resolveProductScan1688QualitySummary(scan: Pick<ProductScanRecord, 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation'> | null | undefined): ProductScan1688QualitySummaryValue | null {
  if (!scan) return null;
  const primary = resolvePrimaryLabel(scan.supplierEvaluation ?? null, scan.supplierDetails, scan.supplierProbe);
  if (primary === null) return null;
  const { hasPricing, hasImages, hasStoreLink } = resolveQualityPricingImages(scan.supplierDetails);
  return { primaryLabel: primary, hasPricing, hasImages, hasStoreLink };
}

export function resolve1688ScanRecommendationReason(scan: Pick<ProductScanRecord, 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation'> | null | undefined): string | null {
  const quality = resolveProductScan1688QualitySummary(scan);
  if (quality === null) return null;
  
  const { primaryLabel, hasPricing, hasImages } = quality;
  if (primaryLabel !== 'Heuristic supplier match') return primaryLabel;
  
  if (hasPricing && hasImages) return 'Supplier match with pricing and images';
  if (hasPricing) return 'Supplier match with pricing';
  if (hasImages) return 'Supplier match with images';
  return primaryLabel;
}

function resolveApplyPolicyEntry(status: string, proceed: boolean, detail: string): ProductScan1688ApplyPolicySummaryValue | null {
  if (status === 'rejected' && !proceed) return { tone: 'destructive', label: 'Apply blocked by AI rejection', detail, blockActions: true };
  if (status === 'failed') return { tone: 'warning', label: 'Manual review after AI failure', detail, blockActions: false };
  if (status === 'skipped' && !proceed) return { tone: 'warning', label: 'Manual review recommended', detail, blockActions: false };
  return null;
}

export function resolveProductScan1688ApplyPolicySummary(scan: Pick<ProductScanRecord, 'supplierEvaluation'> | null | undefined): ProductScan1688ApplyPolicySummaryValue | null {
  const evalObj = scan?.supplierEvaluation;
  if (!evalObj) return null;
  const detail = resolveSupplierEvaluationDetail(scan) ?? 'Manual review recommended';
  return resolveApplyPolicyEntry(evalObj.status, evalObj.proceed, detail);
}

export function resolveProductScan1688RecommendationSignal({ isPreferred = false, hasAlternativeMeaningfulResult = false, hasStrongerAlternative = false }: { isPreferred?: boolean; hasAlternativeMeaningfulResult?: boolean; hasStrongerAlternative?: boolean } = {}): ProductScan1688RecommendationSignalValue {
  if (isPreferred) return { variant: 'preferred', badgeLabel: 'Preferred 1688 supplier result', detail: hasAlternativeMeaningfulResult ? 'Preferred over other 1688 supplier results for this product.' : null };
  if (hasStrongerAlternative) return { variant: 'weaker', badgeLabel: 'Weaker 1688 supplier result', detail: 'A stronger 1688 supplier result is available for this product.' };
  return { variant: 'default', badgeLabel: '1688 supplier result', detail: null };
}

export function resolveProductScan1688TimestampMs(scan: Pick<ProductScanRecord, 'completedAt' | 'updatedAt' | 'createdAt'> | null | undefined): number {
  const candidates = [scan?.completedAt, scan?.updatedAt, scan?.createdAt];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') {
      const parsed = Date.parse(c);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

export function resolveProductScan1688PreferenceRank(scan: Pick<ProductScanRecord, 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation'> | null | undefined): ProductScan1688PreferenceRank {
  const quality = resolveProductScan1688QualitySummary(scan);
  if (quality === null) return null;
  const { primaryLabel } = quality;
  if (primaryLabel === 'AI-approved supplier match') return 0;
  if (primaryLabel === 'Deterministic supplier match') return 1;
  return primaryLabel === 'Heuristic supplier match' ? 2 : 3;
}

type ScanForSort = Pick<ProductScanRecord, 'id' | 'provider' | 'createdAt' | 'updatedAt' | 'completedAt' | 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation' | 'title'>;

export function resolvePreferred1688SupplierScans(scans: ReadonlyArray<ScanForSort>): ScanForSort[] {
  const entries = scans.filter((s) => s.provider === '1688')
    .map((s) => ({ scan: s, rank: resolveProductScan1688PreferenceRank(s), time: resolveProductScan1688TimestampMs(s) }))
    .filter((e): e is { scan: ScanForSort; rank: Exclude<ProductScan1688PreferenceRank, null>; time: number } => e.rank !== null && e.rank < 3);

  return entries.sort((l, r) => {
    if (l.rank !== r.rank) return l.rank - r.rank;
    if (r.time !== l.time) return r.time - l.time;
    return l.scan.id.localeCompare(r.scan.id, undefined, { sensitivity: 'base' });
  }).map((e) => e.scan);
}

export function hasNewerApproved1688Scan(scans: ReadonlyArray<ScanForSort>, scanId: string | null | undefined): boolean {
  if (typeof scanId !== 'string' || scanId.trim() === '') return false;
  const targetId = scanId.trim();
  const target = scans.find((s) => s.id === targetId && s.provider === '1688');
  if (!target) return false;
  const time = resolveProductScan1688TimestampMs(target);
  return resolvePreferred1688SupplierScans(scans).some((s) => s.id !== targetId && s.supplierEvaluation?.status === 'approved' && resolveProductScan1688TimestampMs(s) > time);
}

type RankingMeta = { prefId: string | null, rank: number | null };

function resolveRankingMetadata(pref: ReadonlyArray<Pick<ProductScanRecord, 'id'>>, id: string): RankingMeta {
  const prefId = pref[0]?.id ?? null;
  const idx = id !== '' ? pref.findIndex((s) => s.id === id) : -1;
  const rank = idx >= 0 ? idx + 1 : null;
  return { prefId, rank };
}

export function resolveProductScan1688RankingSummary(preferredScans: ReadonlyArray<Pick<ProductScanRecord, 'id'>>, scanId: string | null | undefined): ProductScan1688RankingSummaryValue {
  const id = typeof scanId === 'string' ? scanId.trim() : '';
  const { prefId, rank } = resolveRankingMetadata(preferredScans, id);
  const isPref = rank === 1 && prefId === id;
  const stronger = rank !== null && prefId !== null && prefId !== id;
  const alternatives = (rank !== null) ? preferredScans.filter((s) => s.id !== id).map((s) => s.id) : [];

  return { rank, count: preferredScans.length, isPreferred: isPref, hasStrongerAlternative: stronger, preferredScanId: prefId, alternativeScanIds: alternatives };
}

export function resolveProductScan1688ResultLabel(scan: Pick<ProductScanRecord, 'id' | 'title' | 'supplierDetails' | 'supplierProbe'> | null | undefined): string {
  if (!scan) return 'Scan result';
  const { title, supplierDetails, supplierProbe, id } = scan;
  const candidate = [title, supplierDetails?.supplierName, supplierProbe?.pageTitle, id].find((v) => typeof v === 'string' && v.trim() !== '');
  return candidate ?? 'Scan result';
}

export function formatProductScan1688RankLabel(rank: number | null | undefined, count: number | null | undefined): string | null {
  if (typeof rank !== 'number' || !Number.isFinite(rank) || typeof count !== 'number' || !Number.isFinite(count) || count <= 1) return null;
  return `Rank ${rank} of ${count}`;
}

export function formatProductScan1688ComparisonCountLabel(count: number | null | undefined): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return null;
  return count === 1 ? 'Compare with 1 alternative result' : `Compare with ${count} alternative results`;
}

export function buildProductScan1688ComparisonTarget(scan: Pick<ProductScanRecord, 'id' | 'title' | 'supplierDetails' | 'supplierProbe'>, rank: number | null, count: number): ProductScan1688ComparisonTargetValue {
  const label = resolveProductScan1688ResultLabel(scan);
  const rankLabel = formatProductScan1688RankLabel(rank, count);
  return { id: scan.id, label, rank, labelWithRank: (rankLabel !== null) ? `${label} (${rankLabel})` : label };
}

export function resolveProductScan1688ComparisonTargets(preferredScans: ReadonlyArray<Pick<ProductScanRecord, 'id' | 'title' | 'supplierDetails' | 'supplierProbe'>>, currentScanId: string | null | undefined): { preferredTarget: ProductScan1688ComparisonTargetValue | null; alternativeTargets: ProductScan1688ComparisonTargetValue[] } {
  const count = preferredScans.length;
  const preferredTarget = preferredScans[0] ? buildProductScan1688ComparisonTarget(preferredScans[0], 1, count) : null;
  const id = typeof currentScanId === 'string' ? currentScanId.trim() : '';
  const alts = preferredScans.filter((s) => s.id !== id);
  const alternativeTargets = alts.map((s, i) => {
    const r = preferredScans.findIndex((p) => p.id === s.id) + 1;
    return buildProductScan1688ComparisonTarget(s, r > 0 ? r : i + 1, count);
  });
  return { preferredTarget, alternativeTargets };
}

export function buildProductScan1688SectionId(scanId: string | null | undefined, section: ProductScan1688SectionKey): string | null {
  const id = normalizeDomIdFragment(scanId);
  return id !== null ? `product-scan-1688-${id}-${section}` : null;
}

function resolveHasBasicInfo(det: ProductScanSupplierDetails): boolean {
  if ((det.supplierName ?? '') !== '') return true;
  if ((det.supplierStoreUrl ?? '') !== '') return true;
  return (det.supplierProductUrl ?? '') !== '';
}

function resolveHasPricingInfo(det: ProductScanSupplierDetails): boolean {
  if ((det.priceText ?? '') !== '') return true;
  if ((det.priceRangeText ?? '') !== '') return true;
  return (det.moqText ?? '') !== '';
}

function resolveHasExtractedText(det: ProductScanSupplierDetails): boolean {
  if (resolveHasBasicInfo(det)) return true;
  return resolveHasPricingInfo(det);
}

function resolveHasExtractedData(det: ProductScanSupplierDetails | null): boolean {
  if (!det) return false;
  if (resolveHasExtractedText(det)) return true;
  const hasImgs = Array.isArray(det.images) && det.images.length > 0;
  return hasImgs || (Array.isArray(det.prices) && det.prices.length > 0);
}

function resolveHasProbeData(p: ProductScanSupplierProbe | null): boolean {
  if (!p) return false;
  if ((p.candidateUrl ?? '') !== '') return true;
  if ((p.canonicalUrl ?? '') !== '') return true;
  return (p.pageTitle ?? '') !== '';
}

function resolveHasBaseDetails(scan: Pick<ProductScanRecord, 'title' | 'url' | 'supplierDetails' | 'supplierProbe'>): boolean {
  if ((scan.title ?? '') !== '' || (scan.url ?? '') !== '') return true;
  if (resolveHasExtractedData(scan.supplierDetails)) return true;
  return resolveHasProbeData(scan.supplierProbe);
}

export function hasProductScan1688Details(scan: Pick<ProductScanRecord, 'title' | 'url' | 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation' | 'rawResult'> | null | undefined): boolean {
  if (!scan) return false;
  if (resolveHasBaseDetails(scan)) return true;
  const candUrls = resolveSupplierCandidateUrls(scan);
  return candUrls.length > 0 || Boolean(scan.supplierEvaluation);
}
