import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import type { SettingsPanelField } from '@/features/kangur/shared/ui/templates/SettingsPanelBuilder';
import type { KangurThemeMode } from '@/features/kangur/appearance/theme-settings';
import type { KangurAdminLocaleDto as KangurThemeSettingsLocale } from '../kangur-admin-locale';
import { resolveKangurAdminLocale } from '../kangur-admin-locale';
export type KangurThemePreviewSectionId =
  | 'corePalette'
  | 'textOverrides'
  | 'logoLoader'
  | 'backgroundsSurfaces'
  | 'buttons'
  | 'navigationPills'
  | 'gradients'
  | 'homeActions'
  | 'progressBars'
  | 'inputs'
  | 'typographyLayout'
  | 'shapeSpacing'
  | 'shadowsDepth';
export type KangurThemeSectionId =
  | KangurThemePreviewSectionId
  | 'buttonShadows'
  | 'gelEffects';

export const KANGUR_THEME_PREVIEW_SECTION_IDS: readonly KangurThemePreviewSectionId[] = [
  'corePalette',
  'textOverrides',
  'logoLoader',
  'backgroundsSurfaces',
  'buttons',
  'navigationPills',
  'gradients',
  'homeActions',
  'progressBars',
  'inputs',
  'typographyLayout',
  'shapeSpacing',
  'shadowsDepth',
] as const;

const SECTION_COPY: Record<
  KangurThemeSettingsLocale,
  Record<KangurThemeSectionId, { title: string; subtitle: string }>
> = {
  en: {
    corePalette: {
      title: 'Core Palette',
      subtitle: 'Shared tones for highlights, text, and feedback states across Kangur.',
    },
    textOverrides: {
      title: 'Text Overrides',
      subtitle: 'Optional overrides for page, cards, and navigation text colors.',
    },
    logoLoader: {
      title: 'Logo & Loader',
      subtitle: 'Tune the Kangur logo gradients used on the boot loader and navigation.',
    },
    backgroundsSurfaces: {
      title: 'Backgrounds and Surfaces',
      subtitle: 'Base page, panel, card, and chat shell colors.',
    },
    buttons: {
      title: 'Buttons',
      subtitle: 'Primary and secondary CTA colors used by the live storefront.',
    },
    buttonShadows: {
      title: 'Button Shadows',
      subtitle: 'Drop shadows for the primary and secondary button shell.',
    },
    gelEffects: {
      title: 'Gel Effects',
      subtitle: 'Gloss overlay, inner shadows, text shadow, and outer glow for gel-style buttons.',
    },
    navigationPills: {
      title: 'Navigation Pills',
      subtitle: 'Sidebar and tab pill styling for default and active states.',
    },
    gradients: {
      title: 'Gradients',
      subtitle: 'Accent gradients used by lesson tiles, badges, and decorative highlights.',
    },
    homeActions: {
      title: 'Home Actions',
      subtitle:
        'Theme the four main home buttons (icons stay untouched). Leave a field empty to keep the default tone.',
    },
    progressBars: {
      title: 'Progress Bars',
      subtitle: 'Track colors for progress indicators across Kangur.',
    },
    inputs: {
      title: 'Inputs',
      subtitle: 'Search, answer, and tutor prompt field colors.',
    },
    typographyLayout: {
      title: 'Typography and Layout',
      subtitle: 'Fonts, base text rhythm, and page width used by the live Kangur shell.',
    },
    shapeSpacing: {
      title: 'Shape and Spacing',
      subtitle: 'Shared radius controls for panels, navigation, buttons, and inputs.',
    },
    shadowsDepth: {
      title: 'Shadows and Depth',
      subtitle: 'Fine-tune glass panel and card shadow softness.',
    },
  },
  pl: {
    corePalette: {
      title: 'Paleta główna',
      subtitle: 'Wspólne tony dla wyróżnień, tekstu i stanów informacji zwrotnej w Kangur.',
    },
    textOverrides: {
      title: 'Nadpisania tekstu',
      subtitle: 'Opcjonalne nadpisania kolorów tekstu strony, kart i nawigacji.',
    },
    logoLoader: {
      title: 'Logo i loader',
      subtitle: 'Dostrój gradienty logo Kangur używane w loaderze i nawigacji.',
    },
    backgroundsSurfaces: {
      title: 'Tła i powierzchnie',
      subtitle: 'Bazowe kolory strony, paneli, kart i powłoki czatu.',
    },
    buttons: {
      title: 'Przyciski',
      subtitle: 'Kolory głównych i drugorzędnych CTA używanych w publicznym storefrontcie.',
    },
    buttonShadows: {
      title: 'Cienie przycisków',
      subtitle: 'Cienie zewnętrzne dla obudowy głównych i drugorzędnych przycisków.',
    },
    gelEffects: {
      title: 'Efekty żelowe',
      subtitle: 'Połysk, cienie wewnętrzne, cień tekstu i zewnętrzna poświata dla żelowych przycisków.',
    },
    navigationPills: {
      title: 'Pills nawigacji',
      subtitle: 'Styl pills dla sidebaru i zakładek w stanie domyślnym i aktywnym.',
    },
    gradients: {
      title: 'Gradienty',
      subtitle: 'Gradienty akcentów używane na kafelkach lekcji, badgeach i dekoracyjnych wyróżnieniach.',
    },
    homeActions: {
      title: 'Akcje strony głównej',
      subtitle:
        'Motywuj cztery główne przyciski strony głównej (ikony pozostają bez zmian). Puste pole zachowuje domyślny ton.',
    },
    progressBars: {
      title: 'Paski postępu',
      subtitle: 'Kolory toru dla wskaźników postępu w Kangur.',
    },
    inputs: {
      title: 'Pola',
      subtitle: 'Kolory pola wyszukiwania, odpowiedzi i promptu tutora.',
    },
    typographyLayout: {
      title: 'Typografia i układ',
      subtitle: 'Fonty, rytm bazowego tekstu i szerokość strony używane przez powłokę Kangur.',
    },
    shapeSpacing: {
      title: 'Kształt i odstępy',
      subtitle: 'Wspólne promienie dla paneli, nawigacji, przycisków i pól.',
    },
    shadowsDepth: {
      title: 'Cienie i głębia',
      subtitle: 'Dostrój miękkość cieni szklanego panelu i kart.',
    },
  },
  uk: {
    corePalette: {
      title: 'Основна палітра',
      subtitle: 'Спільні тони для акцентів, тексту та станів зворотного звʼязку в Kangur.',
    },
    textOverrides: {
      title: 'Перевизначення тексту',
      subtitle: 'Необовʼязкові перевизначення кольорів тексту сторінки, карток і навігації.',
    },
    logoLoader: {
      title: 'Лого і лоадер',
      subtitle: 'Налаштуйте градієнти логотипа Kangur, які використовуються в лоадері та навігації.',
    },
    backgroundsSurfaces: {
      title: 'Тла і поверхні',
      subtitle: 'Базові кольори сторінки, панелей, карток і оболонки чату.',
    },
    buttons: {
      title: 'Кнопки',
      subtitle: 'Кольори основних і другорядних CTA, що використовуються у storefront.',
    },
    buttonShadows: {
      title: 'Тіні кнопок',
      subtitle: 'Зовнішні тіні для оболонки основних і другорядних кнопок.',
    },
    gelEffects: {
      title: 'Гелеві ефекти',
      subtitle: 'Блік, внутрішні тіні, тінь тексту й зовнішнє сяйво для гелевих кнопок.',
    },
    navigationPills: {
      title: 'Навігаційні pills',
      subtitle: 'Стиль pills для бокової панелі й вкладок у звичайному та активному стані.',
    },
    gradients: {
      title: 'Градієнти',
      subtitle: 'Акцентні градієнти для плиток уроків, бейджів і декоративних підсвіток.',
    },
    homeActions: {
      title: 'Дії головної сторінки',
      subtitle:
        'Оформіть чотири головні кнопки сторінки (іконки залишаються без змін). Порожнє поле зберігає типовий тон.',
    },
    progressBars: {
      title: 'Смужки прогресу',
      subtitle: 'Кольори треку для індикаторів прогресу в Kangur.',
    },
    inputs: {
      title: 'Поля',
      subtitle: 'Кольори поля пошуку, відповіді та підказки тутору.',
    },
    typographyLayout: {
      title: 'Типографіка і макет',
      subtitle: 'Шрифти, ритм базового тексту й ширина сторінки, які використовує оболонка Kangur.',
    },
    shapeSpacing: {
      title: 'Форма і відступи',
      subtitle: 'Спільні радіуси для панелей, навігації, кнопок і полів.',
    },
    shadowsDepth: {
      title: 'Тіні і глибина',
      subtitle: 'Налаштуйте мʼякість тіней скляної панелі та карток.',
    },
  },
};

