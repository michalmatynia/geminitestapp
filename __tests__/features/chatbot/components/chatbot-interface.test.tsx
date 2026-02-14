/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ChatInterface } from '@/features/ai/chatbot/components/ChatInterface';
import { useChatbot } from '@/features/ai/chatbot/context/ChatbotContext';

vi.mock('@/features/ai/chatbot/context/ChatbotContext', () => ({
  useChatbot: vi.fn(),
}));

describe('ChatInterface', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.clearAllMocks();
  });

  const mockMessages = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
  ];

  const defaultMockValue = {
    messages: [],
    input: '',
    setInput: vi.fn(),
    isSending: false,
    sendMessage: vi.fn(),
  };

  it('renders \'Start a conversation\' when no messages', () => {
    vi.mocked(useChatbot).mockReturnValue(defaultMockValue);
    render(<ChatInterface />);
    expect(screen.getByText('Start a conversation...')).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    vi.mocked(useChatbot).mockReturnValue({
      ...defaultMockValue,
      messages: mockMessages,
    });
    render(<ChatInterface />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('calls setInput on input change', () => {
    const setInput = vi.fn();
    vi.mocked(useChatbot).mockReturnValue({
      ...defaultMockValue,
      setInput,
    });
    render(<ChatInterface />);
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'New message' } });
    expect(setInput).toHaveBeenCalledWith('New message');
  });

  it('calls sendMessage on form submit', () => {
    const sendMessage = vi.fn();
    vi.mocked(useChatbot).mockReturnValue({
      ...defaultMockValue,
      input: 'Hello',
      sendMessage,
    });
    render(<ChatInterface />);
    const button = screen.getByRole('button', { name: 'Send' });
    fireEvent.click(button);
    expect(sendMessage).toHaveBeenCalled();
  });

  it('disables input and button while sending', () => {
    vi.mocked(useChatbot).mockReturnValue({
      ...defaultMockValue,
      isSending: true,
      input: 'Hello',
    });
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
  });

  it('disables send button when input is empty', () => {
    vi.mocked(useChatbot).mockReturnValue({
      ...defaultMockValue,
      input: '',
    });
    render(<ChatInterface />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
