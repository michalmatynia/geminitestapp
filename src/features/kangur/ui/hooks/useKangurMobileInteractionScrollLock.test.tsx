/**
 * @vitest-environment jsdom
 */

import { render } from '@/__tests__/test-utils';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useKangurMobileInteractionScrollLock } from './useKangurMobileInteractionScrollLock';

function TouchLockProbe({
  active,
}: {
  active: boolean;
}): JSX.Element {
  const { lock, unlock } = useKangurMobileInteractionScrollLock();

  useEffect(() => {
    if (active) {
      lock();
    } else {
      unlock();
    }
  }, [active, lock, unlock]);

  return <div>lock test</div>;
}

describe('useKangurMobileInteractionScrollLock', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    document.body.removeAttribute('style');
    for (const key of Object.keys(document.body.dataset)) {
      delete document.body.dataset[key];
    }
    for (const key of Object.keys(document.documentElement.dataset)) {
      delete document.documentElement.dataset[key];
    }

    const appContent = document.createElement('main');
    appContent.id = 'app-content';
    document.body.replaceChildren(appContent);

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query === '(max-width: 639px)',
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }),
      writable: true,
    });
  });

  it('locks and unlocks scroll on mobile interactions', () => {
    const appContent = document.getElementById('app-content');
    expect(appContent).not.toBeNull();

    const { rerender } = render(<TouchLockProbe active={false} />);
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.documentElement.style.overscrollBehaviorY).toBe('');
    expect(document.documentElement.style.touchAction).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.touchAction).toBe('');
    expect(appContent?.style.overflow).toBe('');

    rerender(<TouchLockProbe active />);

    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overscrollBehaviorY).toBe('none');
    expect(document.documentElement.style.touchAction).toBe('none');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.touchAction).toBe('none');
    expect(document.body.style.overscrollBehaviorY).toBe('none');
    expect(appContent?.style.overflow).toBe('hidden');
    expect(appContent?.style.touchAction).toBe('none');
    expect(appContent?.style.overscrollBehaviorY).toBe('none');

    rerender(<TouchLockProbe active={false} />);

    expect(document.documentElement.style.overflow).toBe('');
    expect(document.documentElement.style.overscrollBehaviorY).toBe('');
    expect(document.documentElement.style.touchAction).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.touchAction).toBe('');
    expect(document.body.style.overscrollBehaviorY).toBe('');
    expect(appContent?.style.overflow).toBe('');
    expect(appContent?.style.touchAction).toBe('');
    expect(appContent?.style.overscrollBehaviorY).toBe('');
  });
});
