/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { MessageSquareQuote } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminChatbotPageLayout } from '@/shared/ui/admin-chatbot-page-layout';

describe('AdminChatbotPageLayout', () => {
  it('renders the shared chatbot page shell with breadcrumbs, heading, and icon support', () => {
    render(
      <AdminChatbotPageLayout
        title='Chatbot Context'
        current='Context'
        description='Manage chatbot contexts.'
        icon={<MessageSquareQuote data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Create Context</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminChatbotPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Chatbot' })).toHaveAttribute(
      'href',
      '/admin/chatbot'
    );
    expect(screen.getByRole('heading', { name: 'Chatbot Context' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Context' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
