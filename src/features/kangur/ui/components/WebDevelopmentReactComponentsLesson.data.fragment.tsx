import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import { ReactFragmentGroupAnimation, ReactFragmentKeyListAnimation } from '@/features/kangur/ui/components/LessonAnimations';
import { KangurLessonCallout, KangurLessonCaption, KangurLessonInset, KangurLessonLead, KangurLessonStack, KangurLessonVisual } from '@/features/kangur/ui/design/lesson-primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { LessonCodeBlock } from './WebDevelopmentReactComponentsLesson.data.shared';

export const fragmentSlides: LessonSlide[] = [
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
];
