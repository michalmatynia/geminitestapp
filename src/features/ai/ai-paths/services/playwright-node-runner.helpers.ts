import 'server-only';

import os from 'os';
import path from 'path';

import { getPlaywrightRuntime } from '@/shared/lib/playwright/runtime';

export const RUN_ROOT_DIR = path.join(os.tmpdir(), 'ai-paths-playwright-runs');
export const RUN_TTL_MS = 24 * 60 * 60 * 1000;

export const getPlaywright = (): typeof import('playwright') => getPlaywrightRuntime();

export type PlaywrightHelperTarget = {
  scrollIntoViewIfNeeded?: (() => Promise<unknown> | unknown) | undefined;
  click?: ((options?: Record<string, unknown>) => Promise<unknown> | unknown) | undefined;
  boundingBox?:
    | (() =>
        | Promise<{ x: number; y: number; width: number; height: number } | null>
        | { x: number; y: number; width: number; height: number }
        | null)
    | undefined;
};

export const normalizeDelayRange = (min: number, max: number): { min: number; max: number } => {
  const safeMin = Math.max(0, Math.trunc(Number.isFinite(min) ? min : 0));
  const safeMax = Math.max(0, Math.trunc(Number.isFinite(max) ? max : 0));
  return {
    min: Math.min(safeMin, safeMax),
    max: Math.max(safeMin, safeMax),
  };
};

export const pickDelayInRange = (min: number, max: number): number => {
  const normalized = normalizeDelayRange(min, max);
  if (normalized.min === normalized.max) {
    return normalized.min;
  }
  return normalized.min + Math.floor(Math.random() * (normalized.max - normalized.min + 1));
};

export const pickSignedOffset = (magnitude: number): number => {
  const safeMagnitude = Math.max(0, Math.trunc(Number.isFinite(magnitude) ? magnitude : 0));
  if (safeMagnitude === 0) {
    return 0;
  }
  return Math.floor(Math.random() * (safeMagnitude * 2 + 1)) - safeMagnitude;
};

export const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const resolveRunStatePath = (runId: string): string => path.join(RUN_ROOT_DIR, `${runId}.json`);

export const resolveRunArtifactsDir = (runId: string): string => path.join(RUN_ROOT_DIR, runId);
