import 'server-only';

import type { KangurAiTutorConversationContext, KangurAiTutorMessageArtifact } from '@/shared/contracts/kangur-ai-tutor';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { sanitizeSvg } from '@/shared/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KANGUR_AI_TUTOR_DRAWING_ANALYSIS_BRAIN_CAPABILITY = 'kangur_ai_tutor.drawing_analysis';

const KANGUR_TUTOR_DRAWING_BLOCK_PATTERN =
  /<kangur_tutor_drawing>([\s\S]*?)<\/kangur_tutor_drawing>/i;
const KANGUR_TUTOR_DRAWING_TITLE_PATTERN = /<title>([\s\S]*?)<\/title>/i;
const KANGUR_TUTOR_DRAWING_CAPTION_PATTERN = /<caption>([\s\S]*?)<\/caption>/i;
const KANGUR_TUTOR_DRAWING_ALT_PATTERN = /<alt>([\s\S]*?)<\/alt>/i;
const KANGUR_TUTOR_DRAWING_REQUEST_PATTERN =
  /\b(narysuj|rysuj|rysunek|szkic|schemat|diagram|pokaz .*rysun|pokaz .*schemat)\b/i;

// JSON schema for structured drawing output (when model supports JSON mode)
export const KANGUR_TUTOR_DRAWING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      description: 'Main tutor response text in Polish',
    },
    drawing: {
      type: 'object',
      description: 'Optional drawing with SVG',
      properties: {
        title: { type: 'string', description: 'Short title in Polish (max 120 chars)' },
        caption: { type: 'string', description: 'Brief explanation in Polish (max 240 chars)' },
        alt: { type: 'string', description: 'Accessibility description in Polish (max 160 chars)' },
        svg: { type: 'string', description: 'SVG XML content (no script/style/external refs)' },
      },
      required: ['svg'],
      additionalProperties: false,
    },
  },
  required: ['message'],
  additionalProperties: false,
};

// ---------------------------------------------------------------------------
// Text normalization
// ---------------------------------------------------------------------------

const normalizeDrawingText = (
  value: string | null | undefined,
  maxLength: number
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.length > maxLength ? normalized.slice(0, maxLength).trimEnd() : normalized;
};

const extractTaggedTutorDrawingText = (
  value: string,
  pattern: RegExp,
  maxLength: number
): string | undefined => normalizeDrawingText(value.match(pattern)?.[1] ?? null, maxLength);

// ---------------------------------------------------------------------------
// Drawing support detection
// ---------------------------------------------------------------------------

export const shouldEnableTutorDrawingSupport = (input: {
  context: KangurAiTutorConversationContext | undefined;
  latestUserMessage: string | null;
  messages: Array<{
    role: string;
    artifacts?: KangurAiTutorMessageArtifact[];
  }>;
}): boolean => {
  const latestUserDrawingArtifact = [...input.messages]
    .reverse()
    .find(
      (message) =>
        message.role === 'user' &&
        message.artifacts?.some((artifact) => artifact.type === 'user_drawing')
    );

  return (
    Boolean(latestUserDrawingArtifact) ||
    input.context?.promptMode === 'explain' ||
    input.context?.promptMode === 'selected_text' ||
    input.context?.interactionIntent === 'explain' ||
    Boolean(
      input.latestUserMessage &&
        KANGUR_TUTOR_DRAWING_REQUEST_PATTERN.test(input.latestUserMessage)
    )
  );
};

// ---------------------------------------------------------------------------
// Drawing instruction builder
// ---------------------------------------------------------------------------

export const buildTutorDrawingInstructions = (): string =>
  [
    'Drawing support: when a tiny visual sketch would clearly help, append exactly one optional drawing block after the normal text reply.',
    'Always keep the normal tutor text outside the drawing block.',
    'Do not pretend to inspect learner-uploaded pixels. If the learner attached a drawing, use it only as a signal that a visual explanation may help.',
    'Use this exact format when you draw:',
    '<kangur_tutor_drawing>',
    '<title>Krótki tytuł po polsku</title>',
    '<caption>Jedno krótkie objaśnienie rysunku.</caption>',
    '<alt>Krótki opis dostępności.</alt>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">...</svg>',
    '</kangur_tutor_drawing>',
    'Use only simple SVG elements and inline attributes.',
    'Never use script, style, foreignObject, iframe, object, embed, external hrefs, or image tags.',
    'Keep the sketch child-friendly, large, and easy to read.',
  ].join('\n');

// ---------------------------------------------------------------------------
// Learner drawing analysis
// ---------------------------------------------------------------------------

const buildLearnerDrawingAnalysisPrompt = (input: {
  context: KangurAiTutorConversationContext | undefined;
  latestUserMessage: string | null;
}): string =>
  [
    'Analyze the attached learner drawing for a math tutor.',
    'Describe only visible math-relevant structure or spatial cues.',
    'Keep the analysis short, concrete, and in Polish.',
    'If the drawing is ambiguous, say what is uncertain.',
    'Do not solve the task.',
    ...(input.latestUserMessage ? [`Learner message: ${input.latestUserMessage}`] : []),
    ...(input.context?.selectedText
      ? [`Selected text: ${input.context.selectedText}`]
      : []),
    ...(input.context?.currentQuestion
      ? [`Current question: ${input.context.currentQuestion}`]
      : []),
    ...(input.context?.title ? [`Current title: ${input.context.title}`] : []),
  ].join('\n');

