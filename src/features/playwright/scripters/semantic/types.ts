import type { z } from 'zod';

import type { ScripterRunStepTelemetry } from '../scripter-runner';
import type {
  semanticOutputKindSchema,
  semanticScripterDefinitionSchema,
  semanticTargetFieldSchema,
} from './schema';

// ── Output kind ───────────────────────────────────────────────────────────────

export type SemanticOutputKind = z.infer<typeof semanticOutputKindSchema>;
export type SemanticTargetField = z.infer<typeof semanticTargetFieldSchema>;
export type SemanticScripterDefinition = z.infer<typeof semanticScripterDefinitionSchema>;

// ── Mapped record — single superset covering all domains ─────────────────────

/**
 * A fully resolved record produced by the semantic engine.
 * Every field is populated (null / [] when not bound), so domain adapters can
 * read any field without defensive checks against `raw`.
 *
 * Field groups:
 *   Universal  — title, description, sourceUrl, canonicalUrl, images, language, tags, externalId
 *   Product    — price, currency, sku, ean, brand, category
 *   Article    — author, publishedAt, bodyText, excerpt
 *   Job        — company, location, salary, jobType, applyUrl, postedAt, requirements
 */
export type SemanticMappedRecord = {
  // ── Universal ──────────────────────────────────────────────────────────────
  title: string | null;
  description: string | null;
  sourceUrl: string | null;
  canonicalUrl: string | null;
  images: string[];
  language: string | null;
  tags: string[];
  externalId: string | null;

  // ── Product ────────────────────────────────────────────────────────────────
  price: number | null;
  currency: string | null;
  sku: string | null;
  ean: string | null;
  brand: string | null;
  category: string | null;

  // ── Article ────────────────────────────────────────────────────────────────
  author: string | null;
  publishedAt: string | null;
  bodyText: string | null;
  excerpt: string | null;

  // ── Job ────────────────────────────────────────────────────────────────────
  company: string | null;
  location: string | null;
  salary: string | null;
  jobType: string | null;
  applyUrl: string | null;
  postedAt: string | null;
  requirements: string | null;

  // ── Raw ────────────────────────────────────────────────────────────────────
  raw: Record<string, unknown>;
};

// ── Issue type ────────────────────────────────────────────────────────────────

export type SemanticFieldIssueSeverity = 'error' | 'warning';

export type SemanticFieldMapIssue = {
  field: SemanticTargetField | string;
  severity: SemanticFieldIssueSeverity;
  message: string;
  path?: string;
  transform?: string;
};

// ── Per-record result ─────────────────────────────────────────────────────────

export type SemanticExtractedRecord = {
  index: number;
  mapped: SemanticMappedRecord;
  issues: SemanticFieldMapIssue[];
  raw: Record<string, unknown>;
};

// ── Run result ────────────────────────────────────────────────────────────────

export type SemanticRunSummary = {
  total: number;
  clean: number;
  withWarnings: number;
  withErrors: number;
};

export type SemanticRunResult = {
  scripterId: string;
  scripterVersion: number;
  outputKind: SemanticOutputKind;
  records: SemanticExtractedRecord[];
  summary: SemanticRunSummary;
  telemetry: ScripterRunStepTelemetry[];
  errors: Array<{ stepId: string; message: string }>;
  visitedUrls: string[];
};

// ── Domain record types ───────────────────────────────────────────────────────

export type SemanticProductRecord = {
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  sku: string | null;
  ean: string | null;
  brand: string | null;
  category: string | null;
  sourceUrl: string | null;
  images: string[];
  externalId: string | null;
  tags: string[];
  raw: Record<string, unknown>;
};

export type SemanticArticleRecord = {
  title: string;
  description: string | null;
  bodyText: string;
  excerpt: string | null;
  sourceUrl: string;
  canonicalUrl: string;
  author: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
  tags: string[];
  language: string | null;
  wordCount: number;
  raw: Record<string, unknown>;
};

export type SemanticJobRecord = {
  title: string;
  description: string | null;
  requirements: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  jobType: string | null;
  sourceUrl: string;
  applyUrl: string | null;
  postedAt: string | null;
  tags: string[];
  imageUrl: string | null;
  raw: Record<string, unknown>;
};
