export const FALLBACK_TUTOR_NAME = { de: 'KI-Tutor', en: 'AI Tutor', pl: 'AI Tutor' } as const;

export const createSignedOutMessage = (l: 'de' | 'en' | 'pl'): string =>
  ({ de: 'Melde dich an, um den KI-Tutor in diesem kroku zu öffnen.', en: 'Sign in to open AI Tutor for this step.', pl: 'Zaloguj się, aby otworzyć AI Tutora przy tym kroku.' })[l];

export const createRestoringSignInMessage = (l: 'de' | 'en' | 'pl'): string =>
  ({ de: 'Die Anmeldung wird wiederhergestellt, damit der KI-Tutor starten kann.', en: 'Restoring sign-in so AI Tutor can open here.', pl: 'Przywracamy logowanie, aby AI Tutor mógł się tutaj otworzyć.' })[l];

export const createLockedTestPromptMessage = (l: 'de' | 'en' | 'pl'): string =>
  ({ de: 'Sprawdź odpowiedź, aby odblokować szybkie podpowiedzi tutora przy tym pytaniu.', en: 'Reveal the answer to unlock tutor prompts for this test question.', pl: 'Sprawdź odpowiedź, aby odblokować szybkie podpowiedzi tutora przy tym pytaniu.' })[l];
