export interface ApiEnvelopeDto<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type HttpResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

export interface PaginationDto {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationDto;
  // Legacy compatibility fields
  total?: number;
  page?: number;
  limit?: number;
}

export interface LegacyPaginatedResponseDto<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}
