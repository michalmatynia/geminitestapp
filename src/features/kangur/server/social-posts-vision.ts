import 'server-only';

import fs from 'fs/promises';

import mime from 'mime-types';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

import { getDiskPathFromPublicPath, isHttpFilepath } from '@/features/files/server';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
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

const OPENAI_MAX_IMAGES = 10;
const OPENAI_MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024;
const OPENAI_MAX_TOTAL_IMAGE_BASE64_BYTES = 15 * 1024 * 1024;
const MAX_SUMMARY_CHARS = 8000;

const truncateText = (value: string, maxChars: number): string =>
  value.length <= maxChars ? value : value.slice(0, maxChars).trimEnd();

const resolveAddonSource = (addon: KangurSocialImageAddon): string | null => {
  const asset = addon.imageAsset;
  return asset.url?.trim() || asset.filepath?.trim() || asset.thumbnailUrl?.trim() || null;
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

    const diskPath = getDiskPathFromPublicPath(source);
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

const buildImageParts = async (
  imageAddons: KangurSocialImageAddon[],
  openAiGuards: boolean
): Promise<ChatCompletionContentPart[]> => {
  const sources = imageAddons
    .map((addon) => resolveAddonSource(addon))
    .filter((source): source is string => Boolean(source));
  if (sources.length === 0) return [];

  const limitedSources = openAiGuards ? sources.slice(0, OPENAI_MAX_IMAGES) : sources;
  const parts: ChatCompletionContentPart[] = [];
  let totalBytes = 0;

  for (const source of limitedSources) {
    const loaded = await readImageDataUrl(source);
    if (!loaded) continue;
    if (openAiGuards && loaded.size > OPENAI_MAX_IMAGE_BASE64_BYTES) {
      continue;
    }
    if (openAiGuards) {
      totalBytes += loaded.dataUrl.length;
      if (totalBytes > OPENAI_MAX_TOTAL_IMAGE_BASE64_BYTES) break;
    }
    parts.push({
      type: 'image_url',
      image_url: { url: loaded.dataUrl },
    });
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

const buildSystemPrompt = (basePrompt: string): string => {
  const lines = [
    basePrompt.trim(),
    'You analyze Kangur UI screenshots against the documentation context.',
    'Return a JSON object with keys: summary, highlights, docUpdates.',
    'summary: short paragraph describing visible changes or notable UI details.',
    'highlights: array of short bullet sentences.',
    'docUpdates: array of objects { docPath, section, proposedText, reason }.',
    'Use docPath values that exist under /docs/kangur when possible.',
    'If you are not confident about a doc update, return an empty docUpdates array.',
  ].filter(Boolean);
  return lines.join('\n');
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
        'Kangur Social Visual Analysis model is missing. Configure it in AI Brain.'
      );
    }

    const vendor = inferBrainModelVendor(modelId);
    if (vendor !== 'openai' && vendor !== 'ollama') {
      throw configurationError(
        'Visual analysis requires an OpenAI or Ollama-compatible multimodal model.'
      );
    }

    const systemPrompt = buildSystemPrompt(brainConfig.systemPrompt ?? '');
    const userPromptLines = [
      'Documentation context:',
      '',
      context,
      '',
      'Captured screenshots:',
      ...imageAddons.map((addon, index) => {
        const label = addon.title?.trim() || `Screenshot ${index + 1}`;
        const source = addon.sourceUrl?.trim();
        return `- ${label}${source ? ` (${source})` : ''}`;
      }),
    ];
    if (notes) {
      userPromptLines.push('', 'Additional notes:', notes);
    }

    const content: ChatCompletionContentPart[] = [
      { type: 'text', text: userPromptLines.join('\n') },
    ];
    const imageParts = await buildImageParts(imageAddons, vendor === 'openai');
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
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'kangur.social-posts.visual-analysis',
        action: 'parseResponse',
        modelId,
      });
      parsed = {};
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

    void ErrorSystem.logInfo('Kangur social visuals analyzed', {
      service: 'kangur.social-posts.visual-analysis',
      durationMs: Date.now() - startedAt,
      modelId,
      imageAddonCount: imageAddons.length,
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
