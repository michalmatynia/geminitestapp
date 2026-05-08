import { getDb } from '@/lib/mongodb';
import { STORIES, type Story } from '@/data/stories';
import { normalizeLocale } from '@/lib/locales';

const COLLECTION = 'ecom_stories';

const STORY_CATEGORY_PL: Record<string, string> = {
  Craft: 'Rzemiosło',
  Material: 'Material',
  Object: 'Produkt',
  Maker: 'Twórca',
  Philosophy: 'Filozofia',
};

const TAG_PL: Record<string, string> = {
  Belgium: 'Belgia',
  Ceramics: 'Ceramika',
  Consumption: 'Konsumpcja',
  Craft: 'Rzemiosło',
  Denmark: 'Dania',
  Design: 'Design',
  France: 'Francja',
  Furniture: 'Meble',
  Heritage: 'Dziedzictwo',
  Interview: 'Wywiad',
  Leather: 'Skóra',
  Linen: 'Len',
  Maker: 'Twórca',
  Material: 'Material',
  Object: 'Produkt',
  Philosophy: 'Filozofia',
  Scotland: 'Szkocja',
  Sustainability: 'Zrównoważenie',
  Tanning: 'Garbowanie',
  Textiles: 'Tekstylia',
  Wool: 'Wełna',
};

