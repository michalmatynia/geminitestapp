/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}));

vi.mock('../login-constants', () => ({
  KANGUR_PARENT_CAPTCHA_SITE_KEY: 'test-turnstile-site-key',
  TURNSTILE_SCRIPT_ID: 'kangur-turnstile-script',
  TURNSTILE_SCRIPT_SRC: 'https://example.test/turnstile.js',
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system-client', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

describe('useTurnstile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete (window as Window & { turnstile?: unknown }).turnstile;
    document.getElementById('kangur-turnstile-script')?.remove();
  });

  it('does not load the Turnstile script when disabled', async () => {
    const appendChildSpy = vi.spyOn(document.head, 'appendChild');
    const { useTurnstile } = await import('../use-turnstile');

    renderHook(() =>
      useTurnstile({
        enabled: false,
        onVerify: vi.fn(),
      })
    );

    await waitFor(() => {
      expect(appendChildSpy).not.toHaveBeenCalled();
    });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('keeps script load failures out of the client error pipeline and reports them through onLoadError', async () => {
    const onLoadError = vi.fn();
    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      queueMicrotask(() => {
        (node as HTMLScriptElement).onerror?.(new Event('error'));
      });
      return node;
    });

    const { useTurnstile } = await import('../use-turnstile');

    renderHook(() =>
      useTurnstile({
        enabled: true,
        onVerify: vi.fn(),
        onLoadError,
      })
    );

    await waitFor(() => {
      expect(onLoadError).toHaveBeenCalled();
    });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });
});
