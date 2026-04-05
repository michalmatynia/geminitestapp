import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { TraderaProductLinkExistingCandidate, TraderaProductLinkExistingInferenceMethod } from '@/shared/contracts/integrations/listings';

export type TraderaManualLinkConnectionCandidate = TraderaProductLinkExistingCandidate & {
  connection: IntegrationConnectionRecord;
};

export type ResolvedTraderaManualLinkConnection =
  | {
      kind: 'resolved';
      connection: TraderaManualLinkConnectionCandidate;
      inferenceMethod: TraderaProductLinkExistingInferenceMethod;
      sellerAlias: string | null;
    }
  | {
      kind: 'missing';
      sellerAlias: string | null;
    }
  | {
      kind: 'ambiguous';
      sellerAlias: string | null;
      candidates: TraderaManualLinkConnectionCandidate[];
    };

const APPLICATION_LD_JSON_REGEX =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&apos;': '\'',
  '&#39;': '\'',
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
};

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(amp|apos|quot|lt|gt|#39);/gi, (match) => HTML_ENTITY_MAP[match] ?? match);

const normalizeComparableName = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase().replace(/^@+/, '');

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = normalizeWhitespace(decodeHtmlEntities(value));
  return normalized.length > 0 ? normalized : null;
};

const visitStructuredData = (
  value: unknown,
  onCandidate: (candidate: string) => string | null
): string | null => {
  if (!value) return null;

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = visitStructuredData(entry, onCandidate);
      if (resolved) return resolved;
    }
    return null;
  }

  if (typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const directCandidates = [
    onCandidate(String(record['sellerName'] ?? '')),
    onCandidate(String(record['sellerAlias'] ?? '')),
  ].filter((candidate): candidate is string => Boolean(candidate));
  if (directCandidates[0]) {
    return directCandidates[0];
  }

  const seller = record['seller'];
  if (seller && typeof seller === 'object' && !Array.isArray(seller)) {
    const sellerRecord = seller as Record<string, unknown>;
    const resolved =
      onCandidate(String(sellerRecord['alternateName'] ?? '')) ??
      onCandidate(String(sellerRecord['name'] ?? ''));
    if (resolved) return resolved;
  }

  for (const child of Object.values(record)) {
    const resolved = visitStructuredData(child, onCandidate);
    if (resolved) return resolved;
  }

  return null;
};

const extractAliasFromStructuredData = (html: string): string | null => {
  APPLICATION_LD_JSON_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = APPLICATION_LD_JSON_REGEX.exec(html))) {
    const scriptContent = match[1]?.trim();
    if (!scriptContent) continue;

    try {
      const parsed = JSON.parse(scriptContent) as unknown;
      const resolved = visitStructuredData(parsed, (candidate) => readString(candidate));
      if (resolved) return resolved;
    } catch {
      // Ignore malformed structured data blocks and continue with other heuristics.
    }
  }

  return null;
};

const ALIAS_REGEXES = [
  /"sellerAlias"\s*:\s*"([^"]+)"/i,
  /"sellerName"\s*:\s*"([^"]+)"/i,
  /"seller"\s*:\s*\{[\s\S]{0,2000}?"name"\s*:\s*"([^"]+)"/i,
  />\s*S(?:a|ä)ljare\s*:?[\s\S]{0,200}?<[^>]*>\s*([^<]+?)\s*</i,
  />\s*Seller\s*:?[\s\S]{0,200}?<[^>]*>\s*([^<]+?)\s*</i,
] as const;

export const extractTraderaSellerAliasFromHtml = (html: string): string | null => {
  const structuredDataAlias = extractAliasFromStructuredData(html);
  if (structuredDataAlias) return structuredDataAlias;

  for (const pattern of ALIAS_REGEXES) {
    const match = html.match(pattern);
    const resolved = readString(match?.[1]);
    if (resolved) return resolved;
  }

  return null;
};

export const resolveTraderaManualLinkConnection = (args: {
  candidates: TraderaManualLinkConnectionCandidate[];
  providedConnectionId?: string | null | undefined;
  preferredConnectionId?: string | null | undefined;
  sellerAlias?: string | null | undefined;
}): ResolvedTraderaManualLinkConnection => {
  const candidates = args.candidates;
  const sellerAlias = readString(args.sellerAlias) ?? null;
  const providedConnectionId = args.providedConnectionId?.trim() ?? '';
  const preferredConnectionId = args.preferredConnectionId?.trim() ?? '';

  if (providedConnectionId) {
    const providedMatch = candidates.find(
      (candidate) => candidate.connectionId === providedConnectionId
    );
    if (providedMatch) {
      return {
        kind: 'resolved',
        connection: providedMatch,
        inferenceMethod: 'provided',
        sellerAlias,
      };
    }
  }

  if (candidates.length === 0) {
    return {
      kind: 'missing',
      sellerAlias,
    };
  }

  if (sellerAlias) {
    const normalizedSellerAlias = normalizeComparableName(sellerAlias);
    const sellerMatches = candidates.filter((candidate) => {
      const normalizedConnectionUsername = normalizeComparableName(candidate.connectionUsername);
      return normalizedConnectionUsername.length > 0 &&
        normalizedConnectionUsername === normalizedSellerAlias;
    });

    if (sellerMatches.length === 1) {
      return {
        kind: 'resolved',
        connection: sellerMatches[0] as TraderaManualLinkConnectionCandidate,
        inferenceMethod: 'seller_alias',
        sellerAlias,
      };
    }

    if (sellerMatches.length > 1) {
      const preferredMatch = preferredConnectionId
        ? sellerMatches.find((candidate) => candidate.connectionId === preferredConnectionId)
        : null;
      if (preferredMatch) {
        return {
          kind: 'resolved',
          connection: preferredMatch,
          inferenceMethod: 'preferred_default',
          sellerAlias,
        };
      }

      return {
        kind: 'ambiguous',
        sellerAlias,
        candidates: sellerMatches,
      };
    }
  }

  if (candidates.length === 1) {
    return {
      kind: 'resolved',
      connection: candidates[0] as TraderaManualLinkConnectionCandidate,
      inferenceMethod: 'sole_connection',
      sellerAlias,
    };
  }

  return {
    kind: 'ambiguous',
    sellerAlias,
    candidates,
  };
};
