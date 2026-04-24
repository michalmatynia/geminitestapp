import { describe, expect, it, vi } from 'vitest';

import { createProbeSessionStore, type ProbeSessionHandle } from './probe-session';

const makeHandle = (): ProbeSessionHandle & { closed: boolean } => {
  const handle = { closed: false, async close() { handle.closed = true; } };
  return handle;
};

describe('createProbeSessionStore', () => {
  it('creates and retrieves a session by id', () => {
    let id = 0;
    const store = createProbeSessionStore({ generateId: () => `s-${++id}` });
    const handle = makeHandle();
    const record = store.create({ url: 'https://x', handle });
    expect(record.id).toBe('s-1');
    expect(store.get('s-1')?.url).toBe('https://x');
  });

  it('expires sessions past their TTL and closes the handle', () => {
    let currentTime = 0;
    const store = createProbeSessionStore({ ttlMs: 100, now: () => currentTime });
    const handle = makeHandle();
    const created = store.create({ url: 'https://x', handle });
    currentTime = 1_000;
    expect(store.get(created.id)).toBeNull();
  });

  it('touch resets lastUsedAt', () => {
    let currentTime = 0;
    const store = createProbeSessionStore({ ttlMs: 100, now: () => currentTime });
    const created = store.create({ url: 'https://x', handle: makeHandle() });
    currentTime = 80;
    store.touch(created.id);
    currentTime = 150;
    expect(store.get(created.id)?.id).toBe(created.id);
  });

  it('evicts oldest sessions over maxSessions and closes them', async () => {
    let id = 0;
    const handles = Array.from({ length: 4 }, () => makeHandle());
    const store = createProbeSessionStore({ maxSessions: 2, generateId: () => `s-${++id}` });
    for (let i = 0; i < 4; i += 1) {
      store.create({ url: `https://${i}`, handle: handles[i]! });
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.size()).toBe(2);
    expect(handles[0]!.closed).toBe(true);
    expect(handles[1]!.closed).toBe(true);
  });

  it('sweep returns count of expired sessions removed', async () => {
    let currentTime = 0;
    const store = createProbeSessionStore({ ttlMs: 100, now: () => currentTime });
    store.create({ id: 'a', url: 'https://a', handle: makeHandle() });
    store.create({ id: 'b', url: 'https://b', handle: makeHandle() });
    currentTime = 500;
    expect(await store.sweep()).toBe(2);
    expect(store.size()).toBe(0);
  });

  it('close removes the session and reports success', async () => {
    const handle = makeHandle();
    const store = createProbeSessionStore();
    store.create({ id: 'a', url: 'https://a', handle });
    expect(await store.close('a')).toBe(true);
    expect(handle.closed).toBe(true);
    expect(await store.close('a')).toBe(false);
  });

  it('uses crypto-backed default ids when not injected', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    const store = createProbeSessionStore();
    store.create({ url: 'https://x', handle: makeHandle() });
    expect(spy).toHaveBeenCalled();
  });
});
