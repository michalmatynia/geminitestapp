import { KangurLessonCaption, KangurLessonInset } from '@/features/kangur/ui/design/lesson-primitives';

export const BUILT_IN_COMPONENTS = [
  {
    name: '<Fragment>',
    description: 'Grupuje kilka elementów JSX bez dodatkowego wrappera. Skrót: <>...</>.',
  },
  {
    name: '<Profiler>',
    description: 'Mierzy czas renderowania drzewa i pozwala raportować wyniki programowo.',
  },
  {
    name: '<Suspense>',
    description: 'Pokazuje fallback, gdy komponenty potomne ładują dane lub kod.',
  },
  {
    name: '<StrictMode>',
    description: 'Włącza dodatkowe kontrole tylko w trybie dev, by szybciej znaleźć błędy.',
  },
  {
    name: '<Activity>',
    description: 'Ukrywa i przywraca UI wraz ze stanem dzieci, bez pełnego unmountu.',
  },
] as const;

export const BuiltInPanel = ({
  name,
  description,
}: {
  name: string;
  description: string;
}): JSX.Element => (
  <KangurLessonInset accent='slate' className='text-left'>
    <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>Wbudowany</div>
    <div className='mt-1 text-sm font-semibold text-slate-900'>
      <span className='font-mono'>{name}</span>
    </div>
    <p className='mt-2 text-sm text-slate-600'>{description}</p>
  </KangurLessonInset>
);

export const LessonCodeBlock = ({
  title,
  code,
  caption,
}: {
  title?: string;
  code: string;
  caption?: string;
}): JSX.Element => (
  <KangurLessonInset
    accent='slate'
    className='border-slate-900/70 bg-slate-950 text-slate-100'
  >
    {title ? (
      <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400'>
        {title}
      </div>
    ) : null}
    <pre className='mt-2 overflow-x-auto text-xs leading-relaxed'>
      <code>{code}</code>
    </pre>
    {caption ? (
      <KangurLessonCaption className='mt-3 text-slate-300'>{caption}</KangurLessonCaption>
    ) : null}
  </KangurLessonInset>
);
