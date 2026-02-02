// Minimal types - single source of truth
export type Status = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type MongoSettingRecord = { _id: string; key: string; value: string };

export type SettingRecord = { key: string; value: string };

export type MongoDocument<T> = T & { _id: string };

export type ApiParams = { id: string };