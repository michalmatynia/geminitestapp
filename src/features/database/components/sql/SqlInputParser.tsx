import { MONGO_OPERATIONS, type MongoCommandInput } from '@/shared/contracts/database';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { asRecord } from '@/shared/utils/type-utils';

interface RawMongoCommand {
  collection?: unknown;
  operation?: unknown;
  filter?: unknown;
  pipeline?: unknown;
  data?: unknown;
}

function validateOperation(op: unknown): MongoCommandInput['operation'] {
  if (typeof op === 'string') {
    const valid = Array.from(MONGO_OPERATIONS);
    if (valid.includes(op)) {
      return op as MongoCommandInput['operation'];
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
    logClientError(error);
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
