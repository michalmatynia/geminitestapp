import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import mime from 'mime-types';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

import { getDiskPathFromPublicPath, isHttpFilepath } from '@/features/files/server';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import { findKangurSocialImageAddonsByIds } from './social-image-addons-repository';
import {
  kangurSocialDocUpdateSchema,
  type KangurSocialDocUpdate,
} from '@/shared/contracts/kangur-social-posts';
import { configurationError } from '@/shared/errors/app-error';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { inferBrainModelVendor } from '@/shared/lib/ai-brain/model-vendor';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { buildKangurDocContext, resolveKangurDocReferences } from './social-posts-docs';

export type KangurSocialVisualAnalysis = {
  summary: string;
  highlights: string[];
  docUpdates: KangurSocialDocUpdate[];
};

type VisualAnalysisInput = {
  docReferences?: string[];
  notes?: string;
  modelId?: string;
  imageAddons: KangurSocialImageAddon[];
};

type BeforeAfterPair = {
  addon: KangurSocialImageAddon;
  previousAddon: KangurSocialImageAddon | null;
};

const resolvePreviousAddons = async (
  addons: KangurSocialImageAddon[]
): Promise<Map<string, KangurSocialImageAddon>> => {
  const previousIds = addons
    .map((addon) => addon.previousAddonId?.trim())
    .filter((id): id is string => Boolean(id));
  if (previousIds.length === 0) return new Map();

  const uniqueIds = [...new Set(previousIds)];
  const previousAddons = await findKangurSocialImageAddonsByIds(uniqueIds);
  return new Map(previousAddons.map((addon) => [addon.id, addon]));
};

const buildBeforeAfterPairs = async (
  addons: KangurSocialImageAddon[]
): Promise<BeforeAfterPair[]> => {
  const previousMap = await resolvePreviousAddons(addons);
  return addons.map((addon) => ({
    addon,
    previousAddon: addon.previousAddonId ? previousMap.get(addon.previousAddonId) ?? null : null,
  }));
};

const OPENAI_MAX_IMAGES = 10;
const OPENAI_MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024;
const OPENAI_MAX_TOTAL_IMAGE_BASE64_BYTES = 15 * 1024 * 1024;
const MAX_SUMMARY_CHARS = 8000;

const truncateText = (value: string, maxChars: number): string =>
  value.length <= maxChars ? value : value.slice(0, maxChars).trimEnd();

const resolveAddonSource = (addon: KangurSocialImageAddon): string | null => {
  const asset = addon.imageAsset;
  // Prefer filepath for server-side reads — url may be a relative API serve path
  // that cannot be read from disk.
  return asset.filepath?.trim() || asset.url?.trim() || asset.thumbnailUrl?.trim() || null;
};

