import 'dotenv/config';

import OpenAI from 'openai';
import sharp from 'sharp';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';

import type { AiBrainAssignment, AiBrainSettings } from '@/shared/contracts/ai-brain';
import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  AI_BRAIN_SETTINGS_KEY,
  defaultBrainAssignment,
  parseBrainSettings,
  sanitizeBrainAssignment,
} from '@/shared/lib/ai-brain/settings';

type SettingDoc = {
  _id?: string;
  key?: string;
  value?: string;
};

type CliOptions = {
  dryRun: boolean;
  model: string | null;
  skipProbe: boolean;
};

type ProbeResult = {
  modelId: string;
  ok: boolean;
  detail: string;
};

const DRAWING_CAPABILITY = 'kangur_ai_tutor.drawing_analysis';
const SOURCE_CAPABILITIES = [
  DRAWING_CAPABILITY,
  'product.description.vision',
  'image_studio.ui_extractor',
  'image_studio.mask_ai',
  'agent_runtime.selector_inference',
] as const;
const PREFERRED_MODELS = ['gemma3:12b', 'gemma3:27b', 'qwen3-vl:30b', 'llava:latest'] as const;

const parseArgs = (argv: string[]): CliOptions => {
  const modelFlag = argv.find((value: string): boolean => value.startsWith('--model='));

  return {
    dryRun: !argv.includes('--write'),
    model: modelFlag ? modelFlag.slice('--model='.length).trim() || null : null,
    skipProbe: argv.includes('--skip-probe'),
  };
};

const normalizeUnique = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value): void => {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    output.push(normalized);
  });

  return output;
};

const looksLikeVisionModel = (modelId: string): boolean => {
  const normalized = modelId.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes('embed')) return false;
  if (normalized.startsWith('gemma3:')) return true;
  return (
    normalized.includes('vision') ||
    normalized.includes('-vl') ||
    normalized.includes('llava') ||
    normalized.includes('multimodal')
  );
};

const readBrainSettings = async (db: Db): Promise<AiBrainSettings> => {
  const doc = await db.collection<SettingDoc>('settings').findOne({
    $or: [{ _id: AI_BRAIN_SETTINGS_KEY }, { key: AI_BRAIN_SETTINGS_KEY }],
  });
  return parseBrainSettings(doc?.value ?? null);
};

const readProviderCatalogModels = async (db: Db): Promise<string[]> => {
  const doc = await db.collection<SettingDoc>('settings').findOne({
    $or: [{ _id: AI_BRAIN_PROVIDER_CATALOG_KEY }, { key: AI_BRAIN_PROVIDER_CATALOG_KEY }],
  });

  if (!doc?.value?.trim()) return [];

  try {
    const parsed = JSON.parse(doc.value) as { entries?: Array<{ value?: unknown }> };
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return normalizeUnique(
      entries.map((entry): string | null =>
        typeof entry?.value === 'string' ? entry.value : null
      )
    );
  } catch {
    return [];
  }
};

