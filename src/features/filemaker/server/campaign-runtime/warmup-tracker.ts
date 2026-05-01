import 'server-only';

export const FILEMAKER_CAMPAIGN_WARMUP_STATE_KEY = 'filemaker_campaign_warmup_state';

export type FilemakerCampaignWarmupSenderState = {
  firstSendDate: string;
  dailyUsage: Record<string, number>;
};

export type FilemakerCampaignWarmupState = {
  version: 1;
  senders: Record<string, FilemakerCampaignWarmupSenderState>;
};

export type FilemakerCampaignWarmupReservation =
  | { ok: true }
  | { ok: false; nextAvailableAt: string; dailyCap: number; used: number };

export const DEFAULT_FILEMAKER_CAMPAIGN_WARMUP_SCHEDULE: readonly number[] = [
  50, 100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000,
];

export const resolveFilemakerCampaignWarmupDailyCap = (
  dayIndex: number,
  schedule: readonly number[] = DEFAULT_FILEMAKER_CAMPAIGN_WARMUP_SCHEDULE
): number | null => {
  if (dayIndex < 0) return schedule[0] ?? null;
  if (dayIndex >= schedule.length) return null;
  return schedule[dayIndex] ?? null;
};

const toUtcDateString = (date: Date): string => date.toISOString().slice(0, 10);

const daysBetween = (fromIso: string, toIso: string): number => {
  const from = Date.UTC(
    Number.parseInt(fromIso.slice(0, 4), 10),
    Number.parseInt(fromIso.slice(5, 7), 10) - 1,
    Number.parseInt(fromIso.slice(8, 10), 10)
  );
  const to = Date.UTC(
    Number.parseInt(toIso.slice(0, 4), 10),
    Number.parseInt(toIso.slice(5, 7), 10) - 1,
    Number.parseInt(toIso.slice(8, 10), 10)
  );
  return Math.floor((to - from) / 86_400_000);
};

const buildNextMidnightIso = (nowDateString: string): string => {
  const year = Number.parseInt(nowDateString.slice(0, 4), 10);
  const month = Number.parseInt(nowDateString.slice(5, 7), 10) - 1;
  const day = Number.parseInt(nowDateString.slice(8, 10), 10);
  return new Date(Date.UTC(year, month, day + 1)).toISOString();
};

export const buildEmptyFilemakerCampaignWarmupState =
  (): FilemakerCampaignWarmupState => ({ version: 1, senders: {} });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && value !== undefined && typeof value === 'object';

const normalizeDailyUsage = (value: unknown): Record<string, number> => {
  const usage: Record<string, number> = {};
  if (!isRecord(value)) return usage;
  for (const [day, count] of Object.entries(value)) {
    if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
      usage[day] = Math.floor(count);
    }
  }
  return usage;
};

const normalizeWarmupSenderState = (
  value: unknown
): FilemakerCampaignWarmupSenderState | null => {
  if (!isRecord(value)) return null;
  const firstSendDate =
    typeof value['firstSendDate'] === 'string' ? value['firstSendDate'] : '';
  if (firstSendDate.length === 0) return null;
  return {
    firstSendDate,
    dailyUsage: normalizeDailyUsage(value['dailyUsage']),
  };
};

export const normalizeFilemakerCampaignWarmupState = (
  value: unknown
): FilemakerCampaignWarmupState => {
  if (!isRecord(value)) return buildEmptyFilemakerCampaignWarmupState();
  const sendersRaw = value['senders'];
  const senders: Record<string, FilemakerCampaignWarmupSenderState> = {};
  if (!isRecord(sendersRaw)) return { version: 1, senders };
  for (const [key, entry] of Object.entries(sendersRaw)) {
    const sender = normalizeWarmupSenderState(entry);
    if (sender !== null) senders[key] = sender;
  }
  return { version: 1, senders };
};

export type CreateFilemakerCampaignWarmupTrackerOptions = {
  readState: () => Promise<FilemakerCampaignWarmupState>;
  writeState: (state: FilemakerCampaignWarmupState) => Promise<void>;
  now?: () => Date;
  schedule?: readonly number[];
};

export type FilemakerCampaignWarmupTracker = {
  reserve: (senderKey: string) => Promise<FilemakerCampaignWarmupReservation>;
};

type FilemakerCampaignWarmupUsageContext = {
  cap: number | null;
  firstSendDate: string;
  usage: Record<string, number>;
  used: number;
};

const resolveWarmupUsageContext = ({
  schedule,
  senderKey,
  state,
  today,
}: {
  schedule: readonly number[];
  senderKey: string;
  state: FilemakerCampaignWarmupState;
  today: string;
}): FilemakerCampaignWarmupUsageContext => {
  const existing = state.senders[senderKey];
  const firstSendDate = existing?.firstSendDate ?? today;
  const dayIndex = daysBetween(firstSendDate, today);
  const usage = existing?.dailyUsage ?? {};
  return {
    cap: resolveFilemakerCampaignWarmupDailyCap(dayIndex, schedule),
    firstSendDate,
    usage,
    used: usage[today] ?? 0,
  };
};

const buildBlockedWarmupReservation = (
  cap: number | null,
  used: number,
  today: string
): FilemakerCampaignWarmupReservation | null => {
  if (cap === null || used < cap) return null;
  return {
    ok: false,
    nextAvailableAt: buildNextMidnightIso(today),
    dailyCap: cap,
    used,
  };
};

const buildWarmupNextState = ({
  dailyUsage,
  firstSendDate,
  senderKey,
  state,
  today,
  used,
}: {
  dailyUsage: Record<string, number>;
  firstSendDate: string;
  senderKey: string;
  state: FilemakerCampaignWarmupState;
  today: string;
  used: number;
}): FilemakerCampaignWarmupState => ({
  version: 1,
  senders: {
    ...state.senders,
    [senderKey]: {
      firstSendDate,
      dailyUsage: { ...dailyUsage, [today]: used + 1 },
    },
  },
});

export const createFilemakerCampaignWarmupTracker = (
  options: CreateFilemakerCampaignWarmupTrackerOptions
): FilemakerCampaignWarmupTracker => {
  const now = options.now ?? (() => new Date());
  const schedule = options.schedule ?? DEFAULT_FILEMAKER_CAMPAIGN_WARMUP_SCHEDULE;

  return {
    async reserve(senderKey: string): Promise<FilemakerCampaignWarmupReservation> {
      if (senderKey.trim().length === 0) return { ok: true };
      const state = await options.readState();
      const today = toUtcDateString(now());
      const usageContext = resolveWarmupUsageContext({ schedule, senderKey, state, today });
      const blockedReservation = buildBlockedWarmupReservation(
        usageContext.cap,
        usageContext.used,
        today
      );
      if (blockedReservation !== null) return blockedReservation;

      const nextState = buildWarmupNextState({
        dailyUsage: usageContext.usage,
        firstSendDate: usageContext.firstSendDate,
        senderKey,
        state,
        today,
        used: usageContext.used,
      });
      await options.writeState(nextState);
      return { ok: true };
    },
  };
};
