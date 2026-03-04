import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChatbotContextModalPanel } from '@/features/ai/chatbot/components/ChatbotContextModal';

describe('ChatbotContextModal runtime context', () => {
  it('throws when used outside provider', () => {
    expect(() => render(<ChatbotContextModalPanel />)).toThrow(
      'useChatbotContextModalRuntime must be used within ChatbotContextModalProvider'
    );
  });
});
