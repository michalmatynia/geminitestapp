'use client';

import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import { ReactProfilerMultiBoundaryAnimation, ReactProfilerTimingAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { KangurLessonCallout, KangurLessonCaption, KangurLessonInset, KangurLessonLead, KangurLessonStack, KangurLessonVisual } from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { LessonCodeBlock } from './WebDevelopmentReactComponentsLesson.data.shared';

export const profilerSlides: LessonSlide[] = [
    {
      title: 'Profiler w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            <strong>{'<Profiler>'}</strong> pozwala programowo mierzyć wydajność renderowania
            drzewa Reacta. Dostajesz dane o czasie renderu i fazie aktualizacji.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Podstawowe użycie'
            code={`<Profiler id="App" onRender={onRender}>
  <App />
</Profiler>`}
            caption='Profiler owija drzewo i raportuje timing przy każdym commitcie.'
          />
          <KangurLessonVisual
            accent='violet'
            caption='Profiler porównuje actualDuration z baseDuration.'
            maxWidthClassName='max-w-full'
          >
            <ReactProfilerTimingAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'onRender i parametry',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            React wywoła <strong>onRender</strong> przy każdym commicie w obrębie
            profiliowanego drzewa.
          </KangurLessonLead>
          <LessonCodeBlock
            title='onRender callback'
            code={`function onRender(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) {
  // loguj lub agreguj metryki
}`}
            caption='Callback dostaje szczegółowe dane o renderowaniu.'
          />
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Co oznaczają parametry?</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li><strong>id</strong> – identyfikator profiliowanej części UI.</li>
              <li><strong>phase</strong> – "mount", "update" lub "nested-update".</li>
              <li><strong>actualDuration</strong> – rzeczywisty czas renderu dla aktualizacji.</li>
              <li><strong>baseDuration</strong> – czas renderu bez optymalizacji.</li>
              <li><strong>startTime</strong> – start renderu.</li>
              <li><strong>commitTime</strong> – czas commitu (wspólny dla profili).</li>
            </ul>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kilka profili naraz',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Możesz mierzyć różne części aplikacji, owijając je osobnymi profilerami
            lub zagnieżdżając je wewnątrz siebie.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Wiele profilerów'
            code={`<App>
  <Profiler id="Sidebar" onRender={onRender}>
    <Sidebar />
  </Profiler>
  <Profiler id="Content" onRender={onRender}>
    <Content />
  </Profiler>
</App>`}
            caption='Każdy profiler raportuje osobne id.'
          />
          <KangurLessonVisual
            accent='violet'
            caption='Wiele granic = osobne pomiary.'
            maxWidthClassName='max-w-full'
          >
            <ReactProfilerMultiBoundaryAnimation />
          </KangurLessonVisual>
          <LessonCodeBlock
            title='Zagnieżdżanie'
            code={`<Profiler id="Content" onRender={onRender}>
  <Content>
    <Profiler id="Editor" onRender={onRender}>
      <Editor />
    </Profiler>
  </Content>
</Profiler>`}
            caption='Zagnieżdżone drzewka pozwalają na dokładniejsze pomiary.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Caveats i wskazówki',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Profilowanie dodaje narzut, więc w buildach produkcyjnych jest domyślnie wyłączone.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Pułapka</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Aby mierzyć w produkcji, potrzebujesz builda z włączonym profilowaniem.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Note</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Jeśli szukasz narzędzia wizualnego, użyj zakładki Profiler w React DevTools.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCaption align='left'>
            Profiler jest lekki, ale używaj go tylko tam, gdzie naprawdę potrzebujesz pomiarów.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Co robić z metrykami?',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jeśli <strong>actualDuration</strong> zbliża się do <strong>baseDuration</strong>,
            drzewo nie korzysta z memoizacji. Szukaj miejsc, gdzie renderujesz za dużo.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
              <p className='text-sm font-semibold text-slate-900'>Sygnały</p>
              <KangurLessonCaption className='mt-2 text-left'>
                actualDuration spada po pierwszym renderze = memoizacja działa.
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
              <p className='text-sm font-semibold text-slate-900'>Alert</p>
              <KangurLessonCaption className='mt-2 text-left'>
                actualDuration ≈ baseDuration = szukaj zbędnych renderów.
              </KangurLessonCaption>
            </KangurLessonCallout>
          </div>
          <LessonCodeBlock
            title='Wstępna optymalizacja'
            code={`const MemoCard = memo(Card);

function List({ items }) {
  const sorted = useMemo(() => sort(items), [items]);
  return sorted.map(item => <MemoCard key={item.id} item={item} />);
}`}
            caption='Memo + useMemo pomagają ograniczyć niepotrzebne renderowanie.'
          />
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Szybki checklist</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Zmierz zanim zaczniesz optymalizować.</li>
              <li>Wybierz 1-2 najdroższe drzewa.</li>
              <li>Zredukuj liczbę renderów (memo/useMemo/useCallback).</li>
              <li>Sprawdź, czy actualDuration spada po poprawkach.</li>
            </ul>
          </KangurLessonCallout>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Mini‑ćwiczenie</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Wybierz jeden komponent, zmierz jego actualDuration, wprowadź memo, a potem
              porównaj wyniki. Co się zmieniło?
            </KangurLessonCaption>
          </KangurLessonCallout>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            <LessonCodeBlock
              title='Przed'
              code={`function Item({ data }) {
  return <Row data={data} />;
}

function List({ items }) {
  return items.map(item => <Item key={item.id} data={item} />);
}`}
              caption='Każdy Item renderuje się przy każdej zmianie listy.'
            />
            <LessonCodeBlock
              title='Po'
              code={`const Item = memo(function Item({ data }) {
  return <Row data={data} />;
});

function List({ items }) {
  return items.map(item => <Item key={item.id} data={item} />);
}`}
              caption='Memo ogranicza renderowanie, gdy propsy się nie zmieniają.'
            />
          </div>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Przykładowe pomiary</p>
            <div className='mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600'>
              <span className='font-semibold text-slate-500'>Etap</span>
              <span className='font-semibold text-slate-500'>actual</span>
              <span className='font-semibold text-slate-500'>base</span>
              <span>Przed</span>
              <span>18 ms</span>
              <span>20 ms</span>
              <span>Po</span>
              <span>6 ms</span>
              <span>20 ms</span>
            </div>
            <div className='mt-3 space-y-2 text-xs text-slate-600'>
              <div className='flex items-center gap-2'>
                <span className='w-10 font-semibold text-slate-500'>Przed</span>
                <div className='h-2 w-32 rounded-full bg-slate-200'>
                  <div className='relative h-2 w-28 overflow-hidden rounded-full bg-slate-400 animate-[growBase_3.6s_ease-in-out_infinite]'>
                    <span className='bar-shimmer' />
                  </div>
                </div>
                <div className='h-2 w-24 rounded-full bg-slate-200'>
                  <div className='relative h-2 w-20 overflow-hidden rounded-full bg-sky-400 animate-[growActual_2.2s_ease-in-out_infinite]'>
                    <span className='bar-shimmer' />
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <span className='w-10 font-semibold text-slate-500'>Po</span>
                <div className='h-2 w-32 rounded-full bg-slate-200'>
                  <div className='relative h-2 w-28 overflow-hidden rounded-full bg-slate-400 animate-[growBase_4s_ease-in-out_infinite]'>
                    <span className='bar-shimmer' />
                  </div>
                </div>
                <div className='h-2 w-24 rounded-full bg-slate-200'>
                  <div className='relative h-2 w-10 overflow-hidden rounded-full bg-sky-400 animate-[growActual_2.8s_ease-in-out_infinite]'>
                    <span className='bar-shimmer' />
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-3 text-[11px] text-slate-500'>
                <span className='inline-flex items-center gap-1'>
                  <span className='h-2 w-2 rounded-full bg-slate-400' />
                  baseDuration
                </span>
                <span className='inline-flex items-center gap-1'>
                  <span className='h-2 w-2 rounded-full bg-sky-400' />
                  actualDuration
                </span>
              </div>
            </div>
            <style>{`
              @keyframes growBase {
                0%, 100% { transform: scaleX(0.7); transform-origin: left; opacity: 0.7; }
                50% { transform: scaleX(1); opacity: 1; }
              }
              @keyframes growActual {
                0%, 100% { transform: scaleX(0.55); transform-origin: left; opacity: 0.7; }
                50% { transform: scaleX(1); opacity: 1; }
              }
              @keyframes shimmer {
                0% { transform: translateX(-100%); opacity: 0; }
                30% { opacity: 0.35; }
                60% { opacity: 0.12; }
                100% { transform: translateX(220%); opacity: 0; }
              }
              .bar-shimmer {
                position: absolute;
                inset: 0;
                width: 40%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
                animation: shimmer 2.8s ease-in-out infinite;
              }
              @media (prefers-reduced-motion: reduce) {
                .animate-[growBase_3.6s_ease-in-out_infinite],
                .animate-[growBase_4s_ease-in-out_infinite],
                .animate-[growActual_2.2s_ease-in-out_infinite],
                .animate-[growActual_2.8s_ease-in-out_infinite] {
                  animation: none;
                }
                .bar-shimmer {
                  animation: none;
                }
              }
            `}</style>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
];