const MODE_COPY: Record<
  KangurThemeSettingsLocale,
  Record<
    KangurThemeMode,
    {
      label: string;
      resetLabel: string;
      resetDescription: string;
      toastMessage: string;
    }
  >
> = {
  en: {
    daily: {
      label: 'Daily theme',
      resetLabel: 'Restore daily theme',
      resetDescription: 'Overwrite this theme with the default daily preset.',
      toastMessage: 'Daily theme restored to default settings.',
    },
    dawn: {
      label: 'Dawn theme',
      resetLabel: 'Restore dawn theme',
      resetDescription: 'Overwrite this theme with the default dawn preset.',
      toastMessage: 'Dawn theme restored to default settings.',
    },
    sunset: {
      label: 'Sunset theme',
      resetLabel: 'Restore sunset theme',
      resetDescription: 'Overwrite this theme with the default sunset preset.',
      toastMessage: 'Sunset theme restored to default settings.',
    },
    nightly: {
      label: 'Night theme',
      resetLabel: 'Restore night theme',
      resetDescription: 'Overwrite this theme with the default night preset.',
      toastMessage: 'Night theme restored to default settings.',
    },
  },
  pl: {
    daily: {
      label: 'Motyw dzienny',
      resetLabel: 'Przywróć motyw dzienny',
      resetDescription: 'Nadpisuje ten motyw domyślnym presetem dziennym.',
      toastMessage: 'Motyw dzienny przywrócony do domyślnych ustawień.',
    },
    dawn: {
      label: 'Motyw świtowy',
      resetLabel: 'Przywróć motyw świtowy',
      resetDescription: 'Nadpisuje ten motyw domyślnym presetem świtu.',
      toastMessage: 'Motyw świtowy przywrócony do domyślnych ustawień.',
    },
    sunset: {
      label: 'Motyw zachodu',
      resetLabel: 'Przywróć motyw zachodu',
      resetDescription: 'Nadpisuje ten motyw domyślnym presetem zachodu.',
      toastMessage: 'Motyw zachodu przywrócony do domyślnych ustawień.',
    },
    nightly: {
      label: 'Motyw nocny',
      resetLabel: 'Przywróć motyw nocny',
      resetDescription: 'Nadpisuje ten motyw domyślnym presetem nocnym.',
      toastMessage: 'Motyw nocny przywrócony do domyślnych ustawień.',
    },
  },
  uk: {
    daily: {
      label: 'Денна тема',
      resetLabel: 'Відновити денну тему',
      resetDescription: 'Перезаписує цю тему типовим денним пресетом.',
      toastMessage: 'Денну тему відновлено до типових налаштувань.',
    },
    dawn: {
      label: 'Світанкова тема',
      resetLabel: 'Відновити світанкову тему',
      resetDescription: 'Перезаписує цю тему типовим пресетом світанку.',
      toastMessage: 'Світанкову тему відновлено до типових налаштувань.',
    },
    sunset: {
      label: 'Тема заходу',
      resetLabel: 'Відновити тему заходу',
      resetDescription: 'Перезаписує цю тему типовим пресетом заходу.',
      toastMessage: 'Тему заходу відновлено до типових налаштувань.',
    },
    nightly: {
      label: 'Нічна тема',
      resetLabel: 'Відновити нічну тему',
      resetDescription: 'Перезаписує цю тему типовим нічним пресетом.',
      toastMessage: 'Нічну тему відновлено до типових налаштувань.',
    },
  },
};

