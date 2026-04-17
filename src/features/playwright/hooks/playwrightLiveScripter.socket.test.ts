// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import type { LiveScripterPickedElement } from '@/shared/contracts/playwright-live-scripter';

import {
  applyLiveScripterServerMessage,
  attachLiveScripterSocketHandlers,
  parseLiveScripterServerMessage,
} from './playwrightLiveScripter.socket';
import type {
  LiveScripterConnectionRefs,
  LiveScripterStateSetters,
} from './playwrightLiveScripter.result';

const pickedElement: LiveScripterPickedElement = {
  tag: 'button',
  id: 'submit',
  classes: ['btn'],
  textPreview: 'Submit',
  role: 'button',
  attrs: { 'data-testid': 'submit-button' },
  boundingBox: { x: 10, y: 20, width: 100, height: 32 },
  candidates: {
    css: '#submit',
    xpath: '//*[@id="submit"]',
    role: 'button',
    text: 'Submit',
    testId: 'submit-button',
  },
};

const createRefs = (): LiveScripterConnectionRefs => ({
  sessionIdRef: { current: 'session-1' },
  socketRef: { current: null },
  socketPathRef: { current: '/api/playwright/live-scripter/ws?sessionId=session-1' },
  connectionTokenRef: { current: 1 },
  reconnectAttemptsRef: { current: 0 },
  pendingMessagesRef: { current: [] },
});

const createSetters = (): LiveScripterStateSetters => ({
  setStatus: vi.fn(),
  setFrame: vi.fn(),
  setPickedElement: vi.fn(),
  setCurrentUrl: vi.fn(),
  setCurrentTitle: vi.fn(),
  setErrorMessage: vi.fn(),
});

describe('playwrightLiveScripter.socket', () => {
  it('reports invalid server messages', () => {
    const setters = createSetters();

    const result = parseLiveScripterServerMessage('not-json', setters);

    expect(result).toBeNull();
    expect(setters.setErrorMessage).toHaveBeenCalledWith(
      'Live scripter received an invalid server message.'
    );
    expect(setters.setStatus).toHaveBeenCalledWith('error');
  });

  it('applies navigation and close messages to client state', () => {
    const refs = createRefs();
    const setters = createSetters();
    const clearClientState = vi.fn();
    const closeSocket = vi.fn();

    applyLiveScripterServerMessage({
      message: { type: 'navigated', url: 'https://example.com/item', title: 'Item' },
      refs,
      clearClientState,
      closeSocket,
      setters,
      reconnectSocket: vi.fn(),
    });
    applyLiveScripterServerMessage({
      message: { type: 'closed' },
      refs,
      clearClientState,
      closeSocket,
      setters,
      reconnectSocket: vi.fn(),
    });

    expect(setters.setCurrentUrl).toHaveBeenCalledWith('https://example.com/item');
    expect(setters.setCurrentTitle).toHaveBeenCalledWith('Item');
    expect(closeSocket).toHaveBeenCalled();
    expect(clearClientState).toHaveBeenCalled();
    expect(refs.sessionIdRef.current).toBeNull();
  });

  it('routes WebSocket picked messages through the assigned handlers', () => {
    const refs = createRefs();
    const setters = createSetters();
    const clearClientState = vi.fn();
    const closeSocket = vi.fn();
    const socket = {
      onmessage: null,
      onerror: null,
      onclose: null,
    } as unknown as WebSocket;

    attachLiveScripterSocketHandlers({
      socket,
      connectionToken: 1,
      refs,
      clearClientState,
      closeSocket,
      setters,
      reconnectSocket: vi.fn(),
    });

    socket.onmessage?.({
      data: JSON.stringify({ type: 'picked', element: pickedElement }),
    } as MessageEvent);

    expect(setters.setPickedElement).toHaveBeenCalledWith(pickedElement);
  });

  it('flushes queued client messages when the socket becomes ready again', () => {
    const refs = createRefs();
    const setters = createSetters();
    const clearClientState = vi.fn();
    const closeSocket = vi.fn();
    const send = vi.fn();
    refs.socketRef.current = {
      readyState: WebSocket.OPEN,
      send,
    } as unknown as WebSocket;
    refs.pendingMessagesRef.current = [
      { type: 'pick_at', x: 130, y: 144 },
      { type: 'drive_click', x: 80, y: 60 },
    ];

    applyLiveScripterServerMessage({
      message: { type: 'ready', sessionId: 'session-1' },
      refs,
      clearClientState,
      closeSocket,
      setters,
      reconnectSocket: vi.fn(),
    });

    expect(setters.setStatus).toHaveBeenCalledWith('live');
    expect(send).toHaveBeenNthCalledWith(1, JSON.stringify({ type: 'pick_at', x: 130, y: 144 }));
    expect(send).toHaveBeenNthCalledWith(2, JSON.stringify({ type: 'drive_click', x: 80, y: 60 }));
    expect(refs.pendingMessagesRef.current).toEqual([]);
  });
});