export const analyzeLearnerDrawingWithBrain = async (input: {
  drawingImageData: string;
  context: KangurAiTutorConversationContext | undefined;
  latestUserMessage: string | null;
}): Promise<string | null> => {
  const brainConfig = await resolveBrainExecutionConfigForCapability(
    KANGUR_AI_TUTOR_DRAWING_ANALYSIS_BRAIN_CAPABILITY,
    {
      defaultTemperature: 0.1,
      defaultMaxTokens: 220,
      defaultSystemPrompt:
        'You analyze learner sketches for the Kangur AI Tutor. Return only a short Polish summary of what is visually present and mathematically relevant.',
      runtimeKind: 'vision',
    }
  );

  const response = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    temperature: brainConfig.temperature,
    maxTokens: brainConfig.maxTokens,
    messages: [
      {
        role: 'system',
        content: brainConfig.systemPrompt,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildLearnerDrawingAnalysisPrompt({
              context: input.context,
              latestUserMessage: input.latestUserMessage,
            }),
          },
          {
            type: 'image_url',
            image_url: {
              url: input.drawingImageData,
            },
          },
        ],
      },
    ],
  });

  return normalizeDrawingText(response.text, 320) ?? null;
};

// ---------------------------------------------------------------------------
// JSON mode extraction
// ---------------------------------------------------------------------------

interface TutorDrawingJsonResponse {
  message: string;
  drawing?: {
    title?: string;
    caption?: string;
    alt?: string;
    svg: string;
  };
}

export const extractTutorDrawingArtifactsFromJson = (
  jsonText: string
): {
  message: string;
  artifacts: KangurAiTutorMessageArtifact[];
} => {
  try {
    const parsed: TutorDrawingJsonResponse = JSON.parse(jsonText);
    const artifacts: KangurAiTutorMessageArtifact[] = [];

    if (parsed.drawing?.svg) {
      const sanitizedSvg = sanitizeSvg(parsed.drawing.svg, { viewBox: '0 0 320 200' }).trim();
      if (sanitizedSvg) {
        artifacts.push({
          type: 'assistant_drawing',
          svgContent: sanitizedSvg,
          ...(parsed.drawing.title ? { title: normalizeDrawingText(parsed.drawing.title, 120) } : {}),
          ...(parsed.drawing.caption ? { caption: normalizeDrawingText(parsed.drawing.caption, 240) } : {}),
          ...(parsed.drawing.alt ? { alt: normalizeDrawingText(parsed.drawing.alt, 160) } : {}),
        });
      }
    }

    return {
      message: normalizeDrawingText(parsed.message, 4000) || 'Sprawdź szkic poniżej.',
      artifacts,
    };
  } catch {
    // JSON parsing failed: fall back to empty response
    return { message: '', artifacts: [] };
  }
};

// ---------------------------------------------------------------------------
// Response drawing artifact extraction
// ---------------------------------------------------------------------------

export const extractTutorDrawingArtifactsFromResponse = (
  value: string
): {
  message: string;
  artifacts: KangurAiTutorMessageArtifact[];
} => {
  const trimmed = value.trim();
  const match = trimmed.match(KANGUR_TUTOR_DRAWING_BLOCK_PATTERN);
  if (!match) {
    return { message: trimmed, artifacts: [] };
  }

  const drawingBlock = match[1] ?? '';
  const svgMatch = drawingBlock.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) {
    return {
      message: trimmed.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim(),
      artifacts: [],
    };
  }

  const metadataBlock = drawingBlock.replace(svgMatch[0], '');
  const sanitizedSvg = sanitizeSvg(svgMatch[0], { viewBox: '0 0 320 200' }).trim();
  const cleanedMessage = trimmed.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim();
  const artifacts: KangurAiTutorMessageArtifact[] = sanitizedSvg
    ? [
      {
        type: 'assistant_drawing',
        svgContent: sanitizedSvg,
        ...(extractTaggedTutorDrawingText(metadataBlock, KANGUR_TUTOR_DRAWING_TITLE_PATTERN, 120)
          ? {
            title: extractTaggedTutorDrawingText(
              metadataBlock,
              KANGUR_TUTOR_DRAWING_TITLE_PATTERN,
              120
            ),
          }
          : {}),
        ...(extractTaggedTutorDrawingText(
          metadataBlock,
          KANGUR_TUTOR_DRAWING_CAPTION_PATTERN,
          240
        )
          ? {
            caption: extractTaggedTutorDrawingText(
              metadataBlock,
              KANGUR_TUTOR_DRAWING_CAPTION_PATTERN,
              240
            ),
          }
          : {}),
        ...(extractTaggedTutorDrawingText(metadataBlock, KANGUR_TUTOR_DRAWING_ALT_PATTERN, 160)
          ? {
            alt: extractTaggedTutorDrawingText(
              metadataBlock,
              KANGUR_TUTOR_DRAWING_ALT_PATTERN,
              160
            ),
          }
          : {}),
      },
    ]
    : [];

  return {
    message: cleanedMessage || 'Sprawdź szkic poniżej.',
    artifacts,
  };
};
