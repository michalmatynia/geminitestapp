import 'server-only';

import { configurationError, operationFailedError } from '@/shared/errors/app-error';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import {
  buildKangurSocialPostCombinedBody,
  type KangurSocialGeneratedDraft,
  type KangurSocialVisualAnalysis,
} from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import {
  buildKangurDocContext,
  resolveKangurDocReferences,
  type KangurDocEntry,
} from './social-posts-docs';
import { analyzeKangurSocialVisuals } from './social-posts-vision';

type GenerationInput = {
  docReferences?: string[];
  notes?: string;
  modelId?: string;
  visionModelId?: string;
  imageAddons?: KangurSocialImageAddon[];
  projectUrl?: string;
  prefetchedVisualAnalysis?: KangurSocialVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
};

type GenerationContext = {
  docReferences: string[];
  notes: string;
  notesLength: number;
  projectUrl: string;
  imageAddons: KangurSocialImageAddon[];
  imageAddonSummary: string;
  visionModelId: string;
  requireVisualAnalysisInBody: boolean;
};

type VisualAnalysisSnapshot = {
  visualSummary: string | null;
  visualHighlights: string[];
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
    'You are writing a LinkedIn post about recent StudiQ improvements.',
    'Generate bilingual content in Polish and English.',
    'Return a JSON object with keys: titlePl, titleEn, bodyPl, bodyEn.',
    'Keep each body concise and professional for LinkedIn.',
    'If image add-ons are provided, reference them naturally in the post.',
    'Treat the visual analysis as descriptive input only and consolidate it with the current documentation context to write the update.',
  ].filter(Boolean);
  return lines.join('\n');
};

const normalizeDocReferences = (docReferences: string[] | undefined): string[] =>
  (docReferences ?? []).map((ref) => ref.trim()).filter(Boolean);

const normalizeOptionalText = (value: string | undefined): string => value?.trim() ?? '';

const resolveImageAddons = (
  imageAddons: KangurSocialImageAddon[] | undefined
): KangurSocialImageAddon[] => imageAddons ?? [];

const normalizeGenerationInput = (input: GenerationInput): GenerationContext => {
  const docReferences = normalizeDocReferences(input.docReferences);
  const notes = normalizeOptionalText(input.notes);
  const projectUrl = normalizeOptionalText(input.projectUrl);
  const imageAddons = resolveImageAddons(input.imageAddons);

  return {
    docReferences,
    notes,
    notesLength: notes.length,
    projectUrl,
    imageAddons,
    imageAddonSummary: buildImageAddonSummary(imageAddons),
    visionModelId: normalizeOptionalText(input.visionModelId),
    requireVisualAnalysisInBody: Boolean(input.requireVisualAnalysisInBody),
  };
};

const createEmptyVisualAnalysisSnapshot = (): VisualAnalysisSnapshot => ({
  visualSummary: null,
  visualHighlights: [],
});

const normalizePrefetchedVisualAnalysis = (
  analysis: KangurSocialVisualAnalysis
): VisualAnalysisSnapshot => ({
  visualSummary: analysis.summary.trim() || null,
  visualHighlights: analysis.highlights,
});

const runVisualAnalysisSafely = async ({
  context,
  startedAt,
}: {
  context: GenerationContext;
  startedAt: number;
}): Promise<VisualAnalysisSnapshot> => {
  if (context.imageAddons.length === 0) {
    return createEmptyVisualAnalysisSnapshot();
  }

  try {
    const analysis = await analyzeKangurSocialVisuals({
      modelId: context.visionModelId || undefined,
      imageAddons: context.imageAddons,
    });

    return {
      visualSummary: analysis.summary || null,
      visualHighlights: analysis.highlights,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.generate',
      action: 'visualAnalysis',
      durationMs: Date.now() - startedAt,
      modelId: context.visionModelId || null,
      imageAddonCount: context.imageAddons.length,
    });
    return createEmptyVisualAnalysisSnapshot();
  }
};

const pushPromptSection = (
  userPromptLines: string[],
  heading: string,
  value: string | string[] | null | undefined
): void => {
  if (!value) return;

  const lines = Array.isArray(value) ? value.filter(Boolean) : [value];
  if (lines.length === 0) return;
  userPromptLines.push('', heading, ...lines);
};

const buildUserPromptLines = ({
  context,
  docsContext,
  visualAnalysis,
}: {
  context: GenerationContext;
  docsContext: string;
  visualAnalysis: VisualAnalysisSnapshot;
}): string[] => {
  const userPromptLines = [
    'Use the following documentation summary and excerpts together with the visual analysis to craft the post:',
    '',
    docsContext,
  ];

  pushPromptSection(
    userPromptLines,
    'Visual analysis summary from the prior image-only pass:',
    visualAnalysis.visualSummary
  );
  pushPromptSection(
    userPromptLines,
    'Visual highlights:',
    visualAnalysis.visualHighlights.map((item) => `- ${item}`)
  );
  if (
    context.requireVisualAnalysisInBody &&
    (visualAnalysis.visualSummary || visualAnalysis.visualHighlights.length > 0)
  ) {
    pushPromptSection(
      userPromptLines,
      'Important requirement:',
      'Both the Polish and English post bodies must explicitly mention the visual analysis findings or visible UI changes.'
    );
  }
  pushPromptSection(
    userPromptLines,
    'Visual add-ons available for the post:',
    context.imageAddonSummary
  );
  pushPromptSection(userPromptLines, 'Project URL to reference in the post:', context.projectUrl);
  pushPromptSection(userPromptLines, 'Additional notes:', context.notes);

  return userPromptLines;
};

