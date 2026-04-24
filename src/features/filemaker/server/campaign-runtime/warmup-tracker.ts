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

export const normalizeFilemakerCampaignWarmupState = (
  value: unknown
): FilemakerCampaignWarmupState => {
  if (!value || typeof value !== 'object') return buildEmptyFilemakerCampaignWarmupState();
  const record = value as Record<string, unknown>;
  const sendersRaw = record['senders'];
  const senders: Record<string, FilemakerCampaignWarmupSenderState> = {};
  if (sendersRaw && typeof sendersRaw === 'object') {
    for (const [key, entry] of Object.entries(sendersRaw)) {
      if (!entry || typeof entry !== 'object') continue;
      const entryRecord = entry as Record<string, unknown>;
      const firstSendDate =
        typeof entryRecord['firstSendDate'] === 'string' ? entryRecord['firstSendDate'] : '';
      if (!firstSendDate) continue;
      const usage: Record<string, number> = {};
      const usageRaw = entryRecord['dailyUsage'];
      if (usageRaw && typeof usageRaw === 'object') {
        for (const [day, count] of Object.entries(usageRaw)) {
          if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
            usage[day] = Math.floor(count);
          }
        }
      }
      senders[key] = { firstSendDate, dailyUsage: usage };
    }
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

export const createFilemakerCampaignWarmupTracker = (
  options: CreateFilemakerCampaignWarmupTrackerOptions
): FilemakerCampaignWarmupTracker => {
  const now = options.now ?? (() => new Date());
  const schedule = options.schedule ?? DEFAULT_FILEMAKER_CAMPAIGN_WARMUP_SCHEDULE;

  return {
    async reserve(senderKey: string): Promise<FilemakerCampaignWarmupReservation> {
      if (!senderKey.trim()) return { ok: true };
      const state = await options.readState();
      const today = toUtcDateString(now());
      const existing = state.senders[senderKey];
      const firstSendDate = existing?.firstSendDate ?? today;
      const dayIndex = daysBetween(firstSendDate, today);
      const cap = resolveFilemakerCampaignWarmupDailyCap(dayIndex, schedule);

      const usage = existing?.dailyUsage ?? {};
      const used = usage[today] ?? 0;

      if (cap !== null && used >= cap) {
        return {
          ok: false,
          nextAvailableAt: buildNextMidnightIso(today),
          dailyCap: cap,
          used,
        };
      }

      const nextUsage = { ...usage, [today]: used + 1 };
      const nextState: FilemakerCampaignWarmupState = {
        version: 1,
        senders: {
          ...state.senders,
          [senderKey]: { firstSendDate, dailyUsage: nextUsage },
        },
      };
      await options.writeState(nextState);
      return { ok: true };
    },
  };
};
