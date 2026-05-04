/**
 * System Log Types
 * 
 * Type definitions for system log documents and structures.
 * Provides:
 * - MongoDB system log document types
 * - Log level type definitions
 * - Log category and source types
 * - Service identification types
 * - Database document structure types
 */

import type { ObjectId } from 'mongodb';

export type MongoSystemLogDoc = {
  _id?: string | ObjectId;
  id?: string;
  level?: string;
  message?: string;
  category?: string | null;
  source?: string | null;
  service?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  spanId?: string | null;
  parentSpanId?: string | null;
  userId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string | null;
};
