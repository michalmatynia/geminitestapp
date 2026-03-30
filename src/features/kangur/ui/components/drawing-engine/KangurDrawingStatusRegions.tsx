'use client';

type KangurDrawingStatusRegionsProps = {
  keyboardStatus: string;
  keyboardStatusTestId: string;
  liveMessage?: string;
};

export function KangurDrawingStatusRegions({
  keyboardStatus,
  keyboardStatusTestId,
  liveMessage,
}: KangurDrawingStatusRegionsProps): React.JSX.Element {
  return (
    <>
      {liveMessage ? (
        <div aria-atomic='true' aria-live='polite' className='sr-only'>
          {liveMessage}
        </div>
      ) : null}
      <div
        aria-atomic='true'
        aria-live='polite'
        className='sr-only'
        data-testid={keyboardStatusTestId}
      >
        {keyboardStatus}
      </div>
    </>
  );
}
