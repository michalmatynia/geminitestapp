export type ProbeSessionHandle = {
  close: () => Promise<void>;
};

export type ProbeSessionRecord<T extends ProbeSessionHandle = ProbeSessionHandle> = {
  id: string;
  url: string;
  handle: T;
  createdAt: number;
  lastUsedAt: number;
};

export type ProbeSessionStore<T extends ProbeSessionHandle = ProbeSessionHandle> = {
  create(input: { id?: string; url: string; handle: T }): ProbeSessionRecord<T>;
  get(id: string): ProbeSessionRecord<T> | null;
  touch(id: string): void;
  close(id: string): Promise<boolean>;
  sweep(): Promise<number>;
  size(): number;
  ids(): string[];
};

export type ProbeSessionStoreOptions = {
  ttlMs?: number;
  maxSessions?: number;
  now?: () => number;
  generateId?: () => string;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_SESSIONS = 8;

const defaultGenerateId = (): string => {
  const bytes = new Uint8Array(12);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const createProbeSessionStore = <T extends ProbeSessionHandle = ProbeSessionHandle>(
  options: ProbeSessionStoreOptions = {}
): ProbeSessionStore<T> => {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS;
  const now = options.now ?? Date.now;
  const generateId = options.generateId ?? defaultGenerateId;
  const records = new Map<string, ProbeSessionRecord<T>>();

  const isExpired = (record: ProbeSessionRecord<T>): boolean =>
    now() - record.lastUsedAt > ttlMs;

  const closeOne = async (id: string): Promise<boolean> => {
    const record = records.get(id);
    if (!record) return false;
    records.delete(id);
    await record.handle.close().catch(() => undefined);
    return true;
  };

  return {
    create({ id, url, handle }) {
      const currentTime = now();
      const recordId = id ?? generateId();
      const record: ProbeSessionRecord<T> = {
        id: recordId,
        url,
        handle,
        createdAt: currentTime,
        lastUsedAt: currentTime,
      };
      records.set(recordId, record);
      while (records.size > maxSessions) {
        const oldestEntry = Array.from(records.entries()).reduce((oldest, current) =>
          current[1].lastUsedAt < oldest[1].lastUsedAt ? current : oldest
        );
        void closeOne(oldestEntry[0]);
      }
      return record;
    },
    get(id) {
      const record = records.get(id);
      if (!record) return null;
      if (isExpired(record)) {
        void closeOne(id);
        return null;
      }
      return record;
    },
    touch(id) {
      const record = records.get(id);
      if (record) record.lastUsedAt = now();
    },
    async close(id) {
      return closeOne(id);
    },
    async sweep() {
      const expired: string[] = [];
      for (const [id, record] of records) {
        if (isExpired(record)) expired.push(id);
      }
      for (const id of expired) await closeOne(id);
      return expired.length;
    },
    size() {
      return records.size;
    },
    ids() {
      return Array.from(records.keys());
    },
  };
};
