import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadConfigModule = async () => {
  vi.resetModules();
  return import('@/shared/lib/observability/workers/system-log-alerts/config');
};

describe('system-log-alerts config shared-lib coverage', () => {
  beforeEach(() => {
    delete process.env['SYSTEM_LOG_ALERT_REPEAT_EVERY_MS'];
    delete process.env['SYSTEM_LOG_ALERT_WINDOW_SECONDS'];
    delete process.env['SYSTEM_LOG_ALERT_MIN_ERRORS'];
    delete process.env['SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS'];
    delete process.env['SYSTEM_LOG_ALERT_PER_SERVICE_MIN_ERRORS'];
    delete process.env['SYSTEM_LOG_ALERT_COOLDOWN_SECONDS'];
    delete process.env['SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS'];
    delete process.env['SYSTEM_LOG_SLOW_REQUEST_MIN_COUNT'];
    delete process.env['SYSTEM_LOG_SLOW_REQUEST_WINDOW_SECONDS'];
    delete process.env['SYSTEM_LOG_SILENCE_WINDOW_SECONDS'];
    delete process.env['SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS'];
    delete process.env['SYSTEM_LOG_TELEMETRY_SILENCE_WINDOW_SECONDS'];
    delete process.env['SYSTEM_LOG_TELEMETRY_SILENCE_COOLDOWN_SECONDS'];
    delete process.env['SYSTEM_LOG_TELEMETRY_CRITICAL_SERVICES'];
  });

  it('exposes the default worker configuration values', async () => {
    const config = await loadConfigModule();

    expect(config.SYSTEM_LOG_ALERT_REPEAT_EVERY_MS).toBe(60_000);
    expect(config.SYSTEM_LOG_ALERT_WINDOW_SECONDS).toBe(300);
    expect(config.SYSTEM_LOG_ALERT_MIN_ERRORS).toBe(20);
    expect(config.SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS).toBe(10);
    expect(config.SYSTEM_LOG_ALERT_PER_SERVICE_MIN_ERRORS).toBe(10);
    expect(config.SYSTEM_LOG_ALERT_COOLDOWN_SECONDS).toBe(600);
    expect(config.SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS).toBe(750);
    expect(config.SYSTEM_LOG_SLOW_REQUEST_MIN_COUNT).toBe(20);
    expect(config.SYSTEM_LOG_SLOW_REQUEST_WINDOW_SECONDS).toBe(300);
    expect(config.SYSTEM_LOG_SILENCE_WINDOW_SECONDS).toBe(300);
    expect(config.SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS).toBe(900);
    expect(config.SYSTEM_LOG_TELEMETRY_SILENCE_WINDOW_SECONDS).toBe(900);
    expect(config.SYSTEM_LOG_TELEMETRY_SILENCE_COOLDOWN_SECONDS).toBe(900);
    expect(config.SYSTEM_LOG_TELEMETRY_CRITICAL_SERVICES).toEqual([]);
    expect(config.ALERT_QUEUE_NAME).toBe('system-log-alerts');
    expect(config.ALERT_REPEAT_JOB_ID).toBe('system-log-alerts-tick');
    expect(config.ALERT_STARTUP_JOB_ID).toBe('system-log-alerts-startup-tick');
    expect(config.ALERT_EVIDENCE_SAMPLE_LIMIT).toBe(5);
    expect(config.ALERT_GROUP_SCAN_LIMIT).toBe(2000);
  });

  it('parses env overrides, floors small values, and trims critical service names', async () => {
    process.env['SYSTEM_LOG_ALERT_REPEAT_EVERY_MS'] = '1000';
    process.env['SYSTEM_LOG_ALERT_WINDOW_SECONDS'] = '5';
    process.env['SYSTEM_LOG_ALERT_MIN_ERRORS'] = '0';
    process.env['SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS'] = '2.9';
    process.env['SYSTEM_LOG_ALERT_PER_SERVICE_MIN_ERRORS'] = 'invalid';
    process.env['SYSTEM_LOG_ALERT_COOLDOWN_SECONDS'] = '30';
    process.env['SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS'] = '25';
    process.env['SYSTEM_LOG_SLOW_REQUEST_MIN_COUNT'] = '4.7';
    process.env['SYSTEM_LOG_SLOW_REQUEST_WINDOW_SECONDS'] = '20';
    process.env['SYSTEM_LOG_SILENCE_WINDOW_SECONDS'] = '15';
    process.env['SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS'] = '10';
    process.env['SYSTEM_LOG_TELEMETRY_SILENCE_WINDOW_SECONDS'] = '15';
    process.env['SYSTEM_LOG_TELEMETRY_SILENCE_COOLDOWN_SECONDS'] = '10';
    process.env['SYSTEM_LOG_TELEMETRY_CRITICAL_SERVICES'] = ' api , worker ,, cron ';

    const config = await loadConfigModule();

    expect(config.SYSTEM_LOG_ALERT_REPEAT_EVERY_MS).toBe(15_000);
    expect(config.SYSTEM_LOG_ALERT_WINDOW_SECONDS).toBe(60);
    expect(config.SYSTEM_LOG_ALERT_MIN_ERRORS).toBe(1);
    expect(config.SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS).toBe(2);
    expect(config.SYSTEM_LOG_ALERT_PER_SERVICE_MIN_ERRORS).toBe(10);
    expect(config.SYSTEM_LOG_ALERT_COOLDOWN_SECONDS).toBe(60);
    expect(config.SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS).toBe(50);
    expect(config.SYSTEM_LOG_SLOW_REQUEST_MIN_COUNT).toBe(4);
    expect(config.SYSTEM_LOG_SLOW_REQUEST_WINDOW_SECONDS).toBe(60);
    expect(config.SYSTEM_LOG_SILENCE_WINDOW_SECONDS).toBe(60);
    expect(config.SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS).toBe(120);
    expect(config.SYSTEM_LOG_TELEMETRY_SILENCE_WINDOW_SECONDS).toBe(60);
    expect(config.SYSTEM_LOG_TELEMETRY_SILENCE_COOLDOWN_SECONDS).toBe(120);
    expect(config.SYSTEM_LOG_TELEMETRY_CRITICAL_SERVICES).toEqual(['api', 'worker', 'cron']);
  });
});
