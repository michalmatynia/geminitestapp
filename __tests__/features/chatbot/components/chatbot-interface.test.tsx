/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ChatInterface } from '@/features/ai/chatbot/components/ChatInterface';
import { ChatMessage } from '@/shared/types/chatbot';

describe('ChatInterface', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  const mockMessages: ChatMessage[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
  ];

  const defaultProps = {
    messages: [],
    input: '',
    setInput: vi.fn(),
    isSending: false,
    onSend: vi.fn((e) => e.preventDefault()),
    renderFormattedMessage: (content: string) => content,
  };

  it('renders \'Start a conversation\' when no messages', () => {
    render(<ChatInterface {...defaultProps} />);
    expect(screen.getByText('Start a conversation...')).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    render(<ChatInterface {...defaultProps} messages={mockMessages} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('calls setInput on input change', () => {
    render(<ChatInterface {...defaultProps} />);
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'New message' } });
    expect(defaultProps.setInput).toHaveBeenCalledWith('New message');
  });

  it('calls onSend on form submit', () => {
    render(<ChatInterface {...defaultProps} input="Hello" />);
    const button = screen.getByRole('button', { name: 'Send' });
    fireEvent.click(button);
    expect(defaultProps.onSend).toHaveBeenCalled();
  });

  it('disables input and button while sending', () => {
    render(<ChatInterface {...defaultProps} isSending={true} input="Hello" />);
    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
  });

  it('disables send button when input is empty', () => {
    render(<ChatInterface {...defaultProps} input="" />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