const FONT_WEIGHT_OPTIONS_BY_LOCALE: Record<
  KangurThemeSettingsLocale,
  ReadonlyArray<LabeledOptionDto<string>>
> = {
  en: [
    { value: '300', label: 'Light (300)' },
    { value: '400', label: 'Regular (400)' },
    { value: '500', label: 'Medium (500)' },
    { value: '600', label: 'Semibold (600)' },
    { value: '700', label: 'Bold (700)' },
    { value: '800', label: 'Extrabold (800)' },
  ],
  pl: [
    { value: '300', label: 'Lekki (300)' },
    { value: '400', label: 'Regularny (400)' },
    { value: '500', label: 'Średni (500)' },
    { value: '600', label: 'Półgruby (600)' },
    { value: '700', label: 'Gruby (700)' },
    { value: '800', label: 'Bardzo gruby (800)' },
  ],
  uk: [
    { value: '300', label: 'Легка (300)' },
    { value: '400', label: 'Звичайна (400)' },
    { value: '500', label: 'Середня (500)' },
    { value: '600', label: 'Напівжирна (600)' },
    { value: '700', label: 'Жирна (700)' },
    { value: '800', label: 'Дуже жирна (800)' },
  ],
};

const HOME_ACTION_GROUP_LABELS: Record<
  KangurThemeSettingsLocale,
  Record<'lessons' | 'play' | 'training' | 'kangur', string>
> = {
  en: {
    lessons: 'Lessons',
    play: 'Play',
    training: 'Training',
    kangur: 'Kangur',
  },
  pl: {
    lessons: 'Lekcje',
    play: 'Graj',
    training: 'Trening',
    kangur: 'Kangur',
  },
  uk: {
    lessons: 'Уроки',
    play: 'Грай',
    training: 'Тренування',
    kangur: 'Kangur',
  },
};

const HOME_ACTION_TOKEN_LABELS: Record<KangurThemeSettingsLocale, Record<string, string>> = {
  en: {
    TextColor: 'Text Color',
    TextActiveColor: 'Active Text Color',
    LabelStart: 'Label Gradient Start',
    LabelMid: 'Label Gradient Mid',
    LabelEnd: 'Label Gradient End',
    LabelStartActive: 'Active Label Gradient Start',
    LabelMidActive: 'Active Label Gradient Mid',
    LabelEndActive: 'Active Label Gradient End',
    AccentStart: 'Accent Gradient Start',
    AccentMid: 'Accent Gradient Mid',
    AccentEnd: 'Accent Gradient End',
    UnderlayStart: 'Underlay Gradient Start',
    UnderlayMid: 'Underlay Gradient Mid',
    UnderlayEnd: 'Underlay Gradient End',
    UnderlayTintStart: 'Underlay Tint Start',
    UnderlayTintMid: 'Underlay Tint Mid',
    UnderlayTintEnd: 'Underlay Tint End',
    AccentShadowColor: 'Accent Shadow',
    UnderlayShadowColor: 'Underlay Shadow',
    SurfaceShadowColor: 'Surface Shadow',
  },
  pl: {
    TextColor: 'Kolor tekstu',
    TextActiveColor: 'Kolor aktywnego tekstu',
    LabelStart: 'Poczatek gradientu etykiety',
    LabelMid: 'Srodek gradientu etykiety',
    LabelEnd: 'Koniec gradientu etykiety',
    LabelStartActive: 'Poczatek aktywnego gradientu etykiety',
    LabelMidActive: 'Srodek aktywnego gradientu etykiety',
    LabelEndActive: 'Koniec aktywnego gradientu etykiety',
    AccentStart: 'Poczatek gradientu akcentu',
    AccentMid: 'Srodek gradientu akcentu',
    AccentEnd: 'Koniec gradientu akcentu',
    UnderlayStart: 'Poczatek gradientu podkladu',
    UnderlayMid: 'Srodek gradientu podkladu',
    UnderlayEnd: 'Koniec gradientu podkladu',
    UnderlayTintStart: 'Poczatek zabarwienia podkladu',
    UnderlayTintMid: 'Srodek zabarwienia podkladu',
    UnderlayTintEnd: 'Koniec zabarwienia podkladu',
    AccentShadowColor: 'Cien akcentu',
    UnderlayShadowColor: 'Cien podkladu',
    SurfaceShadowColor: 'Cien powierzchni',
  },
  uk: {
    TextColor: 'Колір тексту',
    TextActiveColor: 'Колір активного тексту',
    LabelStart: 'Початок градієнта мітки',
    LabelMid: 'Середина градієнта мітки',
    LabelEnd: 'Кінець градієнта мітки',
    LabelStartActive: 'Початок активного градієнта мітки',
    LabelMidActive: 'Середина активного градієнта мітки',
    LabelEndActive: 'Кінець активного градієнта мітки',
    AccentStart: 'Початок градієнта акценту',
    AccentMid: 'Середина градієнта акценту',
    AccentEnd: 'Кінець градієнта акценту',
    UnderlayStart: 'Початок градієнта підкладки',
    UnderlayMid: 'Середина градієнта підкладки',
    UnderlayEnd: 'Кінець градієнта підкладки',
    UnderlayTintStart: 'Початок тонування підкладки',
    UnderlayTintMid: 'Середина тонування підкладки',
    UnderlayTintEnd: 'Кінець тонування підкладки',
    AccentShadowColor: 'Тінь акценту',
    UnderlayShadowColor: 'Тінь підкладки',
    SurfaceShadowColor: 'Тінь поверхні',
  },
};

