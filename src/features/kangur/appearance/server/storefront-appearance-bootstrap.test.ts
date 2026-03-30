/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('storefront-appearance-bootstrap', () => {
  it('serializes dark-mode surface vars for the SSR shell bootstrap', async () => {
    const { getKangurSurfaceBootstrapStyle } = await import('./storefront-appearance-bootstrap');

    const css = getKangurSurfaceBootstrapStyle({
      mode: 'dark',
      themeSettings: {
        dark: JSON.stringify({
          cardBg: '#0f172a',
          containerBorderColor: '#334155',
        }),
      },
    });

    expect(css).toContain('html.kangur-surface-active');
    expect(css).toContain('body.kangur-surface-active');
    expect(css).toContain('--kangur-soft-card-border:');
    expect(css).toContain('--kangur-glass-panel-border:');
  });

  it('escapes inline css text before injecting the bootstrap style tag', async () => {
    const { getKangurSurfaceBootstrapStyle } = await import('./storefront-appearance-bootstrap');

    const css = getKangurSurfaceBootstrapStyle({
      mode: 'default',
      themeSettings: {
        default: JSON.stringify({
          backgroundColor: '</style><script>alert(1)</script>',
        }),
      },
    });

    expect(css).not.toContain('<');
  });
});
