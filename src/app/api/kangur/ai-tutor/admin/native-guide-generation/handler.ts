import 'server-only';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  resolveBrainExecutionConfigForCapability,
} from '@/shared/lib/ai-brain/server';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { kangurAiTutorNativeGuideEntrySchema } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { kangurAiTutorSurfaceSchema } from '@/shared/contracts/kangur-ai-tutor';

const NATIVE_GUIDE_GENERATION_CAPABILITY = 'kangur_ai_tutor.chat';

const generateNativeGuideRequestSchema = z.object({
  surface: kangurAiTutorSurfaceSchema.optional(),
  focusKind: z.string().trim().max(120).optional(),
  contentTitle: z.string().trim().min(1).max(200),
  contentDescription: z.string().trim().min(1).max(1000),
  targetAgeGroup: z.string().trim().max(60).optional(),
  mathTopics: z.array(z.string().trim().max(120)).max(5).default([]),
});

type GenerateNativeGuideRequest = z.infer<typeof generateNativeGuideRequestSchema>;

interface GeneratedGuideEntry {
  title: string;
  shortDescription: string;
  fullDescription: string;
  hints: string[];
  triggerPhrases: string[];
}

const buildGuideGenerationPrompt = (input: GenerateNativeGuideRequest): string => [
  'You are a tutor content expert. Generate a native guide entry for the Kangur AI Tutor.',
  '',
  'Context:',
  `- Surface: ${input.surface || 'lesson'}`,
  `- Content Title: "${input.contentTitle}"`,
  `- Content Description: ${input.contentDescription}`,
  ...(input.focusKind ? [`- Focus Kind: ${input.focusKind}`] : []),
  ...(input.mathTopics.length > 0 ? [`- Math Topics: ${input.mathTopics.join(', ')}`] : []),
  ...(input.targetAgeGroup ? [`- Target Age: ${input.targetAgeGroup}`] : []),
  '',
  'Generate a guide entry in JSON format:',
  '{',
  '  "title": "Short, clear title (max 120 chars)",',
  '  "shortDescription": "Brief overview for the learner (max 240 chars)",',
  '  "fullDescription": "Detailed explanation in Polish, encouraging exploration (max 1200 chars)",',
  '  "hints": ["Hint 1 (max 240 chars)", "Hint 2", ...],  // 3-5 hints that guide without solving',
  '  "triggerPhrases": ["Common learner question pattern", ...]  // Phrases that should trigger this guide',
  '}',
  '',
  'Generate the JSON directly, no markdown code blocks. All text must be in Polish.',
].join('\n');

const parseGeneratedGuideJson = (text: string): GeneratedGuideEntry | null => {
  try {
    // Remove any markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleaned) as Partial<GeneratedGuideEntry>;

    // Validate required fields
    if (!parsed.title || !parsed.shortDescription || !parsed.fullDescription) {
      return null;
    }

    return {
      title: parsed.title,
      shortDescription: parsed.shortDescription,
      fullDescription: parsed.fullDescription,
      hints: Array.isArray(parsed.hints) ? parsed.hints : [],
      triggerPhrases: Array.isArray(parsed.triggerPhrases) ? parsed.triggerPhrases : [],
    };
  } catch {
    return null;
  }
};

export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  void requireActiveLearner(actor);

  const parsed = await parseJsonBody(req, generateNativeGuideRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const input = parsed.data;

  try {
    const brainConfig = await resolveBrainExecutionConfigForCapability(
      NATIVE_GUIDE_GENERATION_CAPABILITY,
      {
        defaultTemperature: 0.5,
        defaultMaxTokens: 1200,
        defaultSystemPrompt:
          'You are a Polish math tutor guide writer. Generate helpful, encouraging guide entries that guide learners without solving problems for them.',
        runtimeKind: 'chat',
      }
    );

    const prompt = buildGuideGenerationPrompt(input);
    const res = await runBrainChatCompletion({
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
          content: prompt,
        },
      ],
    });

    const generatedGuide = parseGeneratedGuideJson(res.text);
    if (!generatedGuide) {
      await logKangurServerEvent({
        source: 'kangur.ai-tutor.native-guide-generation.parse-failed',
        service: 'kangur.ai-tutor',
        message: 'Failed to parse AI-generated native guide entry.',
        level: 'warn',
        request: req,
        requestContext: ctx,
        actor,
        statusCode: 500,
        context: {
          contentTitle: input.contentTitle,
          focusKind: input.focusKind,
        },
      });
      return NextResponse.json(
        {
          error: 'Failed to generate guide entry. Please try again or refine the content description.',
          success: false,
        },
        { status: 500 }
      );
    }

    // Build a minimal native guide entry structure for admin approval
    const draftEntry: Partial<KangurAiTutorNativeGuideEntry> = {
      id: `generated-${Date.now()}`,
      surface: input.surface ?? null,
      title: generatedGuide.title,
      shortDescription: generatedGuide.shortDescription,
      fullDescription: generatedGuide.fullDescription,
      hints: generatedGuide.hints.slice(0, 8),
      triggerPhrases: generatedGuide.triggerPhrases.slice(0, 16),
      enabled: false, // Start disabled, admin must review and enable
      sortOrder: 0,
    };

    // Validate against schema to ensure it's valid
    try {
      kangurAiTutorNativeGuideEntrySchema.parse(draftEntry);
    } catch (validationError) {
      await logKangurServerEvent({
        source: 'kangur.ai-tutor.native-guide-generation.validation-failed',
        service: 'kangur.ai-tutor',
        message: 'Generated guide entry failed validation.',
        level: 'warn',
        request: req,
        requestContext: ctx,
        actor,
        statusCode: 500,
        context: {
          contentTitle: input.contentTitle,
          validationError: String(validationError),
        },
      });
      return NextResponse.json(
        {
          error: 'Generated entry failed validation. The AI response may need adjustment.',
          success: false,
        },
        { status: 500 }
      );
    }

    await logKangurServerEvent({
      source: 'kangur.ai-tutor.native-guide-generation.completed',
      service: 'kangur.ai-tutor',
      message: 'AI-assisted native guide entry generated successfully.',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        contentTitle: input.contentTitle,
        focusKind: input.focusKind,
        generatedTitle: generatedGuide.title,
        hintCount: generatedGuide.hints.length,
        triggerPhraseCount: generatedGuide.triggerPhrases.length,
      },
    });

    return NextResponse.json(
      {
        success: true,
        draft: draftEntry,
        note: 'Generated entry is disabled by default. Admin must review, edit, and enable.',
      },
      { status: 200 }
    );
  } catch (error) {
    void ErrorSystem.captureException(error);
    await logKangurServerEvent({
      source: 'kangur.ai-tutor.native-guide-generation.error',
      service: 'kangur.ai-tutor',
      message: 'Error during native guide generation.',
      level: 'error',
      request: req,
      requestContext: ctx,
      actor,
      error,
      statusCode: 500,
      context: {
        contentTitle: input.contentTitle,
        focusKind: input.focusKind,
      },
    });
    throw badRequestError('Failed to generate native guide entry.');
  }
}
