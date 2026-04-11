import { NextRequest, NextResponse } from 'next/server';

import {
  getAiPathsSetting,
  requireAiPathsAccess,
  requireAiPathsRunAccess,
  upsertAiPathsSetting,
} from '@/features/ai/ai-paths/server';
import {
  getAllAiPathsSettings,
} from '@/features/ai/ai-paths/server/settings-store';
import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  type AiPathsSettingRecord,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import { parsePathMetas } from '@/features/ai/ai-paths/server/settings-store.parsing';
import {
  aiTriggerButtonCreateSchema,
  buildCanonicalTriggerButtonDisplay,
  parseAiTriggerButtonsRaw,
  serializeAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';
import {
  aiTriggerButtonsQuerySchema,
  type AiTriggerButtonRecord,
} from '@/shared/contracts/ai-trigger-buttons';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { AppErrorCodes, badRequestError, isAppError } from '@/shared/errors/app-error';
import {
  isPlaywrightAiPathsFixtureTriggerButton,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM,
  shouldIncludePlaywrightAiPathsFixtureButtons,
} from '@/shared/lib/ai-paths/playwright-fixture-scope';
import { loadCanonicalStoredPathConfig } from '@/shared/lib/ai-paths/core/utils/stored-path-config';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

import { assertTriggerButtonPathExists } from './path-validation';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const AI_PATHS_TRIGGER_BUTTONS_KEY = 'ai_paths_trigger_buttons';
export { aiTriggerButtonsQuerySchema as querySchema };
const readAllAiPathsSettings = getAllAiPathsSettings as () => Promise<AiPathsSettingRecord[]>;
const readTriggerButtonsRaw = async (): Promise<string | null> =>
  await getAiPathsSetting(AI_PATHS_TRIGGER_BUTTONS_KEY);

const writeTriggerButtonsRaw = async (value: string): Promise<void> => {
  await upsertAiPathsSetting(AI_PATHS_TRIGGER_BUTTONS_KEY, value);
};

const createMinimalTriggerButtonSettingsSnapshot = (): AiPathsSettingRecord[] => [
  { key: AI_PATHS_INDEX_KEY, value: '[]' },
  { key: AI_PATHS_TRIGGER_BUTTONS_KEY, value: '[]' },
];

const buildSettingsValueMap = (records: AiPathsSettingRecord[]): Map<string, string> =>
  new Map(records.map((record) => [record.key, record.value]));

const readTriggerButtonSettingsSnapshot = async (): Promise<Map<string, string>> => {
  const existingRecords = await readAllAiPathsSettings();
  const sourceRecords =
    existingRecords.length > 0 ? existingRecords : createMinimalTriggerButtonSettingsSnapshot();
  return buildSettingsValueMap(sourceRecords);
};

const isMalformedPathIndexPayload = (raw: string | null): boolean => {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return false;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return true;
    }
    return parsed.some((item: unknown) => !item || typeof item !== 'object' || Array.isArray(item));
  } catch (error) {
    void ErrorSystem.captureException(error);
    return true;
  }
};

const filterButtonsWithExistingPaths = async (
  buttons: AiTriggerButtonRecord[],
  settingsSnapshot?: Map<string, string>
): Promise<AiTriggerButtonRecord[]> => {
  const boundButtons = buttons.filter(
    (button) => typeof button.pathId === 'string' && button.pathId.trim().length > 0
  );
  if (boundButtons.length === 0) {
    return buttons;
  }

  const pathIndexRaw = settingsSnapshot?.get(AI_PATHS_INDEX_KEY) ?? (await getAiPathsSetting(AI_PATHS_INDEX_KEY));
  if (isMalformedPathIndexPayload(pathIndexRaw)) {
    return buttons;
  }
  const indexedPathMetas = parsePathMetas(pathIndexRaw);
  const indexedPathIds = new Set(indexedPathMetas.map((meta) => meta.id));
  const validButtonIds = new Set<string>();

  await Promise.all(
    boundButtons.map(async (button): Promise<void> => {
      const pathId = button.pathId?.trim() ?? '';
      if (!pathId || !indexedPathIds.has(pathId)) {
        return;
      }

      const configKey = `${AI_PATHS_CONFIG_KEY_PREFIX}${pathId}`;
      const rawConfig = settingsSnapshot?.get(configKey) ?? (await getAiPathsSetting(configKey));
      if (typeof rawConfig !== 'string' || rawConfig.trim().length === 0) return;

      try {
        loadCanonicalStoredPathConfig({
          pathId,
          rawConfig,
        });
        validButtonIds.add(button.id);
      } catch (error) {
        void ErrorSystem.captureException(error);
      
        // Hide buttons bound to malformed or otherwise invalid path configs.
      }
    })
  );

  return buttons.filter((button) => {
    if (typeof button.pathId !== 'string' || button.pathId.trim().length === 0) {
      return true;
    }
    return validButtonIds.has(button.id);
  });
};

