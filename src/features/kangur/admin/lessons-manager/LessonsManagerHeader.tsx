import { Badge, SelectSimple } from '@/features/kangur/shared/ui';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_AGE_GROUPS } from '@/features/kangur/lessons/lesson-catalog-metadata';

export function LessonsManagerHeader({ state, onNewLesson }: { state: any; onNewLesson: () => void }) {
  return (
    <div className='flex items-center gap-3'>
      <SelectSimple
        value={state.contentLocale}
        onChange={(v) => state.setContentLocale(v)}
        options={state.contentLocaleOptions}
        className='w-40'
      />
      <Badge variant='outline'>{state.contentLocaleLabel}</Badge>
      <SelectSimple
        value={state.ageGroupFilter}
        onChange={(v) => state.setAgeGroupFilter(v)}
        options={[{ value: 'all', label: 'All Ages' }, ...KANGUR_AGE_GROUPS.map(g => ({ value: g.id, label: g.label }))]}
        className='w-40'
      />
      <KangurButton variant='primary' onClick={onNewLesson}>New lesson</KangurButton>
    </div>
  );
}
