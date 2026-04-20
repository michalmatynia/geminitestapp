import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { asRecord } from '@/shared/utils/type-utils';

const MONGO_OPERATIONS = new Set<string>([
  'find',
  'insertOne',
  'updateOne',
  'deleteOne',
  'deleteMany',
  'aggregate',
  'countDocuments',
]);

export type MongoCommandInput = {
  collection: string;
  operation: 'find' | 'insertOne' | 'updateOne' | 'deleteOne' | 'deleteMany' | 'aggregate' | 'countDocuments';
  filter?: Record<string, unknown>;
  pipeline?: unknown[];
  data?: Record<string, unknown> | undefined;
};

interface RawMongoCommand {
  collection?: unknown;
  operation?: unknown;
  filter?: unknown;
  pipeline?: unknown;
  data?: unknown;
}

function validateOperation(op: unknown): MongoCommandInput['operation'] {
  if (typeof op === 'string') {
    const normalized = op.trim();
    if (MONGO_OPERATIONS.has(normalized)) {
      return normalized as MongoCommandInput['operation'];
    }
  }
  throw new Error('Command must include a supported "operation"');
}

function parseInputBody(input: RawMongoCommand): Omit<MongoCommandInput, 'collection' | 'operation'> {
  return {
    filter: asRecord(input.filter) ?? {},
    pipeline: Array.isArray(input.pipeline) ? (input.pipeline as unknown[]) : undefined,
    data: asRecord(input.data),
  };
}

export function parseMongoCommandInput(raw: string): MongoCommandInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error('Invalid command JSON payload');
    logClientError(normalizedError);
    throw new Error('Command must be valid JSON.');
  }

  const input = parsed as RawMongoCommand | null | undefined;
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Command must be a JSON object.');
  }

  const collection = typeof input.collection === 'string' ? input.collection.trim() : '';
  if (collection.length === 0) throw new Error('Command must include a "collection" string.');

  return {
    collection,
    operation: validateOperation(input.operation),
    ...parseInputBody(input),
  };
}
