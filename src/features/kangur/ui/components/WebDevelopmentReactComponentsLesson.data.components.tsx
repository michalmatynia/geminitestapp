import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import { ReactActivityToggleAnimation, ReactSuspenseFallbackAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { KangurLessonCallout, KangurLessonCaption, KangurLessonLead, KangurLessonStack, KangurLessonVisual } from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_GRID_TIGHT_CLASSNAME, KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { BUILT_IN_COMPONENTS, BuiltInPanel, LessonCodeBlock } from './WebDevelopmentReactComponentsLesson.data.shared';

export const componentsSlides: LessonSlide[] = [
    {
      title: 'Wbudowane komponenty Reacta',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            React udostępnia kilka wbudowanych komponentów do użycia w JSX. Każdy z nich
            rozwiązuje konkretny problem: grupowanie elementów, fallback, pomiar wydajności,
            dodatkowe kontrole i ukrywanie UI.
          </KangurLessonLead>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {BUILT_IN_COMPONENTS.map((item) => (
              <BuiltInPanel key={item.name} name={item.name} description={item.description} />
            ))}
          </div>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            <LessonCodeBlock
              title='Fragment + Suspense'
              code={`<>
  <Header />
  <Suspense fallback={<Loading />}>
    <Albums />
  </Suspense>
</>`}
              caption='Fragment grupuje JSX, a Suspense pokazuje fallback podczas ładowania.'
            />
            <KangurLessonVisual
              accent='sky'
              caption='Suspense przełącza się z fallbacku na gotową treść.'
              maxWidthClassName='max-w-full'
            >
              <ReactSuspenseFallbackAnimation />
            </KangurLessonVisual>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Fragment i StrictMode',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            <strong>Fragment</strong> pozwala zwracać kilka elementów JSX bez dodatkowego
            wrappera, a <strong>StrictMode</strong> włącza dodatkowe kontrole tylko w trybie
            deweloperskim.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            <LessonCodeBlock
              title='Fragment'
              code={`<>
  <h1>Dashboard</h1>
  <Toolbar />
  <Main />
</>`}
              caption='Fragment grupuje elementy bez dodatkowego div.'
            />
            <LessonCodeBlock
              title='StrictMode'
              code={`<StrictMode>
  <App />
</StrictMode>`}
              caption='StrictMode uruchamia dodatkowe kontrole w trybie dev.'
            />
          </div>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Tip</p>
            <KangurLessonCaption className='mt-2 text-left'>
              StrictMode pomaga szybciej znaleźć nieczyste efekty i problemy z renderem.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Activity i Profiler',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            <strong>Activity</strong> ukrywa i przywraca UI bez utraty stanu, a
            <strong> Profiler</strong> pozwala mierzyć czas renderowania drzewa.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            <KangurLessonCallout accent='sky' padding='sm' className='text-left'>
              <p className='text-sm font-semibold text-slate-900'>Kiedy Activity?</p>
              <KangurLessonCaption className='mt-2 text-left'>
                Gdy chcesz chwilowo ukryć UI, ale zachować jego stan i szybki powrót.
              </KangurLessonCaption>
            </KangurLessonCallout>
            <KangurLessonCallout accent='violet' padding='sm' className='text-left'>
              <p className='text-sm font-semibold text-slate-900'>Kiedy Profiler?</p>
              <KangurLessonCaption className='mt-2 text-left'>
                Gdy chcesz mierzyć wydajność renderowania konkretnego drzewa komponentów.
              </KangurLessonCaption>
            </KangurLessonCallout>
          </div>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            <LessonCodeBlock
              title='Activity'
              code={`<Activity mode={isOpen ? 'visible' : 'hidden'}>
  <Sidebar />
</Activity>`}
              caption='UI wraca z zachowanym stanem, ale ukryte efekty są czyszczone.'
            />
            <KangurLessonVisual
              accent='sky'
              caption='Activity ukrywa i przywraca UI bez pełnego unmountu.'
              maxWidthClassName='max-w-full'
            >
              <ReactActivityToggleAnimation />
            </KangurLessonVisual>
          </div>
          <LessonCodeBlock
            title='Profiler'
            code={`<Profiler id="chart" onRender={logPerf}>
  <Chart />
</Profiler>`}
            caption='Profiler raportuje czas renderowania i można go logować.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Suspense w praktyce',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            <strong>Suspense</strong> wyświetla fallback, gdy potomne komponenty ładują kod lub dane.
            To dobry sposób na kontrolę stanu “ładowania” w UI.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Suspense z fallback'
            code={`<Suspense fallback={<Loading />}>
  <Albums />
</Suspense>`}
            caption='Gdy Albums czeka na dane, React pokazuje Loading.'
          />
          <KangurLessonVisual
            accent='sky'
            caption='Fallback jest widoczny tylko do momentu, gdy dane są gotowe.'
            maxWidthClassName='max-w-full'
          >
            <ReactSuspenseFallbackAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Activity i stan UI',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            <strong>Activity</strong> ukrywa UI (display: none), ale zachowuje stan komponentów.
            To przydaje się, gdy chcesz szybko przywrócić wcześniejszy widok.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Ukrywanie i przywracanie'
            code={`<Activity mode={isOpen ? 'visible' : 'hidden'}>
  <Sidebar />
</Activity>`}
            caption='Stan Sidebar zostaje zachowany, mimo że UI znika.'
          />
          <KangurLessonVisual
            accent='sky'
            caption='Activity przełącza widoczność bez utraty stanu.'
            maxWidthClassName='max-w-full'
          >
            <ReactActivityToggleAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Twoje komponenty',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Własne komponenty to zwykłe funkcje JavaScript, które zwracają JSX.
            Nazwy zaczynaj z wielkiej litery, a dane przekazuj przez propsy.
          </KangurLessonLead>
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Jak myśleć o komponencie</p>
            <KangurLessonCaption className='mt-2 text-left'>
              To mały, przewidywalny klocek UI, który możesz wielokrotnie składać w większe ekrany.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <LessonCodeBlock
            title='Komponent funkcyjny'
            code={`function Button({ label }) {
  return <button>{label}</button>;
}

export default function Toolbar() {
  return (
    <>
      <Button label="Save" />
      <Button label="Cancel" />
    </>
  );
}`}
            caption='Komponent to funkcja, a JSX składa interfejs z mniejszych części.'
          />
          <KangurLessonCallout accent='emerald' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Dobra praktyka</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Nazywaj komponenty rzeczownikami (Card, Sidebar, ProfileHeader) i trzymaj je małe.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
];