const readImageDataUrl = async (
  source: string
): Promise<{ dataUrl: string; size: number } | null> => {
  try {
    if (isHttpFilepath(source)) {
      const response = await fetch(source);
      if (!response.ok) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const base64Image = buffer.toString('base64');
      return {
        dataUrl: `data:${contentType};base64,${base64Image}`,
        size: base64Image.length,
      };
    }

    // Batch capture stores absolute temp paths (e.g. /var/tmp/libapp-uploads/...)
    // to avoid writing into public/ which triggers Turbopack HMR page reloads.
    // Paths starting with /uploads/ are public URL paths that need resolution
    // via getDiskPathFromPublicPath, NOT direct filesystem reads.
    const diskPath = path.isAbsolute(source) && !source.startsWith('/uploads/')
      ? source
      : getDiskPathFromPublicPath(source);
    const buffer = await fs.readFile(diskPath);
    const lookup = mime.lookup(diskPath);
    const contentType = (typeof lookup === 'string' ? lookup : null) || 'image/png';
    const base64Image = buffer.toString('base64');
    return {
      dataUrl: `data:${contentType};base64,${base64Image}`,
      size: base64Image.length,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const appendImagePart = (
  parts: ChatCompletionContentPart[],
  loaded: { dataUrl: string; size: number },
  label: string
): void => {
  parts.push({ type: 'text', text: label });
  parts.push({
    type: 'image_url',
    image_url: { url: loaded.dataUrl },
  });
};

const buildImageParts = async (
  pairs: BeforeAfterPair[],
  openAiGuards: boolean
): Promise<ChatCompletionContentPart[]> => {
  const parts: ChatCompletionContentPart[] = [];
  let totalBytes = 0;
  let imageCount = 0;

  for (const { addon, previousAddon } of pairs) {
    if (openAiGuards && imageCount >= OPENAI_MAX_IMAGES) break;

    const addonLabel = addon.title?.trim() || addon.presetId || 'Screenshot';

    // Load "before" image if previous addon exists
    if (previousAddon) {
      const prevSource = resolveAddonSource(previousAddon);
      if (prevSource) {
        const prevLoaded = await readImageDataUrl(prevSource);
        if (prevLoaded) {
          if (openAiGuards && prevLoaded.size > OPENAI_MAX_IMAGE_BASE64_BYTES) {
            // skip oversized before image
          } else {
            if (openAiGuards) {
              totalBytes += prevLoaded.dataUrl.length;
              if (totalBytes > OPENAI_MAX_TOTAL_IMAGE_BASE64_BYTES) break;
            }
            appendImagePart(parts, prevLoaded, `[BEFORE] ${addonLabel}:`);
            imageCount += 1;
          }
        }
      }
    }

    if (openAiGuards && imageCount >= OPENAI_MAX_IMAGES) break;

    // Load "after" (current) image
    const source = resolveAddonSource(addon);
    if (!source) continue;
    const loaded = await readImageDataUrl(source);
    if (!loaded) continue;
    if (openAiGuards && loaded.size > OPENAI_MAX_IMAGE_BASE64_BYTES) continue;
    if (openAiGuards) {
      totalBytes += loaded.dataUrl.length;
      if (totalBytes > OPENAI_MAX_TOTAL_IMAGE_BASE64_BYTES) break;
    }

    const imageLabel = previousAddon ? `[AFTER] ${addonLabel}:` : `${addonLabel}:`;
    appendImagePart(parts, loaded, imageLabel);
    imageCount += 1;
  }

  return parts;
};

const parseHighlights = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, 24);
};

const parseDocUpdates = (value: unknown): KangurSocialDocUpdate[] => {
  if (!Array.isArray(value)) return [];
  const updates: KangurSocialDocUpdate[] = [];
  value.forEach((entry) => {
    const parsed = kangurSocialDocUpdateSchema.safeParse(entry);
    if (parsed.success) updates.push(parsed.data);
  });
  return updates.slice(0, 50);
};

const buildSystemPrompt = (basePrompt: string, hasBeforeAfter: boolean): string => {
  const lines = [
    basePrompt.trim(),
    'You analyze StudiQ UI screenshots against the documentation context.',
    'Return a JSON object with keys: summary, highlights, docUpdates.',
    'summary: short paragraph describing visible changes or notable UI details.',
    'highlights: array of short bullet sentences.',
    'docUpdates: array of objects { docPath, section, proposedText, reason }.',
    'Use docPath values that exist under /docs/kangur when possible.',
    'If you are not confident about a doc update, return an empty docUpdates array.',
  ];
  if (hasBeforeAfter) {
    lines.push(
      '',
      'Some images are provided as BEFORE/AFTER pairs. Images labeled [BEFORE] show the previous state and [AFTER] show the current state.',
      'When you see before/after pairs, focus on what visual changes occurred between the two versions.',
      'Describe specific differences: layout changes, new elements, removed elements, styling changes, content updates.',
      'Include these visual changes prominently in both the summary and highlights.'
    );
  }
  return lines.filter(Boolean).join('\n');
};

export async function analyzeKangurSocialVisuals(
  input: VisualAnalysisInput
): Promise<KangurSocialVisualAnalysis> {
  const startedAt = Date.now();
  const docReferences = (input.docReferences ?? []).map((ref) => ref.trim()).filter(Boolean);
  const docs = resolveKangurDocReferences(docReferences);
  const { context } = await buildKangurDocContext(docs);
  const notes = input.notes?.trim() ?? '';
  const imageAddons = input.imageAddons ?? [];
  let modelId = '';

  try {
    if (imageAddons.length === 0) {
      return { summary: '', highlights: [], docUpdates: [] };
    }

    const overrideModelId = input.modelId?.trim() ?? '';
    const brainConfig = await resolveBrainExecutionConfigForCapability(
      'kangur_social.visual_analysis',
      {
        defaultTemperature: 0.2,
        defaultMaxTokens: 900,
        defaultModelId: overrideModelId,
        runtimeKind: 'vision',
      }
    );
    modelId = overrideModelId || brainConfig.modelId.trim();
    if (!modelId) {
      throw configurationError(
        'StudiQ Social Visual Analysis model is missing. Configure it in AI Brain.'
      );
    }

    const vendor = inferBrainModelVendor(modelId);
    if (vendor !== 'openai' && vendor !== 'ollama') {
      throw configurationError(
        'Visual analysis requires an OpenAI or Ollama-compatible multimodal model.'
      );
    }

    const pairs = await buildBeforeAfterPairs(imageAddons);
    const hasBeforeAfter = pairs.some((pair) => pair.previousAddon !== null);

    const systemPrompt = buildSystemPrompt(brainConfig.systemPrompt ?? '', hasBeforeAfter);
    const userPromptLines = [
      'Documentation context:',
      '',
      context,
      '',
      'Captured screenshots:',
      ...pairs.map(({ addon, previousAddon }, index) => {
        const label = addon.title?.trim() || `Screenshot ${index + 1}`;
        const source = addon.sourceUrl?.trim();
        const changeNote = previousAddon ? ' [has before/after comparison]' : '';
        return `- ${label}${source ? ` (${source})` : ''}${changeNote}`;
      }),
    ];
    if (notes) {
      userPromptLines.push('', 'Additional notes:', notes);
    }

    const content: ChatCompletionContentPart[] = [
      { type: 'text', text: userPromptLines.join('\n') },
    ];
    const imageParts = await buildImageParts(pairs, vendor === 'openai');
    content.push(...imageParts);

    const res = await runBrainChatCompletion({
      modelId,
      temperature: brainConfig.temperature,
      maxTokens: brainConfig.maxTokens,
      jsonMode: supportsBrainJsonMode(modelId),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
    });

    let parsed: Partial<KangurSocialVisualAnalysis> & {
      docUpdates?: unknown;
      highlights?: unknown;
    } = {};
    try {
      parsed = JSON.parse(res.text) as Partial<KangurSocialVisualAnalysis>;
    } catch {
      // Try extracting JSON from markdown code fences (common with Ollama models)
      const jsonMatch = res.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch?.[1]) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim()) as Partial<KangurSocialVisualAnalysis>;
        } catch {
          parsed = {};
        }
      }
      if (!parsed.summary) {
        // Use raw text as the summary so the pipeline still has visual context
        const raw = res.text.trim();
        if (raw.length > 0) {
          parsed = { summary: raw };
        }
      }
    }

    const summaryText =
      typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : res.text.trim();

    const analysis: KangurSocialVisualAnalysis = {
      summary: truncateText(summaryText, MAX_SUMMARY_CHARS),
      highlights: parseHighlights(parsed.highlights),
      docUpdates: parseDocUpdates(parsed.docUpdates),
    };

    const beforeAfterCount = pairs.filter((p) => p.previousAddon !== null).length;

    void ErrorSystem.logInfo('Kangur social visuals analyzed', {
      service: 'kangur.social-posts.visual-analysis',
      durationMs: Date.now() - startedAt,
      modelId,
      imageAddonCount: imageAddons.length,
      beforeAfterPairCount: beforeAfterCount,
      docReferenceCount: docReferences.length,
      highlightCount: analysis.highlights.length,
      docUpdateCount: analysis.docUpdates.length,
      notesLength: notes.length,
    });

    return analysis;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.visual-analysis',
      action: 'analyze',
      durationMs: Date.now() - startedAt,
      modelId: modelId || null,
      imageAddonCount: imageAddons.length,
      docReferenceCount: docReferences.length,
      notesLength: notes.length,
    });
    throw error;
  }
}
