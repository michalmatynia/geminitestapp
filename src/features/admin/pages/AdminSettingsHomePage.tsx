import {
  BellIcon,
  ArrowRightIcon,
  Brain,
  Activity,
  Clapperboard,
  MonitorPlay,
  RefreshCcw,
  Search,
  Type,
  Palette,
  Folder,
  FileText,
  HardDrive,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/shared/ui/primitives.public';
import { NavigationCard, NavigationCardGrid, SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

type SettingsOption = {
  id: string;
  href: string;
  icon: typeof BellIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
};

const settings: SettingsOption[] = [
  {
    id: 'notifications',
    href: '/admin/settings/notifications',
    icon: BellIcon,
    title: 'Notifications',
    description: 'Manage toast position, accent color, and preview behavior.',
    color: 'emerald',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'typography',
    href: '/admin/settings/typography',
    icon: Type,
    title: 'Typography',
    description: 'Choose which local font set the admin uses.',
    color: 'emerald',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'menu',
    href: '/admin/settings/menu',
    icon: Palette,
    title: 'Admin Menu',
    description: 'Pin favorites and color-code sections in the sidebar.',
    color: 'cyan',
    bgColor: 'bg-cyan-500/10',
  },
  {
    id: 'brain',
    href: '/admin/brain?tab=routing',
    icon: Brain,
    title: 'Brain',
    description:
      'Unified AI center: provider keys, model routing, prompts, schedules, and metrics.',
    color: 'emerald',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'folder-trees',
    href: '/admin/settings/folder-trees',
    icon: Folder,
    title: 'Folder Trees',
    description: 'Configure tree placeholders, nesting rules, and icons per instance.',
    color: 'blue',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'text-editors',
    href: '/admin/settings/text-editors',
    icon: FileText,
    title: 'Text Editors',
    description: 'Configure reusable editor-engine instances and toolbar capabilities.',
    color: 'blue',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'playwright',
    href: '/admin/settings/playwright',
    icon: MonitorPlay,
    title: 'Playwright Personas',
    description: 'Create reusable browser automation profiles.',
    color: 'orange',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'playwright-ai',
    href: '/admin/settings/playwright-ai',
    icon: Brain,
    title: 'Playwright AI',
    description: 'AI model routing for step sequencer evaluation and live scripter probe suggestions.',
    color: 'fuchsia',
    bgColor: 'bg-fuchsia-500/10',
  },
  {
    id: 'playwright-step-sequencer',
    href: '/admin/playwright/step-sequencer',
    icon: Clapperboard,
    title: 'Step Sequencer',
    description: 'Build and manage Playwright steps, step sets, and named action sequences.',
    color: 'orange',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'scanner',
    href: '/admin/settings/scanner',
    icon: Search,
    title: 'Scanner',
    description: 'Configure the global Playwright runtime used by product image scans.',
    color: 'orange',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'recovery',
    href: '/admin/settings/recovery',
    icon: Activity,
    title: 'Transient Recovery',
    description: 'Control retry and circuit-breaker thresholds.',
    color: 'cyan',
    bgColor: 'bg-cyan-500/10',
  },
  {
    id: 'sync',
    href: '/admin/settings/sync',
    icon: RefreshCcw,
    title: 'Background Sync',
    description: 'Schedule background sync and manage offline mutations.',
    color: 'blue',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'storage',
    href: '/admin/settings/storage',
    icon: HardDrive,
    title: 'File Storage',
    description: 'Switch file source between local uploads and FastComet.',
    color: 'cyan',
    bgColor: 'bg-cyan-500/10',
  },
];

const colorClasses: Record<string, { border: string; text: string }> = {
  emerald: {
    border: 'group-hover:border-emerald-500/50',
    text: 'text-emerald-400',
  },
  blue: {
    border: 'group-hover:border-blue-500/50',
    text: 'text-blue-400',
  },
  amber: {
    border: 'group-hover:border-amber-500/50',
    text: 'text-amber-400',
  },
  violet: {
    border: 'group-hover:border-violet-500/50',
    text: 'text-violet-400',
  },
  cyan: {
    border: 'group-hover:border-cyan-500/50',
    text: 'text-cyan-400',
  },
  orange: {
    border: 'group-hover:border-orange-500/50',
    text: 'text-orange-400',
  },
};

export function AdminSettingsHomePage(): React.ReactNode {
  return (
    <div className='page-section'>
      {/* Header */}
      <SectionHeader
        title='Settings'
        description='Customize your application preferences and configuration.'
        className='mb-8'
      />

      {/* Settings Grid */}
      <NavigationCardGrid className='md:grid-cols-2'>
        {settings.map((setting: SettingsOption) => {
          const Icon = setting.icon;
          const colors = colorClasses[setting['color']] || colorClasses['emerald']!;

          return (
            <NavigationCard
              key={setting.id}
              href={setting.href}
              linkClassName='group'
              className={`group relative border-border bg-card transition-all duration-300 hover:border hover:bg-muted/50 ${colors.border}`}
              padding='none'
              contentClassName='p-6'
              leading={
                <div
                  className={`flex size-12 items-center justify-center rounded-lg ${setting.bgColor} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className={`size-6 ${colors.text}`} />
                </div>
              }
              title={setting.title}
              description={setting.description}
              titleClassName='transition-colors group-hover:text-gray-100'
              descriptionClassName='group-hover:text-gray-300'
              trailing={
                <ArrowRightIcon className='mt-1 size-4 text-gray-600 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-gray-400' />
              }
            />
          );
        })}
      </NavigationCardGrid>

      {/* Help Section */}
      <FormSection title='Need Help?' className='mt-8'>
        <p className='text-sm text-gray-400'>
          Each setting section contains detailed explanations and preview options to help you
          customize your preferences.
        </p>
        <div className='mt-4 flex gap-2'>
          <Button variant='outline' size='sm' asChild>
            <Link href='/admin'>Back to Admin</Link>
          </Button>
        </div>
      </FormSection>
    </div>
  );
}
