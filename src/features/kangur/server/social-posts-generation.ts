import 'server-only';

import { configurationError } from '@/shared/errors/app-error';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import {
  buildKangurSocialPostCombinedBody,
  type KangurSocialDocUpdate,
} from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { buildKangurDocContext, resolveKangurDocReferences } from './social-posts-docs';
import { analyzeKangurSocialVisuals } from './social-posts-vision';

export type KangurSocialPostDraft = {
  titlePl: string;
  titleEn: string;
  bodyPl: string;
  bodyEn: string;
  combinedBody: string;
  summary: string;
  docReferences: string[];
  visualSummary: string | null;
  visualHighlights: string[];
  visualDocUpdates: KangurSocialDocUpdate[];
};

type GenerationInput = {
  docReferences?: string[];
  notes?: string;
  modelId?: string;
  visionModelId?: string;
  imageAddons?: KangurSocialImageAddon[];
};

const buildImageAddonSummary = (addons: KangurSocialImageAddon[]): string => {
  if (addons.length === 0) return '';
  return addons
    .map((addon) => {
      const title = addon.title.trim() || 'Image add-on';
      const description = addon.description?.trim();
      const sourceUrl = addon.sourceUrl?.trim();
      const parts = [title];
      if (description) parts.push(description);
      if (sourceUrl) parts.push(`Source: ${sourceUrl}`);
      return `- ${parts.join(' — ')}`;
    })
    .join('\n');
};

const buildSystemPrompt = (basePrompt: string): string => {
  const lines = [
    basePrompt.trim(),
    'You are writing a LinkedIn post about recent Kangur and StudiQ improvements.',
    'Generate bilingual content in Polish and English.',
    'Return a JSON object with keys: titlePl, titleEn, bodyPl, bodyEn.',
    'Keep each body concise and professional for LinkedIn.',
    'If image add-ons are provided, reference them naturally in the post.',
  ].filter(Boolean);
  return lines.join('\n');
};

