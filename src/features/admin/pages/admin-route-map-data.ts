import { flattenAdminNav, type FlattenedNavItem, type NavItem } from '@/features/admin/components/menu/admin-menu-utils';

export type RouteMapEntry = FlattenedNavItem & {
  description: string;
  section: string;
  breadcrumb: string;
};

export type RouteMapGroup = [string, RouteMapEntry[]];

const ROUTE_DESCRIPTION_OVERRIDES: Record<string, string> = {
  '/admin': 'Admin home dashboard with quick links and global status.',
  '/admin/routes': 'Reference map of admin routes with descriptions.',
  '/admin/ai-paths': 'Design, test, and run AI Paths workflows.',
  '/admin/context-registry':
    'Inspect the centralized AI context registry, runtime refs, bundles, tools, and reusable context packs.',
  '/admin/case-resolver':
    'Build case flows with folder-organized files, WYSIWYG prompt nodes, and node-map composition.',
  '/admin/case-resolver/cases': 'List, add, open, edit, and remove Case Resolver cases.',
  '/admin/case-resolver/tags': 'Manage tags used by Case Resolver documents.',
  '/admin/case-resolver/identifiers': 'Manage case identifiers used by Case Resolver documents.',
  '/admin/case-resolver/categories': 'Manage the Case Resolver document category tree.',
  '/admin/case-resolver/preferences':
    'Configure default Case Resolver Case list view and filter behavior.',
  '/admin/case-resolver/capture':
    'Configure Case Resolver Capture role mappings and Filemaker auto-matching rules.',
  '/admin/case-resolver/settings': 'Configure Case Resolver OCR model settings.',
  '/admin/kangur':
    'Open the Kangur learning and competition workspace for math training and score tracking.',
  '/admin/kangur/observability':
    'Monitor Kangur-specific alerts, route health, client telemetry, and recent server activity.',
  '/admin/kangur/lessons-manager':
    'Manage Kangur lessons list, order, and visibility using the Master Folder Tree runtime.',
  '/admin/kangur/social':
    'Prepare bilingual Kangur social posts with images, scheduling, and LinkedIn publishing.',
  '/admin/kangur/settings':
    'Configure Kangur narrator voice, narration mode, and documentation tooltip behavior.',
  '/admin/kangur/settings/ai-tutor-content':
    'Edit the Mongo-backed AI Tutor content pack used by onboarding, helper prompts, and tutor explanations.',
  '/admin/filemaker':
    'Manage persons, organizations, events, and emails used as addresser/addressee data in Case Resolver documents.',
  '/admin/filemaker/persons': 'Search and review Filemaker persons.',
  '/admin/filemaker/organizations': 'Search and review Filemaker organizations.',
  '/admin/filemaker/events': 'Search and review Filemaker events with linked organizations.',
  '/admin/filemaker/emails': 'Search and review Filemaker emails and relationship links.',
  '/admin/filemaker/list':
    'Search and review the combined Filemaker person, organization, and event registry.',
  '/admin/ai-paths/queue': 'Monitor queued, running, and completed path runs.',
  '/admin/ai-paths/dead-letter': 'Inspect failed AI runs and retry or requeue them.',
  '/admin/validator': 'Edit validation rules for each available validator pattern list.',
  '/admin/validator/lists': 'Create, rename, lock, and remove available validator pattern lists.',
  '/admin/prompt-exploder':
    'Explode long prompts into editable typed segments and reassemble them.',
  '/admin/prompt-exploder/projects': 'Create, edit, remove, and open Prompt Exploder projects.',
  '/admin/prompt-exploder/settings':
    'Configure Prompt Exploder runtime, learning, and AI model settings.',
  '/admin/products': 'Browse and manage all products in the catalog.',
  '/admin/products/import': 'Import products from Base.com and manage import templates.',
  '/admin/integrations/aggregators/base-com/import-export':
    'Configure Base.com product export defaults and export templates.',
  '/admin/cms/builder': 'Visual page builder for CMS layouts.',
  '/admin/settings': 'System settings overview and quick access cards.',
  '/admin/settings/menu': 'Customize the admin menu structure and favorites.',
};

type DescriptionRule = {
  describe: (label: string, parent: string) => string;
  matches: (label: string) => boolean;
};

