export type ProductAiJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled';

export type ProductAiJobRecord = {
  id: string;
  productId: string;
  status: ProductAiJobStatus;
  type: string;
  payload: unknown;
  result?: unknown;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

export type ProductAiJobUpdate = Partial<
  Pick<
    ProductAiJobRecord,
    | 'status'
    | 'type'
    | 'payload'
    | 'result'
    | 'errorMessage'
    | 'startedAt'
    | 'finishedAt'
  >
> & {
  productId?: string;
  createdAt?: Date;
};

export type ProductAiJobRepository = {
  createJob(
    productId: string,
    type: string,
    payload: unknown
  ): Promise<ProductAiJobRecord>;
  findJobs(productId?: string): Promise<ProductAiJobRecord[]>;
  findJobById(jobId: string): Promise<ProductAiJobRecord | null>;
  findNextPendingJob(): Promise<ProductAiJobRecord | null>;
  findAnyPendingJob(): Promise<ProductAiJobRecord | null>;
  claimNextPendingJob(): Promise<ProductAiJobRecord | null>;
  updateJob(jobId: string, data: ProductAiJobUpdate): Promise<ProductAiJobRecord>;
  deleteJob(jobId: string): Promise<void>;
  deleteTerminalJobs(): Promise<{ count: number }>;
  deleteAllJobs(): Promise<{ count: number }>;
  markStaleRunningJobs(maxAgeMs: number): Promise<{ count: number }>;
};
