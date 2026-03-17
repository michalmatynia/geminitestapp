'use client';

import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';

export default function WebDevelopmentReactComponentsLesson(): React.JSX.Element {
  return (
    <div className='flex w-full justify-center'>
      <KangurGlassPanel
        className='flex w-full max-w-3xl flex-col items-center gap-4 text-center'
        padding='xl'
        surface='playField'
      >
        <div className='text-5xl' aria-hidden='true'>
          ⚛️
        </div>
        <div className='space-y-2'>
          <h2 className='text-2xl font-semibold text-slate-800'>React Components</h2>
          <p className='text-sm text-slate-600'>
            Materiały do tej ścieżki są w przygotowaniu. Wkrótce pojawią się ćwiczenia i
            przykłady komponentów.
          </p>
        </div>
      </KangurGlassPanel>
    </div>
  );
}