const readRequestCookie = (req: NextRequest, name: string): string | null => {
  const cookies = (req as NextRequest & { cookies?: { get?: (key: string) => { value?: string } | undefined } })
    .cookies;
  return cookies?.get?.(name)?.value ?? null;
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    await requireAiPathsRunAccess();
  } catch (error) {
    void ErrorSystem.captureException(error);
    // Trigger buttons are rendered across multiple surfaces. For users without
    // AI-paths permissions, treat this as an empty list rather than a noisy API error.
    if (
      isAppError(error) &&
      (error.code === AppErrorCodes.unauthorized || error.code === AppErrorCodes.forbidden)
    ) {
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }
    throw error;
  }

  const settingsSnapshot = await readTriggerButtonSettingsSnapshot();
  const raw = settingsSnapshot.get(AI_PATHS_TRIGGER_BUTTONS_KEY) ?? null;
  let parsedButtons: AiTriggerButtonRecord[];
  try {
    parsedButtons = parseAiTriggerButtonsRaw(raw);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
  const query = aiTriggerButtonsQuerySchema.parse(_ctx.query ?? {});
  const fixtureCookieValue = readRequestCookie(req, PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME);
  const includeFixtureButtons =
    shouldIncludePlaywrightAiPathsFixtureButtons(fixtureCookieValue) ||
    query[PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM] === true;
  const scopedButtons = includeFixtureButtons
    ? parsedButtons
    : parsedButtons.filter((button) => !isPlaywrightAiPathsFixtureTriggerButton(button));
  let visibleButtons = scopedButtons;
  try {
    visibleButtons = await filterButtonsWithExistingPaths(scopedButtons, settingsSnapshot);
  } catch (error) {
    void ErrorSystem.captureException(error);
    visibleButtons = scopedButtons;
  }

  return NextResponse.json(visibleButtons, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  const parsed = await parseJsonBody(req, aiTriggerButtonCreateSchema, {
    logPrefix: 'ai-paths.trigger-buttons.POST',
  });
  if (!parsed.ok) return parsed.response;

  const { name, iconId, pathId, enabled, locations, mode, display } = parsed.data;
  const raw = await readTriggerButtonsRaw();
  const existing = parseAiTriggerButtonsRaw(raw);
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw badRequestError('Name is required.');
  }
  await assertTriggerButtonPathExists(pathId ?? null);

  const now = new Date().toISOString();
  const isVisible = enabled ?? true;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `trigger_${Math.random().toString(36).slice(2, 10)}`;

  const maxSortIndex = existing.reduce((max, r) => Math.max(max, r.sortIndex ?? 0), -1);

  const record = {
    id,
    name: normalizedName,
    iconId: iconId ? iconId.trim() : null,
    pathId: pathId ? pathId.trim() : null,
    enabled: isVisible,
    locations,
    mode,
    display: buildCanonicalTriggerButtonDisplay(normalizedName, display),
    createdAt: now,
    updatedAt: now,
    sortIndex: maxSortIndex + 1,
  };

  const next = [...existing, record];
  await writeTriggerButtonsRaw(serializeAiTriggerButtonsRaw(next));
  return NextResponse.json(record);
}
