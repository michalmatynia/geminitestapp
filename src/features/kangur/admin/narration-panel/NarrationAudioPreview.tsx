import { buildInlineVttTrackSrc } from '@/features/kangur/tts/captions';

export function NarrationAudioPreview({ response, script }: { response: any; script: any }) {
  if (!response?.segments) return null;

  return (
    <div className='rounded-2xl border border-border/60 bg-background/60 p-4'>
      <div className='text-sm font-semibold text-foreground'>Audio preview</div>
      <div className='mt-4 space-y-3'>
        {response.segments.map((segment: any, index: number) => (
          <article key={segment.id} className='rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3'>
            <div className='text-[11px] font-semibold text-emerald-300'>Audio segment {index + 1}</div>
            <audio controls src={segment.audioUrl} className='mt-3 w-full'>
              <track default kind='captions' src={buildInlineVttTrackSrc(segment.text)} srcLang={script.locale} />
            </audio>
          </article>
        ))}
      </div>
    </div>
  );
}
