import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import { ReactStrictModeCycleAnimation, ReactStrictModeDoubleRenderAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { KangurLessonCallout, KangurLessonCaption, KangurLessonInset, KangurLessonLead, KangurLessonStack, KangurLessonVisual } from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { LessonCodeBlock } from './WebDevelopmentReactComponentsLesson.data.shared';

export const strictModeSlides: LessonSlide[] = [
    {
      title: 'StrictMode w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            <strong>{'<StrictMode>'}</strong> pomaga wykryć typowe błędy wcześnie — tylko w trybie
            deweloperskim. Nie wpływa na produkcję.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Cała aplikacja'
            code={`import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);`}
            caption='Zalecane dla nowych aplikacji.'
          />
          <KangurLessonVisual
            accent='sky'
            caption='StrictMode uruchamia dodatkowy cykl setup/cleanup w dev.'
            maxWidthClassName='max-w-full'
          >
            <ReactStrictModeCycleAnimation />
          </KangurLessonVisual>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Co włącza StrictMode?</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Podwójny render komponentów (wykrywa nieczyste renderowanie).</li>
              <li>Dodatkowy cykl setup/cleanup dla Effectów.</li>
              <li>Dodatkowy cykl dla callback refs.</li>
              <li>Ostrzeżenia o przestarzałych API.</li>
            </ul>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Tylko część aplikacji',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            StrictMode możesz włączyć tylko dla fragmentu UI. Wtedy sprawdzane są tylko komponenty
            wewnątrz tego drzewa.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Częściowe użycie'
            code={`function App() {
  return (
    <>
      <Header />
      <StrictMode>
        <main>
          <Sidebar />
          <Content />
        </main>
      </StrictMode>
      <Footer />
    </>
  );
}`}
            caption='Header i Footer nie są objęte kontrolami StrictMode.'
          />
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Uwaga</p>
            <KangurLessonCaption className='mt-2 text-left'>
              W częściowym StrictMode React uruchamia tylko zachowania możliwe w produkcji.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Podwójny render = wykrywanie nieczystości',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            StrictMode wywołuje render dwa razy, by wykryć impure rendering. Jeśli mutujesz propsy,
            zobaczysz błąd szybciej.
          </KangurLessonLead>
          <KangurLessonVisual
            accent='violet'
            caption='Podwójne wywołanie renderu ujawnia impure rendering.'
            maxWidthClassName='max-w-full'
          >
            <ReactStrictModeDoubleRenderAnimation />
          </KangurLessonVisual>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            <LessonCodeBlock
              title='Błąd (mutacja propsów)'
              code={`function StoryTray({ stories }) {
  const items = stories;
  items.push({ id: 'create', label: 'Create Story' });
  return items.map(story => <Story key={story.id} {...story} />);
}`}
              caption='Mutacja propsów = brak czystości funkcji.'
            />
            <LessonCodeBlock
              title='Poprawka'
              code={`function StoryTray({ stories }) {
  const items = stories.slice(); // kopia
  items.push({ id: 'create', label: 'Create Story' });
  return items.map(story => <Story key={story.id} {...story} />);
}`}
              caption='Kopiuj dane zanim je modyfikujesz.'
            />
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Effecty: setup → cleanup → setup',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            StrictMode uruchamia dodatkowy cykl setup/cleanup dla każdego Effectu. Jeśli brakuje
            cleanup, szybciej zauważysz wyciek.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Effect z cleanup'
            code={`useEffect(() => {
  const connection = createConnection(serverUrl, roomId);
  connection.connect();
  return () => connection.disconnect();
}, [roomId]);`}
            caption='Cleanup zapobiega wyciekom i podwójnym połączeniom.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Callback refs i cleanup',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Callback refy też przechodzą dodatkowy cykl. Brak cleanup powoduje rosnące listy i
            wycieki pamięci.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Callback ref z cleanup'
            code={`<li ref={(node) => {
  const list = itemsRef.current;
  const item = { node };
  list.push(item);
  return () => {
    list.splice(list.indexOf(item), 1);
  };
}} />`}
            caption='Cleanup usuwa elementy z mapy refów.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Caveats i ostrzeżenia',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            StrictMode nie przyjmuje propsów i nie da się go “wyłączyć” wewnątrz drzewa, które
            już nim objęto.
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Brak opt‑outu</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Jeśli część zespołu nie chce tych kontroli, trzeba przenieść StrictMode niżej w drzewie.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCallout accent='rose' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Deprecated APIs</p>
            <KangurLessonCaption className='mt-2 text-left'>
              StrictMode ostrzega m.in. o <strong>UNSAFE_</strong> lifecycle w klasach.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCaption align='left'>
            Wszystkie kontrole StrictMode działają wyłącznie w development i nie wpływają na produkcję.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
];
