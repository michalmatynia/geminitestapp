export function NarrationScriptPreview({ script }: { script: any }) {
  return (
    <div className='rounded-2xl border border-border/60 bg-background/60 p-4'>
      <div className='text-sm font-semibold text-foreground'>Narration script</div>
      <div className='mt-4 space-y-3'>
        {script.segments.map((segment: any, index: number) => (
          <article key={segment.id} className='rounded-2xl border border-border/60 bg-card/30 p-3'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
              Segment {index + 1}
            </div>
            <div className='mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground'>{segment.text}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
