export function PreviewCanvas({ canvasRef, previewWidthClass, previewFrameClass, isInspecting, styles, children }: any) {
  return (
    <div
      data-cms-canvas='true'
      ref={canvasRef}
      className={`relative mx-auto ${previewWidthClass} ${previewFrameClass} ${isInspecting ? 'cursor-crosshair' : ''}`}
      style={styles}
    >
      {children}
    </div>
  );
}
