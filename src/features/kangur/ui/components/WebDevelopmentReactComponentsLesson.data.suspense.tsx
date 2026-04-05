'use client';

import type { LessonSlide } from '@/features/kangur/ui/components/lesson-framework/LessonSlideSection';
import { ReactSuspenseNestedRevealAnimation, ReactSuspenseFallbackAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { KangurLessonCallout, KangurLessonCaption, KangurLessonInset, KangurLessonLead, KangurLessonStack, KangurLessonVisual } from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { LessonCodeBlock } from './WebDevelopmentReactComponentsLesson.data.shared';

export const suspenseSlides: LessonSlide[] = [
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
];
