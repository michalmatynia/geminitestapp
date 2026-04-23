import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFilesystemScripterRegistry } from './filesystem-scripter-registry';
import { createInMemoryScripterRegistry } from './scripter-registry';
import type { ScripterDefinition } from './types';

const makeDef = (overrides: Partial<ScripterDefinition> = {}): ScripterDefinition => ({
  id: 'shop-example',
  version: 1,
  siteHost: 'shop.example',
  entryUrl: 'https://shop.example/products',
  steps: [{ id: 'open', kind: 'goto', url: 'https://shop.example/products' }],
  fieldMap: { bindings: { title: { path: 'name' } } },
  ...overrides,
});

describe('createInMemoryScripterRegistry', () => {
  it('validates seed entries', () => {
    const badDef = { ...makeDef(), id: '' } as unknown as ScripterDefinition;
    expect(() => createInMemoryScripterRegistry([badDef])).toThrow(/Invalid scripter definition/);
  });

  it('lists sorted entries and retrieves by id', async () => {
    const registry = createInMemoryScripterRegistry([
      makeDef({ id: 'b-site' }),
      makeDef({ id: 'a-site' }),
    ]);
    const list = await registry.list();
    expect(list.map((e) => e.id)).toEqual(['a-site', 'b-site']);
    const fetched = await registry.get('a-site');
    expect(fetched?.id).toBe('a-site');
  });

  it('rejects saves that downgrade version', async () => {
    const registry = createInMemoryScripterRegistry([makeDef({ version: 3 })]);
    await expect(registry.save(makeDef({ version: 2 }))).rejects.toThrow(/version conflict/);
  });

  it('upserts when version is equal or greater', async () => {
    const registry = createInMemoryScripterRegistry([makeDef({ version: 1 })]);
    await registry.save(makeDef({ version: 2, description: 'updated' }));
    const fetched = await registry.get('shop-example');
    expect(fetched?.version).toBe(2);
    expect(fetched?.description).toBe('updated');
  });

  it('deletes entries', async () => {
    const registry = createInMemoryScripterRegistry([makeDef()]);
    expect(await registry.delete('shop-example')).toBe(true);
    expect(await registry.delete('shop-example')).toBe(false);
    expect(await registry.get('shop-example')).toBeNull();
  });
});

describe('createFilesystemScripterRegistry', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'scripter-reg-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('persists definitions as JSON on save and reads them back on get', async () => {
    const registry = createFilesystemScripterRegistry(dir);
    await registry.save(makeDef());
    const stored = await readFile(join(dir, 'shop-example.json'), 'utf8');
    expect(JSON.parse(stored).id).toBe('shop-example');

    const fresh = createFilesystemScripterRegistry(dir);
    const fetched = await fresh.get('shop-example');
    expect(fetched?.id).toBe('shop-example');
  });

  it('lists all valid files in the directory', async () => {
    const registry = createFilesystemScripterRegistry(dir);
    await registry.save(makeDef({ id: 'aaa' }));
    await registry.save(makeDef({ id: 'bbb' }));
    const list = await registry.list();
    expect(list.map((e) => e.id)).toEqual(['aaa', 'bbb']);
  });

  it('rejects unsafe ids', async () => {
    const registry = createFilesystemScripterRegistry(dir);
    await expect(registry.save(makeDef({ id: '../escape' }))).rejects.toThrow(/Invalid scripter id/);
  });

  it('rejects saves that downgrade version', async () => {
    const registry = createFilesystemScripterRegistry(dir);
    await registry.save(makeDef({ version: 5 }));
    await expect(registry.save(makeDef({ version: 4 }))).rejects.toThrow(/version conflict/);
  });

  it('delete returns false when file missing', async () => {
    const registry = createFilesystemScripterRegistry(dir);
    expect(await registry.delete('nope')).toBe(false);
  });
});
