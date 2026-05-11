import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  processGraphModel,
  type Job,
} from '@/features/products/workers/product-ai-processors';
import { badRequestError, operationFailedError } from '@/shared/errors/app-error';
import { buildGraphModelJobPayload } from '@/shared/lib/ai-paths/core/runtime/graph-model-job';

export type EcommercePagesCmsEditorialArticleAiDraft = {
  body?: string;
  excerpt?: string;
  tag?: string;
  title?: string;
};

export type EcommercePagesCmsEditorialArticleAiRequest = {
  draft?: EcommercePagesCmsEditorialArticleAiDraft;
  imageUrl?: string;
  prompt: string;
};

export type EcommercePagesCmsGeneratedEditorialArticle = {
  body: string;
  excerpt: string;
  modelId: string | null;
  title: string;
};

const EDITORIAL_ARTICLE_AI_PATH_ID = 'ecommerce-editorial-article-gemma-vision';
const EDITORIAL_ARTICLE_MODEL_NODE_ID = 'node-editorial-article-gemma-vision';
const EDITORIAL_ARTICLE_MODEL_TITLE = 'Gemma Vision Article Writer';
const EDITORIAL_ARTICLE_MODEL_ID = 'ollama:gemma3';
const MAX_PROMPT_LENGTH = 6_000;
const MAX_IMAGE_URL_LENGTH = 2_000;

const EDITORIAL_ARTICLE_SYSTEM_PROMPT = [
  'You write editorial articles for the Stargater ecommerce storefront.',
  'Use the provided image only as visual evidence when it is present.',
  'Return only valid JSON with this exact schema:',
  '{"title":"","excerpt":"","body":""}',
  'Do not include markdown fences, commentary, citations, or unsupported claims.',
].join('\n');

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizePrompt = (value: unknown): string => {
  const prompt = toTrimmedString(value);
  if (prompt.length === 0) throw badRequestError('Article AI prompt is required.');
  return prompt.slice(0, MAX_PROMPT_LENGTH);
};

const normalizeImageUrl = (value: unknown): string | null => {
  const imageUrl = toTrimmedString(value);
  if (imageUrl.length === 0) return null;
  const normalized = imageUrl.slice(0, MAX_IMAGE_URL_LENGTH);
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('/')
  ) {
    return normalized;
  }
  throw badRequestError('Context image URL must be http(s) or a local public image path.');
};

const normalizeDraft = (
  draft: EcommercePagesCmsEditorialArticleAiRequest['draft']
): EcommercePagesCmsEditorialArticleAiDraft => ({
  body: toTrimmedString(draft?.body),
  excerpt: toTrimmedString(draft?.excerpt),
  tag: toTrimmedString(draft?.tag),
  title: toTrimmedString(draft?.title),
});

const withFallbackText = (value: string | undefined, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const buildArticlePrompt = (input: {
  draft: EcommercePagesCmsEditorialArticleAiDraft;
  imageUrl: string | null;
  prompt: string;
}): string =>
  [
    'Generate a storefront Lore & Drops article.',
    `Article tag: ${withFallbackText(input.draft.tag, 'Universe Report')}`,
    `Existing title: ${withFallbackText(input.draft.title, '(empty)')}`,
    `Existing short form: ${withFallbackText(input.draft.excerpt, '(empty)')}`,
    `Existing long text: ${withFallbackText(input.draft.body, '(empty)')}`,
    `Context image URL: ${input.imageUrl ?? '(none)'}`,
    '',
    'User prompt:',
    input.prompt,
    '',
    'Output rules:',
    '- title: concise editorial headline, no quotation marks.',
    '- excerpt: one shopper-facing sentence for the homepage card.',
    '- body: 4 to 7 short paragraphs separated by blank lines.',
  ].join('\n');

const extractJsonObjectText = (value: string): string => {
  const trimmed = value.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return trimmed;
  return trimmed.slice(firstBrace, lastBrace + 1);
};

const parseGeneratedArticleJson = (
  value: string
): Pick<EcommercePagesCmsGeneratedEditorialArticle, 'body' | 'excerpt' | 'title'> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObjectText(value));
  } catch (error) {
    throw operationFailedError('Gemma Vision returned article text that was not valid JSON.', error);
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw operationFailedError('Gemma Vision returned an invalid article payload.');
  }
  const record = parsed as Record<string, unknown>;
  const title = toTrimmedString(record['title']);
  const body = toTrimmedString(record['body']);
  const excerpt = toTrimmedString(record['excerpt']);
  if (title.length === 0 || body.length === 0) {
    throw operationFailedError('Gemma Vision did not return both title and long content.');
  }
  return { body, excerpt, title };
};

const buildArticleGenerationJob = (input: {
  imageUrl: string | null;
  prompt: string;
}): Job => {
  const now = new Date();
  const runId = `cms-editorial-article-${randomUUID()}`;
  return {
    id: `job-${runId}`,
    productId: 'cms-editorial-article',
    status: 'pending',
    type: 'graph_model',
    payload: buildGraphModelJobPayload({
      prompt: input.prompt,
      ...(input.imageUrl !== null ? { imageUrls: [input.imageUrl] } : {}),
      activePathId: EDITORIAL_ARTICLE_AI_PATH_ID,
      maxTokens: 1800,
      modelId: EDITORIAL_ARTICLE_MODEL_ID,
      nodeId: EDITORIAL_ARTICLE_MODEL_NODE_ID,
      nodeTitle: EDITORIAL_ARTICLE_MODEL_TITLE,
      runId,
      systemPrompt: EDITORIAL_ARTICLE_SYSTEM_PROMPT,
      temperature: 0.35,
      vision: true,
    }),
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    errorMessage: null,
    result: null,
  };
};

const readGraphModelResultText = (value: Record<string, unknown>): string => {
  const result = toTrimmedString(value['result']);
  if (result.length > 0) return result;
  throw operationFailedError('Gemma Vision article generation returned an empty result.');
};

export const generateEcommercePagesCmsEditorialArticleWithAiPath = async (
  input: EcommercePagesCmsEditorialArticleAiRequest
): Promise<EcommercePagesCmsGeneratedEditorialArticle> => {
  const prompt = normalizePrompt(input.prompt);
  const imageUrl = normalizeImageUrl(input.imageUrl);
  const draft = normalizeDraft(input.draft);
  const result = await processGraphModel(
    buildArticleGenerationJob({
      imageUrl,
      prompt: buildArticlePrompt({ draft, imageUrl, prompt }),
    })
  );
  const generated = parseGeneratedArticleJson(readGraphModelResultText(result));
  const modelId = toTrimmedString(result['modelId']);
  return {
    ...generated,
    modelId: modelId.length > 0 ? modelId : null,
  };
};
