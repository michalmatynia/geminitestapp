import { describe, expect, it } from 'vitest';

import * as imageStudioIndex from './index';

describe('image studio index barrel', () => {
  it('continues exposing the image studio admin pages', () => {
    expect(imageStudioIndex).toHaveProperty('AdminImageStudioPage');
    expect(imageStudioIndex).toHaveProperty('AdminImageStudioPromptsPage');
    expect(imageStudioIndex).toHaveProperty('AdminImageStudioSettingsPage');
    expect(imageStudioIndex).toHaveProperty('AdminImageStudioUiPresetsPage');
  });
});
