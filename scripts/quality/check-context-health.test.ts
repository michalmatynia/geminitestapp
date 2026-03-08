import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeContextHealth } from './lib/check-context-health.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'context-health-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root, relativeFile, contents) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeContextHealth', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('measures actual provider values instead of unrelated useMemo objects', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/context/SystemLogsContext.tsx',
      `'use client';
import { createContext, useMemo } from 'react';

const SystemLogsContext = createContext(null);

export function SystemLogsProvider({ children }) {
  const filters = useMemo(
    () => ({
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      sixteen: 16,
      seventeen: 17,
    }),
    []
  );

  const stateValue = {
    level: 'all',
    logs: [],
    page: 1,
  };

  return <SystemLogsContext.Provider value={stateValue}>{children}{filters.level}</SystemLogsContext.Provider>;
}
`
    );

    const report = analyzeContextHealth({ root });

    expect(report.issues).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'context-monolith' })])
    );
  });

  it('recognizes inline state and actions hooks as a split context', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/context/SystemLogsContext.tsx',
      `'use client';
import { createContext, useContext } from 'react';

const SystemLogsStateContext = createContext(null);
const SystemLogsActionsContext = createContext(null);

export const useSystemLogsState = () => useContext(SystemLogsStateContext);
export const useSystemLogsActions = () => useContext(SystemLogsActionsContext);

export function SystemLogsProvider({ children }) {
  const stateValue = { level: 'all', logs: [], page: 1, total: 0 };
  const actionsValue = { setPage: () => {}, refresh: () => {} };

  return (
    <SystemLogsActionsContext.Provider value={actionsValue}>
      <SystemLogsStateContext.Provider value={stateValue}>{children}</SystemLogsStateContext.Provider>
    </SystemLogsActionsContext.Provider>
  );
}
`
    );

    const report = analyzeContextHealth({ root });

    expect(report.issues).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'context-monolith' })])
    );
    expect(report.issues).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'context-missing-split' })])
    );
  });

  it('treats multi-context provider files as already split', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/context/DraftCreatorFormContext.tsx',
      `'use client';
import { createContext } from 'react';

const BasicInfoContext = createContext(null);
const MetadataContext = createContext(null);

export function DraftCreatorFormProvider({ children }) {
  const basicInfo = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
  };
  const metadata = { selectedIds: [] };

  return (
    <BasicInfoContext.Provider value={basicInfo}>
      <MetadataContext.Provider value={metadata}>{children}</MetadataContext.Provider>
    </BasicInfoContext.Provider>
  );
}
`
    );

    const report = analyzeContextHealth({ root });

    expect(report.issues).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'context-monolith' })])
    );
    expect(report.issues).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'context-missing-split' })])
    );
  });

  it('treats composed provider files as already split even when contexts are imported', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/context/PromptEngineContext.tsx',
      `'use client';
import { ConfigContext } from './ConfigContext';
import { DataContext } from './DataContext';

export function PromptEngineProvider({ children }) {
  const configValue = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
  };
  const dataValue = { ready: true };

  return (
    <ConfigContext.Provider value={configValue}>
      <DataContext.Provider value={dataValue}>{children}</DataContext.Provider>
    </ConfigContext.Provider>
  );
}
`
    );

    const report = analyzeContextHealth({ root });

    expect(report.issues).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'context-monolith' })])
    );
    expect(report.issues).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'context-missing-split' })])
    );
  });

  it('warns when the actual provider value exceeds the field threshold', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/example/context/ProductStudioContext.tsx',
      `'use client';
import { createContext } from 'react';

const ProductStudioContext = createContext(null);

export function ProductStudioProvider({ children }) {
  const stateValue = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
  };

  return <ProductStudioContext.Provider value={stateValue}>{children}</ProductStudioContext.Provider>;
}
`
    );

    const report = analyzeContextHealth({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'context-monolith',
          file: 'src/features/example/context/ProductStudioContext.tsx',
          severity: 'warn',
        }),
      ])
    );
  });
});
