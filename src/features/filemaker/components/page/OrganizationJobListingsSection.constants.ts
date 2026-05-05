export const JOB_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

export const SALARY_PERIOD_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'fixed', label: 'Fixed' },
];

export const APPLICATION_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'applied', label: 'Applied' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

export const RESPONSIBILITY_ITEM_START_RE =
  /(Tworzenie|Budowanie|Integracja|Wsparcie|Dbanie|Optymalizacja|Debugowanie|Rozw[oó]j|Projektowanie|Implementacja|Utrzymanie|Wsp[oó]łpraca|Przygotowywanie|Prowadzenie|Analiza|Testowanie|Dokumentowanie|Creating|Building|Integrating|Supporting|Maintaining|Designing|Implementing|Optimizing|Debugging|Developing|Updating)\b/giu;

export const RESPONSIBILITY_HEADING_RE =
  /^(tw[oó]j zakres obowi[aą]zk[oó]w|zakres obowi[aą]zk[oó]w|responsibilities|your responsibilities|role responsibilities)\s*/iu;