const PANEL_COPY: Record<
  KangurThemeSettingsLocale,
  {
    locale: KangurThemeSettingsLocale;
    autosaveTitle: string;
    autosaveDescription: string;
    restoreDefaultButton: string;
    restoring: string;
    resetError: string;
    modeTitle: string;
    modeSubtitle: string;
    saveAction: string;
    resetAction: string;
    unsavedChanges: string;
    previewTitle: string;
    previewInfoTitle: string;
    previewInfoText: string;
    saveSuccess: string;
    saveError: string;
    auto: string;
    progressTrackColorPickerAria: string;
    progressTrackColorValueAria: string;
  }
> = {
  en: {
    locale: 'en',
    autosaveTitle: 'Autosave',
    autosaveDescription:
      'Changes in this editor save to Mongo automatically and feed the live Kangur storefront theme. This panel only shows tokens that the public Kangur runtime maps today, so every field here has a live storefront effect.',
    restoreDefaultButton: 'Restore defaults',
    restoring: 'Restoring...',
    resetError: 'Failed to restore the theme.',
    modeTitle: 'Theme mode',
    modeSubtitle: 'Choose which Kangur storefront theme slot you want to edit.',
    saveAction: 'Save theme',
    resetAction: 'Reset draft',
    unsavedChanges: 'Unsaved changes',
    previewTitle: 'Preview',
    previewInfoTitle: 'Live preview',
    previewInfoText:
      'The preview reflects the current draft and lets you compare it across Kangur theme slots.',
    saveSuccess: 'Theme saved successfully.',
    saveError: 'Failed to save theme.',
    auto: 'Auto',
    progressTrackColorPickerAria: 'Progress track color picker',
    progressTrackColorValueAria: 'Progress track color value',
  },
  pl: {
    locale: 'pl',
    autosaveTitle: 'Automatyczny zapis',
    autosaveDescription:
      'Zmiany w tym edytorze zapisują się automatycznie do Mongo i zasilają motyw live Kangur. Ten panel pokazuje tylko tokeny, które dzisiejszy runtime publiczny Kangur mapuje, więc każde pole ma realny efekt w storefrontcie.',
    restoreDefaultButton: 'Przywróć domyślne',
    restoring: 'Przywracam...',
    resetError: 'Nie udało się przywrócić motywu.',
    modeTitle: 'Tryb motywu',
    modeSubtitle: 'Wybierz slot motywu storefrontu Kangur, który chcesz edytować.',
    saveAction: 'Zapisz motyw',
    resetAction: 'Resetuj szkic',
    unsavedChanges: 'Niezapisane zmiany',
    previewTitle: 'Podgląd',
    previewInfoTitle: 'Podgląd na żywo',
    previewInfoText:
      'Podgląd odzwierciedla bieżący szkic i pozwala porównać go między slotami motywu Kangur.',
    saveSuccess: 'Motyw został zapisany.',
    saveError: 'Nie udało się zapisać motywu.',
    auto: 'Auto',
    progressTrackColorPickerAria: 'Wybierak koloru toru postępu',
    progressTrackColorValueAria: 'Wartość koloru toru postępu',
  },
  uk: {
    locale: 'uk',
    autosaveTitle: 'Автозбереження',
    autosaveDescription:
      'Зміни в цьому редакторі автоматично зберігаються в Mongo і живлять live-тему Kangur. Ця панель показує лише ті токени, які сьогодні мапить публічний runtime Kangur, тому кожне поле тут має реальний ефект у storefront.',
    restoreDefaultButton: 'Відновити типові',
    restoring: 'Відновлюю...',
    resetError: 'Не вдалося відновити тему.',
    modeTitle: 'Режим теми',
    modeSubtitle: 'Виберіть слот теми storefront Kangur, який потрібно редагувати.',
    saveAction: 'Зберегти тему',
    resetAction: 'Скинути чернетку',
    unsavedChanges: 'Є незбережені зміни',
    previewTitle: 'Попередній перегляд',
    previewInfoTitle: 'Живий перегляд',
    previewInfoText:
      'Попередній перегляд відображає поточну чернетку та дозволяє порівнювати її між слотами тем Kangur.',
    saveSuccess: 'Тему успішно збережено.',
    saveError: 'Не вдалося зберегти тему.',
    auto: 'Авто',
    progressTrackColorPickerAria: 'Вибір кольору смужки прогресу',
    progressTrackColorValueAria: 'Значення кольору смужки прогресу',
  },
};

