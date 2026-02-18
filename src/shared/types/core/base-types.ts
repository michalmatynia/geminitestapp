import { DtoBase, NamedDto, Localized, CreateDto, UpdateDto } from '../base';
import type { StatusDto } from '../../contracts/base';

export type { DtoBase, NamedDto, Localized, CreateDto, UpdateDto };

import type { SettingRecordDto } from '../../dtos/settings';

// Minimal types - single source of truth
export type Status = StatusDto;

export type Entity = DtoBase;

export type MongoSettingRecord = { _id: string; key: string; value: string };

export type SettingRecord = SettingRecordDto;

export type MongoDocument<T> = T & { _id: string };

export type ApiParams = { id: string };
