'use client';



type GraphModelDebugPanelProps = {
  payload: unknown;
};

export function GraphModelDebugPanel({
  payload,
}: GraphModelDebugPanelProps): React.JSX.Element {
  return (
    <div className='rounded-lg border border-border bg-card/60 p-4'>
      <div className='mb-2 text-sm font-semibold text-white'>Graph Model Debug</div>
      {payload ? (
        <pre className='max-h-60 overflow-auto rounded-md border border-border bg-card/70 p-3 text-[11px] text-gray-300 whitespace-pre-wrap'>
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : (
        <div className='text-[11px] text-gray-500'>
          Run a model node to capture the latest payload.
        </div>
      )}
    </div>
  );
}
