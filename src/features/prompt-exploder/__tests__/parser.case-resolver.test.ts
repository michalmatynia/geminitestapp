import { describe, expect, it } from 'vitest';

import {
  defaultPromptEngineSettings,
  type PromptValidationRule,
} from '@/features/prompt-engine/settings';
import { explodePromptText } from '@/features/prompt-exploder/parser';
import { getPromptExploderScopedRules } from '@/features/prompt-exploder/pattern-pack';

describe('case resolver prompt exploder segmentation', () => {
  it('splits place/date, addresser, and addressee blocks from HTML input', () => {
    const prompt = [
      '<p style="text-align: right;">Szczecin, 25.01.2026 r.</p>',
      '<p></p>',
      '<p>Michał Matynia</p>',
      '<p>Fioletowa 71/2</p>',
      '<p>70-781 Szczecin</p>',
      '<p>Polska</p>',
      '<p style="text-align: right;">Inspektorat ZUS w Gryficach</p>',
      '<p style="text-align: right;">Dąbskiego 5</p>',
      '<p style="text-align: right;">72-300 Gryfice</p>',
      '<p></p>',
      '<p><strong>Wniosek o umorzenie zadłużenia</strong></p>',
    ].join('');

    const rules = getPromptExploderScopedRules(
      defaultPromptEngineSettings,
      'case_resolver_prompt_exploder'
    );
    const document = explodePromptText({
      prompt,
      validationRules: rules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    const segmentBodies = document.segments.map((segment) => ((segment.raw || segment.text) || '') || '');
    const addresserIndex = segmentBodies.findIndex((value) =>
      value.includes('Michał Matynia')
    );
    const addresseeIndex = segmentBodies.findIndex((value) =>
      value.includes('Inspektorat ZUS w Gryficach')
    );
    const placeDateIndex = segmentBodies.findIndex((value) =>
      value.includes('Szczecin, 25.01.2026 r.')
    );
    
    expect(placeDateIndex).toBeGreaterThanOrEqual(0);
    expect(addresserIndex).toBeGreaterThanOrEqual(0);
    expect(addresseeIndex).toBeGreaterThanOrEqual(0);
    expect(addresserIndex).not.toBe(placeDateIndex);
    expect(addresseeIndex).toBeGreaterThan(addresserIndex);
    
    const addresserSegment = document.segments[addresserIndex];
    const addresseeSegment = document.segments[addresseeIndex];
    const placeDateSegment = document.segments[placeDateIndex];
    const subjectSegment = document.segments.find((segment) =>
      (((segment.raw || segment.text) || '') || '').includes('Wniosek o umorzenie zadłużenia')
    );    expect(addresserSegment?.raw).toContain('Fioletowa 71/2');
    expect(addresserSegment?.raw).toContain('Polska');
    expect(addresserSegment?.raw).not.toContain('Inspektorat ZUS w Gryficach');
    expect(addresseeSegment?.raw).toContain('Inspektorat ZUS w Gryficach');
    expect(addresseeSegment?.raw).toContain('72-300 Gryfice');
    expect(placeDateSegment?.raw).not.toContain('Michał Matynia');
    expect(addresserSegment?.raw).not.toContain('Szczecin, 25.01.2026 r.');
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Place Date City'
    );
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Place Date Day'
    );
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Place Date Month'
    );
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Place Date Year'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Addresser First Name'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address Street'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address Street Number'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address House Number'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address Postal Code'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address City'
    );
    expect(addresserSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Address Country'
    );
    expect(addresseeSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Addressee Organization'
    );
    expect(addresseeSegment?.matchedPatternLabels).toContain(
      'Case Resolver Extract: Addressee Organization Name'
    );
    expect(addresseeSegment?.matchedPatternLabels).not.toContain(
      'Case Resolver Extract: Address Country'
    );
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Place + Date'
    );
    expect(addresseeSegment?.matchedSequenceLabels).toContain('Case Resolver Structure');
    expect(placeDateSegment?.title).toBe('');
    expect(addresserSegment?.title).toBe('');
    expect(addresseeSegment?.title).toBe('');
    expect(subjectSegment?.title).toBe('');
  });

  it('keeps plain place/date line isolated from addresser block without comma suffix', () => {
    const prompt = [
      '<p style="text-align: right;">Szczecin 25.01.2026</p>',
      '<p></p>',
      '<p>Michał Matynia</p>',
      '<p>Fioletowa 71/2</p>',
      '<p>70-781 Szczecin</p>',
      '<p>Polska</p>',
      '<p style="text-align: right;">Inspektorat ZUS w Gryficach</p>',
      '<p style="text-align: right;">Dąbskiego 5</p>',
      '<p style="text-align: right;">72-300 Gryfice</p>',
      '<p></p>',
      '<p><strong>Wniosek o umorzenie zadłużenia</strong></p>',
    ].join('');

    const rules = getPromptExploderScopedRules(
      defaultPromptEngineSettings,
      'case_resolver_prompt_exploder'
    );
    const document = explodePromptText({
      prompt,
      validationRules: rules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    const placeDateSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes('Szczecin 25.01.2026')
    );
    const addresserSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes('Michał Matynia')
    );
    const addresseeSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes('Inspektorat ZUS w Gryficach')
    );
    const subjectSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes('Wniosek o umorzenie zadłużenia')
    );

    expect(placeDateSegment).toBeDefined();
    expect(addresserSegment).toBeDefined();
    expect(addresseeSegment).toBeDefined();
    expect(placeDateSegment?.id).not.toBe(addresserSegment?.id);
    expect(addresserSegment?.id).not.toBe(addresseeSegment?.id);
    expect(placeDateSegment?.raw).toBe('Szczecin 25.01.2026');
    expect(addresserSegment?.raw).toContain('Fioletowa 71/2');
    expect(addresserSegment?.raw).toContain('70-781 Szczecin');
    expect(addresserSegment?.raw).toContain('Polska');
    expect(addresserSegment?.raw).not.toContain('Inspektorat ZUS w Gryficach');
    expect(addresseeSegment?.raw).toContain('Inspektorat ZUS w Gryficach');
    expect(addresseeSegment?.raw).toContain('Dąbskiego 5');
    expect(addresseeSegment?.raw).toContain('72-300 Gryfice');
    expect(placeDateSegment?.title).toBe('');
    expect(addresserSegment?.title).toBe('');
    expect(addresseeSegment?.title).toBe('');
    expect(subjectSegment?.title).toBe('');
  });

  it('keeps placeholder place/date heading title empty for "city, dnia [DD.MM.YYYY]" format', () => {
    const prompt = [
      '<p>Szczecin, dnia [DD.MM.2026]</p>',
      '<p>Michał Matynia</p>',
      '<p>Fioletowa 71/2</p>',
      '<p>70-781 Szczecin</p>',
      '<p>Polska</p>',
      '<p>Inspektorat ZUS w Gryficach</p>',
      '<p>Dąbskiego 5</p>',
      '<p>72-300 Gryfice</p>',
      '<p>Dotyczy: postępowanie administracyjne ZUS O/Szczecin nr 390000/71/RKS3/2026/282</p>',
    ].join('');

    const rules = getPromptExploderScopedRules(
      defaultPromptEngineSettings,
      'case_resolver_prompt_exploder'
    );
    const document = explodePromptText({
      prompt,
      validationRules: rules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    const placeDateSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes('Szczecin, dnia [DD.MM.2026]')
    );
    const addresserSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes('Michał Matynia')
    );

    expect(placeDateSegment).toBeDefined();
    expect(addresserSegment).toBeDefined();
    expect(placeDateSegment?.id).not.toBe(addresserSegment?.id);
    expect(placeDateSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Place + Date'
    );
    expect(placeDateSegment?.title).toBe('');
  });

  it('splits Dotyczy subheading into its own segment and keeps the title empty', () => {
    const prompt = [
      '<p><strong>Wniosek o umorzenie zadłużenia</strong></p>',
      '<p><strong>Dotyczy: postępowanie administracyjne ZUS O/Szczecin nr 390000/71/RKS3/2026/282</strong></p>',
      '<p>Niniejszym wnoszę o umorzenie powstałego zadłużenia z tytułu należności składkowych.</p>',
      '<p><strong>Uzasadnienie</strong></p>',
    ].join('');

    const rules = getPromptExploderScopedRules(
      defaultPromptEngineSettings,
      'case_resolver_prompt_exploder'
    );
    const document = explodePromptText({
      prompt,
      validationRules: rules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    const dotyczySegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes(
        'Dotyczy: postępowanie administracyjne ZUS O/Szczecin nr 390000/71/RKS3/2026/282'
      )
    );
    const bodySegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes(
        'Niniejszym wnoszę o umorzenie powstałego zadłużenia'
      )
    );

    expect(dotyczySegment).toBeDefined();
    expect(bodySegment).toBeDefined();
    expect(dotyczySegment?.id).not.toBe(bodySegment?.id);
    expect(dotyczySegment?.raw?.trim()).toBe(
      'Dotyczy: postępowanie administracyjne ZUS O/Szczecin nr 390000/71/RKS3/2026/282'
    );    expect(dotyczySegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Dotyczy Subheading'
    );
    expect(dotyczySegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Subject/Section'
    );
    expect(dotyczySegment?.title).toBe('');
    expect(bodySegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Body Statement Start'
    );
    expect(bodySegment?.title).toBe('');
  });

  it('splits compact sender and ZUS addressee blocks without blank-line separator', () => {
    const prompt = `Szczecin 06.02.2026

Michał Matynia
Fioletowa 71/2
70-781 Szczecin
Polska
Zakład Ubezpieczeń Społecznych Oddział w Szczecinie
ul. MATEJKI 22
70-530 SZCZECIN

Rezygnacja z funkcji płatnika składek (wyrejestrowanie)

Na podstawie obowiązujących przepisów informuję, że z dniem [dd.mm.2026] zaprzestaję prowadzenia działalności gospodarczej. W związku z tym rezygnuję z pełnienia funkcji płatnika składek na ubezpieczenia społeczne i zdrowotne. Proszę o dokonanie wyrejestrowania mnie w trybie natychmiastowym.`;

    const rules = getPromptExploderScopedRules(
      defaultPromptEngineSettings,
      'case_resolver_prompt_exploder'
    );
    const document = explodePromptText({
      prompt,
      validationRules: rules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    const segmentBodies = document.segments.map((segment) => segment.raw || segment.text);
    const addresserIndex = segmentBodies.findIndex((value) => (value || '').includes('Michał Matynia'));
    const addresseeIndex = segmentBodies.findIndex((value) =>
      (value || '').includes('Zakład Ubezpieczeń Społecznych Oddział w Szczecinie')
    );    const subjectIndex = document.segments.findIndex(
      (segment) =>
        segment.title === 'Rezygnacja z funkcji płatnika składek (wyrejestrowanie)'
    );

    expect(addresserIndex).toBeGreaterThanOrEqual(0);
    expect(addresseeIndex).toBeGreaterThanOrEqual(0);
    expect(subjectIndex).toBeGreaterThanOrEqual(0);
    expect(addresseeIndex).toBeGreaterThan(addresserIndex);
    expect(subjectIndex).toBeGreaterThan(addresseeIndex);

    const addresserSegment = document.segments[addresserIndex];
    const addresseeSegment = document.segments[addresseeIndex];
    const subjectSegment = document.segments[subjectIndex];

    expect(addresserSegment?.raw).toContain('Fioletowa 71/2');
    expect(addresserSegment?.raw).not.toContain(
      'Zakład Ubezpieczeń Społecznych Oddział w Szczecinie'
    );
    expect(addresseeSegment?.raw).toContain('ul. MATEJKI 22');
    expect(addresseeSegment?.raw).not.toContain('Michał Matynia');
    expect(addresseeSegment?.raw).not.toContain(
      'Rezygnacja z funkcji płatnika składek (wyrejestrowanie)'
    );
    expect(addresseeSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Addressee Organization'
    );
    expect(subjectSegment?.raw).toContain('Na podstawie obowiązujących przepisów informuję');
    expect(subjectSegment?.raw).not.toContain(
      'Zakład Ubezpieczeń Społecznych Oddział w Szczecinie'
    );
  });

  it('splits sender and police addressee blocks for unicode and ascii dash variants', () => {
    const addresseeHeadings = [
      'Komisariat Policji Szczecin–Dąbie',
      'Komisariat Policji Szczecin-Dąbie',
    ];

    addresseeHeadings.forEach((addresseeHeading) => {
      const prompt = `Szczecin 14.02.2026

Michał Matynia
Fioletowa 71/2
70-781 Szczecin
Polska
${addresseeHeading}
ul. Pomorska 15
70-812 Szczecin

Dotyczy: wezwania na dzień 12.02.2026 r., godz. 08:30, pok. 24
Niniejszym wnoszę o zwrot kosztów podróży świadka.`;

      const rules = getPromptExploderScopedRules(
        defaultPromptEngineSettings,
        'case_resolver_prompt_exploder'
      );
      const document = explodePromptText({
        prompt,
        validationRules: rules,
        validationScope: 'case_resolver_prompt_exploder',
      });

      const segmentBodies = document.segments.map((segment) => segment.raw || segment.text);
      const addresserIndex = segmentBodies.findIndex((value) =>
        (value || '').includes('Michał Matynia')
      );
      const addresseeIndex = segmentBodies.findIndex((value) =>
        (value || '').includes(addresseeHeading)
      );
      const dotyczyIndex = segmentBodies.findIndex((value) =>
        (value || '').includes('Dotyczy: wezwania na dzień 12.02.2026 r., godz. 08:30, pok. 24')
      );
      const bodyIndex = segmentBodies.findIndex((value) =>
        (value || '').includes('Niniejszym wnoszę o zwrot kosztów podróży świadka.')
      );

      expect(addresserIndex).toBeGreaterThanOrEqual(0);
      expect(addresseeIndex).toBeGreaterThanOrEqual(0);
      expect(dotyczyIndex).toBeGreaterThanOrEqual(0);
      expect(bodyIndex).toBeGreaterThanOrEqual(0);
      expect(addresseeIndex).toBeGreaterThan(addresserIndex);
      expect(dotyczyIndex).toBeGreaterThan(addresseeIndex);
      expect(bodyIndex).toBeGreaterThan(dotyczyIndex);

      const addresserSegment = document.segments[addresserIndex];
      const addresseeSegment = document.segments[addresseeIndex];
      const bodySegment = document.segments[bodyIndex];

      expect(addresserSegment?.raw).toContain('Fioletowa 71/2');
      expect(addresserSegment?.raw).not.toContain(addresseeHeading);
      expect(addresseeSegment?.raw).toContain('ul. Pomorska 15');
      expect(addresseeSegment?.raw).not.toContain('Michał Matynia');
      expect(addresseeSegment?.matchedPatternLabels).toContain(
        'Case Resolver Heading: Addressee Organization'
      );
      expect(bodySegment?.raw).toContain('Niniejszym wnoszę o zwrot kosztów podróży świadka.');
      expect(bodySegment?.raw).not.toContain(addresseeHeading);
    });
  });

  it('keeps Uzasadnienie in title only and removes it from body text', () => {
    const prompt = [
      '<p><strong>Uzasadnienie</strong></p>',
      '<p>Przez kilka lat nie nastąpiło skuteczne doręczenie wnioskodawcy informacji o narastającym zadłużeniu względem ZUS.</p>',
      '<p>Organ rentowy nie dopełnił tym samym obowiązków wynikających z art. 9 i art. 10 KPA.</p>',
    ].join('');

    const rules = getPromptExploderScopedRules(
      defaultPromptEngineSettings,
      'case_resolver_prompt_exploder'
    );
    const document = explodePromptText({
      prompt,
      validationRules: rules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    const uzasadnienieSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes(
        'Przez kilka lat nie nastąpiło skuteczne doręczenie wnioskodawcy'
      )
    );

    expect(uzasadnienieSegment).toBeDefined();
    expect(uzasadnienieSegment?.title).toBe('Uzasadnienie');
    const uzasadnienieBody = uzasadnienieSegment?.raw || uzasadnienieSegment?.text || '';
    expect(uzasadnienieBody.startsWith('Uzasadnienie')).toBe(false);
  });

  it('keeps Na zakończenie closing segment title empty', () => {
    const prompt = [
      '<p>Na zakończenie, na podstawie art. 73 § 1 KPA, wnoszę o umożliwienie dostępu do akt sprawy.</p>',
      '<p>Proszę o udostępnienie mi akt postępowania do wglądu.</p>',
    ].join('');

    const rules = getPromptExploderScopedRules(
      defaultPromptEngineSettings,
      'case_resolver_prompt_exploder'
    );
    const document = explodePromptText({
      prompt,
      validationRules: rules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    const closingSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes('Na zakończenie, na podstawie art. 73 § 1 KPA')
    );

    expect(closingSegment).toBeDefined();
    expect(closingSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Closing Statement'
    );
    expect(closingSegment?.title).toBe('');
  });

  it('keeps WSA party line titles empty for addresser and addressee rows', () => {
    const prompt = [
      'Strona w postępowaniu przed WSA: Michał Matynia, ul. Fioletowa 71/2, 70-781 Szczecin',
      '',
      'Organ w postępowaniu przed WSA: Zakład Ubezpieczeń Społecznych Oddział w Szczecinie, ul. Matejki 22, 70-530 Szczecin',
      '',
      'Dotyczy: skarga na decyzję ZUS',
    ].join('\n');

    const rules = getPromptExploderScopedRules(
      defaultPromptEngineSettings,
      'case_resolver_prompt_exploder'
    );
    const document = explodePromptText({
      prompt,
      validationRules: rules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    const addresserSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes(
        'Strona w postępowaniu przed WSA: Michał Matynia'
      )
    );
    const addresseeSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes(
        'Organ w postępowaniu przed WSA: Zakład Ubezpieczeń Społecznych'
      )
    );

    expect(addresserSegment).toBeDefined();
    expect(addresseeSegment).toBeDefined();
    expect(addresserSegment?.title).toBe('');
    expect(addresseeSegment?.title).toBe('');
  });

  it('splits a full real-world ZUS letter into multiple case-resolver segments', () => {
    const prompt = `Szczecin 25.01.2026

Michał Matynia
Fioletowa 71/2
70-781 Szczecin
Polska
Inspektorat ZUS w Gryficach
 Dąbskiego 5
72-300 Gryfice


Wniosek o umorzenie zadłużenia lub korektę rozliczeń oraz o zawieszenie postępowania administracyjnego
Dotyczy: postępowanie administracyjne ZUS O/Szczecin nr 390000/71/RKS3/2026/282

Niniejszym wnoszę o umorzenie powstałego zadłużenia z tytułu należności składkowych, ewentualnie o korektę rozliczeń w zakresie tych należności. Jednocześnie, na podstawie art. 97 § 1 pkt 4 Kodeksu postępowania administracyjnego, wnoszę o zawieszenie postępowania administracyjnego w ww. sprawie, albowiem rozstrzygnięcie niniejszej sprawy zależy od uprzedniego wyjaśnienia zagadnienia wstępnego (ustalenia daty skutecznego zamknięcia działalności gospodarczej wnioskodawcy).
Uzasadnienie

Przez kilka lat nie nastąpiło skuteczne doręczenie wnioskodawcy informacji o narastającym zadłużeniu względem ZUS. Organ rentowy nie dopełnił tym samym obowiązków wynikających z art. 9 i art. 10 KPA – nie poinformował strony należycie o okolicznościach sprawy ani nie zapewnił jej czynnego udziału na każdym etapie postępowania. W efekcie wnioskodawca został pozbawiony możliwości podjęcia odpowiednio wczesnych działań zaradczych, ponieważ nie miał wiedzy o powstających zaległościach. Gdyby informacje o zadłużeniu były prawidłowo doręczane, wnioskodawca mógłby wcześniej zareagować i wyjaśnić sprawę. Brak takiego działania ze strony organu stanowi naruszenie podstawowych zasad postępowania administracyjnego, co uzasadnia wyjątkowe potraktowanie niniejszej sprawy.

Wnioskodawca działał w usprawiedliwionym błędzie co do stanu faktycznego – był przekonany, że prowadzona przez niego działalność gospodarcza została skutecznie zamknięta (wyrejestrowana) już w 2022 roku. Przekonanie to wynikało z informacji otrzymanych od księgowej zatrudnionej przez firmę Last Minute / Bonaventure, w której wnioskodawca podjął pracę. W ramach procesu zatrudnienia wnioskodawca poinformował o zamiarze zakończenia działalności gospodarczej i pozostawał w przeświadczeniu, że wszelkie formalności związane z wyrejestrowaniem działalności zostały dopełnione przez wspomnianą księgową. Wypełniając formularz rekrutacyjny przekazany do działu HR firmy Last Minute, wnioskodawca wyraźnie zaznaczył planowane zamknięcie działalności. Świadczy to o jego braku intencji dalszego prowadzenia firmy oraz o dochowaniu należytej staranności – nowy pracodawca został poinformowany o zamknięciu biznesu. Powyższe okoliczności dowodzą, że wnioskodawca nie działał z zamiarem uchylania się od obowiązków wobec ZUS, lecz padł ofiarą nieporozumienia co do stanu formalnego działalności.

Pomimo opisanej pomyłki, wnioskodawca reagował na każde otrzymane wezwanie z ZUS, co potwierdza jego dobrą wolę. Gdy tylko dowiedział się o zaległościach, niezwłocznie podejmował działania w celu ich uregulowania. Świadczą o tym dokonane wpłaty: w dniach 02.08.2022 r., 29.12.2022 r., 20.11.2023 r. oraz 04.12.2025 r. – każda zrealizowana bezpośrednio po otrzymaniu informacji o zadłużeniu. W szczególności w roku 2022, a następnie ponownie w 2025, wnioskodawca nawiązał kontakt z organem rentowym i podjął stosowne kroki zaraz po tym, gdy tylko otrzymał zawiadomienia o zaległych składkach. Takie konsekwentne zachowanie dowodzi, że wnioskodawca nie działał w złej wierze i nie miał zamiaru wyrządzić szkody systemowi ubezpieczeń społecznych. Przeciwnie – starał się wywiązać z obowiązków, gdy tylko stały się one dla niego oczywiste.

Należy również podkreślić, że faktyczne zaprzestanie działalności nastąpiło już w czerwcu 2022 r. Od tego czasu wnioskodawca nie prowadzi działalności gospodarczej i nie osiąga z niej żadnych przychodów. Co istotne, od października 2022 r. nie zostały złożone do ZUS żadne dokumenty rozliczeniowe dotyczące tej działalności (np. deklaracje DRA). Sam Zakład Ubezpieczeń Społecznych potwierdził ten stan rzeczy w piśmie z dnia 24.11.2025 r., wskazując na brak dokumentów od 10/2022. Oznacza to, że od ponad trzech lat nie odnotowano jakiejkolwiek aktywności gospodarczej po stronie wnioskodawcy. W związku z powyższym naliczanie kolejnych składek za ten okres jest nieuzasadnione, a powstałe zadłużenie ma charakter czysto formalny. Sytuacja, w której ZUS domaga się zaległości za okres, w którym działalność faktycznie nie była prowadzona, przemawia za zastosowaniem korekty rozliczeń lub umorzeniem należności, aby przywrócić stan zgodny z zasadami sprawiedliwości i zaufania obywatela do organu.

Na skutek wieloletniego naliczania odsetek od zaległości, których istnienia wnioskodawca nie był świadomy, kwota odsetek urosła do poziomu przekraczającego 50% kwoty należności głównej. Taka rażąca dysproporcja może stanowić naruszenie zasady proporcjonalności, wyrażonej w art. 7 KPA. Zgodnie z tą zasadą organ administracji publicznej ma obowiązek działać w sposób proporcjonalny, celowy i sprawiedliwy, uwzględniając zarówno interes publiczny, jak i słuszny interes obywatela. Obciążenie strony odsetkami przewyższającymi połowę długu głównego wydaje się nieadekwatne do okoliczności niniejszej sprawy. Warto zauważyć, że zadłużenie narosło w wyniku splotu okoliczności niezawinionych bezpośrednio przez wnioskodawcę – w szczególności braku informacji od organu oraz usprawiedliwionego błędu co do statusu działalności. Dlatego też dalsze egzekwowanie tak wysokich odsetek byłoby sprzeczne z zasadą proporcjonalności i godziłoby w zaufanie obywatela do organów państwa.

Biorąc pod uwagę powyższe argumenty i wyjątkowe okoliczności sprawy, wnoszę o pozytywne rozpatrzenie niniejszego wniosku. Umorzenie zadłużenia (ewentualnie stosowna korekta rozliczeń za sporny okres) jest w pełni uzasadnione brakiem winy umyślnej po stronie płatnika, jego rzetelnym postępowaniem oraz uchybieniami proceduralnymi po stronie organu. Jednocześnie zawieszenie postępowania pozwoli na ostateczne wyjaśnienie statusu działalności gospodarczej i uniknięcie pochopnego rozstrzygnięcia, które mogłoby naruszać słuszne interesy strony.

Na zakończenie, na podstawie art. 73 § 1 KPA, wnoszę o umożliwienie dostępu do akt sprawy. Proszę o udostępnienie mi akt postępowania do wglądu oraz o umożliwienie sporządzenia z nich notatek lub kopii. Prawo wglądu w akta własnej sprawy przysługuje stronie na każdym etapie postępowania administracyjnego, co ma na celu zapewnienie pełnej transparentności i możliwości obrony swoich praw. Skorzystanie z tego uprawnienia pozwoli wnioskodawcy na zapoznanie się ze zgromadzonym materiałem dowodowym i ewentualne uzupełnienie argumentacji.

Z poważaniem,`;

    const rules = getPromptExploderScopedRules(
      defaultPromptEngineSettings,
      'case_resolver_prompt_exploder'
    );
    const document = explodePromptText({
      prompt,
      validationRules: rules,
      validationScope: 'case_resolver_prompt_exploder',
    });

    expect(document.segments.length).toBeGreaterThan(5);

    const placeDateSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes('Szczecin 25.01.2026')
    );
    const addresserSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes('Michał Matynia')
    );
    const addresseeSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes('Inspektorat ZUS w Gryficach')
    );
    const dotyczySegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes(
        'Dotyczy: postępowanie administracyjne ZUS O/Szczecin nr 390000/71/RKS3/2026/282'
      )
    );
    const bodySegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes(
        'Niniejszym wnoszę o umorzenie powstałego zadłużenia'
      )
    );
    const closingSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes(
        'Na zakończenie, na podstawie art. 73 § 1 KPA'
      )
    );

    expect(placeDateSegment).toBeDefined();
    expect(addresserSegment).toBeDefined();
    expect(addresseeSegment).toBeDefined();
    expect(dotyczySegment).toBeDefined();
    expect(bodySegment).toBeDefined();
    expect(closingSegment).toBeDefined();
    expect(addresserSegment?.id).not.toBe(addresseeSegment?.id);
    expect(dotyczySegment?.id).not.toBe(bodySegment?.id);
    expect(addresserSegment?.raw).toContain('Fioletowa 71/2');
    expect(addresserSegment?.raw).toContain('Polska');
    expect(addresserSegment?.raw).not.toContain('Inspektorat ZUS w Gryficach');
    expect(dotyczySegment?.title).toBe('');
    expect(dotyczySegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Dotyczy Subheading'
    );
    expect(closingSegment?.matchedPatternLabels).toContain(
      'Case Resolver Heading: Closing Statement'
    );

    const uzasadnienieSegment = document.segments.find(
      (segment) => segment.title === 'Uzasadnienie'
    );
    const wniosekSegment = document.segments.find((segment) =>
      ((segment.raw || segment.text) || '').includes(
        'Wniosek o umorzenie zadłużenia lub korektę rozliczeń oraz o zawieszenie postępowania administracyjnego'
      )
    );
    expect(uzasadnienieSegment).toBeDefined();
    expect(wniosekSegment?.title).toBe('');
    const uzasadnienieBody =
      uzasadnienieSegment?.raw || uzasadnienieSegment?.text || '';
    expect(uzasadnienieBody.startsWith('Uzasadnienie')).toBe(false);
  });

  it('does not apply hidden structural fallback segmentation without matching heading rules', () => {
    const prompt = `Szczecin 25.01.2026
Michał Matynia
Fioletowa 71/2
70-781 Szczecin
Polska
Inspektorat ZUS w Gryficach
Dąbskiego 5
72-300 Gryfice
Wniosek o umorzenie zadłużenia lub korektę rozliczeń
Dotyczy: postępowanie administracyjne ZUS O/Szczecin nr 390000/71/RKS3/2026/282
Niniejszym wnoszę o umorzenie powstałego zadłużenia.
Uzasadnienie
Przez kilka lat nie nastąpiło skuteczne doręczenie informacji o zadłużeniu.
Na zakończenie, na podstawie art. 73 § 1 KPA, wnoszę o dostęp do akt sprawy.
Z poważaniem,`;

    const fallbackOnlyHeadingRule: PromptValidationRule = {
      kind: 'regex',
      id: 'segment.case_resolver.heading.synthetic_fallback_only',
      enabled: true,
      severity: 'info',
      title: 'Synthetic fallback heading',
      description: null,
      pattern: '^$a',
      flags: 'i',
      message: 'synthetic',
      similar: [],
      appliesToScopes: ['case_resolver_prompt_exploder'],
      promptExploderTreatAsHeading: true,
      promptExploderSegmentType: 'assigned_text',
      promptExploderConfidenceBoost: 0,
      promptExploderPriority: 0,
    };

    const document = explodePromptText({
      prompt,
      validationRules: [fallbackOnlyHeadingRule],
      validationScope: 'case_resolver_prompt_exploder',
    });

    expect(document.segments).toHaveLength(1);
    const mergedSegment = document.segments[0];
    expect(mergedSegment).toBeDefined();
    expect(mergedSegment?.matchedSequenceLabels).not.toContain('Case Resolver Structure');
    const mergedText = mergedSegment?.raw || mergedSegment?.text || '';
    expect(mergedText).toContain('Dotyczy: postępowanie administracyjne');
    expect(mergedText).toContain('Niniejszym wnoszę o umorzenie');
    expect(mergedText).toContain('Przez kilka lat nie nastąpiło skuteczne');
    expect(mergedText).toContain('Na zakończenie, na podstawie art. 73 § 1 KPA');
  });
});
