import type { KangurAiTutorNativeGuideEntry } from './kangur-ai-tutor-native-guide';
import type {
  KangurAiTutorFocusKind,
  KangurAiTutorFollowUpAction,
  KangurAiTutorSurface,
} from './kangur-ai-tutor';

const createGuideEntry = (input: {
  id: string;
  surface?: KangurAiTutorSurface | null;
  focusKind?: KangurAiTutorFocusKind | null;
  focusIdPrefixes?: string[];
  contentIdPrefixes?: string[];
  title: string;
  shortDescription: string;
  fullDescription: string;
  hints?: string[];
  relatedGames?: string[];
  relatedTests?: string[];
  followUpActions?: KangurAiTutorFollowUpAction[];
  triggerPhrases?: string[];
  enabled?: boolean;
  sortOrder?: number;
}): KangurAiTutorNativeGuideEntry => ({
  surface: null,
  focusKind: null,
  focusIdPrefixes: [],
  contentIdPrefixes: [],
  hints: [],
  relatedGames: [],
  relatedTests: [],
  followUpActions: [],
  triggerPhrases: [],
  enabled: true,
  sortOrder: 0,
  ...input,
});

export const KANGUR_NATIVE_GUIDE_ENTRIES_AUTH: KangurAiTutorNativeGuideEntry[] = [
  createGuideEntry({
    id: 'auth-overview',
    surface: 'auth',
    contentIdPrefixes: ['auth:login:'],
    title: 'Ekran logowania i zakładania konta',
    shortDescription:
      'To wspólny ekran wejścia do Kangur dla ucznia i rodzica, z miejscem na logowanie oraz założenie konta rodzica.',
    fullDescription:
      'Ekran logowania porządkuje dwa scenariusze: uczeń wchodzi nickiem i hasłem, a rodzic emailem i hasłem albo zakłada nowe konto. Tutor może tu tłumaczyć, które pole do czego służy, czym różni się logowanie ucznia od rodzica i kiedy trzeba przełączyć formularz na tworzenie konta. To także miejsce, w którym można szybko przejść między logowaniem a rejestracją.',
    hints: [
      'Najpierw ustal, czy loguje się uczeń, czy rodzic, bo od tego zależy jaki identyfikator trzeba wpisać.',
      'Jeśli rodzic nie ma jeszcze konta, przejdź na tryb tworzenia konta zamiast próbować zgadywać hasło.',
      'Jeśli masz już konto, upewnij się, że formularz jest w trybie logowania.',
    ],
    triggerPhrases: [
      'ekran logowania',
      'jak działa logowanie',
      'jak założyć konto rodzica',
      'co mogę tutaj zrobić',
    ],
    sortOrder: 179,
  }),
  createGuideEntry({
    id: 'auth-login-form',
    surface: 'auth',
    focusKind: 'login_form',
    focusIdPrefixes: ['kangur-auth-login-form'],
    contentIdPrefixes: ['auth:login:'],
    title: 'Formularz logowania Kangur',
    shortDescription:
      'Ten formularz zbiera dane potrzebne do wejścia ucznia albo rodzica do aplikacji.',
    fullDescription:
      'Formularz logowania łączy dwa tryby pracy: zwykle logowanie i założenie konta rodzica. W zależności od wybranego scenariusza pokazuje odpowiednie pola, komunikaty i przycisk akcji, dlatego Tutor-AI powinien wyjaśniać nie tylko gdzie wpisać dane, ale tez jaki tryb jest teraz aktywny. Jeśli widzisz dodatkowe pola rejestracji, oznacza to, że formularz jest w trybie tworzenia konta.',
    hints: [
      'Jeśli na formularzu widać tryb tworzenia konta, rodzic powinien wpisać email i nowe hasło, a nie dane ucznia.',
      'Gdy uczeń loguje się nickiem, najważniejsze jest poprawne wpisanie identyfikatora bez spacji.',
      'Gdy pojawia się błąd, sprawdź czy wybrany jest właściwy tryb: logowanie lub tworzenie konta.',
    ],
    triggerPhrases: [
      'formularz logowania',
      'sekcja logowania',
      'jak wypełnić ten formularz',
      'co oznacza ten formularz',
    ],
    sortOrder: 180,
  }),
  createGuideEntry({
    id: 'auth-login-identifier-field',
    surface: 'auth',
    focusKind: 'login_identifier_field',
    focusIdPrefixes: ['kangur-auth-login-identifier-field'],
    contentIdPrefixes: ['auth:login:'],
    title: 'Pole identyfikatora logowania',
    shortDescription:
      'To pole przyjmuje email rodzica albo nick ucznia, zależnie od tego kto wchodzi do Kangur.',
    fullDescription:
      'Pole identyfikatora jest pierwszym krokiem logowania. Dla rodzica oczekuje adresu email, a dla ucznia prostego nicku. Tutor-AI powinien pomagać rozróżnić te dwa przypadki i przypominać, że od poprawnego typu identyfikatora zależy dalsze powodzenie logowania.',
    hints: [
      'Rodzic wpisuje pełny email z symbolem @.',
      'Uczeń wpisuje swój nick dokładnie tak, jak został zapisany w Kangur.',
      'Nie dodawaj spacji ani dodatkowych znaków na początku lub końcu wpisu.',
    ],
    triggerPhrases: [
      'pole logowania',
      'co wpisać tutaj',
      'email czy nick',
      'identyfikator logowania',
    ],
    sortOrder: 181,
  }),
  createGuideEntry({
    id: 'auth-create-account-action',
    surface: 'auth',
    focusKind: 'create_account_action',
    focusIdPrefixes: ['kangur-auth-create-account-action'],
    title: 'Akcja utworzenia konta',
    shortDescription:
      'Ten przycisk prowadzi rodzica do założenia nowego konta zamiast zwykłego logowania.',
    fullDescription:
      'Akcja utworzenia konta jest przeznaczona dla rodzica, który jeszcze nie ma danych do logowania. Po jej wybraniu formularz przechodzi w tryb rejestracji i zaczyna prowadzić przez utworzenie konta oraz potwierdzenie emaila. Po zakończeniu rejestracji wraca się do logowania na nowe konto.',
    hints: [
      'Użyj tej akcji wtedy, gdy rodzic wchodzi pierwszy raz i nie ma jeszcze hasła.',
      'Po założeniu konta trzeba zwykle potwierdzić adres email, zanim logowanie zacznie działać.',
      'Sprawdź skrzynkę pocztową, jeśli potwierdzenie nie pojawia się od razu.',
    ],
    triggerPhrases: [
      'utwórz konto',
      'jak założyć konto',
      'po co ten przycisk',
      'tworzenie konta rodzica',
    ],
    sortOrder: 182,
  }),
  createGuideEntry({
    id: 'auth-login-action',
    surface: 'auth',
    focusKind: 'login_action',
    focusIdPrefixes: ['kangur-auth-login-action'],
    title: 'Akcja logowania',
    shortDescription:
      'Ten przycisk prowadzi do wejścia na istniejące konto ucznia albo rodzica.',
    fullDescription:
      'Akcja logowania służy do przejścia na ekran, na którym wpisuje się istniejące dane dostępowe. Tutor-AI powinien tłumaczyć, że to właściwa droga dla osób, które mają już konto, a nie dla rodzica dopiero tworzącego pierwszy dostęp. Po jej wybraniu formularz powinien pokazywać pola logowania, a nie rejestracji.',
    hints: [
      'Kliknij logowanie, gdy konto jest już założone i trzeba tylko podać dane.',
      'Jeśli rodzic jeszcze nie ma konta, lepszym wyborem będzie akcja utworzenia konta.',
      'Gdy widzisz pola rejestracji, przełącz się z powrotem na logowanie.',
    ],
    triggerPhrases: [
      'zaloguj się',
      'jak wejść do konta',
      'po co ten przycisk logowania',
      'mam już konto',
    ],
    sortOrder: 183,
  }),
];
