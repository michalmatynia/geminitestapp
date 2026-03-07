import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { runTeachingChat } from '@/features/ai/agentcreator/teaching/server/chat';
import {
  parseKangurAiTutorSettings,
  getKangurAiTutorSettingsForLearner,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';
import { resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  AGENT_PERSONA_SETTINGS_KEY,
  type AgentPersona,
} from '@/shared/contracts/agents';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  resolveBrainExecutionConfigForCapability,
} from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  type BrainChatMessage,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { parseJsonSetting } from '@/shared/utils/settings-json';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const chatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  lessonContext: z.string().optional(),
});

const SOCRATIC_CONSTRAINT = [
  'You are a friendly AI tutor helping a child (age 6–12) learn.',
  'IMPORTANT RULES:',
  '- NEVER give direct answers to exercises or problems.',
  '- Instead, ask guiding questions or provide process hints.',
  '- Acknowledge what the child says correctly.',
  '- Keep responses short and encouraging.',
  '- If the child is stuck, hint at the next thinking step, not the answer.',
].join('\n');

const resolvePersonaInstructions = async (agentPersonaId: string | null): Promise<string> => {
  if (!agentPersonaId) return '';
  try {
    const raw = await readStoredSettingValue(AGENT_PERSONA_SETTINGS_KEY);
    const personas = parseJsonSetting<AgentPersona[]>(raw, []);
    const persona = personas.find((p) => p.id === agentPersonaId);
    if (!persona) return '';
    const parts: string[] = [];
    if (persona.name) parts.push(`You are ${persona.name}.`);
    if (persona.role) parts.push(`Role: ${persona.role}.`);
    if (persona.instructions) parts.push(persona.instructions.trim());
    return parts.join('\n');
  } catch {
    return '';
  }
};

export async function postKangurAiTutorChatHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learnerId = actor.activeLearner.id;

  const parsed = await parseJsonBody(req, chatSchema, {
    logPrefix: 'kangur.ai-tutor.chat.POST',
  });
  if (!parsed.ok) return parsed.response;

  const { messages, lessonContext } = parsed.data;

  const rawSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStore = parseKangurAiTutorSettings(rawSettings);
  const tutorSettings = getKangurAiTutorSettingsForLearner(settingsStore, learnerId);

  if (!tutorSettings.enabled) {
    throw badRequestError('AI tutor is not enabled for this learner.');
  }

  const personaInstructions = await resolvePersonaInstructions(tutorSettings.agentPersonaId);

  const systemParts: string[] = [SOCRATIC_CONSTRAINT];
  if (personaInstructions) systemParts.push(personaInstructions);
  if (lessonContext) systemParts.push(`Current lesson context: ${lessonContext}`);
  const systemPrompt = systemParts.join('\n\n');

  const sessionId = `kangur-ai-tutor:${learnerId}`;
  const baseTimestamp = new Date().toISOString();
  const chatMessages: ChatMessage[] = messages.map((message, index) => ({
    id: `${sessionId}:message:${index}`,
    sessionId,
    role: message.role,
    content: message.content,
    timestamp: baseTimestamp,
  }));

  if (tutorSettings.teachingAgentId) {
    // Use RAG-backed teaching agent — inject system prompt as first message
    const augmentedMessages: ChatMessage[] = [
      {
        id: `${sessionId}:system`,
        sessionId,
        role: 'system',
        content: systemPrompt,
        timestamp: baseTimestamp,
      },
      ...chatMessages.filter((m) => m.role !== 'system'),
    ];
    const result = await runTeachingChat({
      agentId: tutorSettings.teachingAgentId,
      messages: augmentedMessages,
    });
    return NextResponse.json(result);
  }

  // Fallback: direct Brain call with agent_teaching.chat capability
  const brainConfig = await resolveBrainExecutionConfigForCapability('agent_teaching.chat', {
    defaultTemperature: 0.4,
    defaultMaxTokens: 600,
    runtimeKind: 'chat',
  });

  const combinedSystemPrompt = [brainConfig.systemPrompt.trim(), systemPrompt]
    .filter(Boolean)
    .join('\n\n');

  const res = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    temperature: brainConfig.temperature,
    maxTokens: brainConfig.maxTokens,
    messages: [
      { role: 'system', content: combinedSystemPrompt },
      ...(chatMessages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })) as BrainChatMessage[]),
    ],
  });

  return NextResponse.json({ message: res.text.trim(), sources: [] });
}
