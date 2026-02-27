import 'dotenv/config';

import prisma from '@/shared/lib/db/prisma';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import {
  AI_BRAIN_SETTINGS_KEY,
  parseBrainSettings,
  sanitizeBrainAssignment,
  defaultBrainAssignment,
} from '@/features/ai/brain/settings';
import type { AiBrainSettings } from '@/shared/contracts/ai-brain';
import type { ChatbotSettingsDto as ChatbotSettings } from '@/shared/contracts/chatbot';

type CliOptions = {
  dryRun: boolean;
};

type SettingDoc = {
  _id?: string;
  key?: string;
  value?: string;
};

const CHATBOT_SETTINGS_KEY = 'default';

const parseArgs = (argv: string[]): CliOptions => ({
  dryRun: !argv.includes('--write'),
});

const readBrainSettings = async (): Promise<AiBrainSettings> => {
  const provider = await getAppDbProvider().catch(() => 'prisma' as const);

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection<SettingDoc>('settings').findOne({
      $or: [{ _id: AI_BRAIN_SETTINGS_KEY }, { key: AI_BRAIN_SETTINGS_KEY }],
    });
    return parseBrainSettings(doc?.value ?? null);
  }

  if (!('setting' in prisma)) {
    return parseBrainSettings(null);
  }

  const setting = await prisma.setting.findUnique({
    where: { key: AI_BRAIN_SETTINGS_KEY },
    select: { value: true },
  });
  return parseBrainSettings(setting?.value ?? null);
};

const readChatbotSettings = async (): Promise<ChatbotSettings | null> => {
  if (!('chatbotSettings' in prisma)) {
    return null;
  }

  const row = await prisma.chatbotSettings.findUnique({
    where: { key: CHATBOT_SETTINGS_KEY },
    select: { settings: true },
  });

  if (!row || !row.settings || typeof row.settings !== 'object' || Array.isArray(row.settings)) {
    return null;
  }

  return row.settings as unknown as ChatbotSettings;
};

const writeBrainSettings = async (settings: AiBrainSettings): Promise<void> => {
  const value = JSON.stringify(settings);
  const provider = await getAppDbProvider();

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').updateOne(
      {
        $or: [{ _id: AI_BRAIN_SETTINGS_KEY }, { key: AI_BRAIN_SETTINGS_KEY }],
      },
      {
        $set: {
          key: AI_BRAIN_SETTINGS_KEY,
          value,
        },
        $setOnInsert: {
          _id: AI_BRAIN_SETTINGS_KEY,
        },
      },
      { upsert: true },
    );
    return;
  }

  if (!('setting' in prisma)) {
    throw new Error('Prisma settings model is unavailable.');
  }

  await prisma.setting.upsert({
    where: { key: AI_BRAIN_SETTINGS_KEY },
    update: { value },
    create: { key: AI_BRAIN_SETTINGS_KEY, value },
  });
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const [currentBrainSettings, chatbotSettings] = await Promise.all([
    readBrainSettings(),
    readChatbotSettings(),
  ]);

  const currentAssignment =
    currentBrainSettings.assignments.chatbot ??
    currentBrainSettings.defaults ??
    defaultBrainAssignment;

  const resolvedModelId =
    chatbotSettings?.defaultModelId?.trim() ||
    chatbotSettings?.model?.trim() ||
    currentAssignment.modelId ||
    '';

  const nextAssignment = sanitizeBrainAssignment({
    ...currentAssignment,
    enabled: currentAssignment.enabled ?? true,
    provider: 'model',
    modelId: resolvedModelId,
    temperature:
      typeof chatbotSettings?.temperature === 'number'
        ? chatbotSettings.temperature
        : currentAssignment.temperature,
    maxTokens:
      typeof chatbotSettings?.maxTokens === 'number'
        ? chatbotSettings.maxTokens
        : currentAssignment.maxTokens,
    systemPrompt:
      typeof chatbotSettings?.systemPrompt === 'string'
        ? chatbotSettings.systemPrompt
        : currentAssignment.systemPrompt,
  });

  const nextBrainSettings: AiBrainSettings = {
    ...currentBrainSettings,
    assignments: {
      ...(currentBrainSettings.assignments ?? {}),
      chatbot: nextAssignment,
    },
  };

  const changed =
    JSON.stringify(currentBrainSettings.assignments?.chatbot ?? null) !==
    JSON.stringify(nextAssignment);

  if (!options.dryRun && changed) {
    await writeBrainSettings(nextBrainSettings);
  }

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'write',
        changed,
        chatbotSettingsFound: Boolean(chatbotSettings),
        previousAssignment: currentBrainSettings.assignments?.chatbot ?? null,
        nextAssignment,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error('Failed to backfill Brain chatbot assignment:', error);
  process.exit(1);
});
