export function ProgressBlock({ settings }: { settings: Record<string, unknown> }) {
  const value = typeof settings['progressValue'] === 'number' ? settings['progressValue'] : 0;
  const max = typeof settings['progressMax'] === 'number' && settings['progressMax'] > 0 ? settings['progressMax'] : 100;
  const height = typeof settings['progressHeight'] === 'number' && settings['progressHeight'] > 0 ? settings['progressHeight'] : 12;
  const fillColor = typeof settings['fillColor'] === 'string' ? settings['fillColor'] : '#6366f1';
  const trackColor = typeof settings['trackColor'] === 'string' ? settings['trackColor'] : '#e2e8f0';
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className='w-full space-y-2'>
      <div className='w-full overflow-hidden' style={{ backgroundColor: trackColor, borderRadius: '999px', height: `${height}px` }}>
        <div className='h-full transition-[width] duration-300 ease-out' style={{ backgroundColor: fillColor, borderRadius: '999px', width: `${percent}%` }} />
      </div>
    </div>
  );
}
