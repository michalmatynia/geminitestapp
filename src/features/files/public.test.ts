import { describe, expect, it } from 'vitest';

import filesDefault, * as filesPublic from './public';

describe('files public barrel', () => {
  it('continues exposing the client-safe file manager surface', () => {
    expect(filesDefault).toBe(filesPublic.FileManager);
    expect(filesPublic).toHaveProperty('FileManagerRuntimeContext');
    expect(filesPublic).toHaveProperty('FileUploadEventsPanel');
  });

  it('continues exposing admin file pages', () => {
    expect(filesPublic).toHaveProperty('AdminFilesPage');
    expect(filesPublic).toHaveProperty('AdminFileStorageSettingsPage');
  });
});
