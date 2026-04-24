import { Badge, SelectSimple } from '@/features/kangur/shared/ui';

export function QuestionEditorHeader({ copy, suiteTitle, pointValue, onPointValueChange }: { copy: any, suiteTitle: string, pointValue: number, onPointValueChange: (v: number) => void }) {
  return (
    <div className='flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border/60 bg-[linear-gradient(135deg,rgba(9,16,32,0.97),rgba(12,34,59,0.86))] p-5 shadow-[0_24px_70px_-36px_rgba(8,145,178,0.55)]'>
      <div className='max-w-2xl space-y-2'>
        <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80'>{copy.shell.eyebrow}</div>
        <div className='text-lg font-semibold text-white'>{copy.shell.title}</div>
        <div className='text-sm leading-6 text-slate-300'>{copy.shell.description}</div>
      </div>
      <div className='min-w-[148px] rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-3'>
        <div className='text-[11px] font-semibold uppercase tracking-wide text-cyan-100/80'>{copy.shell.pointValue}</div>
        <div className='mt-2'>
          <SelectSimple
            size='sm'
            value={String(pointValue)}
            onValueChange={(v) => { const n = parseInt(v, 10); if (Number.isFinite(n)) onPointValueChange(n); }}
            options={copy.pointValueOptions}
            triggerClassName='h-9'
          />
        </div>
      </div>
    </div>
  );
}
