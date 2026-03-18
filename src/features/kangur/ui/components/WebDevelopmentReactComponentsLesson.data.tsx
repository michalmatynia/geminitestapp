import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  ReactFragmentGroupAnimation,
  ReactFragmentKeyListAnimation,
  ReactActivityToggleAnimation,
  ReactProfilerMultiBoundaryAnimation,
  ReactProfilerTimingAnimation,
  ReactStrictModeCycleAnimation,
  ReactStrictModeDoubleRenderAnimation,
  ReactSuspenseNestedRevealAnimation,
  ReactSuspenseFallbackAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

type SectionId =
  | 'components'
  | 'fragment'
  | 'profiler'
  | 'strict_mode'
  | 'suspense'
  | 'activity'
  | 'composition'
  | 'summary';

const BUILT_IN_COMPONENTS = [
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

const BuiltInPanel = ({
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

const LessonCodeBlock = ({
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

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  components: [
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
  ],
  fragment: [
    {
      title: 'Fragment w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            <strong>{'<Fragment>'}</strong> (albo skrót <strong>{'<>'}</strong>) grupuje elementy
            JSX bez dodawania wrappera do DOM. To tak, jakby elementy nie były wcale
            zgrupowane.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            <LessonCodeBlock
              title='Shorthand'
              code={`<>
  <OneChild />
  <AnotherChild />
</>`}
              caption='Skrót <>...</> działa jak <Fragment>...</Fragment>.'
            />
            <KangurLessonVisual
              accent='sky'
              caption='Fragment grupuje elementy bez dodania wrappera w DOM.'
              maxWidthClassName='max-w-full'
            >
              <ReactFragmentGroupAnimation />
            </KangurLessonVisual>
          </div>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Po co Fragment?</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Komponent może zwrócić tylko jeden element, a Fragment pozwala zwrócić ich wiele
              bez dodatkowych divów.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Typowe użycia',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Fragment działa wszędzie tam, gdzie JSX wymaga pojedynczego elementu: w return,
            w propsach i w zmiennych.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            <LessonCodeBlock
              title='Return wielu elementów'
              code={`function Post() {
  return (
    <>
      <PostTitle />
      <PostBody />
    </>
  );
}`}
              caption='Komponent zwraca wiele elementów bez wrappera.'
            />
            <LessonCodeBlock
              title='Fragment w zmiennej'
              code={`const buttons = (
  <>
    <OKButton />
    <CancelButton />
  </>
);

<Dialog buttons={buttons} />`}
              caption='Fragment możesz trzymać w zmiennej i przekazywać dalej.'
            />
          </div>
          <LessonCodeBlock
            title='Tekst + elementy'
            code={`function DateRange({ start, end }) {
  return (
    <>
      From <DatePicker date={start} />
      to <DatePicker date={end} />
    </>
  );
}`}
            caption='Fragment pozwala mieszać tekst i komponenty w jednym zwrocie.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Listy i klucze',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy renderujesz listę Fragmentów, potrzebujesz klucza. Wtedy nie używasz skrótu
            <strong>{' <>'}</strong>, tylko pełnej składni <strong>{'<Fragment>'}</strong>.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Fragment z key'
            code={`import { Fragment } from 'react';

return posts.map(post => (
  <Fragment key={post.id}>
    <PostTitle title={post.title} />
    <PostBody body={post.body} />
  </Fragment>
));`}
            caption='Key działa tylko w jawnej składni <Fragment>.'
          />
          <KangurLessonVisual
            accent='sky'
            caption='Lista Fragmentów wymaga kluczy.'
            maxWidthClassName='max-w-full'
          >
            <ReactFragmentKeyListAnimation />
          </KangurLessonVisual>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Caveat</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Jeśli potrzebujesz <strong>key</strong> lub <strong>ref</strong>, użyj
              jawnego <strong>{'<Fragment>'}</strong>.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Canary: Fragment refs',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            W wersji Canary Fragment może przyjmować <strong>ref</strong>. Dostajesz
            <strong> FragmentInstance</strong> z metodami do obsługi DOM bez dodatkowych wrapperów.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Ref do Fragment'
            code={`import { Fragment, useRef } from 'react';

const fragmentRef = useRef(null);

<Fragment ref={fragmentRef}>
  {children}
</Fragment>`}
            caption='Ref działa tylko w jawnej składni <Fragment>.'
          />
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>FragmentInstance (przykłady)</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Eventy: addEventListener, removeEventListener, dispatchEvent</li>
              <li>Layout: compareDocumentPosition, getClientRects, getRootNode</li>
              <li>Focus: focus, focusLast, blur</li>
              <li>Observer: observeUsing, unobserveUsing</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Canary = funkcjonalność eksperymentalna, dostępna tylko w specjalnych buildach Reacta.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Drobne pułapki',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Fragment nie resetuje stanu komponentów przy przełączaniu między
            <strong>{' <>'}</strong> a pojedynczym elementem. To działa tylko na jednym poziomie.
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Zapamiętaj</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Jeśli zależy Ci na resecie stanu, zmiana wrappera na Fragment nie wystarczy.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  profiler: [
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
  ],
  strict_mode: [
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
  ],
  suspense: [
    {
      title: 'Suspense w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            <strong>{'<Suspense>'}</strong> wyświetla fallback, dopóki dzieci nie zakończą
            ładowania. Gdy dane lub kod są gotowe, React przełącza UI z fallbacku na właściwą
            treść.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Podstawowe użycie'
            code={`<Suspense fallback={<Loading />}>
  <Albums />
</Suspense>`}
            caption='Fallback pokazuje się, gdy dzieci się wstrzymują.'
          />
          <KangurLessonVisual
            accent='sky'
            caption='Fallback znika, gdy Suspense przestaje się wstrzymywać.'
            maxWidthClassName='max-w-full'
          >
            <ReactSuspenseFallbackAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Propsy i caveats',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Suspense ma tylko dwa propsy: <strong>children</strong> i <strong>fallback</strong>.
            Jeśli render zostanie wstrzymany przed pierwszym mountem, stan nie jest zachowywany.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Propsy</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li><strong>children</strong> – właściwe UI, które może się wstrzymać.</li>
              <li><strong>fallback</strong> – UI zastępcze (np. skeleton lub spinner).</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Caveat</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Jeśli zawartość już się pokazała, a potem znów się wstrzyma, fallback pojawi się
              ponownie, chyba że użyjesz <strong>startTransition</strong> lub
              <strong> useDeferredValue</strong>.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Revealing: razem czy stopniowo?',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Jeden Suspense traktuje całe drzewo jako jedną jednostkę — wszystko pojawia się
            razem. Zagnieżdżone granice pozwalają odsłaniać UI stopniowo.
          </KangurLessonLead>
          <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
            <LessonCodeBlock
              title='Wszystko razem'
              code={`<Suspense fallback={<Loading />}>
  <Biography />
  <Albums />
</Suspense>`}
              caption='Dwie sekcje pojawiają się naraz.'
            />
            <LessonCodeBlock
              title='Stopniowo'
              code={`<Suspense fallback={<Loading />}>
  <Biography />
  <Suspense fallback={<AlbumsSkeleton />}>
    <Albums />
  </Suspense>
</Suspense>`}
              caption='Zagnieżdżone granice mogą odsłaniać część UI wcześniej.'
            />
          </div>
          <KangurLessonVisual
            accent='sky'
            caption='Zagnieżdżone granice ujawniają UI etapami.'
            maxWidthClassName='max-w-full'
          >
            <ReactSuspenseNestedRevealAnimation />
          </KangurLessonVisual>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Skąd bierze się “suspending”?',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Suspense działa tylko z “Suspense‑enabled” źródłami danych. Zwykłe fetch w Effectach
            nie aktywują Suspense.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Obsługiwane źródła</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Frameworki z Suspense (np. Relay, Next.js).</li>
              <li>Lazy‑loading kodu przez <strong>lazy</strong>.</li>
              <li>Odczyt z cache Promise przez <strong>use</strong>.</li>
            </ul>
          </KangurLessonInset>
          <KangurLessonCaption align='left'>
            Fetch w Effectach lub handlerach zdarzeń nie wstrzymuje renderu przez Suspense.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  activity: [
    {
      title: 'Activity w skrócie',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            <strong>{'<Activity>'}</strong> pozwala ukrywać i przywracać UI wraz ze stanem dzieci.
            Ukryty content dostaje <strong>display: none</strong>, a Effecty są czyszczone.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Podstawowe użycie'
            code={`<Activity mode={isOpen ? 'visible' : 'hidden'}>
  <Sidebar />
</Activity>`}
            caption='mode: "visible" | "hidden" (domyślnie widoczny).'
          />
          <KangurLessonVisual
            accent='sky'
            caption='Activity chowa UI, ale zachowuje stan.'
            maxWidthClassName='max-w-full'
          >
            <ReactActivityToggleAnimation />
          </KangurLessonVisual>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Co się dzieje w ukryciu?</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>UI jest ukryte przez <strong>display: none</strong>.</li>
              <li>Effecty są czyszczone, a po powrocie odtwarzane.</li>
              <li>Dzieci nadal renderują się na niskim priorytecie.</li>
            </ul>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Odtwarzanie stanu',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Zwykłe unmountowanie niszczy stan. Activity “zapamiętuje” UI, więc możesz ukryć i
            przywrócić np. boczny panel bez utraty stanu.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Zamiast unmount'
            code={`// Zamiast: {isShowing && <Sidebar />}
<Activity mode={isShowing ? 'visible' : 'hidden'}>
  <Sidebar />
</Activity>`}
            caption='Stan sidebaru pozostaje zachowany.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Zachowanie DOM (np. textarea)',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Ponieważ Activity używa <strong>display: none</strong>, DOM też pozostaje zachowany.
            To przydatne np. w zakładkach z edytorem lub formularzem.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Przykład z zakładkami'
            code={`<Activity mode={activeTab === 'contact' ? 'visible' : 'hidden'}>
  <Contact />
</Activity>`}
            caption='Tekst w textarea nie znika po zmianie zakładki.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Pre-rendering ukrytej treści',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Activity potrafi przygotować UI wcześniej: ukryta granica renderuje dzieci na
            niższym priorytecie, bez mountowania Effectów.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Hidden pre-render'
            code={`<Activity mode="hidden">
  <SlowComponent />
</Activity>`}
            caption='Ukryte dzieci mogą wczytać kod i dane wcześniej.'
          />
          <KangurLessonCallout accent='amber' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Note</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Pre-rendering działa tylko z Suspense‑enabled źródłami danych (np. Relay, Next,
              lazy, use). Fetch w Effectach nie aktywuje Activity.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Szybsze interakcje i hydratacja',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Activity pomaga w selektywnej hydratacji: React może uczynić część UI interaktywną
            wcześniej, nawet gdy reszta czeka na kod lub dane.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Hydratacja w kawałkach'
            code={`function Page() {
  return (
    <>
      <MessageComposer />
      <Suspense fallback="Loading chats...">
        <Chats />
      </Suspense>
    </>
  );
}`}
            caption='Część UI może stać się interaktywna wcześniej.'
          />
          <KangurLessonCaption align='left'>
            Activity może poprawiać hydratację nawet wtedy, gdy jest zawsze widoczne.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Caveats i troubleshooting',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Ukryty Activity czyści Effecty, ale DOM zostaje. To może zostawić niepożądane efekty
            (np. wideo nadal gra).
          </KangurLessonLead>
          <KangurLessonCallout accent='rose' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Side effects</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Ponieważ DOM nie jest niszczony, efekty przeglądarki mogą pozostać aktywne.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCallout accent='slate' padding='sm' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Text-only caveat</p>
            <KangurLessonCaption className='mt-2 text-left'>
              Ukryty Activity z samym tekstem nie renderuje nic w DOM, bo nie ma elementu, który
              mógłby zostać ukryty.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Gdy Effecty nie działają',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Gdy Activity jest ukryty, React czyści wszystkie Effecty dzieci. Subskrypcje
            zatrzymują się, a kod z useEffect nie działa w tle.
          </KangurLessonLead>
          <KangurLessonInset accent='slate' className='text-left'>
            <p className='text-sm font-semibold text-slate-900'>Jak się zabezpieczyć?</p>
            <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
              <li>Przenieś krytyczne działania do cleanupu Effectu.</li>
              <li>Włącz StrictMode, by szybciej wyłapać braki w cleanupach.</li>
            </ul>
          </KangurLessonInset>
        </KangurLessonStack>
      ),
    },
  ],
  composition: [
    {
      title: 'Kompozycja i propsy',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Składaj UI z mniejszych, przewidywalnych części.</KangurLessonLead>
          <KangurLessonCaption>
            Materiały o kompozycji pojawią się tu w kolejnych iteracjach.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Przekazywanie propsów',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Propsy to dane wejściowe komponentu. Dzięki nim jeden komponent może działać w różnych
            kontekstach.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Propsy w akcji'
            code={`function Badge({ label, tone }) {
  return <span className={\`badge \${tone}\`}>{label}</span>;
}

<Badge label="New" tone="success" />
<Badge label="Draft" tone="warning" />`}
            caption='Ten sam komponent, różne dane wejściowe.'
          />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Kompozycja UI',
      content: (
        <KangurLessonStack align='start' className='w-full'>
          <KangurLessonLead align='left'>
            Kompozycja polega na składaniu UI z mniejszych elementów zamiast kopiowania kodu.
          </KangurLessonLead>
          <LessonCodeBlock
            title='Kompozycja'
            code={`function Card({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

<Card title="Stats">
  <StatsGrid />
</Card>`}
            caption='Card buduje ramę, a children wypełniają treść.'
          />
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Podsumowanie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Wracamy do podstaw Reacta.</KangurLessonLead>
          <KangurLessonCaption>
            Kompletne ćwiczenia będą dostępne wkrótce.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'components',
    emoji: '⚛️',
    title: 'Components',
    description: 'Wbudowane komponenty Reacta i własne funkcje',
    slideCount: SLIDES.components.length,
  },
  {
    id: 'fragment',
    emoji: '🧩',
    title: 'Fragment',
    description: 'Grupowanie JSX bez wrappera i canary refy',
    slideCount: SLIDES.fragment.length,
  },
  {
    id: 'profiler',
    emoji: '📊',
    title: 'Profiler',
    description: 'Pomiar wydajności renderu i onRender callback',
    slideCount: SLIDES.profiler.length,
  },
  {
    id: 'strict_mode',
    emoji: '🛡️',
    title: 'StrictMode',
    description: 'Dodatkowe kontrole w dev i typowe pułapki',
    slideCount: SLIDES.strict_mode.length,
  },
  {
    id: 'suspense',
    emoji: '⏳',
    title: 'Suspense',
    description: 'Fallback, granice i wspierane źródła danych',
    slideCount: SLIDES.suspense.length,
  },
  {
    id: 'activity',
    emoji: '🫥',
    title: 'Activity',
    description: 'Ukrywanie UI, zachowanie stanu i pre-rendering',
    slideCount: SLIDES.activity.length,
  },
  {
    id: 'composition',
    emoji: '🧱',
    title: 'Kompozycja i propsy',
    description: 'Składanie interfejsu z mniejszych części',
    slideCount: SLIDES.composition.length,
  },
  {
    id: 'summary',
    emoji: '📋',
    title: 'Podsumowanie',
    description: 'Najważniejsze wnioski',
    slideCount: SLIDES.summary.length,
  },
];
