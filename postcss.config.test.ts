import { describe, expect, it } from 'vitest';

import config from './postcss.config.mjs';

describe('postcss config', () => {
  it('uses the static Tailwind PostCSS plugin config', () => {
    expect(config).toEqual({
      plugins: {
        '@tailwindcss/postcss': {},
      },
    });
  });
});