export async function generateKangurSocialPostDraft(
  input: GenerationInput
): Promise<KangurSocialPostDraft> {
  const startedAt = Date.now();
  const docReferences = (input.docReferences ?? []).map((ref) => ref.trim()).filter(Boolean);
  const docs = resolveKangurDocReferences(docReferences);
  const { summary, context } = await buildKangurDocContext(docs);
  const notes = input.notes?.trim() ?? '';
  const imageAddons = input.imageAddons ?? [];
  const imageAddonSummary = buildImageAddonSummary(imageAddons);
  const notesLength = notes.length;
  const visionModelId = input.visionModelId?.trim() ?? '';
  let modelId = '';

  try {
    let visualSummary: string | null = null;
    let visualHighlights: string[] = [];
    let visualDocUpdates: KangurSocialDocUpdate[] = [];

    if (imageAddons.length > 0) {
      try {
        const analysis = await analyzeKangurSocialVisuals({
          docReferences,
          notes,
          modelId: visionModelId || undefined,
          imageAddons,
        });
        visualSummary = analysis.summary || null;
        visualHighlights = analysis.highlights;
        visualDocUpdates = analysis.docUpdates;
      } catch (error) {
        void ErrorSystem.captureException(error, {
          service: 'kangur.social-posts.generate',
          action: 'visualAnalysis',
          durationMs: Date.now() - startedAt,
          modelId: visionModelId || null,
          imageAddonCount: imageAddons.length,
        });
      }
    }

    const overrideModelId = input.modelId?.trim() ?? '';
    const brainConfig = await resolveBrainExecutionConfigForCapability(
      'kangur_social.post_generation',
      {
        defaultTemperature: 0.6,
        defaultMaxTokens: 900,
        defaultModelId: overrideModelId,
        runtimeKind: 'chat',
      }
    );
    modelId = overrideModelId || brainConfig.modelId.trim();
    if (!modelId) {
      throw configurationError(
        'Kangur Social Post Generation model is missing. Configure it in AI Brain.'
      );
    }

    const systemPrompt = buildSystemPrompt(brainConfig.systemPrompt ?? '');
    const userPromptLines = [
      'Use the following documentation summary and excerpts to craft the post:',
      '',
      context,
    ];
    if (visualSummary) {
      userPromptLines.push('', 'Visual analysis summary:', visualSummary);
    }
    if (visualHighlights.length > 0) {
      userPromptLines.push(
        '',
        'Visual highlights:',
        visualHighlights.map((item) => `- ${item}`).join('\n')
      );
    }
    if (visualDocUpdates.length > 0) {
      userPromptLines.push(
        '',
        'Documentation updates suggested from visuals:',
        visualDocUpdates
          .map((update) => {
            const section = update.section?.trim();
            const header = section ? `${update.docPath} (${section})` : update.docPath;
            const proposed = update.proposedText?.trim();
            return `- ${header}${proposed ? `: ${proposed}` : ''}`;
          })
          .join('\n')
      );
    }
    if (imageAddonSummary) {
      userPromptLines.push('', 'Visual add-ons available for the post:', imageAddonSummary);
    }
    if (notes) {
      userPromptLines.push('', 'Additional notes:', notes);
    }

    const res = await runBrainChatCompletion({
      modelId,
      temperature: brainConfig.temperature,
      maxTokens: brainConfig.maxTokens,
      jsonMode: supportsBrainJsonMode(modelId),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPromptLines.join('\n') },
      ],
    });

    let parsed: Partial<KangurSocialPostDraft> = {};
    try {
      parsed = JSON.parse(res.text) as Partial<KangurSocialPostDraft>;
    } catch {
      // Models (especially Ollama) often wrap JSON in markdown fences or
      // return free-form text. Try to extract JSON from the response first,
      // then fall back to using the raw text as body content.
      const jsonMatch = res.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch?.[1]) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim()) as Partial<KangurSocialPostDraft>;
        } catch {
          parsed = {};
        }
      }
      // If still empty, use the raw response as body content so the user
      // gets something to edit rather than completely empty fields.
      if (!parsed.titlePl && !parsed.bodyPl && !parsed.bodyEn) {
        const raw = res.text.trim();
        if (raw.length > 0) {
          parsed = { bodyPl: raw, bodyEn: raw };
        }
      }
    }

    const titlePl = (parsed.titlePl ?? '').trim();
    const titleEn = (parsed.titleEn ?? '').trim();
    const bodyPl = (parsed.bodyPl ?? '').trim();
    const bodyEn = (parsed.bodyEn ?? '').trim();
    const combinedBody = buildKangurSocialPostCombinedBody(bodyPl, bodyEn);

    const draft: KangurSocialPostDraft = {
      titlePl,
      titleEn,
      bodyPl,
      bodyEn,
      combinedBody,
      summary,
      docReferences: docReferences.length > 0 ? docReferences : docs.map((doc) => doc.id),
      visualSummary,
      visualHighlights,
      visualDocUpdates,
    };

    void ErrorSystem.logInfo('Kangur social post draft generated', {
      service: 'kangur.social-posts.generate',
      durationMs: Date.now() - startedAt,
      modelId,
      visionModelId: visionModelId || null,
      docReferenceCount: docReferences.length,
      resolvedDocCount: docs.length,
      usedDocReferenceCount: draft.docReferences.length,
      imageAddonCount: imageAddons.length,
      visualHighlightCount: visualHighlights.length,
      visualDocUpdateCount: visualDocUpdates.length,
      notesLength,
    });

    return draft;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.generate',
      action: 'generateDraft',
      durationMs: Date.now() - startedAt,
      modelId: modelId || null,
      visionModelId: visionModelId || null,
      docReferenceCount: docReferences.length,
      resolvedDocCount: docs.length,
      imageAddonCount: imageAddons.length,
      notesLength,
    });
    throw error;
  }
}
