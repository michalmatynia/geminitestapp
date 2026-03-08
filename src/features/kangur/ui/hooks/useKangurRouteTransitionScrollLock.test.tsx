/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME,
  KANGUR_ROUTE_TRANSITION_SCROLLBAR_GAP_VAR,
  useKangurRouteTransitionScrollLock,
} from '@/features/kangur/ui/hooks/useKangurRouteTransitionScrollLock';

function RouteTransitionScrollLockProbe({
  active,
}: {
  active: boolean;
}): React.JSX.Element {
  useKangurRouteTransitionScrollLock(active);
  return <div>Scroll lock probe</div>;
}

describe('useKangurRouteTransitionScrollLock', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    document.body.className = '';
    document.body.removeAttribute('style');
    document.body.innerHTML = '';

    const appContent = document.createElement('main');
    appContent.id = 'app-content';
    document.body.appendChild(appContent);

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1008,
    });
  });

  it('adds and removes the Kangur route transition lock across the document surface', () => {
    const appContent = document.getElementById('app-content');
    expect(appContent).not.toBeNull();

    const { rerender, unmount } = render(<RouteTransitionScrollLockProbe active={false} />);

    expect(document.documentElement).not.toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(document.body).not.toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(appContent).not.toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);

    rerender(<RouteTransitionScrollLockProbe active />);

    expect(document.documentElement).toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(document.body).toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(appContent).toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(document.documentElement).toHaveStyle({
      overflowY: 'hidden',
      overscrollBehaviorY: 'none',
    });
    expect(document.body).toHaveStyle({
      overflowY: 'hidden',
      overscrollBehaviorY: 'none',
    });
    expect(appContent).toHaveStyle({
      [KANGUR_ROUTE_TRANSITION_SCROLLBAR_GAP_VAR]: '16px',
      paddingInlineEnd: '16px',
    });

    rerender(<RouteTransitionScrollLockProbe active={false} />);

    expect(document.documentElement).not.toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(document.body).not.toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(appContent).not.toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(document.documentElement.style.getPropertyValue('overflow-y')).toBe('');
    expect(document.documentElement.style.getPropertyValue('overscroll-behavior-y')).toBe('');
    expect(document.body.style.getPropertyValue('overflow-y')).toBe('');
    expect(document.body.style.getPropertyValue('overscroll-behavior-y')).toBe('');
    expect(appContent?.style.getPropertyValue('padding-inline-end')).toBe('');
    expect(appContent?.style.getPropertyValue(KANGUR_ROUTE_TRANSITION_SCROLLBAR_GAP_VAR)).toBe('');

    rerender(<RouteTransitionScrollLockProbe active />);

    expect(document.documentElement).toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);

    unmount();

    expect(document.documentElement).not.toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(document.body).not.toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(appContent).not.toHaveClass(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    expect(document.documentElement.style.getPropertyValue('overflow-y')).toBe('');
    expect(document.body.style.getPropertyValue('overflow-y')).toBe('');
    expect(appContent?.style.getPropertyValue('padding-inline-end')).toBe('');
  });
});
