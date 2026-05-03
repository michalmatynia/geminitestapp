import { FileTextIcon } from 'lucide-react';
import { Badge, CollapsibleSection } from '@/shared/ui/primitives.public';
import { FormSection, SearchInput } from '@/shared/ui/forms-and-actions.public';

export const AdditionalObjectsSection = ({
  groups,
  filteredGroups,
  groupQuery,
  setGroupQuery,
  expandedGroups,
  toggleGroup,
  groupIconMap,
}: {
  groups: any[];
  filteredGroups: any[];
  groupQuery: string;
  setGroupQuery: (v: string) => void;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (type: string) => void;
  groupIconMap: Record<string, React.ComponentType<{ className?: string }>>;
}) => {
  if (groups.length === 0) return null;

  return (
    <FormSection
      title='Additional Objects'
      description='Functions, views, and sequences'
      actions={
        <SearchInput
          size='sm'
          value={groupQuery}
          onChange={(e) => setGroupQuery(e.target.value)}
          onClear={() => setGroupQuery('')}
          placeholder='Search objects...'
          className='h-8 w-40'
        />
      }
      className='p-6'
    >
      <div className='grid gap-2 mt-4'>
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups[group.type] ?? false;
          const Icon = groupIconMap[group.type] ?? FileTextIcon;
          return (
            <CollapsibleSection
              key={group.type}
              open={isExpanded}
              onOpenChange={() => toggleGroup(group.type)}
              variant='card'
              className='bg-card/40'
              title={
                <div className='flex items-center gap-2 text-xs font-semibold text-gray-200'>
                  <Icon className='size-4 text-sky-300' />
                  {group.type}
                  <Badge variant='outline' className='text-[9px] bg-sky-500/5 ml-1'>
                    {group.objects.length}
                  </Badge>
                </div>
              }
            >
              <div className='p-3 bg-black/20'>
                <div className='flex flex-wrap gap-2'>
                  {group.objects.map((obj: string) => (
                    <span
                      key={obj}
                      className='font-mono text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5'
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            </CollapsibleSection>
          );
        })}
      </div>
    </FormSection>
  );
};
