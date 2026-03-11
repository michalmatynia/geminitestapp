/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminChatbotBreadcrumbs } from '@/shared/ui/admin-chatbot-breadcrumbs';

describe('AdminChatbotBreadcrumbs', () => {
  it('renders the shared Admin to Chatbot breadcrumb trail', () => {
    render(<AdminChatbotBreadcrumbs current='Sessions' />);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Chatbot' })).toHaveAttribute(
      'href',
      '/admin/chatbot'
    );
    expect(screen.getByText('Sessions')).toBeInTheDocument();
  });
});
