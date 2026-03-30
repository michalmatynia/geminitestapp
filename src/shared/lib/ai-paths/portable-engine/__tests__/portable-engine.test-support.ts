import { createHash } from 'node:crypto';

import type { PathConfig } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

export const ensureCryptoSubtleDigestForTest = (): (() => void) => {
  if (
    globalThis.crypto?.subtle &&
    typeof globalThis.crypto.subtle.digest === 'function' &&
    typeof globalThis.crypto.subtle.importKey === 'function' &&
    typeof globalThis.crypto.subtle.sign === 'function'
  ) {
    return () => {};
  }
  const previous = globalThis.crypto;
  const asBytes = (data: BufferSource): Uint8Array =>
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const subtle = {
    digest: async (_algorithm: string, data: BufferSource): Promise<ArrayBuffer> => {
      const bytes = asBytes(data);
      const digest = createHash('sha256').update(Buffer.from(bytes)).digest();
      return digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength);
    },
    importKey: async (_format: string, keyData: BufferSource): Promise<{ key: Buffer }> => ({
      key: Buffer.from(asBytes(keyData)),
    }),
    sign: async (
      _algorithm: string | { name: string; hash?: string },
      key: { key: Buffer },
      data: BufferSource
    ): Promise<ArrayBuffer> => {
      const signature = createHash('sha256')
        .update(createHash('sha256').update(key.key).digest())
        .update(Buffer.from(asBytes(data)))
        .digest();
      return signature.buffer.slice(
        signature.byteOffset,
        signature.byteOffset + signature.byteLength
      );
    },
  };
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    writable: true,
    value: { subtle },
  });
  return () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      writable: true,
      value: previous,
    });
  };
};

export const buildInvalidCompilePath = (): PathConfig => {
  const base = createDefaultPathConfig('path_portable_invalid_compile');
  const sourceNode = base.nodes[0]!;
  return {
    ...base,
    nodes: [
      {
        ...sourceNode,
        type: 'model',
        title: 'Model',
        description: 'Model without required prompt wiring.',
        inputs: ['prompt'],
        outputs: ['result'],
      },
    ],
    edges: [],
  };
};
