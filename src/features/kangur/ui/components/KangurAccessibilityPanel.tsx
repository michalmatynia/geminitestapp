'use client';

import { useEffect, useRef, useState } from 'react';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';

const ACCESSIBILITY_FEATURES = [
  'Nawiguj po stronie za pomocą klawisza Tab i Shift+Tab; aktywne elementy pokazują widoczny obrys.',
  'Przycisk „Przejdź do głównej treści” w lewym górnym rogu pozwala ominąć nawigację.',
  'Po zmianie strony focus trafia automatycznie na główny region dzięki mechanizmowi ogłoszeń dostępności.',
  'Menu mobilne obsługuje Escape oraz pułapkę focusa, a widoczność wzorowana jest na aria-live statusie.',
];

export function KangurAccessibilityPanel(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus();
      return;
    }

    triggerRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleBackdropClick = (): void => setIsOpen(false);

  return (
    <>
      <div
        className={cn(
          'pointer-events-auto z-40 flex items-center justify-end',
          'fixed top-4 right-4 max-sm:top-2 max-sm:right-2'
        )}
      >
        <KangurButton
          ref={triggerRef}
          aria-expanded={isOpen}
          aria-controls='kangur-accessibility-panel'
          className='uppercase tracking-wide'
          size='sm'
          type='button'
          variant='surface'
          onClick={() => setIsOpen((prev) => !prev)}
        >
          Asystent dostępności
        </KangurButton>
      </div>
      {isOpen ? (
        <div
          aria-modal='true'
          id='kangur-accessibility-panel'
          role='dialog'
          className='fixed inset-0 z-50 flex items-center justify-center px-4 py-8'
        >
          <button
            type='button'
            aria-label='Zamknij panel dostępności'
            className='absolute inset-0 h-full w-full bg-slate-950/60'
            onClick={handleBackdropClick}
          />
          <div
            ref={panelRef}
            tabIndex={-1}
            className='relative z-10 w-full max-w-lg space-y-4 rounded-3xl border border-white/30 bg-white/90 p-6 text-sm text-slate-900 shadow-[0_25px_60px_-32px_rgba(15,23,42,0.8)] backdrop-blur'
          >
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p
                  className='text-xs font-semibold tracking-[0.5em] uppercase text-slate-500'
                  id='kangur-accessibility-panel-title'
                >
                  Dostępność
                </p>
                <h2 className='text-2xl font-bold text-slate-900'>Jak możesz korzystać z Kangura?</h2>
              </div>
              <KangurButton
                size='sm'
                variant='ghost'
                onClick={() => setIsOpen(false)}
                type='button'
              >
                Zamknij
              </KangurButton>
            </div>
            <p
              id='kangur-accessibility-panel-description'
              className='text-sm leading-relaxed text-slate-700'
            >
              Przycisk „Asystent dostępności” zawsze pozostaje widoczny na górze strony i otwiera ten opis.
              Znajdziesz tu podpowiedzi o skupieniu focusu, pomocy klawiaturowej oraz menu mobilnym.
            </p>
            <ul className='list-disc space-y-2 pl-4 text-slate-700'>
              {ACCESSIBILITY_FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className='flex justify-end'>
              <KangurButton
                size='sm'
                variant='primary'
                onClick={() => setIsOpen(false)}
                type='button'
              >
                Rozumiem
              </KangurButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