const parseBrainDraftResponse = (text: string): Partial<KangurSocialGeneratedDraft> => {
  try {
    return JSON.parse(text) as Partial<KangurSocialGeneratedDraft>;
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as Partial<KangurSocialGeneratedDraft>;
      } catch {
        return {};
      }
    }

    const raw = text.trim();
    if (!raw) {
      return {};
    }

    return { bodyPl: raw, bodyEn: raw };
  }
};

const normalizeDraftFields = (parsed: Partial<KangurSocialGeneratedDraft>) => ({
  titlePl: (parsed.titlePl ?? '').trim(),
  titleEn: (parsed.titleEn ?? '').trim(),
  bodyPl: (parsed.bodyPl ?? '').trim(),
  bodyEn: (parsed.bodyEn ?? '').trim(),
});

const assertDraftBodyExists = ({
  bodyPl,
  bodyEn,
}: {
  bodyPl: string;
  bodyEn: string;
}): void => {
  if (bodyPl || bodyEn) return;
  throw operationFailedError(
    'The model returned an empty draft. Check your AI Brain routing for kangur_social.post_generation or try a different model.'
  );
};

const resolveRequestedModelId = (overrideModelId: string, fallbackModelId: string): string =>
  overrideModelId || fallbackModelId.trim();

const logDraftGenerationSuccess = ({
  startedAt,
  modelId,
  context,
  docs,
  draft,
  visualAnalysis,
}: {
  startedAt: number;
  modelId: string;
  context: GenerationContext;
  docs: KangurDocEntry[];
  draft: KangurSocialGeneratedDraft;
  visualAnalysis: VisualAnalysisSnapshot;
}): void => {
  void ErrorSystem.logInfo('Kangur social post draft generated', {
    service: 'kangur.social-posts.generate',
    durationMs: Date.now() - startedAt,
    modelId,
    visionModelId: context.visionModelId || null,
    docReferenceCount: context.docReferences.length,
    resolvedDocCount: docs.length,
    usedDocReferenceCount: draft.docReferences.length,
    imageAddonCount: context.imageAddons.length,
    visualHighlightCount: visualAnalysis.visualHighlights.length,
    notesLength: context.notesLength,
  });
};

const logDraftGenerationFailure = ({
  error,
  startedAt,
  modelId,
  context,
  docs,
}: {
  error: unknown;
  startedAt: number;
  modelId: string;
  context: GenerationContext;
  docs: KangurDocEntry[];
}): void => {
  void ErrorSystem.captureException(error, {
    service: 'kangur.social-posts.generate',
    action: 'generateDraft',
    durationMs: Date.now() - startedAt,
    modelId: modelId || null,
    visionModelId: context.visionModelId || null,
    docReferenceCount: context.docReferences.length,
    resolvedDocCount: docs.length,
    imageAddonCount: context.imageAddons.length,
    notesLength: context.notesLength,
  });
};

export async function generateKangurSocialPostDraft(
  input: GenerationInput
): Promise<KangurSocialGeneratedDraft> {
  const startedAt = Date.now();
  const generationContext = normalizeGenerationInput(input);
  const docs = resolveKangurDocReferences(generationContext.docReferences);
  const { summary, context: docsContext } = await buildKangurDocContext(docs);
  let modelId = '';

  try {
    const overrideModelId = input.modelId?.trim() ?? '';
    const visualAnalysis = input.prefetchedVisualAnalysis
      ? normalizePrefetchedVisualAnalysis(input.prefetchedVisualAnalysis)
      : await runVisualAnalysisSafely({
          context: generationContext,
          startedAt,
        });
    const brainConfig = await resolveBrainExecutionConfigForCapability(
      'kangur_social.post_generation',
      {
        defaultTemperature: 0.6,
        defaultMaxTokens: 900,
        defaultModelId: overrideModelId,
        runtimeKind: 'chat',
      }
    );
    modelId = resolveRequestedModelId(overrideModelId, brainConfig.modelId);
    if (!modelId) {
      throw configurationError(
        'StudiQ Social Post Generation model is missing. Configure it in AI Brain.'
      );
    }

    const systemPrompt = buildSystemPrompt(brainConfig.systemPrompt ?? '');
    const userPromptLines = buildUserPromptLines({
      context: generationContext,
      docsContext,
      visualAnalysis,
    });

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

    const parsed = parseBrainDraftResponse(res.text);
    const { titlePl, titleEn, bodyPl, bodyEn } = normalizeDraftFields(parsed);
    assertDraftBodyExists({ bodyPl, bodyEn });

    const combinedBody = buildKangurSocialPostCombinedBody(bodyPl, bodyEn);

    const draft: KangurSocialGeneratedDraft = {
      titlePl,
      titleEn,
      bodyPl,
      bodyEn,
      combinedBody,
      summary,
      docReferences:
        generationContext.docReferences.length > 0
          ? generationContext.docReferences
          : docs.map((doc) => doc.id),
      visualSummary: visualAnalysis.visualSummary,
      visualHighlights: visualAnalysis.visualHighlights,
    };

    logDraftGenerationSuccess({
      startedAt,
      modelId,
      context: generationContext,
      docs,
      draft,
      visualAnalysis,
    });

    return draft;
  } catch (error) {
    logDraftGenerationFailure({
      error,
      startedAt,
      modelId,
      context: generationContext,
      docs,
    });
    throw error;
  }
}