const PL_FIELD_LABELS: Record<string, string> = {
  'Primary Accent': 'Glowny akcent',
  'Secondary Accent': 'Drugorzedny akcent',
  'Warning Accent': 'Akcent ostrzezenia',
  'Success Accent': 'Akcent sukcesu',
  'Primary Text': 'Glowny tekst',
  'Muted Text': 'Wyciszony tekst',
  'Page Text Override': 'Nadpisanie tekstu strony',
  'Page Muted Text Override': 'Nadpisanie wyciszonego tekstu strony',
  'Card Text Override': 'Nadpisanie tekstu karty',
  'Navigation Text Override': 'Nadpisanie tekstu nawigacji',
  'Navigation Active Text Override': 'Nadpisanie aktywnego tekstu nawigacji',
  'Navigation Hover Text Override': 'Nadpisanie tekstu hover nawigacji',
  'Wordmark Start': 'Poczatek napisu logo',
  'Wordmark Mid': 'Srodek napisu logo',
  'Wordmark End': 'Koniec napisu logo',
  'Ring Start': 'Poczatek obwodki',
  'Ring End': 'Koniec obwodki',
  'Accent Start': 'Poczatek akcentu',
  'Accent End': 'Koniec akcentu',
  'Inner Glow Start': 'Poczatek wewnetrznej poswiaty',
  'Inner Glow End': 'Koniec wewnetrznej poswiaty',
  'Logo Shadow': 'Cien logo',
  'Logo Glint': 'Blik logo',
  'Page Background': 'Tło strony',
  'Surface Background': 'Tło powierzchni',
  'Card Background': 'Tło karty',
  'Container Background': 'Tło kontenera',
  'Panel Gradient Start': 'Początek gradientu panelu',
  'Panel Gradient End': 'Koniec gradientu panelu',
  'Panel Transparency': 'Przezroczystość panelu',
  'Base Border': 'Bazowa ramka',
  'Surface Border': 'Ramka powierzchni',
  'Primary Button Background': 'Tło głównego przycisku',
  'Primary Button Text': 'Tekst głównego przycisku',
  'Secondary Button Background': 'Tło drugorzędnego przycisku',
  'Secondary Button Text': 'Tekst drugorzędnego przycisku',
  'Outline Border': 'Ramka outline',
  'Button Padding X': 'Padding X przycisku',
  'Button Padding Y': 'Padding Y przycisku',
  'Button Font Size': 'Rozmiar fontu przycisku',
  'Button Font Weight': 'Grubość fontu przycisku',
  'Button Border Width': 'Szerokosc ramki przycisku',
  'Button Border Opacity': 'Przezroczystosc ramki przycisku',
  'Shadow Opacity': 'Przezroczystosc cienia',
  'Shadow X': 'Cien X',
  'Shadow Y': 'Cien Y',
  'Shadow Blur': 'Rozmycie cienia',
  'Gloss Opacity': 'Przezroczystosc polysku',
  'Gloss Height': 'Wysokosc polysku',
  'Gloss Angle': 'Kat polysku',
  'Top Highlight': 'Gorne podswietlenie',
  'Inner Shadow Opacity': 'Przezroczystosc cienia wewnetrznego',
  'Inner Shadow Blur': 'Rozmycie cienia wewnetrznego',
  'Inner Shadow Y': 'Cien wewnetrzny Y',
  'Text Shadow Opacity': 'Przezroczystosc cienia tekstu',
  'Text Shadow Y': 'Cien tekstu Y',
  'Text Shadow Blur': 'Rozmycie cienia tekstu',
  'Outer Glow Opacity': 'Przezroczystosc zewnetrznej poswiaty',
  'Outer Glow Spread': 'Rozchodzenie zewnetrznej poswiaty',
  'Navbar Gradient Start': 'Poczatek gradientu nawigacji',
  'Navbar Gradient End': 'Koniec gradientu nawigacji',
  'Navbar Transparency': 'Przezroczystosc nawigacji',
  'Pill Background': 'Tlo pill',
  'Pill Text': 'Tekst pill',
  'Active Pill Background': 'Tlo aktywnej pill',
  'Active Pill Text': 'Tekst aktywnej pill',
  'Pill Padding X': 'Padding X pill',
  'Pill Padding Y': 'Padding Y pill',
  'Pill Font Size': 'Rozmiar fontu pill',
  'Indigo Gradient Start': 'Poczatek gradientu indigo',
  'Indigo Gradient End': 'Koniec gradientu indigo',
  'Violet Gradient Start': 'Poczatek gradientu fioletowego',
  'Violet Gradient End': 'Koniec gradientu fioletowego',
  'Emerald Gradient Start': 'Poczatek gradientu szmaragdowego',
  'Emerald Gradient End': 'Koniec gradientu szmaragdowego',
  'Sky Gradient Start': 'Poczatek gradientu blekitnego',
  'Sky Gradient End': 'Koniec gradientu blekitnego',
  'Amber Gradient Start': 'Poczatek gradientu bursztynowego',
  'Amber Gradient End': 'Koniec gradientu bursztynowego',
  'Rose Gradient Start': 'Poczatek gradientu rozowego',
  'Rose Gradient End': 'Koniec gradientu rozowego',
  'Teal Gradient Start': 'Poczatek gradientu turkusowego',
  'Teal Gradient End': 'Koniec gradientu turkusowego',
  'Slate Gradient Start': 'Poczatek gradientu lupkowego',
  'Slate Gradient End': 'Koniec gradientu lupkowego',
  'Progress Track': 'Tor postepu',
  'Input Background': 'Tlo pola',
  'Input Text': 'Tekst pola',
  'Input Border': 'Ramka pola',
  'Input Placeholder': 'Placeholder pola',
  'Input Height': 'Wysokosc pola',
  'Input Font Size': 'Rozmiar fontu pola',
  'Heading Font': 'Font naglowkow',
  'Body Font': 'Font tekstu',
  'Base Font Size': 'Bazowy rozmiar fontu',
  'Body Line Height': 'Wysokosc linii tekstu',
  'Heading Line Height': 'Wysokosc linii naglowka',
  'Page Width': 'Szerokosc strony',
  'Shared Gap Scale': 'Wspolna skala odstepow',
  'Page Padding Top': 'Padding strony od gory',
  'Page Padding Right': 'Padding strony po prawej',
  'Page Padding Bottom': 'Padding strony od dolu',
  'Page Padding Left': 'Padding strony po lewej',
  'Panel Radius': 'Promien panelu',
  'Card Radius': 'Promien karty',
  'Panel Inner Padding': 'Wewnetrzny padding panelu',
  'Navigation Pill Radius': 'Promien pill nawigacji',
  'Button Radius': 'Promien przycisku',
  'Button Border Radius': 'Promien ramki przycisku',
  'Input Radius': 'Promien pola',
  'Panel Shadow Opacity': 'Przezroczystosc cienia panelu',
  'Panel Shadow Blur': 'Rozmycie cienia panelu',
  'Panel Shadow Y': 'Cien panelu Y',
  'Panel Shadow X': 'Cien panelu X',
  'Card Shadow Opacity': 'Przezroczystosc cienia karty',
  'Card Shadow Blur': 'Rozmycie cienia karty',
  'Card Shadow Y': 'Cien karty Y',
  'Card Shadow X': 'Cien karty X',
};

