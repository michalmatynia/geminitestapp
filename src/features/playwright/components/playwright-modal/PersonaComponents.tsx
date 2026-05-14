import React from 'react';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { PLAYWRIGHT_SETTINGS_HREF } from '../PlaywrightEngineLogoButton';

export interface Persona {
  id: string;
  name: string;
  settings: {
    headless: boolean;
  };
}

export function PersonaList({ personas }: { personas: Persona[] }) {
  if (personas.length === 0) {
    return (
      <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
        No personas configured yet.{' '}
        <a
          href={PLAYWRIGHT_SETTINGS_HREF}
          className='font-medium text-foreground underline underline-offset-2 hover:text-white'
        >
          Add one in Playwright settings.
        </a>
      </div>
    );
  }

  return (
    <ul className='space-y-1.5'>
      {personas.map((persona) => (
        <li
          key={persona.id}
          className='flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-xs'
        >
          <span
            className='inline-flex size-5 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-950/50 text-[8px] font-black uppercase text-cyan-300'
            aria-hidden='true'
          >
            PW
          </span>
          <span className='flex-1 truncate font-medium text-foreground'>{persona.name}</span>
          <span className='text-muted-foreground'>
            {persona.settings.headless ? 'Headless' : 'Headful'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ErrorState() {
  return (
    <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200'>
      Could not load personas. Check{' '}
      <a
        href={PLAYWRIGHT_SETTINGS_HREF}
        className='underline underline-offset-2 hover:text-amber-100'
      >
        Playwright settings
      </a>{' '}
      to manage them.
    </div>
  );
}

export function LoadingComponent() {
  return (
    <LoadingState
      message='Loading personas…'
      size='sm'
      className='rounded-xl border border-border/60 bg-background/40 py-3'
    />
  );
}
