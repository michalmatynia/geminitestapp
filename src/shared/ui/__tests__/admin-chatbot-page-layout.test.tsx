/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { MessageSquareQuote } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminChatbotPageLayout } from '@/shared/ui/admin-chatbot-page-layout';

describe('AdminChatbotPageLayout', () => {
  it('renders the shared chatbot page shell with breadcrumbs and header content', () => {
    render(
      <AdminChatbotPageLayout
        title='Chat Sessions'
        current='Sessions'
        description='History of conversations.'
        icon={<MessageSquareQuote data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Refresh</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminChatbotPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Chatbot' })).toHaveAttribute('href', '/admin/chatbot');
    expect(screen.getByRole('heading', { name: 'Chat Sessions' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