const UK_FIELD_LABELS: Record<string, string> = {
  'Primary Accent': 'Основний акцент',
  'Secondary Accent': 'Другорядний акцент',
  'Warning Accent': 'Акцент попередження',
  'Success Accent': 'Акцент успіху',
  'Primary Text': 'Основний текст',
  'Muted Text': 'Приглушений текст',
  'Page Text Override': 'Перевизначення тексту сторінки',
  'Page Muted Text Override': 'Перевизначення приглушеного тексту сторінки',
  'Card Text Override': 'Перевизначення тексту картки',
  'Navigation Text Override': 'Перевизначення тексту навігації',
  'Navigation Active Text Override': 'Перевизначення активного тексту навігації',
  'Navigation Hover Text Override': 'Перевизначення hover-тексту навігації',
  'Wordmark Start': 'Початок напису логотипа',
  'Wordmark Mid': 'Середина напису логотипа',
  'Wordmark End': 'Кінець напису логотипа',
  'Ring Start': 'Початок обвідки',
  'Ring End': 'Кінець обвідки',
  'Accent Start': 'Початок акценту',
  'Accent End': 'Кінець акценту',
  'Inner Glow Start': 'Початок внутрішнього сяйва',
  'Inner Glow End': 'Кінець внутрішнього сяйва',
  'Logo Shadow': 'Тінь логотипа',
  'Logo Glint': 'Блік логотипа',
  'Page Background': 'Тло сторінки',
  'Surface Background': 'Тло поверхні',
  'Card Background': 'Тло картки',
  'Container Background': 'Тло контейнера',
  'Panel Gradient Start': 'Початок градієнта панелі',
  'Panel Gradient End': 'Кінець градієнта панелі',
  'Panel Transparency': 'Прозорість панелі',
  'Base Border': 'Базова рамка',
  'Surface Border': 'Рамка поверхні',
  'Primary Button Background': 'Тло основної кнопки',
  'Primary Button Text': 'Текст основної кнопки',
  'Secondary Button Background': 'Тло другорядної кнопки',
  'Secondary Button Text': 'Текст другорядної кнопки',
  'Outline Border': 'Рамка outline',
  'Button Padding X': 'Padding X кнопки',
  'Button Padding Y': 'Padding Y кнопки',
  'Button Font Size': 'Розмір шрифту кнопки',
  'Button Font Weight': 'Товщина шрифту кнопки',
  'Button Border Width': 'Ширина рамки кнопки',
  'Button Border Opacity': 'Прозорість рамки кнопки',
  'Shadow Opacity': 'Прозорість тіні',
  'Shadow X': 'Тінь X',
  'Shadow Y': 'Тінь Y',
  'Shadow Blur': 'Розмиття тіні',
  'Gloss Opacity': 'Прозорість блиску',
  'Gloss Height': 'Висота блиску',
  'Gloss Angle': 'Кут блиску',
  'Top Highlight': 'Верхнє підсвічування',
  'Inner Shadow Opacity': 'Прозорість внутрішньої тіні',
  'Inner Shadow Blur': 'Розмиття внутрішньої тіні',
  'Inner Shadow Y': 'Внутрішня тінь Y',
  'Text Shadow Opacity': 'Прозорість тіні тексту',
  'Text Shadow Y': 'Тінь тексту Y',
  'Text Shadow Blur': 'Розмиття тіні тексту',
  'Outer Glow Opacity': 'Прозорість зовнішнього сяйва',
  'Outer Glow Spread': 'Поширення зовнішнього сяйва',
  'Navbar Gradient Start': 'Початок градієнта навігації',
  'Navbar Gradient End': 'Кінець градієнта навігації',
  'Navbar Transparency': 'Прозорість навігації',
  'Pill Background': 'Тло pill',
  'Pill Text': 'Текст pill',
  'Active Pill Background': 'Тло активної pill',
  'Active Pill Text': 'Текст активної pill',
  'Pill Padding X': 'Padding X pill',
  'Pill Padding Y': 'Padding Y pill',
  'Pill Font Size': 'Розмір шрифту pill',
  'Indigo Gradient Start': 'Початок градієнта індиго',
  'Indigo Gradient End': 'Кінець градієнта індиго',
  'Violet Gradient Start': 'Початок фіолетового градієнта',
  'Violet Gradient End': 'Кінець фіолетового градієнта',
  'Emerald Gradient Start': 'Початок смарагдового градієнта',
  'Emerald Gradient End': 'Кінець смарагдового градієнта',
  'Sky Gradient Start': 'Початок небесного градієнта',
  'Sky Gradient End': 'Кінець небесного градієнта',
  'Amber Gradient Start': 'Початок бурштинового градієнта',
  'Amber Gradient End': 'Кінець бурштинового градієнта',
  'Rose Gradient Start': 'Початок рожевого градієнта',
  'Rose Gradient End': 'Кінець рожевого градієнта',
  'Teal Gradient Start': 'Початок бірюзового градієнта',
  'Teal Gradient End': 'Кінець бірюзового градієнта',
  'Slate Gradient Start': 'Початок сланцевого градієнта',
  'Slate Gradient End': 'Кінець сланцевого градієнта',
  'Progress Track': 'Трек прогресу',
  'Input Background': 'Тло поля',
  'Input Text': 'Текст поля',
  'Input Border': 'Рамка поля',
  'Input Placeholder': 'Placeholder поля',
  'Input Height': 'Висота поля',
  'Input Font Size': 'Розмір шрифту поля',
  'Heading Font': 'Шрифт заголовків',
  'Body Font': 'Шрифт тексту',
  'Base Font Size': 'Базовий розмір шрифту',
  'Body Line Height': 'Висота рядка тексту',
  'Heading Line Height': 'Висота рядка заголовка',
  'Page Width': 'Ширина сторінки',
  'Shared Gap Scale': 'Спільний масштаб відступів',
  'Page Padding Top': 'Padding сторінки зверху',
  'Page Padding Right': 'Padding сторінки праворуч',
  'Page Padding Bottom': 'Padding сторінки знизу',
  'Page Padding Left': 'Padding сторінки ліворуч',
  'Panel Radius': 'Радіус панелі',
  'Card Radius': 'Радіус картки',
  'Panel Inner Padding': 'Внутрішній padding панелі',
  'Navigation Pill Radius': 'Радіус навігаційної pill',
  'Button Radius': 'Радіус кнопки',
  'Button Border Radius': 'Радіус рамки кнопки',
  'Input Radius': 'Радіус поля',
  'Panel Shadow Opacity': 'Прозорість тіні панелі',
  'Panel Shadow Blur': 'Розмиття тіні панелі',
  'Panel Shadow Y': 'Тінь панелі Y',
  'Panel Shadow X': 'Тінь панелі X',
  'Card Shadow Opacity': 'Прозорість тіні картки',
  'Card Shadow Blur': 'Розмиття тіні картки',
  'Card Shadow Y': 'Тінь картки Y',
  'Card Shadow X': 'Тінь картки X',
};

