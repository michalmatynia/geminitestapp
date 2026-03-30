import {
  PackageIcon,
  BookOpenIcon,
  GraduationCapIcon,
  SettingsIcon,
  MessageCircleIcon,
  StickyNoteIcon,
  ShieldIcon,
  ActivityIcon,
  BarChart3Icon,
  WorkflowIcon,
  HomeIcon,
  GitBranchIcon,
  Plug,
  AppWindow,
  Image as ImageIcon,
  SparklesIcon,
  MapIcon,
  Brain,
} from 'lucide-react';
import React from 'react';

import type { NavItem } from './Menu';

export const buildAdminNav = (handlers: {
  onOpenChat: React.MouseEventHandler<HTMLAnchorElement>;
  onCreatePageClick: () => void;
}): NavItem[] => [
  {
    id: 'home',
    label: 'Home',
    href: '/admin',
    icon: <HomeIcon className='size-4' />,
    keywords: ['dashboard', 'home'],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: <AppWindow className='size-4' />,
    children: [
      { id: 'workspace/front-manage', label: 'Front Manage', href: '/admin/front-manage' },
      {
        id: 'workspace/kangur',
        label: 'Kangur',
        href: '/admin/kangur',
        icon: <GraduationCapIcon className='size-4' />,
        keywords: ['math', 'education', 'training', 'game', 'competition'],
        children: [
          {
            id: 'workspace/kangur/studio',
            label: 'Studio',
            href: '/admin/kangur',
            exact: true,
          },
          {
            id: 'workspace/kangur/builder',
            label: 'CMS Builder',
            href: '/admin/kangur/builder',
          },
          {
            id: 'workspace/kangur/lessons-manager',
            label: 'Lessons Manager',
            href: '/admin/kangur/lessons-manager',
          },
          {
            id: 'workspace/kangur/observability',
            label: 'Observability',
            href: '/admin/kangur/observability',
          },
          {
            id: 'workspace/kangur/social',
            label: 'Social',
            href: '/admin/kangur/social',
            keywords: ['linkedin', 'social', 'posts', 'updates'],
          },
          {
            id: 'workspace/kangur/appearance',
            label: 'Appearance',
            href: '/admin/kangur/appearance',
            keywords: ['theme', 'theming', 'styling', 'brand'],
          },
          {
            id: 'workspace/kangur/settings',
            label: 'Settings',
            href: '/admin/kangur/settings',
          },
          {
            id: 'workspace/kangur/settings/ai-tutor-content',
            label: 'AI Tutor Content',
            href: '/admin/kangur/settings/ai-tutor-content',
            required: true,
          },
        ],
      },
      { id: 'workspace/import', label: 'Import', href: '/admin/import' },
      { id: 'workspace/files', label: 'Files', href: '/admin/files' },
      {
        id: 'workspace/databases',
        label: 'Workflow Database',
        href: '/admin/databases/engine',
        keywords: ['database', 'backups', 'operations', 'engine'],
        children: [
          {
            id: 'workspace/databases/backups',
            label: 'Backups',
            href: '/admin/databases/engine?view=backups',
            exact: true,
          },
          {
            id: 'workspace/databases/operations',
            label: 'Operations',
            href: '/admin/databases/engine?view=operations',
          },
          {
            id: 'workspace/databases/engine',
            label: 'Database Engine',
            href: '/admin/databases/engine',
          },
        ],
      },
      { id: 'workspace/app-embeds', label: 'App Embeds', href: '/admin/app-embeds' },
    ],
  },
  {
    id: 'filemaker',
    label: 'Filemaker',
    href: '/admin/filemaker',
    icon: <BookOpenIcon className='size-4' />,
    keywords: [
      'database',
      'persons',
      'organizations',
      'events',
      'emails',
      'addressing',
      'case resolver',
    ],
    children: [
      { id: 'filemaker/database', label: 'Database', href: '/admin/filemaker', exact: true },
      { id: 'filemaker/persons', label: 'Persons', href: '/admin/filemaker/persons' },
      {
        id: 'filemaker/organizations',
        label: 'Organizations',
        href: '/admin/filemaker/organizations',
      },
      { id: 'filemaker/events', label: 'Events', href: '/admin/filemaker/events' },
      { id: 'filemaker/emails', label: 'Emails', href: '/admin/filemaker/emails' },
      { id: 'filemaker/list', label: 'Combined List', href: '/admin/filemaker/list' },
    ],
  },
  {
    id: 'image-studio',
    label: 'Image Studio',
    href: '/admin/image-studio',
    icon: <ImageIcon className='size-4' />,
    keywords: ['ai', 'images', 'mask', 'studio', 'relight'],
  },
  {
    id: 'prompt-exploder',
    label: 'Prompt Exploder',
    href: '/admin/prompt-exploder',
    icon: <SparklesIcon className='size-4' />,
    keywords: ['ai', 'prompt', 'exploder', 'projects', 'segmentation'],
    children: [
      {
        id: 'prompt-exploder/projects',
        label: 'Projects',
        href: '/admin/prompt-exploder/projects',
      },
      {
        id: 'prompt-exploder/settings',
        label: 'Settings',
        href: '/admin/prompt-exploder/settings',
      },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    href: '/admin/products',
    icon: <PackageIcon className='size-4' />,
    children: [
      {
        id: 'commerce/products',
        label: 'Products',
        href: '/admin/products',
        children: [
          {
            id: 'commerce/products/all',
            label: 'All Products',
            href: '/admin/products',
            exact: true,
          },
          { id: 'commerce/products/drafts', label: 'Drafts', href: '/admin/drafts' },
          {
            id: 'commerce/products/producers',
            label: 'Producers',
            href: '/admin/products/producers',
          },
          {
            id: 'commerce/products/orders-import',
            label: 'Orders Import',
            href: '/admin/products/orders-import',
          },
          {
            id: 'commerce/products/preferences',
            label: 'Preferences',
            href: '/admin/products/preferences',
          },
          { id: 'commerce/products/settings', label: 'Settings', href: '/admin/products/settings' },
        ],
      },
      {
        id: 'commerce/assets',
        label: 'Assets',
        href: '/admin/3d-assets',
        children: [
          { id: 'commerce/assets/3d', label: '3D Assets', href: '/admin/3d-assets' },
          { id: 'commerce/assets/3d-list', label: '3D Asset List', href: '/admin/3d-assets/list' },
        ],
      },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    href: '/admin/integrations',
    icon: <Plug className='size-4' />,
    children: [
      { id: 'integrations/connections', label: 'Connections', href: '/admin/integrations' },
      { id: 'integrations/add', label: 'Add Integration', href: '/admin/integrations/add' },
      {
        id: 'integrations/aggregators',
        label: 'Aggregators',
        href: '/admin/integrations/aggregators/base-com/synchronization-engine',
        children: [
          {
            id: 'integrations/aggregators/base-com',
            label: 'Base.com',
            href: '/admin/integrations/aggregators/base-com/synchronization-engine',
            children: [
              {
                id: 'integrations/aggregators/base-com/synchronization-engine',
                label: 'Synchronization Engine',
                href: '/admin/integrations/aggregators/base-com/synchronization-engine',
              },
              {
                id: 'integrations/aggregators/base-com/category-mapping',
                label: 'Category Mapping',
                href: '/admin/integrations/aggregators/base-com/category-mapping',
              },
              {
                id: 'integrations/aggregators/base-com/import-export',
                label: 'Import / Export',
                href: '/admin/integrations/aggregators/base-com/import-export',
              },
            ],
          },
        ],
      },
      {
        id: 'integrations/marketplaces',
        label: 'Marketplaces',
        href: '/admin/integrations/marketplaces',
        children: [
          {
            id: 'integrations/marketplaces/allegro',
            label: 'Allegro',
            href: '/admin/integrations/marketplaces/allegro',
            children: [
              {
                id: 'integrations/marketplaces/allegro/connections',
                label: 'Connections',
                href: '/admin/integrations/marketplaces/allegro/connections',
              },
              {
                id: 'integrations/marketplaces/allegro/listing-management',
                label: 'Listing Management',
                href: '/admin/integrations/marketplaces/allegro/listing-management',
              },
              {
                id: 'integrations/marketplaces/allegro/listing-templates',
                label: 'Listing Templates',
                href: '/admin/integrations/marketplaces/allegro/listing-templates',
              },
              {
                id: 'integrations/marketplaces/allegro/messages',
                label: 'Messages',
                href: '/admin/integrations/marketplaces/allegro/messages',
              },
              {
                id: 'integrations/marketplaces/allegro/parameter-mapping',
                label: 'Parameter Mapping',
                href: '/admin/integrations/marketplaces/allegro/parameter-mapping',
              },
              {
                id: 'integrations/marketplaces/allegro/shipping-price-management',
                label: 'Shipping Price Management',
                href: '/admin/integrations/marketplaces/allegro/shipping-price-management',
              },
            ],
          },
          {
            id: 'integrations/marketplaces/tradera',
            label: 'Tradera',
            href: '/admin/integrations/tradera',
          },
        ],
      },
    ],
  },
  {
    id: 'brain',
    label: 'Brain',
    href: '/admin/brain?tab=operations',
    icon: <Brain className='size-4' />,
    keywords: ['ai', 'brain', 'operations', 'models', 'routing', 'insights'],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    href: '/admin/ai-paths/queue',
    icon: <WorkflowIcon className='size-4' />,
    keywords: ['queue', 'runner', 'workers', 'background', 'tasks'],
    children: [
      { id: 'jobs/queue', label: 'Job Queue', href: '/admin/ai-paths/queue' },
      { id: 'jobs/dead-letter', label: 'Dead Letter', href: '/admin/ai-paths/dead-letter' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    href: '/admin/ai-paths',
    icon: <GitBranchIcon className='size-4' />,
    children: [
      {
        id: 'ai/ai-paths',
        label: 'AI Paths',
        href: '/admin/ai-paths',
        children: [
          { id: 'ai/ai-paths/canvas', label: 'Canvas', href: '/admin/ai-paths', exact: true },
          {
            id: 'ai/ai-paths/trigger-buttons',
            label: 'Trigger Buttons',
            href: '/admin/ai-paths/trigger-buttons',
          },
          {
            id: 'ai/ai-paths/case-resolver',
            label: 'Case Resolver',
            href: '/admin/case-resolver',
            children: [
              {
                id: 'ai/ai-paths/case-resolver/studio',
                label: 'Studio',
                href: '/admin/case-resolver',
                exact: true,
              },
              {
                id: 'ai/ai-paths/case-resolver/cases',
                label: 'Cases',
                href: '/admin/case-resolver/cases',
              },
              {
                id: 'ai/ai-paths/case-resolver/tags',
                label: 'Tags',
                href: '/admin/case-resolver/tags',
              },
              {
                id: 'ai/ai-paths/case-resolver/identifiers',
                label: 'Case Identifiers',
                href: '/admin/case-resolver/identifiers',
              },
              {
                id: 'ai/ai-paths/case-resolver/categories',
                label: 'Categories',
                href: '/admin/case-resolver/categories',
              },
              {
                id: 'ai/ai-paths/case-resolver/preferences',
                label: 'Preferences',
                href: '/admin/case-resolver/preferences',
              },
              {
                id: 'ai/ai-paths/case-resolver/capture',
                label: 'Capture',
                href: '/admin/case-resolver/capture',
              },
              {
                id: 'ai/ai-paths/case-resolver/settings',
                label: 'Settings',
                href: '/admin/case-resolver/settings',
              },
            ],
          },
        ],
      },
      {
        id: 'ai/context-registry',
        label: 'Context Registry',
        href: '/admin/context-registry',
        keywords: ['context', 'registry', 'runtime', 'nodes', 'policies', 'ai'],
      },
      {
        id: 'ai/prompt-engine',
        label: 'Global Validator',
        href: '/admin/validator',
        keywords: [
          'validation',
          'extractor',
          'formatter',
          'prompt rules',
          'products',
          'image studio',
        ],
        children: [
          { id: 'ai/prompt-engine/validation', label: 'Pattern Editor', href: '/admin/validator' },
          {
            id: 'ai/prompt-engine/validation-lists',
            label: 'List Manager',
            href: '/admin/validator/lists',
          },
        ],
      },
      {
        id: 'ai/image-studio',
        label: 'Image Studio',
        href: '/admin/image-studio',
        keywords: ['images', 'mask', 'polygon', 'relight', 'studio'],
        children: [
          { id: 'ai/image-studio/studio', label: 'Studio', href: '/admin/image-studio' },
          {
            id: 'ai/image-studio/projects',
            label: 'Projects',
            href: '/admin/image-studio?tab=projects',
          },
          {
            id: 'ai/image-studio/settings',
            label: 'Settings',
            href: '/admin/image-studio?tab=settings',
          },
          {
            id: 'ai/image-studio/ui-presets',
            label: 'UI Presets',
            href: '/admin/image-studio/ui-presets',
          },
        ],
      },
      {
        id: 'ai/agent-creator',
        label: 'Agent Creator',
        href: '/admin/agentcreator',
        children: [
          {
            id: 'ai/agent-creator/runs',
            label: 'Runs',
            href: '/admin/agentcreator/runs',
          },
          {
            id: 'ai/agent-creator/learners',
            label: 'Learner Agents',
            href: '/admin/agentcreator/teaching',
            keywords: ['teaching', 'embedding', 'rag', 'school'],
            children: [
              {
                id: 'ai/agent-creator/learners/agents',
                label: 'Agents',
                href: '/admin/agentcreator/teaching/agents',
              },
              {
                id: 'ai/agent-creator/learners/school',
                label: 'Embedding School',
                href: '/admin/agentcreator/teaching/collections',
              },
              {
                id: 'ai/agent-creator/learners/chat',
                label: 'Chat',
                href: '/admin/agentcreator/teaching/chat',
              },
            ],
          },
          {
            id: 'ai/agent-creator/personas',
            label: 'Personas',
            href: '/admin/agentcreator/personas',
          },
        ],
      },
      {
        id: 'ai/chatbot',
        label: 'Chatbot',
        href: '/admin/chatbot',
        children: [
          {
            id: 'ai/chatbot/chat',
            label: 'Chat',
            href: '/admin/chatbot',
            icon: <MessageCircleIcon className='size-4' />,
            onClick: handlers.onOpenChat,
          },
          { id: 'ai/chatbot/sessions', label: 'Sessions', href: '/admin/chatbot/sessions' },
          { id: 'ai/chatbot/context', label: 'Global Context', href: '/admin/chatbot/context' },
          { id: 'ai/chatbot/memory', label: 'Memory', href: '/admin/chatbot/memory' },
        ],
      },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    href: '/admin/notes',
    icon: <BookOpenIcon className='size-4' />,
    children: [
      {
        id: 'content/notes',
        label: 'Notes',
        href: '/admin/notes',
        icon: <StickyNoteIcon className='size-4' />,
        children: [
          { id: 'content/notes/list', label: 'Note List', href: '/admin/notes' },
          { id: 'content/notes/notebooks', label: 'Notebooks', href: '/admin/notes/notebooks' },
          { id: 'content/notes/tags', label: 'Tags', href: '/admin/notes/tags' },
          { id: 'content/notes/themes', label: 'Themes', href: '/admin/notes/themes' },
          { id: 'content/notes/settings', label: 'Settings', href: '/admin/notes/settings' },
        ],
      },
      {
        id: 'content/cms',
        label: 'CMS',
        href: '/admin/cms',
        children: [
          { id: 'content/cms/pages', label: 'Pages', href: '/admin/cms/pages' },
          {
            id: 'content/cms/pages/create',
            label: 'Create Page',
            keywords: ['new page'],
            href: '/admin/cms/pages/create',
            onClick: (event: React.MouseEvent<HTMLAnchorElement>): void => {
              event.preventDefault();
              handlers.onCreatePageClick();
            },
          },
          { id: 'content/cms/builder', label: 'Page Builder', href: '/admin/cms/builder' },
          {
            id: 'content/cms/builder/settings',
            label: 'Builder Settings',
            href: '/admin/cms/builder/settings',
          },
          { id: 'content/cms/zones', label: 'Zones', href: '/admin/cms/zones' },
          { id: 'content/cms/slugs', label: 'Slugs', href: '/admin/cms/slugs' },
          { id: 'content/cms/slugs/create', label: 'Create Slug', href: '/admin/cms/slugs/create' },
          { id: 'content/cms/themes', label: 'Themes', href: '/admin/cms/themes' },
          {
            id: 'content/cms/themes/create',
            label: 'Create Theme',
            href: '/admin/cms/themes/create',
          },
        ],
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    href: '/admin/settings',
    icon: <SettingsIcon className='size-4' />,
    children: [
      {
        id: 'system/settings',
        label: 'Settings',
        href: '/admin/settings',
        children: [
          { id: 'system/settings/overview', label: 'Overview', href: '/admin/settings' },
          { id: 'system/settings/brain', label: 'Brain', href: '/admin/brain?tab=routing' },
          {
            id: 'system/settings/typography',
            label: 'Typography',
            href: '/admin/settings/typography',
          },
          {
            id: 'system/settings/notifications',
            label: 'Notifications',
            href: '/admin/settings/notifications',
          },
          {
            id: 'system/settings/playwright',
            label: 'Playwright Personas',
            href: '/admin/settings/playwright',
          },
          {
            id: 'system/settings/folder-trees',
            label: 'Folder Trees',
            href: '/admin/settings/folder-trees',
          },
          {
            id: 'system/settings/recovery',
            label: 'Transient Recovery',
            href: '/admin/settings/recovery',
          },
          { id: 'system/settings/sync', label: 'Background Sync', href: '/admin/settings/sync' },
          { id: 'system/settings/menu', label: 'Admin Menu', href: '/admin/settings/menu' },
        ],
      },
      {
        id: 'system/routes',
        label: 'Route Map',
        href: '/admin/routes',
        icon: <MapIcon className='size-4' />,
        keywords: ['routes', 'navigation', 'map'],
      },
      {
        id: 'system/analytics',
        label: 'Analytics',
        href: '/admin/system/analytics',
        icon: <BarChart3Icon className='size-4' />,
        keywords: ['page analytics', 'traffic', 'visitors', 'referrers'],
      },
      {
        id: 'system/ai-insights',
        label: 'AI Insights',
        href: '/admin/ai-insights',
        icon: <SparklesIcon className='size-4' />,
        keywords: ['ai insights', 'analytics', 'logs', 'warnings'],
      },
      {
        id: 'system/logs',
        label: 'System Logs',
        href: '/admin/system/logs',
        icon: <ActivityIcon className='size-4' />,
      },
      {
        id: 'system/auth',
        label: 'Auth',
        href: '/admin/auth',
        icon: <ShieldIcon className='size-4' />,
        children: [
          { id: 'system/auth/dashboard', label: 'Dashboard', href: '/admin/auth/dashboard' },
          { id: 'system/auth/users', label: 'Users', href: '/admin/auth/users' },
          {
            id: 'system/auth/login-activity',
            label: 'Login Activity',
            href: '/admin/auth/login-activity',
            keywords: ['logins', 'sign in', 'signed in', 'activity'],
          },
          { id: 'system/auth/permissions', label: 'Permissions', href: '/admin/auth/permissions' },
          { id: 'system/auth/settings', label: 'Settings', href: '/admin/auth/settings' },
          { id: 'system/auth/user-pages', label: 'User Pages', href: '/admin/auth/user-pages' },
        ],
      },
    ],
  },
];
