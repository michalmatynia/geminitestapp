'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, BrainCircuit } from 'lucide-react';

import {
  KangurButton,
  KangurGlassPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurTextHighlight } from '@/features/kangur/ui/hooks/useKangurTextHighlight';
import { cn } from '@/shared/utils';

export function KangurAiTutorWidget(): React.JSX.Element | null {
  const { enabled, isOpen, messages, isLoading, tutorName, openChat, closeChat, sendMessage } =
    useKangurAiTutor();
  const { selectedText, clearSelection } = useKangurTextHighlight();
  const [inputValue, setInputValue] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!isOpen && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  if (!enabled) return null;

  const handleAskAbout = (): void => {
    if (!selectedText) return;
    const quoted = `"${selectedText}"\n\n`;
    setInputValue(quoted);
    openChat();
    clearSelection();
  };

  const handleSend = async (): Promise<void> => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <>
      {/* Text selection tooltip */}
      <AnimatePresence>
        {selectedText && !isOpen && (
          <motion.div
            key='highlight-tooltip'
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className='fixed bottom-24 right-6 z-50'
          >
            <KangurButton
              size='sm'
              variant='primary'
              type='button'
              onClick={handleAskAbout}
              className='shadow-lg'
            >
              <BrainCircuit className='h-3.5 w-3.5' />
              Zapytaj o to
            </KangurButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key='chat-panel'
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className='fixed bottom-20 right-6 z-50 w-80 sm:w-96'
          >
            <KangurGlassPanel
              surface='solid'
              variant='soft'
              className='flex flex-col overflow-hidden rounded-[24px] shadow-2xl border border-indigo-100'
              style={{ maxHeight: '70vh' }}
            >
              {/* Header */}
              <div className='flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3'>
                <div className='flex items-center gap-2'>
                  <BrainCircuit className='h-5 w-5 text-white' />
                  <span className='text-sm font-bold text-white'>{tutorName} 🧠</span>
                </div>
                <button
                  type='button'
                  onClick={closeChat}
                  className='text-white/80 hover:text-white transition-colors'
                  aria-label='Zamknij'
                >
                  <X className='h-4 w-4' />
                </button>
              </div>

              {/* Messages */}
              <div className='flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0'>
                {messages.length === 0 ? (
                  <p className='text-center text-xs text-slate-400 py-4'>
                    Cześć! Masz pytanie dotyczące lekcji? Śmiało pytaj — pomogę Ci myśleć! 😊
                  </p>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                          msg.role === 'user'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-100 text-slate-800'
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className='flex justify-start'>
                    <div className='bg-slate-100 rounded-2xl px-3 py-2'>
                      <span className='text-slate-400 text-xs animate-pulse'>Myślę…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className='border-t border-slate-100 px-3 py-3 flex gap-2 items-center'>
                <KangurTextField
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Pytaj…'
                  accent='indigo'
                  size='sm'
                  className='flex-1'
                  disabled={isLoading}
                  aria-label='Wpisz pytanie'
                />
                <KangurButton
                  type='button'
                  size='sm'
                  variant='primary'
                  onClick={() => void handleSend()}
                  disabled={!inputValue.trim() || isLoading}
                  aria-label='Wyślij'
                >
                  <Send className='h-3.5 w-3.5' />
                </KangurButton>
              </div>
            </KangurGlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button */}
      <div className='fixed bottom-6 right-6 z-50'>
        <motion.button
          type='button'
          onClick={isOpen ? closeChat : openChat}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className={cn(
            'relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl',
            'bg-gradient-to-br from-indigo-500 to-purple-600',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2'
          )}
          aria-label={isOpen ? 'Zamknij pomocnika' : 'Otwórz pomocnika AI'}
        >
          <BrainCircuit className='h-6 w-6 text-white' />
          {hasNewMessage && !isOpen && (
            <span className='absolute top-1 right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white animate-pulse' />
          )}
        </motion.button>
      </div>
    </>
  );
}
