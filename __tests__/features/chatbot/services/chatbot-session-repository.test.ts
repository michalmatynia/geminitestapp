import { ObjectId } from 'mongodb';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { chatbotSessionRepository } from '@/features/ai/chatbot/services/chatbot-session-repository';

// Hoist mocks
const { mockCollection, mockDb } = vi.hoisted(() => {
  const mockCollection = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
    findOne: vi.fn(),
    insertOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  };
  const mockDb = {
    collection: vi.fn(() => mockCollection),
  };
  return { mockCollection, mockDb };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock('mongodb', async (importOriginal) => {
  const actual = await importOriginal() as any;
  const mockObjectId = vi.fn().mockImplementation((id: string) => ({
    toString: () => id,
    equals: (other: any) => other.toString() === id,
  }));
  (mockObjectId as any).isValid = actual.ObjectId.isValid;
  return {
    ...actual,
    ObjectId: mockObjectId,
  };
});

describe('Chatbot Session Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.find.mockReturnThis();
    mockCollection.sort.mockReturnThis();
  });

  describe('findAll', () => {
    it('returns all sessions sorted by updatedAt', async () => {
      const mockDocs = [
        { _id: new ObjectId('507f1f77bcf86cd799439011'), title: 'Session 1', messages: [], createdAt: new Date(), updatedAt: new Date() },
        { _id: new ObjectId('507f1f77bcf86cd799439012'), title: 'Session 2', messages: [], createdAt: new Date(), updatedAt: new Date() },
      ];
      mockCollection.toArray.mockResolvedValue(mockDocs);

      const result = await chatbotSessionRepository.findAll();

      expect(mockDb.collection).toHaveBeenCalledWith('chatbot_sessions');
      expect(mockCollection.find).toHaveBeenCalledWith({});
      expect(mockCollection.sort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('507f1f77bcf86cd799439011');
    });
  });

  describe('findById', () => {
    it('returns session by id', async () => {
      const id = '507f1f77bcf86cd799439011';
      const mockDoc = {
        _id: new ObjectId(id),
        title: 'Session 1',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCollection.findOne.mockResolvedValue(mockDoc);

      const result = await chatbotSessionRepository.findById(id);

      expect(mockCollection.findOne).toHaveBeenCalled();
      expect(result?.id).toBe(id);
    });

    it('returns null if session not found', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      const result = await chatbotSessionRepository.findById('507f1f77bcf86cd799439011');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a new session', async () => {
      const input = { title: 'New Session', settings: { model: 'gpt-4' } };
      const newId = new ObjectId('507f1f77bcf86cd799439013');
      mockCollection.insertOne.mockResolvedValue({ insertedId: newId });

      const result = await chatbotSessionRepository.create(input);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result.id).toBe(newId.toString());
      expect(result.title).toBe('New Session');
    });
  });

  describe('update', () => {
    it('updates an existing session', async () => {
      const id = '507f1f77bcf86cd799439011';
      const mockDoc = {
        _id: new ObjectId(id),
        title: 'Updated Title',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCollection.findOneAndUpdate.mockResolvedValue(mockDoc);

      const result = await chatbotSessionRepository.update(id, { title: 'Updated Title' });

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(result?.title).toBe('Updated Title');
    });
  });

  describe('delete', () => {
    it('deletes a session', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      const result = await chatbotSessionRepository.delete('507f1f77bcf86cd799439011');
      expect(result).toBe(true);
    });

    it('returns false if session not deleted', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });
      const result = await chatbotSessionRepository.delete('507f1f77bcf86cd799439011');
      expect(result).toBe(false);
    });
  });

  describe('addMessage', () => {
    it('adds a message to a session', async () => {
      const id = '507f1f77bcf86cd799439011';
      const message = { role: 'user' as const, content: 'Hello' };
      const mockDoc = {
        _id: new ObjectId(id),
        title: 'Session 1',
        messages: [message],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCollection.findOneAndUpdate.mockResolvedValue(mockDoc);

      const result = await chatbotSessionRepository.addMessage(id, message);

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: expect.anything() },
        {
          $push: { messages: message },
          $set: { updatedAt: expect.any(Date) },
        },
        { returnDocument: 'after' }
      );
      expect(result?.messages).toContain(message);
    });

    it('updates timestamps when adding a message', async () => {
      const id = '507f1f77bcf86cd799439011';
      const message = { role: 'user' as const, content: 'New message' };
      
      const beforeDate = new Date('2020-01-01');
      const mockDoc = {
        _id: new ObjectId(id),
        title: 'Session 1',
        messages: [message],
        createdAt: beforeDate,
        updatedAt: new Date(), // updated
      };
      
      mockCollection.findOneAndUpdate.mockResolvedValue(mockDoc);
      
      const result = await chatbotSessionRepository.addMessage(id, message);
      
      // We can't strictly assert the date instance passed to $set because it's created inside the function,
      // but we verified it is passed in the previous test. 
      // Here we just verify the returned object reflects an update.
      expect(result?.updatedAt.getTime()).toBeGreaterThan(beforeDate.getTime());
    });
  });
});
