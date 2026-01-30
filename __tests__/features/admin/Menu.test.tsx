import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Menu from '@/features/admin/components/Menu';
import { AdminLayoutProvider } from '@/features/admin/context/AdminLayoutContext';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin'),
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
}));

const renderMenu = () => {
  return render(
    <AdminLayoutProvider>
      <Menu />
    </AdminLayoutProvider>
  );
};

describe('Menu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders main menu categories', () => {
    renderMenu();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('System Logs')).toBeInTheDocument();
  });

  it('opens collapsible section when clicked', () => {
    renderMenu();
    const productsTrigger = screen.getByText('Products');
    fireEvent.click(productsTrigger);
    
    // Check if sub-items are visible
    expect(screen.getByText('All Products')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
  });

  it('navigates to create page and collapses menu when Create Page is clicked', () => {
    renderMenu();
    const cmsTrigger = screen.getByText('CMS');
    fireEvent.click(cmsTrigger);
    
    const createPageButton = screen.getByText('Create Page');
    fireEvent.click(createPageButton);
    
    expect(mockPush).toHaveBeenCalledWith('/admin/cms/pages/create');
  });

  it('contains correctly linked standalone sections', () => {
    renderMenu();
    
    const filesLink = screen.getByRole('link', { name: /Files/i });
    expect(filesLink).toHaveAttribute('href', '/admin/files');
    
    const systemLogsLink = screen.getByRole('link', { name: /System Logs/i });
    expect(systemLogsLink).toHaveAttribute('href', '/admin/system/logs');
  });
});
