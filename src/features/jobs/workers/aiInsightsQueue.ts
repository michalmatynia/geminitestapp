import "server-only";

import { listSystemLogs } from "@/features/observability/server";
import { getAiInsightsMeta, setAiInsightsMeta } from "@/features/ai/insights/repository";
import { AI_INSIGHTS_SETTINGS_KEYS } from "@/features/ai/insights/settings";
import {
  generateAnalyticsInsight,
  generateLogsInsight,
  getScheduleSettings,
} from "@/features/ai/insights/generator";

let intervalId: NodeJS.Timeout | null = null;
let running = false;

const CHECK_INTERVAL_MS = 60 * 1000;

const parseDate = (value: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const shouldRun = (lastRun: Date | null, minutes: number): boolean => {
  if (!lastRun) return true;
  const diff = Date.now() - lastRun.getTime();
  return diff >= minutes * 60 * 1000;
};

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const schedule = await getScheduleSettings();
    const analyticsLastRun = parseDate(
      await getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.analyticsLastRunAt),
    );
    const logsLastRun = parseDate(
      await getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastRunAt),
    );

    if (schedule.analyticsEnabled && shouldRun(analyticsLastRun, schedule.analyticsMinutes)) {
      await generateAnalyticsInsight({ source: "scheduled" });
    }

    if (schedule.logsEnabled && shouldRun(logsLastRun, schedule.logsMinutes)) {
      await generateLogsInsight({ source: "scheduled" });
    }

    if (schedule.logsAutoOnError) {
      const latestError = await listSystemLogs({ level: "error", page: 1, pageSize: 1 });
      const latest = latestError.logs[0];
      const lastErrorSeen = parseDate(
        await getAiInsightsMeta(AI_INSIGHTS_SETTINGS_KEYS.logsLastErrorSeenAt),
      );
      const latestAt = latest ? new Date(latest.createdAt) : null;
      if (latestAt && (!lastErrorSeen || latestAt.getTime() > lastErrorSeen.getTime())) {
        await generateLogsInsight({ source: "auto" });
        await setAiInsightsMeta(
          AI_INSIGHTS_SETTINGS_KEYS.logsLastErrorSeenAt,
          latestAt.toISOString(),
        );
      }
    }
  } catch {
    // best-effort; errors are logged by generator
  } finally {
    running = false;
  }
}

export const startAiInsightsQueue = (): void => {
  if (intervalId) return;
  intervalId = setInterval(() => {
    void tick();
  }, CHECK_INTERVAL_MS);
  void tick();
};
