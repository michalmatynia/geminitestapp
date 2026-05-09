import { readInsightSettingValue, parseBooleanSetting } from './settings-service';
import { AI_INSIGHTS_SETTINGS_KEYS } from '../settings';
import { isScheduledAiInsightsEnabled } from '../scheduling';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import {
  generateAnalyticsInsight,
  generateLogsInsight,
  generateRuntimeAnalyticsInsight,
} from '../generator';

export async function runInsightsAutoGeneration(): Promise<void> {
  if (!isScheduledAiInsightsEnabled()) return;

  const settings = [
    { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled, fn: generateAnalyticsInsight, label: 'analytics' },
    { key: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled, fn: generateLogsInsight, label: 'logs' },
    { key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled, fn: generateRuntimeAnalyticsInsight, label: 'runtime analytics' }
  ];

  for (const { key, fn, label } of settings) {
    const enabled = parseBooleanSetting(await readInsightSettingValue(key), false);
    if (enabled) {
      void fn({ source: 'scheduled_job' }).catch((err: unknown) => {
        void logSystemEvent({
          source: 'ai.insights.auto-generation',
          message: `Failed to auto-generate ${label} insight`,
          level: 'error',
          error: err,
        });
      });
    }
  }
}
