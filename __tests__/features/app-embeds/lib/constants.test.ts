import { describe, it, expect } from 'vitest';

import { APP_EMBED_OPTIONS } from '@/features/app-embeds/lib/constants';

describe('APP_EMBED_OPTIONS', () => {
  it('should have correct number of options', () => {
    expect(APP_EMBED_OPTIONS).toHaveLength(5);
  });

  it('should contain chatbot option', () => {
    const chatbot = APP_EMBED_OPTIONS.find((o) => o.id === 'chatbot');
    expect(chatbot).toBeDefined();
    expect(chatbot?.label).toBe('Chatbot');
    expect(chatbot?.settingsRoute).toBe('/admin/chatbot');
  });

  it('should contain ai-paths option', () => {
    const aiPaths = APP_EMBED_OPTIONS.find((o) => o.id === 'ai-paths');
    expect(aiPaths).toBeDefined();
    expect(aiPaths?.label).toBe('AI Paths');
    expect(aiPaths?.settingsRoute).toBe('/admin/ai-paths');
  });

  it('should contain notes option', () => {
    const notes = APP_EMBED_OPTIONS.find((o) => o.id === 'notes');
    expect(notes).toBeDefined();
    expect(notes?.label).toBe('Notes');
    expect(notes?.settingsRoute).toBe('/admin/notes');
  });

  it('should contain products option', () => {
    const products = APP_EMBED_OPTIONS.find((o) => o.id === 'products');
    expect(products).toBeDefined();
    expect(products?.label).toBe('Products');
    expect(products?.settingsRoute).toBe('/admin/products');
  });

  it('should contain kangur option', () => {
    const kangur = APP_EMBED_OPTIONS.find((o) => o.id === 'kangur');
    expect(kangur).toBeDefined();
    expect(kangur?.label).toBe('Kangur');
    expect(kangur?.settingsRoute).toBe('/admin/kangur/settings');
  });
});
