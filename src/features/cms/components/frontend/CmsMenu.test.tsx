/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enMessages from '@/i18n/messages/en.json';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    ...rest
  }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) => (
    <img alt={alt} src={src} {...rest} />
  ),
}));

import { CmsMenu } from '@/features/cms/components/frontend/CmsMenu';
import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { DEFAULT_MENU_SETTINGS } from '@/shared/contracts/cms-menu';

describe('CmsMenu accessibility', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/en/about');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  const renderMenu = (menu: typeof DEFAULT_MENU_SETTINGS) =>
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <CmsStorefrontAppearanceProvider initialMode='default'>
          <CmsMenu menu={menu} />
        </CmsStorefrontAppearanceProvider>
      </NextIntlClientProvider>
    );

  it('announces site navigation, current page state, and external link behavior', () => {
    renderMenu({
      ...DEFAULT_MENU_SETTINGS,
      items: [
        { id: 'home', label: 'Home', url: '/', imageUrl: '' },
        { id: 'about', label: 'About', url: '/about/', imageUrl: '/about.png' },
        { id: 'docs', label: 'Docs', url: 'https://example.com/docs', imageUrl: '' },
      ],
      showItemImages: true,
    });

    expect(screen.getByRole('navigation', { name: 'Nawigacja strony' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('target', '_blank');
  });

  it('exposes the collapsible navigation state to assistive tech', () => {
    renderMenu({
      ...DEFAULT_MENU_SETTINGS,
      collapsible: true,
      collapsedByDefault: false,
      items: [
        { id: 'home', label: 'Home', url: '/', imageUrl: '' },
        { id: 'about', label: 'About', url: '/about', imageUrl: '' },
      ],
    });

    const toggle = screen.getByRole('button', { name: 'Zwin nawigacje' });
    const list = screen.getByRole('list');

    expect(toggle).toHaveAttribute('aria-controls', list.id);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAccessibleName('Rozwin nawigacje');
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  });

  it('renders storefront appearance controls and updates the navbar mode', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <CmsStorefrontAppearanceProvider initialMode='default'>
          <CmsMenu
            menu={{
              ...DEFAULT_MENU_SETTINGS,
              items: [{ id: 'home', label: 'Home', url: '/', imageUrl: '' }],
            }}
          />
        </CmsStorefrontAppearanceProvider>
      </NextIntlClientProvider>
    );

    const navigation = screen.getByRole('navigation', { name: 'Nawigacja strony' });
    const themeToggleButton = screen.getByRole('button', { name: 'Switch to Dark theme' });

    expect(navigation).toHaveAttribute('data-appearance-mode', 'default');

    fireEvent.click(themeToggleButton);

    expect(navigation).toHaveAttribute('data-appearance-mode', 'dark');
    expect(screen.getByRole('button', { name: 'Switch to Default theme' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
