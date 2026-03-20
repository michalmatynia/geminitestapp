'use client';

import {
  ChangeEvent,
  useCallback,
  useState,
} from 'react';

import type { ChatMessageDto } from '@/shared/contracts/chatbot';
import { api } from '@/shared/lib/api-client';

interface ConversationSession {
  learnerId: string;
  surface: string | null;
  contentId: string | null;
  messages: ChatMessageDto[];
  sessionId: string;
  messageCount?: number;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export const KangurAiTutorConversationReplay = (): JSX.Element => {
  const [learnerId, setLearnerId] = useState('');
  const [surface, setSurface] = useState('');
  const [contentId, setContentId] = useState('');
  const [limit, setLimit] = useState(50);
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: null,
  });
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);

  const handleLoadConversation = useCallback(async () => {
    if (!learnerId.trim()) {
      setLoadingState({
        isLoading: false,
        error: 'Learner ID is required.',
      });
      return;
    }

    setLoadingState({ isLoading: true, error: null });

    try {
      const queryParams = new URLSearchParams({
        learnerId: learnerId.trim(),
        limit: limit.toString(),
      });

      if (surface.trim()) {
        queryParams.set('surface', surface.trim());
      }
      if (contentId.trim()) {
        queryParams.set('contentId', contentId.trim());
      }

      const response = await api.get<ConversationSession>(
        `/api/kangur/ai-tutor/chat/admin-history?${queryParams.toString()}`
      );

      setSession(response);
      setLoadingState({ isLoading: false, error: null });
      setSelectedMessageIndex(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load conversation.';
      setLoadingState({
        isLoading: false,
        error: message,
      });
      setSession(null);
    }
  }, [learnerId, surface, contentId, limit]);

  const handleLearnerIdChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setLearnerId(e.target.value);
  };

  const handleSurfaceChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSurface(e.target.value);
  };

  const handleContentIdChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setContentId(e.target.value);
  };

  const handleLimitChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 50)));
  };

  const selectedMessage = selectedMessageIndex !== null ? session?.messages[selectedMessageIndex] : null;

  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h2>AI Tutor Conversation Replay</h2>

      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0 }}>Search Parameters</h3>

        <div style={{ marginBottom: '12px' }}>
          <label htmlFor="learner-id" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Learner ID *
          </label>
          <input
            id="learner-id"
            type="text"
            placeholder="e.g., learner-123"
            value={learnerId}
            onChange={handleLearnerIdChange}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label htmlFor="surface" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Surface (optional)
            </label>
            <input
              id="surface"
              type="text"
              placeholder="e.g., lesson"
              value={surface}
              onChange={handleSurfaceChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label htmlFor="content-id" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Content ID (optional)
            </label>
            <input
              id="content-id"
              type="text"
              placeholder="e.g., lesson-456"
              value={contentId}
              onChange={handleContentIdChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="limit" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Message Limit (max 100)
          </label>
          <input
            id="limit"
            type="number"
            min="1"
            max="100"
            value={limit}
            onChange={handleLimitChange}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          onClick={handleLoadConversation}
          disabled={loadingState.isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loadingState.isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: loadingState.isLoading ? 0.6 : 1,
          }}
        >
          {loadingState.isLoading ? 'Loading...' : 'Load Conversation'}
        </button>

        {loadingState.error && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              border: '1px solid #f5c6cb',
            }}
          >
            {loadingState.error}
          </div>
        )}
      </div>

      {session && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Message List */}
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f9f9f9',
                borderBottom: '1px solid #ddd',
                fontWeight: 'bold',
              }}
            >
              Messages ({session.messages.length})
            </div>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {session.messages.length === 0 ? (
                <div style={{ padding: '12px', color: '#666', fontStyle: 'italic' }}>No messages found</div>
              ) : (
                session.messages.map((message, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedMessageIndex(index)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: 'none',
                      borderBottom: '1px solid #eee',
                      backgroundColor:
                        selectedMessageIndex === index ? '#e3f2fd' : index % 2 === 0 ? '#fafafa' : '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedMessageIndex !== index) {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedMessageIndex !== index) {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fafafa' : '#fff';
                      }
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {message.role.toUpperCase()} • {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                    <div style={{ fontSize: '13px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {message.content.slice(0, 60)}...
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Message Detail */}
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            {selectedMessage ? (
              <>
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: selectedMessage.role === 'user' ? '#e8f5e9' : '#f3e5f5',
                    borderBottom: '1px solid #ddd',
                    fontWeight: 'bold',
                  }}
                >
                  {selectedMessage.role === 'user' ? '👤 User Message' : '🤖 Assistant Message'}
                </div>
                <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
                  <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Timestamp</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {new Date(selectedMessage.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>
                      Content
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: '#fafafa',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: '1.5',
                      }}
                    >
                      {selectedMessage.content}
                    </div>
                  </div>

                  {selectedMessage.metadata && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: 'bold' }}>
                        Metadata
                      </div>
                      <pre
                        style={{
                          padding: '12px',
                          backgroundColor: '#fafafa',
                          borderRadius: '4px',
                          fontSize: '12px',
                          overflow: 'auto',
                          margin: 0,
                        }}
                      >
                        {JSON.stringify(selectedMessage.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#999',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                }}
              >
                Select a message to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