const readLiveOllamaModels = async (): Promise<string[]> => {
  const ollamaBaseUrl = (process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434')
    .trim()
    .replace(/\/+$/, '');

  const response = await fetch(`${ollamaBaseUrl}/api/tags`);
  if (!response.ok) {
    throw new Error(`Ollama model discovery failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as {
    models?: Array<{ name?: unknown; model?: unknown }>;
  };
  const models = Array.isArray(payload.models) ? payload.models : [];

  return normalizeUnique(
    models.map((model): string | null => {
      if (typeof model?.name === 'string' && model.name.trim()) return model.name;
      if (typeof model?.model === 'string' && model.model.trim()) return model.model;
      return null;
    })
  );
};

const buildProbeImageDataUrl = async (): Promise<string> => {
  const png = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();

  return `data:image/png;base64,${png.toString('base64')}`;
};

const probeOllamaVisionModel = async (modelId: string, imageDataUrl: string): Promise<ProbeResult> => {
  const ollamaBaseUrl = (process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434')
    .trim()
    .replace(/\/+$/, '');
  const client = new OpenAI({
    baseURL: `${ollamaBaseUrl}/v1`,
    apiKey: 'ollama',
  });

  try {
    const response = await client.chat.completions.create({
      model: modelId,
      max_tokens: 40,
      messages: [
        { role: 'system', content: 'Answer in one short word.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What do you see?' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    });

    return {
      modelId,
      ok: true,
      detail: response.choices[0]?.message?.content?.trim() || 'ok',
    };
  } catch (error) {
    return {
      modelId,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
};

const resolveCandidateModels = (input: {
  options: CliOptions;
  settings: AiBrainSettings;
  liveOllamaModels: string[];
  catalogModels: string[];
}): string[] => {
  const referencedAssignments = SOURCE_CAPABILITIES.map(
    (capability): string | null => input.settings.capabilities?.[capability]?.modelId ?? null
  );

  const discoveredVisionModels = [
    ...input.liveOllamaModels.filter(looksLikeVisionModel),
    ...input.catalogModels.filter(looksLikeVisionModel),
  ];

  return normalizeUnique([
    input.options.model,
    ...referencedAssignments,
    ...PREFERRED_MODELS,
    ...discoveredVisionModels,
  ]);
};

const writeBrainSettings = async (db: Db, settings: AiBrainSettings): Promise<void> => {
  await db.collection<SettingDoc>('settings').updateOne(
    {
      $or: [{ _id: AI_BRAIN_SETTINGS_KEY }, { key: AI_BRAIN_SETTINGS_KEY }],
    },
    {
      $set: {
        key: AI_BRAIN_SETTINGS_KEY,
        value: JSON.stringify(settings),
      },
      $setOnInsert: {
        _id: AI_BRAIN_SETTINGS_KEY,
      },
    },
    { upsert: true }
  );
};

async function main(): Promise<void> {
  const uri = process.env['MONGODB_URI']?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is required.');
  }

  const options = parseArgs(process.argv.slice(2));
  const mongo = await new MongoClient(uri).connect();
  const db = mongo.db(process.env['MONGODB_DB'] || 'app');

  try {
    const [settings, liveOllamaModels, catalogModels] = await Promise.all([
      readBrainSettings(db),
      readLiveOllamaModels(),
      readProviderCatalogModels(db),
    ]);

    const candidates = resolveCandidateModels({
      options,
      settings,
      liveOllamaModels,
      catalogModels,
    });

    if (candidates.length === 0) {
      throw new Error('No candidate multimodal models were found for drawing analysis.');
    }

    const probeImageDataUrl = options.skipProbe ? null : await buildProbeImageDataUrl();
    const probeResults: ProbeResult[] = [];
    let selectedModelId: string | null = null;

    for (const candidate of candidates) {
      if (options.skipProbe) {
        selectedModelId = candidate;
        break;
      }

      const result = await probeOllamaVisionModel(candidate, probeImageDataUrl!);
      probeResults.push(result);
      if (result.ok) {
        selectedModelId = candidate;
        break;
      }
    }

    if (!selectedModelId) {
      throw new Error(
        `No candidate multimodal model passed the Ollama image probe. Last error: ${
          probeResults[probeResults.length - 1]?.detail ?? 'unknown'
        }`
      );
    }

    const previousAssignment = settings.capabilities?.[DRAWING_CAPABILITY] ?? null;
    const nextAssignment: AiBrainAssignment = sanitizeBrainAssignment({
      ...defaultBrainAssignment,
      enabled: true,
      provider: 'model',
      modelId: selectedModelId,
      temperature: 0.1,
      maxTokens: 220,
      systemPrompt: '',
      notes: `Auto-configured for Kangur AI Tutor drawing analysis on ${new Date().toISOString()}.`,
    });

    const nextSettings: AiBrainSettings = {
      ...settings,
      capabilities: {
        ...(settings.capabilities ?? {}),
        [DRAWING_CAPABILITY]: nextAssignment,
      },
    };

    const changed = JSON.stringify(previousAssignment) !== JSON.stringify(nextAssignment);

    if (!options.dryRun && changed) {
      await writeBrainSettings(db, nextSettings);
    }

    console.log(
      JSON.stringify(
        {
          mode: options.dryRun ? 'dry-run' : 'write',
          changed,
          selectedModelId,
          previousAssignment,
          nextAssignment,
          candidates,
          probeResults,
        },
        null,
        2
      )
    );
  } finally {
    await mongo.close();
  }
}

void main().catch((error) => {
  console.error(
    'Failed to configure Kangur AI Tutor drawing analysis capability:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
