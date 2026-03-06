import { describe, expect, it } from 'vitest';

import {
  runKernelPath,
  runTransformKernelPath,
  stripRuntimeTelemetry,
} from './engine-core.runtime-kernel-parity.builders';

describe('engine-core runtime-kernel dual-run parity', () => {
  it('keeps outputs and node statuses identical for numeric runtime-kernel path', async () => {
