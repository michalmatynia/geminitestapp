import { describe, expect, it } from 'vitest';

import * as databasePublic from './public';

describe('database public barrel', () => {
  it('continues exposing the database admin pages', () => {
    expect(databasePublic).toHaveProperty('DatabasePreviewPage');
    expect(databasePublic).toHaveProperty('DatabasesPage');
    expect(databasePublic).toHaveProperty('DatabaseOperationsPage');
    expect(databasePublic).toHaveProperty('DatabaseEnginePage');
  });

  it('continues exposing runtime API and contract entry points', () => {
    expect(databasePublic).toHaveProperty('getDatabaseStatus');
    expect(databasePublic).toHaveProperty('getDatabasePreview');
    expect(databasePublic).toHaveProperty('executeCrudOperation');
    expect(databasePublic).toHaveProperty('databaseTypeSchema');
  });
});
