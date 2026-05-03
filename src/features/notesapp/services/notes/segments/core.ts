import 'server-only';
import type { NoteRepository } from '../types/note-repository';
import { configurationError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

let _repository: NoteRepository | null = null;

export const invalidateNoteRepositoryCache = (): void => {
  _repository = null;
};

const resolveNoteProvider = async (): Promise<'mongodb'> => {
  const provider = 'mongodb';
  if (process.env['NODE_ENV'] === 'test') {
    void logSystemEvent({
      level: 'info',
      message: `[note-service] Resolved provider: ${provider}`,
      source: 'note-service',
      context: { appDbProvider: process.env['APP_DB_PROVIDER'] },
    });
  }
  return provider;
};

export async function getRepository(): Promise<NoteRepository> {
  if (!_repository) {
    await resolveNoteProvider();
    const { mongoNoteRepository } = await import('../note-repository/mongo-note-repository');
    _repository = mongoNoteRepository;
  }

  if (!_repository) {
    throw configurationError('Failed to initialize note repository');
  }

  return _repository;
}

export const repoCall = async <K extends keyof NoteRepository>(
  key: K,
  ...args: Parameters<NoteRepository[K]>
): Promise<Awaited<ReturnType<NoteRepository[K]>>> => {
  try {
    const repo = await getRepository();
    const fn = repo[key] as (
      ...args: Parameters<NoteRepository[K]>
    ) => ReturnType<NoteRepository[K]>;
    return (await fn(...args)) as Promise<Awaited<ReturnType<NoteRepository[K]>>>;
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'note-service',
      action: 'repoCall',
      method: key,
    });
    throw error;
  }
};
