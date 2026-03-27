/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import EditProductPage from '@/features/products/components/EditProductForm';

const { handleSubmitMock, routerPushMock, useProductFormImagesMock } = vi.hoisted(() => ({
  handleSubmitMock: vi.fn(),
  routerPushMock: vi.fn(),
  useProductFormImagesMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: routerPushMock })),
  usePathname: vi.fn(() => '/admin/products'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('@/features/products/components/ProductForm', () => ({
  default: () => <div data-testid='product-form'>product form</div>,
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => ({
    uploading: false,
    handleSubmit: handleSubmitMock,
    hasUnsavedChanges: true,
  }),
}));

vi.mock('@/features/products/context/ProductFormImageContext', () => ({
  useProductFormImages: () => useProductFormImagesMock(),
}));

vi.mock('@/features/products/context/ProductFormContext', async () => {
  const ReactModule = await import('react');
  return {
    ProductFormProviderRuntimeContext: ReactModule.createContext<unknown>(null),
    ProductFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('EditProductPage', () => {
  beforeEach(() => {
    handleSubmitMock.mockReset();
    routerPushMock.mockReset();
    useProductFormImagesMock.mockReset();
    useProductFormImagesMock.mockReturnValue({
      showFileManager: false,
      handleMultiFileSelect: vi.fn(),
    });
  });

  it('renders the shared product breadcrumb header and routes save and close actions', () => {
    render(<EditProductPage product={{ id: 'product-1' } as Parameters<typeof EditProductPage>[0]['product']} />);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute(
      'href',
      '/admin/products'
    );
    expect(screen.getByRole('heading', { name: 'Edit Product' })).toBeInTheDocument();
    expect(screen.getByTestId('product-form')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(handleSubmitMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Back to products' }));
    expect(routerPushMock).toHaveBeenCalledWith('/admin/products');
  });
});