const DESCRIPTION_RULES: DescriptionRule[] = [
  { matches: (label: string) => label.startsWith('create '), describe: (label) => `Create a new ${label.slice(7).trim().toLowerCase()} entry.` },
  { matches: (label: string) => label.includes('settings'), describe: (_label, parent) => `Configure ${parent.toLowerCase()} settings and defaults.` },
  { matches: (label: string) => label === 'overview', describe: (_label, parent) => `Overview of ${parent.toLowerCase()} configuration.` },
  { matches: (label: string) => label.includes('list') || label.startsWith('all '), describe: (label) => `Browse and manage ${label.replace(/^all\s+/i, '').toLowerCase()} records.` },
  { matches: (label: string) => label.includes('jobs'), describe: (_label, parent) => `Monitor and manage ${parent.toLowerCase()} jobs and runs.` },
  { matches: (label: string) => label.includes('queue'), describe: (_label, parent) => `Inspect queued and running ${parent.toLowerCase()} tasks.` },
  { matches: (label: string) => label.includes('dead letter'), describe: () => 'Review failed jobs and decide on retries or cleanup.' },
  { matches: (label: string) => label.includes('logs'), describe: (_label, parent) => `Review ${parent.toLowerCase()} logs and diagnostics.` },
  { matches: (label: string) => label.includes('builder'), describe: (_label, parent) => `Compose and edit ${parent.toLowerCase()} layouts.` },
  { matches: (label: string) => label.includes('themes'), describe: (_label, parent) => `Manage ${parent.toLowerCase()} themes and styling presets.` },
  { matches: (label: string) => label.includes('slugs'), describe: (_label, parent) => `Manage slug records for ${parent.toLowerCase()} content.` },
  { matches: (label: string) => label.includes('zones'), describe: (_label, parent) => `Manage layout zones for ${parent.toLowerCase()} content.` },
  { matches: (label: string) => label.includes('analytics'), describe: () => 'Review analytics and activity summaries.' },
  { matches: (label: string) => label.includes('permissions'), describe: () => 'Manage access permissions and role rules.' },
  { matches: (label: string) => label.includes('users'), describe: () => 'Manage user accounts and access controls.' },
  { matches: (label: string) => label.includes('chat'), describe: (_label, parent) => `Open the ${parent.toLowerCase()} chat workspace.` },
  { matches: (label: string) => label.includes('sessions'), describe: (_label, parent) => `Review saved ${parent.toLowerCase()} sessions.` },
  { matches: (label: string) => label.includes('memory'), describe: (_label, parent) => `Manage ${parent.toLowerCase()} memory and embeddings.` },
  { matches: (label: string) => label.includes('context'), describe: (_label, parent) => `Edit shared context for ${parent.toLowerCase()}.` },
];

const getRouteDescriptionOverride = (href: string | undefined): string | null => {
  if (href === undefined || href === '') {
    return null;
  }

  return ROUTE_DESCRIPTION_OVERRIDES[href] ?? null;
};

const getDescriptionFromRules = (label: string, parent: string): string | null => {
  const lowerLabel = label.toLowerCase();
  const matchedRule = DESCRIPTION_RULES.find((rule) => rule.matches(lowerLabel));
  return matchedRule === undefined ? null : matchedRule.describe(label, parent);
};

const getRouteSearchHaystack = (entry: RouteMapEntry): string =>
  [
    entry.label,
    entry.href ?? '',
    entry.description,
    entry.breadcrumb,
    entry.keywords?.join(' ') ?? '',
  ]
    .join(' ')
    .toLowerCase();

const buildFallbackDescription = (entry: FlattenedNavItem): string => {
  const override = getRouteDescriptionOverride(entry.href);
  if (override !== null) {
    return override;
  }

  const label = entry.label.trim();
  const section = entry.parents[0] ?? 'Admin';
  const parent = entry.parents[entry.parents.length - 1] ?? section;
  const ruleDescription = getDescriptionFromRules(label, parent);

  return ruleDescription ?? `Open ${label} under ${section}.`;
};

export const buildRouteEntries = (items: NavItem[]): RouteMapEntry[] =>
  flattenAdminNav(items).map((entry: FlattenedNavItem) => ({
    ...entry,
    section: entry.parents[0] ?? 'General',
    breadcrumb: [...entry.parents, entry.label].join(' / '),
    description: buildFallbackDescription(entry),
  }));

export const filterRouteEntries = (
  entries: RouteMapEntry[],
  query: string
): RouteMapEntry[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery === '') {
    return entries;
  }

  return entries.filter((entry: RouteMapEntry) => getRouteSearchHaystack(entry).includes(normalizedQuery));
};

export const groupRouteEntries = (entries: RouteMapEntry[]): RouteMapGroup[] => {
  const groupedEntries = new Map<string, RouteMapEntry[]>();
  entries.forEach((entry: RouteMapEntry) => {
    const siblings = groupedEntries.get(entry.section) ?? [];
    siblings.push(entry);
    groupedEntries.set(entry.section, siblings);
  });

  return Array.from(groupedEntries.entries()).sort((left, right) => left[0].localeCompare(right[0]));
};
