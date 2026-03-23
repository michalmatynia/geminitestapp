import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchTriggerButtons,
  createTriggerButton,
  updateTriggerButton,
  deleteTriggerButton,
  reorderTriggerButtons,
} from '../triggers';
import * as base from '../base';

vi.mock('../base', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('AI Paths Triggers API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchTriggerButtons', () => {
    it('fetches without params', async () => {
      await fetchTriggerButtons();
      expect(base.apiFetch).toHaveBeenCalledWith('/api/ai-paths/trigger-buttons');
    });

    it('fetches with query params', async () => {
      await fetchTriggerButtons({ entityType: 'product', entityId: '123' });
      expect(base.apiFetch).toHaveBeenCalledWith(
        '/api/ai-paths/trigger-buttons?entityType=product&entityId=123'
      );
    });
  });

  describe('createTriggerButton', () => {
    it('posts the payload', async () => {
      const payload = { pathId: 'test-path', label: 'Click Me' } as any;
      await createTriggerButton(payload);
      expect(base.apiPost).toHaveBeenCalledWith('/api/ai-paths/trigger-buttons', payload);
    });
  });

  describe('updateTriggerButton', () => {
    it('patches the payload to specific ID', async () => {
      const payload = { label: 'Updated' } as any;
      await updateTriggerButton('btn-1', payload);
      expect(base.apiPatch).toHaveBeenCalledWith('/api/ai-paths/trigger-buttons/btn-1', payload);
    });
  });

  describe('deleteTriggerButton', () => {
    it('deletes specific ID', async () => {
      await deleteTriggerButton('btn-1');
      expect(base.apiDelete).toHaveBeenCalledWith('/api/ai-paths/trigger-buttons/btn-1');
    });
  });

  describe('reorderTriggerButtons', () => {
    it('posts the ordered IDs', async () => {
      const payload = { orderedIds: ['btn-2', 'btn-1'] };
      await reorderTriggerButtons(payload);
      expect(base.apiPost).toHaveBeenCalledWith('/api/ai-paths/trigger-buttons/reorder', payload);
    });
  });
});
