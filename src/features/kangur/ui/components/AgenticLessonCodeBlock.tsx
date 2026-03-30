import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

type AccentStyle = {
  border: string;
  title: string;
  caption: string;
};

const ACCENT_STYLES: Record<KangurAccent, AccentStyle> = {
  indigo: {
    border: 'border-indigo-900/70',
    title: 'text-indigo-200',
    caption: 'text-indigo-100',
  },
  violet: {
    border: 'border-violet-900/70',
    title: 'text-violet-200',
    caption: 'text-violet-100',
  },
  emerald: {
    border: 'border-emerald-900/70',
    title: 'text-emerald-200',
    caption: 'text-emerald-100',
  },
  sky: {
    border: 'border-sky-900/70',
    title: 'text-sky-200',
    caption: 'text-sky-100',
  },
  amber: {
    border: 'border-amber-900/70',
    title: 'text-amber-200',
    caption: 'text-amber-100',
  },
  rose: {
    border: 'border-rose-900/70',
    title: 'text-rose-200',
    caption: 'text-rose-100',
  },
  teal: {
    border: 'border-teal-900/70',
    title: 'text-teal-200',
    caption: 'text-teal-100',
  },
  slate: {
    border: 'border-slate-900/70',
    title: 'text-slate-200',
    caption: 'text-slate-100',
  },
};

type AgenticLessonCodeBlockProps = {
  accent?: KangurAccent;
  title?: string;
  code: string;
  caption?: string;
  className?: string;
};

export default function AgenticLessonCodeBlock({
  accent = 'slate',
  title,
  code,
  caption,
  className,
}: AgenticLessonCodeBlockProps): JSX.Element {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        'soft-card kangur-lesson-inset w-full border kangur-card-padding-sm shadow-[0_16px_32px_-28px_rgba(15,23,42,0.28)] [color:var(--kangur-page-text)]',
        styles.border,
        'bg-slate-950 text-slate-100',
        className
      )}
    >
      {title ? (
        <div className={cn('text-[11px] font-semibold uppercase tracking-[0.2em]', styles.title)}>
          {title}
        </div>
      ) : null}
      <pre className='mt-2 whitespace-pre-wrap text-xs leading-relaxed'>
        <code>{code}</code>
      </pre>
      {caption ? (
        <p className={cn('mt-3 text-xs text-sm [color:var(--kangur-page-muted-text)]', styles.caption)}>
          {caption}
        </p>
      ) : null}
    </div>
  );
}
