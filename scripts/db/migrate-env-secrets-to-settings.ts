import fs from 'fs';
import path from 'path';

import { MongoClient } from 'mongodb';

type Mapping = {
  envKey: string;
  settingKey: string;
  allowPlaceholder?: boolean;
};

const PLACEHOLDER_VALUES = new Set([
  'your_key_here',
  'your_openai_api_key',
  'your_google_client_id',
  'your_google_client_secret',
  'your_facebook_client_id',
  'your_facebook_client_secret',
  'your_imagekit_id',
  'change_me',
  'replace_me',
]);

const normalizeValue = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('\'') && trimmed.endsWith('\''))
      ? trimmed.slice(1, -1)
      : trimmed;
  return unquoted.trim() || null;
};

const isPlaceholder = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return PLACEHOLDER_VALUES.has(normalized);
};

const loadEnvFile = (): Record<string, string> => {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^export\s+([A-Z0-9_]+)\s*=\s*(.*)$/);
    const keyValue = match ? [match[1], match[2]] : trimmed.split('=');
    if (keyValue.length < 2) return;
    const key = keyValue[0]?.trim();
    const value = keyValue.slice(1).join('=').trim();
    if (!key) return;
    env[key] = value;
  });
  return env;
};

const getEnvValue = (env: Record<string, string>, key: string): string | null => {
  return normalizeValue(env[key] ?? process.env[key]);
};

const mappings: Mapping[] = [
  { envKey: 'OPENAI_API_KEY', settingKey: 'openai_api_key' },
  { envKey: 'ANTHROPIC_API_KEY', settingKey: 'anthropic_api_key' },
  { envKey: 'GEMINI_API_KEY', settingKey: 'gemini_api_key' },
  { envKey: 'BRAVE_SEARCH_API_KEY', settingKey: 'search_brave_api_key' },
  { envKey: 'BRAVE_SEARCH_API_URL', settingKey: 'search_brave_api_url', allowPlaceholder: true },
  { envKey: 'GOOGLE_SEARCH_API_KEY', settingKey: 'search_google_api_key' },
  { envKey: 'GOOGLE_SEARCH_ENGINE_ID', settingKey: 'search_google_engine_id' },
  { envKey: 'GOOGLE_SEARCH_API_URL', settingKey: 'search_google_api_url', allowPlaceholder: true },
  { envKey: 'SERPAPI_API_KEY', settingKey: 'search_serpapi_api_key' },
  { envKey: 'SERPAPI_API_URL', settingKey: 'search_serpapi_api_url', allowPlaceholder: true },
  { envKey: 'GOOGLE_CLIENT_ID', settingKey: 'auth_google_client_id' },
  { envKey: 'GOOGLE_CLIENT_SECRET', settingKey: 'auth_google_client_secret' },
  { envKey: 'FACEBOOK_CLIENT_ID', settingKey: 'auth_facebook_client_id' },
  { envKey: 'FACEBOOK_CLIENT_SECRET', settingKey: 'auth_facebook_client_secret' },
  { envKey: 'AUTH_EMAIL_WEBHOOK_URL', settingKey: 'auth_email_webhook_url', allowPlaceholder: true },
  {
    envKey: 'AUTH_EMAIL_WEBHOOK_SECRET',
    settingKey: 'auth_email_webhook_secret',
    allowPlaceholder: true,
  },
  { envKey: 'SMTP_HOST', settingKey: 'auth_smtp_host', allowPlaceholder: true },
  { envKey: 'SMTP_PORT', settingKey: 'auth_smtp_port', allowPlaceholder: true },
  { envKey: 'SMTP_USER', settingKey: 'auth_smtp_user', allowPlaceholder: true },
  { envKey: 'SMTP_PASS', settingKey: 'auth_smtp_pass', allowPlaceholder: true },
  { envKey: 'SMTP_FROM', settingKey: 'auth_smtp_from', allowPlaceholder: true },
];

const main = async (): Promise<void> => {
  const env = loadEnvFile();
  const mongoUri = getEnvValue(env, 'MONGODB_URI');
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing; cannot write settings.');
  }
  const dbName = getEnvValue(env, 'MONGODB_DB') ?? 'app';

  const secrets = mappings
    .map((mapping) => {
      const value = getEnvValue(env, mapping.envKey);
      if (!value) return null;
      if (!mapping.allowPlaceholder && isPlaceholder(value)) return null;
      return { key: mapping.settingKey, value };
    })
    .filter((entry): entry is { key: string; value: string } => Boolean(entry));

  if (secrets.length === 0) {
    console.log('No secrets found to migrate.');
    return;
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection<{
    _id: string;
    key?: string;
    value?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }>('settings');

  const now = new Date();
  for (const secret of secrets) {
    await collection.updateOne(
      { $or: [{ _id: secret.key }, { key: secret.key }] },
      {
        $set: {
          key: secret.key,
          value: secret.value,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: secret.key,
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }

  console.log(`Upserted ${secrets.length} setting(s): ${secrets.map((s) => s.key).join(', ')}`);
  await client.close();
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
