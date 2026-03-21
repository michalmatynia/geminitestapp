import 'dotenv/config';

import { KANGUR_SLOT_ASSIGNMENTS_KEY } from '@/shared/contracts/kangur';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  getKangurThemeSettingsKeyForAppearanceMode,
  KANGUR_THEME_CATALOG_KEY,
  parseKangurThemeCatalog,
} from '@/features/kangur/theme-settings';
import {
  KANGUR_LEGACY_SETTINGS_COLLECTION,
  KANGUR_SETTINGS_COLLECTION,
  readKangurSettingWithLegacyFallback,
  resolveKangurStoredValue,
  type KangurLegacySettingDocument,
  type KangurSettingDoc,
} from './kangur-settings-store';

type CliOptions = {
  dryRun: boolean;
};

type SlotKey = 'daily' | 'dawn' | 'sunset' | 'nightly';
type SlotAssignment = { id: string; name: string };
type SlotAssignments = Partial<Record<SlotKey, SlotAssignment | null>>;

type SyncResult = {
  slot: SlotKey;
  settingsKey: string;
  themeId?: string;
  themeName?: string;
  status: 'create' | 'update' | 'unchanged' | 'skipped';
  reason?: string;
};

const LEGACY_SLOT_ASSIGNMENTS_KEY = 'kangur_cms_slot_assignments_v1';
const SLOT_KEYS: SlotKey[] = ['daily', 'dawn', 'sunset', 'nightly'];
const SLOT_MODE: Record<SlotKey, 'default' | 'dawn' | 'sunset' | 'dark'> = {
  daily: 'default',
  dawn: 'dawn',
  sunset: 'sunset',
  nightly: 'dark',
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = { dryRun: true };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
    }
  });

  return options;
};

const parseSlotAssignments = (raw: string | null): SlotAssignments => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as SlotAssignments;
    }
  } catch {
    // ignore malformed
  }
  return {};
};

const determineStatus = (current: string | null, nextValue: string): SyncResult['status'] => {
  if (current === nextValue) return 'unchanged';
  return current ? 'update' : 'create';
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to sync Kangur slot assignments.');
  }

  const mongoClient = await getMongoClient();
  const results: SyncResult[] = [];

  try {
    const db = await getMongoDb();
    const collection = db.collection<KangurSettingDoc>(KANGUR_SETTINGS_COLLECTION);
    const legacyCollection = db.collection<KangurLegacySettingDocument>(
      KANGUR_LEGACY_SETTINGS_COLLECTION
    );

    const slotRaw = await readKangurSettingWithLegacyFallback({
      collection,
      legacyCollection,
      keys: [KANGUR_SLOT_ASSIGNMENTS_KEY, LEGACY_SLOT_ASSIGNMENTS_KEY],
    });
    const assignments = parseSlotAssignments(slotRaw);

    const catalogRaw = await readKangurSettingWithLegacyFallback({
      collection,
      legacyCollection,
      keys: [KANGUR_THEME_CATALOG_KEY],
    });
    const catalog = parseKangurThemeCatalog(catalogRaw);

    const now = new Date();

    for (const slot of SLOT_KEYS) {
      const assignment = assignments[slot];
      const settingsKey = getKangurThemeSettingsKeyForAppearanceMode(SLOT_MODE[slot]);
      if (!assignment?.id) {
        results.push({
          slot,
          settingsKey,
          status: 'skipped',
          reason: 'no-assignment',
        });
        continue;
      }
      const entry = catalog.find((theme) => theme.id === assignment.id);
      if (!entry) {
        results.push({
          slot,
          settingsKey,
          themeId: assignment.id,
          themeName: assignment.name,
          status: 'skipped',
          reason: 'missing-catalog',
        });
        continue;
      }

      const nextValue = serializeSetting(entry.settings);
      const existing = await collection.findOne(
        { $or: [{ _id: settingsKey }, { key: settingsKey }] },
        { projection: { _id: 1, key: 1, value: 1 } }
      );
      const currentValue = resolveKangurStoredValue(existing, settingsKey);
      const status = determineStatus(currentValue, nextValue);

      results.push({
        slot,
        settingsKey,
        themeId: entry.id,
        themeName: entry.name,
        status,
      });

      if (!options.dryRun && status !== 'unchanged') {
        await collection.updateOne(
          { $or: [{ _id: settingsKey }, { key: settingsKey }] },
          {
            $set: {
              key: settingsKey,
              value: encodeSettingValue(settingsKey, nextValue),
              updatedAt: now,
            },
            $setOnInsert: {
              _id: settingsKey,
              createdAt: now,
            },
          },
          { upsert: true }
        );
      }
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          dryRun: options.dryRun,
          results,
        },
        null,
        2
      )}\n`
    );
  } finally {
    await mongoClient.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
