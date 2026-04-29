import 'server-only';

import { integrationService } from '@/features/integrations/services/integration-service';
import { findProductListingsByExternalListingIds } from '@/features/integrations/services/product-listing-external-lookup';
import { getProductListingRepository } from '@/features/integrations/services/product-listing-repository';
import type { ProductListing } from '@/shared/contracts/integrations/listings';
import type {
  ProductParseActionsMatchResponse,
  ProductParseActionsMatchRow,
  ProductParseActionsParsedRow,
  ProductParseActionsListingSummary,
  ProductParseActionsProductSummary,
} from '@/shared/contracts/products/parse-actions';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductFiltersParsed } from '@/shared/lib/products/validations';
import { isTraderaIntegrationSlug } from '@/shared/lib/integration-slugs';
import { productService } from '@/shared/lib/products/services/productService';
import {
  normalizeParsedProductTitle,
  parseTraderaProductActionText,
} from './product-parse-actions-parser';

export { normalizeParsedProductTitle, parseTraderaProductActionText };
export { markParsedTraderaMatchesClosed } from './product-parse-actions-marker';

type ScoredProduct = { product: ProductWithImages; score: number };

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const summarizeProduct = (product: ProductWithImages): ProductParseActionsProductSummary => ({
  id: product.id,
  sku: readString(product.sku),
  name: readString(product.name_en) ?? readString(product.name_pl) ?? readString(product.name_de),
});

const summarizeListing = (listing: ProductListing): ProductParseActionsListingSummary => ({
  id: listing.id,
  productId: listing.productId,
  integrationId: listing.integrationId,
  externalListingId: listing.externalListingId,
  status: listing.status,
});

const resolveTraderaIntegrationIds = async (): Promise<Set<string>> => {
  const integrations = await integrationService.listIntegrations();
  return new Set(
    integrations
      .filter((integration): boolean => isTraderaIntegrationSlug(integration.slug))
      .map((integration): string => integration.id)
  );
};

const groupTraderaListingsByExternalId = async (
  rows: ProductParseActionsParsedRow[],
  traderaIntegrationIds: Set<string>
): Promise<Map<string, ProductListing[]>> => {
  const externalIds = rows.flatMap((row: ProductParseActionsParsedRow): string[] =>
    row.objectNumber !== null ? [row.objectNumber] : []
  );
  const listings = await findProductListingsByExternalListingIds(externalIds);
  const grouped = new Map<string, ProductListing[]>();
  listings.forEach((listing: ProductListing) => {
    if (listing.externalListingId === null || !traderaIntegrationIds.has(listing.integrationId)) {
      return;
    }
    grouped.set(listing.externalListingId, [
      ...(grouped.get(listing.externalListingId) ?? []),
      listing,
    ]);
  });
  return grouped;
};

const scoreTitleMatch = (parsed: string, candidate: string): number => {
  if (parsed.length === 0 || candidate.length === 0) return 0;
  if (parsed === candidate) return 1;
  if (parsed.includes(candidate) || candidate.includes(parsed)) return 0.92;
  const parsedTokens = new Set(parsed.split(' ').filter(Boolean));
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean));
  const overlap = Array.from(parsedTokens).filter((token: string): boolean =>
    candidateTokens.has(token)
  ).length;
  return overlap / Math.max(parsedTokens.size, candidateTokens.size, 1);
};

const readProductTitleCandidates = (product: ProductWithImages): string[] => {
  const marketplaceTitles = (product.marketplaceContentOverrides ?? []).flatMap((entry): string[] => {
    const title = readString(entry.title);
    return title !== null ? [title] : [];
  });
  return [
    readString(product.name_en),
    readString(product.name_pl),
    readString(product.name_de),
    ...marketplaceTitles,
  ].flatMap((title): string[] => (title !== null ? [title] : []));
};

const scoreProductForRow = (
  row: ProductParseActionsParsedRow,
  product: ProductWithImages
): ScoredProduct => ({
  product,
  score: Math.max(
    ...readProductTitleCandidates(product).map((title: string): number =>
      scoreTitleMatch(row.normalizedTitle, normalizeParsedProductTitle(title))
    ),
    0
  ),
});

const searchProductsForRow = async (
  row: ProductParseActionsParsedRow
): Promise<ProductWithImages[]> => {
  const filters: ProductFiltersParsed = {
    search: row.title,
    searchLanguage: 'name_en',
    page: 1,
    pageSize: 8,
  };
  return productService.getProducts(filters);
};

