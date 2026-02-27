import { isValidDatabaseEngineBackupTimeUtc } from '@/shared/lib/db/database-engine-backup-schedule';

const pad2 = (value: number): string => value.toString().padStart(2, '0');

const formatHm = (hour: number, minute: number): string => `${pad2(hour)}:${pad2(minute)}`;

const parseHm = (value: string): { hour: number; minute: number } | null => {
  if (!isValidDatabaseEngineBackupTimeUtc(value)) return null;
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number.parseInt(hourRaw ?? '', 10);
  const minute = Number.parseInt(minuteRaw ?? '', 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
};

export const utcHmToLocalHm = (utcHm: string, refDate = new Date()): string | null => {
  const parsed = parseHm(utcHm);
  if (!parsed) return null;

  const date = new Date(refDate.getTime());
  date.setUTCHours(parsed.hour, parsed.minute, 0, 0);
  return formatHm(date.getHours(), date.getMinutes());
};

export const localHmToUtcHm = (localHm: string, refDate = new Date()): string | null => {
  const parsed = parseHm(localHm);
  if (!parsed) return null;

  const date = new Date(refDate.getTime());
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  return formatHm(date.getUTCHours(), date.getUTCMinutes());
};