const STORY_PL: Record<string, Partial<Story>> = {
  'last-weavers-of-bruges': {
    title: 'Ostatni tkacze z Brugii',
    subtitle: 'W pracowni, w której techniki sprzed 600 lat spotykają współczesny design',
    excerpt: 'Wizyta w warsztacie flamandzkiego lnu i rozmowa o napięciu nici, cierpliwości oraz rzemiośle, którego nie da się przyspieszyć.',
    date: 'Kwiecień 2026',
    body: [
      { type: 'paragraph', text: 'Pracownia znajduje się przy wąskiej uliczce nad kanałem, kilka pięter nad wodą. Nie ma szyldu. Adres poznaje się od kogoś, kto też poznał go od kogoś innego. W środku pachnie mokrym lnem i olejem maszynowym.' },
      { type: 'pull-quote', text: '"Krosno nie wie, w którym jest wieku. Zna tylko napięcie, nić i czas."' },
      { type: 'paragraph', text: 'Hendrik De Wolf jest jednym z ostatnich rzemieślników w Belgii, którzy potrafią obsługiwać tradycyjne flamandzkie krosno. To praca wymagająca skupienia, dwóch par rąk i zgody na tempo, którego nie da się zoptymalizować.' },
      { type: 'heading', text: 'Dlaczego len i dlaczego Brugia' },
      { type: 'paragraph', text: 'Rzeka Lys przez stulecia obrabiała len lepiej niż jakiekolwiek inne miejsce w Europie. Mineralna woda oddzielała włókna w sposób, który zbudował lokalny handel i reputację tkaniny.' },
      { type: 'paragraph', text: 'Dziś przemysłowe zakłady potrafią wyprodukować w dzień tyle, ile tradycyjny warsztat robi przez miesiąc. Właśnie dlatego takie miejsca mają znaczenie: nie udają maszyn, tylko zachowują gest ręki.' },
      { type: 'caption', text: 'Tekstylia ARCANA inspirowane są tym podejściem: mniej pośpiechu, więcej uwagi dla materiału.' },
    ],
  },
  'origin-of-cognac-leather': {
    title: 'Skąd bierze się koniakowa skóra',
    subtitle: 'Dlaczego najlepsza skóra nadal zależy od wody, kory dębu i cierpliwości',
    excerpt: 'Historia garbowania roślinnego i skóry, która z czasem nabiera charakteru zamiast tracić formę.',
    date: 'Marzec 2026',
    body: [
      { type: 'paragraph', text: 'Périgord kojarzy się z truflami, ale dla osób pracujących ze skórą ważniejsza jest kora dębu. To ona, razem z wodą i czasem, nadaje skórze gęstość i kolor, który trudno podrobić.' },
      { type: 'pull-quote', text: '"Garbowanie chromowe trwa dwa dni. Roślinne trwa miesiącami. Ta różnica nie jest problemem, tylko produktem."' },
      { type: 'paragraph', text: 'Rodzinne garbarnie pracują powoli: skóry przechodzą przez kolejne kąpiele, coraz bogatsze w taniny. Efekt nie jest idealnie jednolity, ale właśnie dlatego żyje razem z właścicielem.' },
      { type: 'heading', text: 'Patyna zamiast zużycia' },
      { type: 'paragraph', text: 'Dobra skóra nie powinna od razu wyglądać na skończoną. Powinna dojrzewać. Ślady dotyku, światła i codziennego noszenia stają się częścią projektu.' },
      { type: 'caption', text: 'W ARCANA traktujemy materiał jako historię, która zaczyna się przed zakupem i trwa po nim.' },
    ],
  },
  'a-table-stays-in-the-family': {
    title: 'Stół zostaje w rodzinie',
    subtitle: 'O projektowaniu przedmiotów, które mają przeżyć swojego twórcę',
    excerpt: 'Rozmowa o naprawialności, materiałowej uczciwości i przedmiotach, które nie kończą życia po jednym sezonie.',
    date: 'Luty 2026',
    body: [
      { type: 'paragraph', text: 'Lars Bundgaard ma prostą zasadę: nie tworzy niczego, czego nie da się naprawić. Każde łączenie, każda powierzchnia i każdy detal muszą mieć przyszłość po pierwszym uszkodzeniu.' },
      { type: 'pull-quote', text: '"Przedmiot, którego nie da się naprawić, jest tylko wolniejszym odpadem."' },
      { type: 'paragraph', text: 'W jego pracowni pachnie orzechem i olejem. Narzędzia nie są dekoracją, tylko przedłużeniem decyzji projektowych. Nic nie ma wyglądać dobrze tylko na zdjęciu.' },
      { type: 'heading', text: 'Przeciw planowanemu starzeniu' },
      { type: 'paragraph', text: 'Stół, który trwa sto lat, zmienia sposób liczenia ceny. Nie płacisz za trend. Planujesz obecność przedmiotu w wielu przeprowadzkach, naprawach i codziennych rytuałach.' },
      { type: 'caption', text: 'Ta sama logika prowadzi nas przy wyborze kolekcjonalii: produkt powinien mieć sens dłużej niż moment premiery.' },
    ],
  },
  'sand-wool-outer-hebrides': {
    title: 'Wełna, która przetrwała Atlantyk',
    subtitle: 'Jak owce, solny wiatr i stare krosna tworzą tkaninę odporną na pogodę',
    excerpt: 'Zimowa wizyta na Hebrydach i opowieść o wełnie, która zachowuje naturalną ochronę.',
    date: 'Styczeń 2026',
    body: [
      { type: 'paragraph', text: 'Owce na wyspie Harris żyją bez łagodnych warunków. Wiatr znad Atlantyku, cienka trawa i długa wilgotna zima sprawiły, że ich runo stało się gęste, ciepłe i naturalnie odporne.' },
      { type: 'pull-quote', text: '"Zwierzę zaprojektowało materiał. My tylko nauczyliśmy się go używać."' },
      { type: 'paragraph', text: 'W starej tkalni rytm krosna jest częścią krajobrazu. Nie chodzi o nostalgię, ale o wiedzę, która została sprawdzona przez pogodę i czas.' },
      { type: 'heading', text: 'Lanolina ma znaczenie' },
      { type: 'paragraph', text: 'W wielu procesach usuwa się lanolinę, bo ułatwia to barwienie i standaryzację. Tutaj część naturalnej ochrony zostaje, dzięki czemu tkanina odpycha wilgoć zamiast ją natychmiast wchłaniać.' },
      { type: 'caption', text: 'Materiał dobry na lata nie zawsze jest najgładszy. Często jest po prostu najmądrzej pozostawiony sam sobie.' },
    ],
  },
  'clay-and-the-wheel': {
    title: 'Glina i koło',
    subtitle: 'Ceramiczka Hélène Morin o etyce niedoskonałości',
    excerpt: 'O odciskach palców, polityce pracy ręcznej i przedmiotach, które nie ukrywają procesu powstawania.',
    date: 'Grudzień 2025',
    body: [
      { type: 'paragraph', text: 'Studio Hélène Morin mieści się w dawnej stajni pod Limoges. Pracuje sama. Gdy toczy glinę, nie włącza muzyki, bo jak mówi, musi słuchać materiału.' },
      { type: 'pull-quote', text: '"Perfekcja w ceramice to problem maszyny. Moja praca polega na zrobieniu czegoś, czego maszyna nie potrafi."' },
      { type: 'paragraph', text: 'Po latach pracy w produkcji seryjnej wybrała pojedyncze obiekty. Każdy ma drobną asymetrię, inny rytm ściany i ślad decyzji podjętej ręką.' },
      { type: 'heading', text: 'Zostawić odciski' },
      { type: 'paragraph', text: 'Współczesne rzemiosło często usuwa dowody pracy: wygładza łączenia, ukrywa gest, udaje przemysłową powtarzalność. Hélène robi odwrotnie. Odcisk w podstawie naczynia jest podpisem, nie błędem.' },
      { type: 'caption', text: 'W kolekcjonowaniu cenimy przedmioty, które nie boją się pokazać, jak powstały.' },
    ],
  },
  'the-slow-season': {
    title: 'Powolny sezon',
    subtitle: 'Argument za tym, by kupować mniej i zatrzymywać więcej',
    excerpt: 'O przemyślanych zakupach, trwałości i przedmiotach, które stają się towarzyszami, a nie zużywalnym dodatkiem.',
    date: 'Listopad 2025',
    body: [
      { type: 'paragraph', text: 'Najbardziej odpowiedzialny przedmiot to ten, którego nie trzeba szybko wymieniać. Nie jest to nostalgia ani sprzeciw wobec nowoczesności, tylko prośba o więcej namysłu przed zakupem.' },
      { type: 'pull-quote', text: '"Kup raz. Używaj trzydzieści lat. Przekaż dalej."' },
      { type: 'paragraph', text: 'Tanie i nowe często wygrywa, bo koszt pozbycia się rzeczy wydaje się niewidoczny. Ale każdy przedmiot ma swój dalszy ciąg: w szafie, w przeprowadzce, w odpadach albo w czyjejś kolekcji.' },
      { type: 'heading', text: 'Inny sposób liczenia' },
      { type: 'paragraph', text: 'Cena na metce to tylko początek. Liczy się koszt na rok, na użycie, na wspomnienie. Przedmiot, który nadal chcesz mieć po latach, zmienia matematykę zakupu.' },
      { type: 'caption', text: 'ARCANA wybiera rzeczy, które mają szansę zostać z właścicielem dłużej niż jeden impuls.' },
    ],
  },
};