const PL_FIELD_HELPER_TEXTS: Record<string, string> = {
  'Leave empty to use the Primary Text color.':
    'Zostaw puste, aby uzyc koloru glownego tekstu.',
  'Leave empty to use the Muted Text color.':
    'Zostaw puste, aby uzyc koloru wyciszonego tekstu.',
  'Controls text color inside soft cards.':
    'Steruje kolorem tekstu wewnatrz miekkich kart.',
  'Overrides the top navigation text color.':
    'Nadpisuje kolor tekstu gornej nawigacji.',
  'Overrides the active navigation text color.':
    'Nadpisuje kolor aktywnego tekstu nawigacji.',
  'Overrides the hover navigation text color.':
    'Nadpisuje kolor tekstu hover w nawigacji.',
  'Leave empty to derive from the active palette.':
    'Zostaw puste, aby wyprowadzic kolor z aktywnej palety.',
  'CSS color or gradient (e.g. #ff8a3d or linear-gradient(...)).':
    'Kolor CSS lub gradient (np. #ff8a3d albo linear-gradient(...)).',
  'CSS color or gradient (e.g. #ffffff or linear-gradient(...)).':
    'Kolor CSS lub gradient (np. #ffffff albo linear-gradient(...)).',
  'White-to-transparent gloss overlay covering the top portion of the button.':
    'Bialy do przezroczystego polysk pokrywajacy gorna czesc przycisku.',
  'Bright inset line along the top edge of the button.':
    'Jasna linia wewnetrzna przy gornej krawedzi przycisku.',
  'Dark inset shadow at the bottom edge for depth.':
    'Ciemny cien wewnetrzny przy dolnej krawedzi, dodajacy glebi.',
  'Raised or embossed text effect.':
    'Efekt wypuklego lub tloczonego tekstu.',
  'Colored halo around the button. Distinct from drop shadow.':
    'Kolorowa poswiata wokol przycisku, oddzielna od cienia zewnetrznego.',
  'Leave empty to let Kangur pick a track color based on the current mode.':
    'Zostaw puste, aby Kangur sam dobral kolor toru dla biezacego trybu.',
};

