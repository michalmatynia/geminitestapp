import { JobStatusDto } from '../contracts/jobs';

import type { StatusDto, DtoBase } from '../contracts/base';

// Consolidated core types for the application
export type Status = StatusDto;

export type JobStatus = JobStatusDto;

export type BaseRecord = DtoBase;

export type Entity = BaseRecord;

export type Dto = DtoBase;