function docToStory(doc: Record<string, unknown>): Story {
  const { _id, ...rest } = doc;
  void _id;
  return rest as Story;
}

function localizeStory(story: Story, localeInput?: string | null): Story {
  if (normalizeLocale(localeInput) !== 'pl') return story;
  const localized = STORY_PL[story.slug];
  return {
    ...story,
    ...localized,
    category: STORY_CATEGORY_PL[story.category] ?? localized?.category ?? story.category,
    tags: story.tags.map((tag) => TAG_PL[tag] ?? tag),
  };
}

export async function getAllStories(locale?: string | null): Promise<Story[]> {
  try {
    const db = await getDb();
    const docs = await db.collection(COLLECTION).find({}).sort({ date: -1 }).toArray();
    const stories = docs.length === 0
      ? STORIES
      : docs.map((d) => docToStory(d as Record<string, unknown>));
    return stories.map((story) => localizeStory(story, locale));
  } catch {
    return STORIES.map((story) => localizeStory(story, locale));
  }
}

export async function getStoryBySlug(slug: string, locale?: string | null): Promise<Story | null> {
  try {
    const db = await getDb();
    const doc = await db.collection(COLLECTION).findOne({ slug });
    if (!doc) {
      const fallback = STORIES.find((s) => s.slug === slug) ?? null;
      return fallback ? localizeStory(fallback, locale) : null;
    }
    return localizeStory(docToStory(doc as Record<string, unknown>), locale);
  } catch {
    const fallback = STORIES.find((s) => s.slug === slug) ?? null;
    return fallback ? localizeStory(fallback, locale) : null;
  }
}

export async function saveStory(story: Story): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { slug: story.slug },
    { $set: { ...story, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
}

export async function deleteStory(slug: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ slug });
}

export function validateStory(input: unknown): { story: Story | null; errors: string[] } {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { story: null, errors: ['Story must be an object.'] };
  }
  const src = input as Record<string, unknown>;

  const required = ['id', 'slug', 'category', 'title', 'subtitle', 'excerpt', 'readTime', 'date', 'gradient', 'accentColor', 'textColor'];
  for (const key of required) {
    if (typeof src[key] !== 'string' || !(src[key] as string).trim()) {
      errors.push(`${key} is required.`);
    }
  }

  if (!Array.isArray(src['tags'])) errors.push('tags must be an array.');
  if (!Array.isArray(src['body'])) errors.push('body must be an array.');
  if (!Array.isArray(src['relatedSlugs'])) errors.push('relatedSlugs must be an array.');

  if (errors.length > 0) return { story: null, errors };

  return {
    story: {
      id: (src['id'] as string).trim(),
      slug: (src['slug'] as string).trim(),
      category: (src['category'] as string).trim(),
      title: (src['title'] as string).trim(),
      subtitle: (src['subtitle'] as string).trim(),
      excerpt: (src['excerpt'] as string).trim(),
      readTime: (src['readTime'] as string).trim(),
      date: (src['date'] as string).trim(),
      gradient: (src['gradient'] as string).trim(),
      accentColor: (src['accentColor'] as string).trim(),
      textColor: (src['textColor'] as string).trim(),
      tags: (src['tags'] as unknown[]).filter((t): t is string => typeof t === 'string'),
      body: src['body'] as Story['body'],
      relatedSlugs: (src['relatedSlugs'] as unknown[]).filter((s): s is string => typeof s === 'string'),
    },
    errors: [],
  };
}
