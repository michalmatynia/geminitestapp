import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import { ReactActivityToggleAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { KangurLessonCallout, KangurLessonCaption, KangurLessonInset, KangurLessonLead, KangurLessonStack, KangurLessonVisual } from '@/features/kangur/ui/design/lesson-primitives';
import { LessonCodeBlock } from './WebDevelopmentReactComponentsLesson.data.shared';

export const activitySlides: LessonSlide[] = [
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
            supportingContent={
              <div className='text-left'>
                <p className='text-sm font-semibold text-slate-900'>Co się dzieje w ukryciu?</p>
                <ul className='mt-2 list-disc pl-4 text-sm text-slate-600'>
                  <li>UI jest ukryte przez <strong>display: none</strong>.</li>
                  <li>Effecty są czyszczone, a po powrocie odtwarzane.</li>
                  <li>Dzieci nadal renderują się na niskim priorytecie.</li>
                </ul>
              </div>
            }
          >
            <ReactActivityToggleAnimation />
          </KangurLessonVisual>
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
];