const findTraderaListingForProduct = async (
  productId: string,
  traderaIntegrationIds: Set<string>
): Promise<ProductListing | null> => {
  const repository = await getProductListingRepository();
  const listings = await repository.getListingsByProductIds([productId]);
  return (
    listings.find((listing: ProductListing): boolean =>
      traderaIntegrationIds.has(listing.integrationId)
    ) ?? null
  );
};

const matchByListing = async (
  row: ProductParseActionsParsedRow,
  listings: ProductListing[]
): Promise<ProductParseActionsMatchRow | null> => {
  if (listings.length === 0) return null;
  const products = await Promise.all(
    listings.map((listing: ProductListing) => productService.getProductById(listing.productId))
  );
  const candidates = products.flatMap((product): ProductParseActionsProductSummary[] =>
    product !== null ? [summarizeProduct(product)] : []
  );
  if (listings.length !== 1) {
    return {
      row,
      matchStatus: 'ambiguous',
      confidence: 1,
      reason: 'external_listing_id',
      product: null,
      listing: null,
      candidates,
    };
  }
  const listing = listings[0];
  if (listing === undefined) return null;
  const product = products[0] ?? null;
  return {
    row,
    matchStatus: 'confirmed',
    confidence: 1,
    reason: 'external_listing_id',
    product: product !== null ? summarizeProduct(product) : null,
    listing: summarizeListing(listing),
    candidates,
  };
};

const matchByTitle = async (
  row: ProductParseActionsParsedRow,
  traderaIntegrationIds: Set<string>
): Promise<ProductParseActionsMatchRow> => {
  const scored = (await searchProductsForRow(row))
    .map((product: ProductWithImages): ScoredProduct => scoreProductForRow(row, product))
    .filter((entry: ScoredProduct): boolean => entry.score >= 0.55)
    .sort((left: ScoredProduct, right: ScoredProduct): number => right.score - left.score);
  const candidates = scored.map((entry: ScoredProduct): ProductParseActionsProductSummary =>
    summarizeProduct(entry.product)
  );
  const top = scored[0];
  const second = scored[1];
  if (top === undefined) {
    return {
      row,
      matchStatus: 'unmatched',
      confidence: 0,
      reason: 'no_match',
      product: null,
      listing: null,
      candidates: [],
    };
  }
  if (top.score < 0.78 || (second !== undefined && top.score - second.score < 0.05)) {
    return {
      row,
      matchStatus: 'ambiguous',
      confidence: top.score,
      reason: 'title',
      product: null,
      listing: null,
      candidates,
    };
  }
  const listing = await findTraderaListingForProduct(top.product.id, traderaIntegrationIds);
  return {
    row,
    matchStatus: 'confirmed',
    confidence: top.score,
    reason: top.score === 1 ? 'exact_title' : 'fuzzy_title',
    product: summarizeProduct(top.product),
    listing: listing !== null ? summarizeListing(listing) : null,
    candidates,
  };
};

const matchParsedRow = async (
  row: ProductParseActionsParsedRow,
  listingsByExternalId: Map<string, ProductListing[]>,
  traderaIntegrationIds: Set<string>
): Promise<ProductParseActionsMatchRow> => {
  const listingMatch =
    row.objectNumber !== null
      ? await matchByListing(row, listingsByExternalId.get(row.objectNumber) ?? [])
      : null;
  return listingMatch ?? matchByTitle(row, traderaIntegrationIds);
};

export const matchParsedProductActions = async (
  text: string
): Promise<ProductParseActionsMatchResponse> => {
  const rows = parseTraderaProductActionText(text);
  const traderaIntegrationIds = await resolveTraderaIntegrationIds();
  const listingsByExternalId = await groupTraderaListingsByExternalId(rows, traderaIntegrationIds);
  const matches = await Promise.all(
    rows.map((row: ProductParseActionsParsedRow): Promise<ProductParseActionsMatchRow> =>
      matchParsedRow(row, listingsByExternalId, traderaIntegrationIds)
    )
  );

  return {
    source: 'tradera',
    parsedCount: rows.length,
    matchedCount: matches.filter(
      (row: ProductParseActionsMatchRow): boolean => row.product !== null
    ).length,
    actionableCount: matches.filter(
      (row: ProductParseActionsMatchRow): boolean => row.listing !== null
    ).length,
    rows: matches,
  };
};
