import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    chatbotSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    chatbotMessage: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const createMessageRow = (
  overrides: Partial<{
    id: string;
    sessionId: string;
    role: 'system' | 'user' | 'assistant' | 'tool' | 'error' | 'info' | 'audit';
    content: string;
    model: string | null;
    images: string[];
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }> = {}
) => ({
  id: 'message-1',
  sessionId: 'session-1',
  role: 'user' as const,
  content: 'Hello',
  model: null,
  images: [],
  metadata: null,
  createdAt: new Date('2024-01-02T10:00:00.000Z'),
  ...overrides,
});

const createSessionRow = (
  overrides: Partial<{
    id: string;
    title: string | null;
    personaId: string | null;
    settings: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
    messages: Array<ReturnType<typeof createMessageRow>>;
  }> = {}
) => ({
  id: 'session-1',
  title: 'Session 1',
  personaId: null,
  settings: null,
  createdAt: new Date('2024-01-01T10:00:00.000Z'),
  updatedAt: new Date('2024-01-02T10:00:00.000Z'),
  messages: [],
  ...overrides,
});

describe('Chatbot Session Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.doMock('@/shared/lib/db/prisma', () => ({
      default: mockPrisma,
    }));
    mockPrisma.$transaction.mockResolvedValue([]);
  });

  const loadRepository = async () =>
    (await import('@/features/ai/chatbot/services/chatbot-session-repository'))
      .chatbotSessionRepository;

  describe('findAll', () => {
    it('returns all sessions sorted by updatedAt', async () => {
      const sessions = [
        createSessionRow({ id: 'session-1' }),
        createSessionRow({ id: 'session-2', title: 'Session 2' }),
      ];
      mockPrisma.chatbotSession.findMany.mockResolvedValue(sessions);

      const repository = await loadRepository();
      const result = await repository.findAll();

      expect(mockPrisma.chatbotSession.findMany).toHaveBeenCalledWith({
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'session-1',
        title: 'Session 1',
        messageCount: 0,
      });
    });
  });

  describe('findById', () => {
    it('returns session by id', async () => {
      mockPrisma.chatbotSession.findUnique.mockResolvedValue(
        createSessionRow({ id: 'session-1' })
      );

      const repository = await loadRepository();
      const result = await repository.findById('session-1');

      expect(mockPrisma.chatbotSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      expect(result?.id).toBe('session-1');
    });

    it('returns null if session not found', async () => {
      mockPrisma.chatbotSession.findUnique.mockResolvedValue(null);

      const repository = await loadRepository();
      const result = await repository.findById('session-1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a new session', async () => {
      const input = {
        title: 'New Session',
        userId: null,
        messages: [],
        messageCount: 0,
        settings: { model: 'gpt-4' },
      };
      mockPrisma.chatbotSession.create.mockResolvedValue(
        createSessionRow({
          id: 'session-new',
          title: 'New Session',
          settings: { model: 'gpt-4' },
        })
      );

      const repository = await loadRepository();
      const result = await repository.create(input);

      expect(mockPrisma.chatbotSession.create).toHaveBeenCalledWith({
        data: {
          title: 'New Session',
          personaId: null,
          settings: { model: 'gpt-4' },
        },
        include: {
          messages: true,
        },
      });
      expect(result).toMatchObject({
        id: 'session-new',
        title: 'New Session',
      });
      expect(result.settings?.model).toBe('gpt-4');
    });
  });

  describe('update', () => {
    it('updates an existing session', async () => {
      mockPrisma.chatbotSession.findUnique.mockResolvedValue(
        createSessionRow({ id: 'session-1' })
      );
      mockPrisma.chatbotSession.update.mockResolvedValue(
        createSessionRow({ id: 'session-1', title: 'Updated Title' })
      );

      const repository = await loadRepository();
      const result = await repository.update('session-1', {
        title: 'Updated Title',
      });

      expect(mockPrisma.chatbotSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      expect(mockPrisma.chatbotSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          title: 'Updated Title',
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      expect(result?.title).toBe('Updated Title');
    });
  });

  describe('delete', () => {
    it('deletes a session', async () => {
      mockPrisma.chatbotSession.deleteMany.mockResolvedValue({ count: 1 });

      const repository = await loadRepository();
      const result = await repository.delete('session-1');

      expect(mockPrisma.chatbotSession.deleteMany).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      expect(result).toBe(true);
    });

    it('returns false if session not deleted', async () => {
      mockPrisma.chatbotSession.deleteMany.mockResolvedValue({ count: 0 });

      const repository = await loadRepository();
      const result = await repository.delete('session-1');

      expect(result).toBe(false);
    });
  });

  describe('addMessage', () => {
    it('adds a message to a session', async () => {
      const message = { role: 'user' as const, content: 'Hello' };
      const createdAt = new Date('2024-01-03T10:00:00.000Z');
      mockPrisma.chatbotSession.findUnique
        .mockResolvedValueOnce({ id: 'session-1' })
        .mockResolvedValueOnce(
          createSessionRow({
            id: 'session-1',
            messages: [
              createMessageRow({
                sessionId: 'session-1',
                role: 'user',
                content: 'Hello',
                createdAt,
              }),
            ],
            updatedAt: createdAt,
          })
        );
      mockPrisma.chatbotMessage.create.mockReturnValue({ kind: 'create-message' });
      mockPrisma.chatbotSession.update.mockReturnValue({ kind: 'touch-session' });

      const repository = await loadRepository();
      const result = await repository.addMessage('session-1', message);

      expect(mockPrisma.chatbotSession.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: 'session-1' },
        select: {
          id: true,
        },
      });
      expect(mockPrisma.chatbotMessage.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-1',
          role: 'user',
          content: 'Hello',
        },
      });
      expect(mockPrisma.chatbotSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          updatedAt: expect.any(Date),
        },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalledWith([
        { kind: 'create-message' },
        { kind: 'touch-session' },
      ]);
      expect(result?.messages).toHaveLength(1);
      expect(result?.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello',
      });
    });

    it('updates timestamps when adding a message', async () => {
      const beforeDate = new Date('2020-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-03T10:00:00.000Z');
      const message = { role: 'user' as const, content: 'New message' };

      mockPrisma.chatbotSession.findUnique
        .mockResolvedValueOnce({ id: 'session-1' })
        .mockResolvedValueOnce(
          createSessionRow({
            id: 'session-1',
            updatedAt,
            createdAt: beforeDate,
            messages: [
              createMessageRow({
                sessionId: 'session-1',
                content: 'New message',
                createdAt: updatedAt,
              }),
            ],
          })
        );
      mockPrisma.chatbotMessage.create.mockReturnValue({ kind: 'create-message' });
      mockPrisma.chatbotSession.update.mockReturnValue({ kind: 'touch-session' });

      const repository = await loadRepository();
      const result = await repository.addMessage('session-1', message);

      expect(result?.updatedAt).toBe(updatedAt.toISOString());
      expect(new Date(result!.updatedAt!).getTime()).toBeGreaterThan(beforeDate.getTime());
    });
  });
});
