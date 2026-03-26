'use client';

import type {
  CSSProperties,
  KeyboardEventHandler,
  PointerEventHandler,
  ReactNode,
  RefObject,
} from 'react';

import {
  KangurDrawingFeedbackMessage,
  KangurDrawingInputHelpText,
} from '@/features/kangur/ui/components/drawing-engine/KangurDrawingBoardSupport';
import { KangurDrawingCanvasSurface } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingCanvasSurface';
import { KangurInfoCard } from '@/features/kangur/ui/design/primitives';
import type { KangurMiniGameInformationalFeedback } from '@/features/kangur/ui/types';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

type KangurDrawingPracticeBoardProps = {
  accent: KangurAccent;
  actionRow?: ReactNode;
  afterCanvas?: ReactNode;
  ariaDescribedBy?: string;
  ariaKeyShortcuts?: string;
  ariaLabel: string;
  beforeCanvas?: ReactNode;
  boardClassName?: string;
  boardDataTestId?: string;
  canvasClassName?: string;
  canvasDataTestId?: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasStyle?: CSSProperties;
  feedback?: KangurMiniGameInformationalFeedback | null;
  feedbackBeforeActions?: boolean;
  feedbackTestId?: string;
  height: number;
  helpId: string;
  helpTestId?: string;
  helpText: string;
  isCoarsePointer: boolean;
  isPointerDrawing: boolean;
  middleContent?: ReactNode;
  onKeyDown?: KeyboardEventHandler<HTMLCanvasElement>;
  onPointerCancel?: PointerEventHandler<HTMLCanvasElement>;
  onPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onPointerLeave?: PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onPointerUp: PointerEventHandler<HTMLCanvasElement>;
  role?: 'img';
  tabIndex?: number;
  width: number;
};

export function KangurDrawingPracticeBoard({
  accent,
  actionRow,
  afterCanvas,
  ariaDescribedBy,
  ariaKeyShortcuts,
  ariaLabel,
  beforeCanvas,
  boardClassName,
  boardDataTestId,
  canvasClassName = 'w-full rounded-[20px]',
  canvasDataTestId,
  canvasRef,
  canvasStyle,
  feedback,
  feedbackBeforeActions = false,
  feedbackTestId,
  height,
  helpId,
  helpTestId,
  helpText,
  isCoarsePointer,
  isPointerDrawing,
  middleContent,
  onKeyDown,
  onPointerCancel,
  onPointerDown,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  role = 'img',
  tabIndex = 0,
  width,
}: KangurDrawingPracticeBoardProps): React.JSX.Element {
  const feedbackNode = feedback ? (
    <KangurDrawingFeedbackMessage feedback={feedback} testId={feedbackTestId} />
  ) : null;

  return (
    <>
      <KangurInfoCard
        accent={accent}
        className={boardClassName}
        data-testid={boardDataTestId}
        padding='sm'
        tone={feedback ? 'accent' : 'neutral'}
      >
        <KangurDrawingCanvasSurface
          afterCanvas={afterCanvas}
          ariaDescribedBy={ariaDescribedBy}
          ariaKeyShortcuts={ariaKeyShortcuts}
          ariaLabel={ariaLabel}
          beforeCanvas={beforeCanvas}
          canvasClassName={canvasClassName}
          canvasDataTestId={canvasDataTestId}
          canvasRef={canvasRef}
          canvasStyle={canvasStyle}
          height={height}
          isPointerDrawing={isPointerDrawing}
          onKeyDown={onKeyDown}
          onPointerCancel={onPointerCancel}
          onPointerDown={onPointerDown}
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          role={role}
          tabIndex={tabIndex}
          width={width}
        />
      </KangurInfoCard>
      <KangurDrawingInputHelpText
        id={helpId}
        isCoarsePointer={isCoarsePointer}
        testId={helpTestId}
      >
        {helpText}
      </KangurDrawingInputHelpText>
      {middleContent}
      {feedbackBeforeActions ? feedbackNode : null}
      {actionRow}
      {feedbackBeforeActions ? null : feedbackNode}
    </>
  );
}
