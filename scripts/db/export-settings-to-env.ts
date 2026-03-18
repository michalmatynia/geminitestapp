import fs from 'fs';
import path from 'path';

import { MongoClient } from 'mongodb';

type Mapping = {
  envKey: string;
  settingKey: string;
};

const mappings: Mapping[] = [
  { envKey: 'OPENAI_API_KEY', settingKey: 'openai_api_key' },
  { envKey: 'ANTHROPIC_API_KEY', settingKey: 'anthropic_api_key' },
  { envKey: 'GEMINI_API_KEY', settingKey: 'gemini_api_key' },
  { envKey: 'BRAVE_SEARCH_API_KEY', settingKey: 'search_brave_api_key' },
  { envKey: 'BRAVE_SEARCH_API_URL', settingKey: 'search_brave_api_url' },
  { envKey: 'GOOGLE_SEARCH_API_KEY', settingKey: 'search_google_api_key' },
  { envKey: 'GOOGLE_SEARCH_ENGINE_ID', settingKey: 'search_google_engine_id' },
  { envKey: 'GOOGLE_SEARCH_API_URL', settingKey: 'search_google_api_url' },
  { envKey: 'SERPAPI_API_KEY', settingKey: 'search_serpapi_api_key' },
  { envKey: 'SERPAPI_API_URL', settingKey: 'search_serpapi_api_url' },
  { envKey: 'GOOGLE_CLIENT_ID', settingKey: 'auth_google_client_id' },
  { envKey: 'GOOGLE_CLIENT_SECRET', settingKey: 'auth_google_client_secret' },
  { envKey: 'FACEBOOK_CLIENT_ID', settingKey: 'auth_facebook_client_id' },
  { envKey: 'FACEBOOK_CLIENT_SECRET', settingKey: 'auth_facebook_client_secret' },
  { envKey: 'AUTH_EMAIL_WEBHOOK_URL', settingKey: 'auth_email_webhook_url' },
  { envKey: 'AUTH_EMAIL_WEBHOOK_SECRET', settingKey: 'auth_email_webhook_secret' },
  { envKey: 'SMTP_HOST', settingKey: 'auth_smtp_host' },
  { envKey: 'SMTP_PORT', settingKey: 'auth_smtp_port' },
  { envKey: 'SMTP_USER', settingKey: 'auth_smtp_user' },
  { envKey: 'SMTP_PASS', settingKey: 'auth_smtp_pass' },
  { envKey: 'SMTP_FROM', settingKey: 'auth_smtp_from' },
];

const normalizeValue = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
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

const formatEnvValue = (value: string): string => {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  return `"${escaped}"`;
};

const updateEnvFile = (entries: Map<string, string>): string[] => {
  const envPath = path.join(process.cwd(), '.env');
  const raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = raw.split(/\r?\n/);

  const updatedKeys = new Set<string>();
  const nextLines = lines.map((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) return line;
    const key = match[1];
    if (!key) return line;
    if (!entries.has(key)) return line;
    const entryValue = entries.get(key);
    if (entryValue === undefined) return line;
    updatedKeys.add(key);
    return `${key}=${formatEnvValue(entryValue)}`;
  });

  const missingKeys = Array.from(entries.keys()).filter((key) => !updatedKeys.has(key));
  if (missingKeys.length > 0) {
    const lastLine = nextLines.at(-1);
    if (lastLine !== undefined && lastLine.trim() !== '') {
      nextLines.push('');
    }
    missingKeys.forEach((key) => {
      const entryValue = entries.get(key);
      if (entryValue === undefined) return;
      nextLines.push(`${key}=${formatEnvValue(entryValue)}`);
    });
  }

  fs.writeFileSync(envPath, nextLines.join('\n'));
  return Array.from(entries.keys());
};

const main = async (): Promise<void> => {
  const env = loadEnvFile();
  const mongoUri = normalizeValue(env['MONGODB_URI'] ?? process.env['MONGODB_URI']);
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing; cannot read settings.');
  }
  const dbName = normalizeValue(env['MONGODB_DB'] ?? process.env['MONGODB_DB']) ?? 'app';

  const settingKeys = mappings.map((mapping) => mapping.settingKey);
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection<{ _id: string; key?: string; value?: string }>('settings');

  const docs = await collection
    .find(
      {
        $or: [{ _id: { $in: settingKeys } }, { key: { $in: settingKeys } }],
      },
      { projection: { _id: 1, key: 1, value: 1 } }
    )
    .toArray();

  const valueBySetting = new Map<string, string>();
  docs.forEach((doc) => {
    const key = doc.key ?? doc._id;
    if (!key || typeof doc.value !== 'string') return;
    if (!valueBySetting.has(key)) valueBySetting.set(key, doc.value);
  });

  const envEntries = new Map<string, string>();
  const missingFromDb: string[] = [];
  mappings.forEach((mapping) => {
    const value = valueBySetting.get(mapping.settingKey);
    if (value) {
      envEntries.set(mapping.envKey, value);
      return;
    }
    missingFromDb.push(mapping.envKey);
  });

  await client.close();

  missingFromDb.forEach((envKey) => {
    if (!envEntries.has(envKey) && !env[envKey]) {
      envEntries.set(envKey, '');
    }
  });

  if (envEntries.size === 0) {
    console.log('No settings found to export into .env.');
    return;
  }

  const updated = updateEnvFile(envEntries);
  console.log(`Updated .env with ${updated.length} key(s): ${updated.join(', ')}`);
  if (missingFromDb.length > 0) {
    console.log(
      `Missing in Mongo (left blank if absent in .env): ${missingFromDb.join(', ')}`
    );
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