const UK_FIELD_HELPER_TEXTS: Record<string, string> = {
  'Leave empty to use the Primary Text color.':
    'Залиште порожнім, щоб використати колір основного тексту.',
  'Leave empty to use the Muted Text color.':
    'Залиште порожнім, щоб використати колір приглушеного тексту.',
  'Controls text color inside soft cards.':
    'Керує кольором тексту всередині мʼяких карток.',
  'Overrides the top navigation text color.':
    'Перевизначає колір тексту верхньої навігації.',
  'Overrides the active navigation text color.':
    'Перевизначає колір активного тексту навігації.',
  'Overrides the hover navigation text color.':
    'Перевизначає колір hover-тексту навігації.',
  'Leave empty to derive from the active palette.':
    'Залиште порожнім, щоб вивести колір з активної палітри.',
  'CSS color or gradient (e.g. #ff8a3d or linear-gradient(...)).':
    'Колір CSS або градієнт (наприклад, #ff8a3d або linear-gradient(...)).',
  'CSS color or gradient (e.g. #ffffff or linear-gradient(...)).':
    'Колір CSS або градієнт (наприклад, #ffffff або linear-gradient(...)).',
  'White-to-transparent gloss overlay covering the top portion of the button.':
    'Білий до прозорого блиск, що покриває верхню частину кнопки.',
  'Bright inset line along the top edge of the button.':
    'Яскрава внутрішня лінія вздовж верхнього краю кнопки.',
  'Dark inset shadow at the bottom edge for depth.':
    'Темна внутрішня тінь біля нижнього краю для відчуття глибини.',
  'Raised or embossed text effect.':
    'Ефект опуклого або тисненого тексту.',
  'Colored halo around the button. Distinct from drop shadow.':
    'Кольорове сяйво навколо кнопки, окреме від зовнішньої тіні.',
  'Leave empty to let Kangur pick a track color based on the current mode.':
    'Залиште порожнім, щоб Kangur сам підібрав колір треку для поточного режиму.',
};

const PL_FIELD_PLACEHOLDERS: Record<string, string> = {
  Auto: 'Auto',
};

const UK_FIELD_PLACEHOLDERS: Record<string, string> = {
  Auto: 'Авто',
};

export const resolveKangurThemeSettingsLocale = (
  locale: string | null | undefined
): KangurThemeSettingsLocale => resolveKangurAdminLocale(locale);

export const getKangurThemeModeCopy = (
  locale: KangurThemeSettingsLocale,
  mode: KangurThemeMode
) => MODE_COPY[locale][mode];

export const getKangurThemePanelCopy = (locale: KangurThemeSettingsLocale) =>
  PANEL_COPY[locale];

export const getKangurThemeSectionCopy = (
  locale: KangurThemeSettingsLocale,
  sectionId: KangurThemeSectionId
) => SECTION_COPY[locale][sectionId];

export const localizeKangurThemeField = <T extends object>(
  locale: KangurThemeSettingsLocale,
  field: SettingsPanelField<T>
): SettingsPanelField<T> => {
  if (locale === 'en') {
    return field;
  }

  const fieldLabels = locale === 'uk' ? UK_FIELD_LABELS : PL_FIELD_LABELS;
  const fieldHelpers = locale === 'uk' ? UK_FIELD_HELPER_TEXTS : PL_FIELD_HELPER_TEXTS;
  const fieldPlaceholders = locale === 'uk' ? UK_FIELD_PLACEHOLDERS : PL_FIELD_PLACEHOLDERS;

  return {
    ...field,
    label: fieldLabels[field.label] ?? field.label,
    helperText:
      typeof field.helperText === 'string'
        ? (fieldHelpers[field.helperText] ?? field.helperText)
        : field.helperText,
    placeholder:
      typeof field.placeholder === 'string'
        ? (fieldPlaceholders[field.placeholder] ?? field.placeholder)
        : field.placeholder,
  };
};

export const mapKangurThemeSectionToPreviewSection = (
  sectionId: KangurThemeSectionId
): KangurThemePreviewSectionId => {
  if (sectionId === 'buttonShadows' || sectionId === 'gelEffects') {
    return 'buttons';
  }

  return sectionId;
};

export const buildKangurThemeFontWeightOptions = (
  locale: KangurThemeSettingsLocale
): ReadonlyArray<LabeledOptionDto<string>> => FONT_WEIGHT_OPTIONS_BY_LOCALE[locale];

export const buildKangurThemeHomeActionFields = (
  locale: KangurThemeSettingsLocale
): SettingsPanelField<ThemeSettings>[] => {
  const groups = [
    { prefix: 'homeActionLessons', key: 'lessons' },
    { prefix: 'homeActionPlay', key: 'play' },
    { prefix: 'homeActionTraining', key: 'training' },
    { prefix: 'homeActionKangur', key: 'kangur' },
  ] as const;
  const suffixes = [
    'TextColor',
    'TextActiveColor',
    'LabelStart',
    'LabelMid',
    'LabelEnd',
    'LabelStartActive',
    'LabelMidActive',
    'LabelEndActive',
    'AccentStart',
    'AccentMid',
    'AccentEnd',
    'UnderlayStart',
    'UnderlayMid',
    'UnderlayEnd',
    'UnderlayTintStart',
    'UnderlayTintMid',
    'UnderlayTintEnd',
    'AccentShadowColor',
    'UnderlayShadowColor',
    'SurfaceShadowColor',
  ] as const;

  return groups.flatMap((group) =>
    suffixes.map((suffix) => ({
      key: `${group.prefix}${suffix}` as keyof ThemeSettings,
      label: `${HOME_ACTION_GROUP_LABELS[locale][group.key]} ${HOME_ACTION_TOKEN_LABELS[locale][suffix]}`,
      type: 'color' as const,
    }))
  );
};
