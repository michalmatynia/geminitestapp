import { http, HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { vi, MockInstance } from 'vitest';

import { GET, POST } from '@/app/api/chatbot/route';
import { server } from '@/mocks/server';


const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';

describe('Chatbot API', () => {
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env['OLLAMA_MODEL'] = 'test-model';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.resetAllMocks();
    delete process.env['OLLAMA_MODEL'];
  });

  it('should list available Ollama models', async () => {
    server.use(
      http.get(`${OLLAMA_BASE_URL}/api/tags`, () => {
        return HttpResponse.json({
          models: [{ name: 'test-model' }, { name: 'llava' }],
        });
      })
    );

    const res = await GET(new NextRequest('http://localhost/api/chatbot'));
    const data = (await res.json()) as { models: string[] };

    expect(res.status).toBe(200);
    expect(data.models).toEqual(['test-model', 'llava']);
  });

  it('should return fallback models when model listing fails', async () => {
    server.use(
      http.get(`${OLLAMA_BASE_URL}/api/tags`, () => {
        return new HttpResponse('Provider down', { status: 502 });
      })
    );

    const res = await GET(new NextRequest('http://localhost/api/chatbot'));
    const data = (await res.json()) as { models: string[]; warning?: any };

    expect(res.status).toBe(200);
    expect(data.models).toBeDefined();
    expect(data.warning.code).toBe('OLLAMA_UNAVAILABLE');
  });

  it('should reject invalid chat payloads', async () => {
    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(data.error).toBe('No messages provided.');
  });

  it('should proxy chat requests to Ollama', async () => {
    server.use(
      http.post(`${OLLAMA_BASE_URL}/api/chat`, () => {
        return HttpResponse.json({ message: { content: 'Hello from model.' } });
      })
    );

    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { message: string };

    expect(res.status).toBe(200);
    expect(data.message).toBe('Hello from model.');
  });

  it('should return a debug errorId when chat proxy fails', async () => {
    server.use(
      http.post(`${OLLAMA_BASE_URL}/api/chat`, () => {
        return new HttpResponse('Model unavailable', { status: 502 });
      })
    );

    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { error: string; errorId?: string };

    expect(res.status).toBe(502);
    expect(data.error).toContain('Ollama error');
    expect(data.errorId).toBeDefined();
  });

  it('should return a debug errorId on unexpected chat errors', async () => {
    server.use(
      http.post(`${OLLAMA_BASE_URL}/api/chat`, () => {
        return HttpResponse.error();
      })
    );

    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { errorId?: string };

    expect(res.status).toBe(500);
    expect(data.errorId).toBeDefined();
  });
});
