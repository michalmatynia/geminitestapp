import 'server-only';

import { AsyncLocalStorage } from 'node:async_hooks';

export type ServerRequestContext = {
  pathname: string | null;
  requestUrl: string | null;
  headers: Headers;
};

interface IAsyncLocalStorage<T> {
  getStore(): T | undefined;
  run<R>(store: T, callback: () => R): R;
}

type ServerRequestContextGlobal = typeof globalThis & {
  __geminitestappServerRequestContextStorage?: IAsyncLocalStorage<ServerRequestContext>;
};

const requestContextGlobal = globalThis as ServerRequestContextGlobal;

const storage =
  requestContextGlobal.__geminitestappServerRequestContextStorage ??
  new AsyncLocalStorage<ServerRequestContext>();

if (!requestContextGlobal.__geminitestappServerRequestContextStorage) {
  requestContextGlobal.__geminitestappServerRequestContextStorage = storage;
}

export const serverRequestContextStorage = storage;

export const getServerRequestContext = (): ServerRequestContext | undefined =>
  serverRequestContextStorage.getStore();

export const readServerRequestPathname = (): string | null =>
  getServerRequestContext()?.pathname ?? null;

export const readServerRequestHeaders = (): Headers | null =>
  getServerRequestContext()?.headers ?? null;

export const runWithServerRequestContext = <T>(
  context: ServerRequestContext,
  fn: () => T
): T => serverRequestContextStorage.run(context, fn);
