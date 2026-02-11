import { DtoBase } from '../base';

import type { SettingRecordDto } from '../../dtos/settings';

// Minimal types - single source of truth
export type Status = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'canceled';

export type Entity = DtoBase;

export type MongoSettingRecord = { _id: string; key: string; value: string };

export type SettingRecord = SettingRecordDto;

export type MongoDocument<T> = T & { _id: string };

export type ApiParams = { id: string };
