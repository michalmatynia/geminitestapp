// Consolidated core types for the application
export type Status = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'canceled';

export type JobStatus = Status;

export interface BaseRecord {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Entity extends BaseRecord {}

export interface Dto {
  id: string;
  createdAt: string;
  updatedAt: string;
}