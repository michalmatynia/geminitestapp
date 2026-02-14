export type JobStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'canceled' 
  | 'success' 
  | 'listed' 
  | 'deleted' 
  | 'removed' 
  | 'processing' 
  | 'in_progress' 
  | 'queued' 
  | 'queued_relist' 
  | 'needs_login' 
  | 'auth_required'
  | 'unknown';

export interface JobRowData {
  id: string;
  type: string;
  status: JobStatus;
  entityName: string;
  entitySubText?: string | undefined;
  entityId?: string | undefined;
  productId?: string | undefined;
  createdAt: string | Date;
  finishedAt?: string | Date | null;
  errorMessage?: string | null;
  integrationName?: string;
}
