import React, { useEffect, useRef, useState } from 'react';
import { Download, RotateCcw, Zap, Pen, X, Undo2, Redo2 } from 'lucide-react';

interface CanvasProps {
  currentImage: string | null;
  onClear: () => void;
  onDownload: () => void;
  isVisible: boolean;
  className?: string;
  onApplySelection?: (dataUrl: string) => void; // returns painted overlay PNG data URL
  overlayPreviewDataUrl?: string | null; // persisted overlay from parent
}

export const Canvas: React.FC<CanvasProps> = ({
  currentImage,
  onClear,
  onDownload,
  isVisible,
  className,
  onApplySelection,
  overlayPreviewDataUrl: overlayFromParent
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [brushSize, setBrushSize] = useState(16);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [imgNatural, setImgNatural] = useState<{w:number; h:number}>({w:0,h:0});
  // Local overlay preview fallback; parent-provided overlay (overlayFromParent) takes precedence
  const [overlayPreviewDataUrl, setOverlayPreviewDataUrl] = useState<string | null>(null);

  // Undo/Redo stacks (store ImageData for both visible overlay and hidden natural canvas)
  const undoStack = useRef<Array<{ overlay: ImageData; hidden: ImageData }>>([]);
  const redoStack = useRef<Array<{ overlay: ImageData; hidden: ImageData }>>([]);
  // A simple tick to force re-render when stack sizes change (so buttons enable/disable correctly)
  const [historyTick, setHistoryTick] = useState(0);
  const bumpHistory = () => setHistoryTick((t) => t + 1);

  // Refs for drawing
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null); // display size
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(document.createElement('canvas')); // natural size
  const lastPointRef = useRef<{x:number; y:number} | null>(null);

  // Debug logging for image display
  useEffect(() => {
    console.log('Canvas currentImage updated:', {
      hasImage: !!currentImage,
      imageLength: currentImage ? currentImage.length : 0,
      imagePrefix: currentImage ? currentImage.substring(0, 50) : null,
      isDataURL: currentImage ? currentImage.startsWith('data:') : false
    });
    // Parent controls persistence; do not forcibly clear local overlay here
  }, [currentImage]);

  const handleSelectClick = () => {
    if (currentImage) {
      setIsModalOpen(true);
      requestAnimationFrame(syncCanvasSizes);
    }
  };

  const handleImageLoaded = (img: HTMLImageElement) => {
    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    requestAnimationFrame(syncCanvasSizes);
  };

  const syncCanvasSizes = () => {
    const img = previewImgRef.current;
    const overlay = overlayCanvasRef.current;
    const hidden = hiddenCanvasRef.current;
    if (!img || !overlay || !hidden) return;

    const rect = img.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Size overlay canvas to match displayed image pixels
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.width = Math.max(1, Math.floor(rect.width * dpr));
    overlay.height = Math.max(1, Math.floor(rect.height * dpr));
    const octx = overlay.getContext('2d');
    if (octx) octx.clearRect(0, 0, overlay.width, overlay.height);

    // Hidden canvas at natural resolution for precise backend alignment
    const natW = img.naturalWidth || imgNatural.w || Math.max(1, Math.floor(rect.width * dpr));
    const natH = img.naturalHeight || imgNatural.h || Math.max(1, Math.floor(rect.height * dpr));
    hidden.width = natW;
    hidden.height = natH;
    const hctx = hidden.getContext('2d');
    if (hctx) hctx.clearRect(0, 0, natW, natH);

    // Resizing invalidates image data snapshots; reset stacks
    undoStack.current = [];
    redoStack.current = [];
    bumpHistory();
  };

  const snapshotState = () => {
    const overlay = overlayCanvasRef.current;
    const hidden = hiddenCanvasRef.current;
    if (!overlay || !hidden) return;
    const octx = overlay.getContext('2d');
    const hctx = hidden.getContext('2d');
    if (!octx || !hctx) return;
    try {
      const oData = octx.getImageData(0, 0, overlay.width, overlay.height);
      const hData = hctx.getImageData(0, 0, hidden.width, hidden.height);
      undoStack.current.push({ overlay: oData, hidden: hData });
      // new action clears redo history
      redoStack.current = [];
      bumpHistory();
    } catch (e) {
      console.warn('Snapshot failed', e);
    }
  };

  const restoreState = (state: { overlay: ImageData; hidden: ImageData } | undefined) => {
    if (!state) return;
    const overlay = overlayCanvasRef.current;
    const hidden = hiddenCanvasRef.current;
    if (!overlay || !hidden) return;
    const octx = overlay.getContext('2d');
    const hctx = hidden.getContext('2d');
    if (!octx || !hctx) return;
    octx.putImageData(state.overlay, 0, 0);
    hctx.putImageData(state.hidden, 0, 0);
  };

  const handleUndo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    // Push current to redo before restoring previous
    const overlay = overlayCanvasRef.current!;
    const hidden = hiddenCanvasRef.current!;
    const octx = overlay.getContext('2d')!;
    const hctx = hidden.getContext('2d')!;
    const cur = {
      overlay: octx.getImageData(0, 0, overlay.width, overlay.height),
      hidden: hctx.getImageData(0, 0, hidden.width, hidden.height),
    };
    redoStack.current.push(cur);
    restoreState(prev);
    bumpHistory();
  };

  const handleRedo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    // Push current to undo before restoring next
    const overlay = overlayCanvasRef.current!;
    const hidden = hiddenCanvasRef.current!;
    const octx = overlay.getContext('2d')!;
    const hctx = hidden.getContext('2d')!;
    const cur = {
      overlay: octx.getImageData(0, 0, overlay.width, overlay.height),
      hidden: hctx.getImageData(0, 0, hidden.width, hidden.height),
    };
    undoStack.current.push(cur);
    restoreState(next);
    bumpHistory();
  };

  const getOverlayPoint = (clientX: number, clientY: number) => {
    const overlay = overlayCanvasRef.current!;
    const rect = overlay.getBoundingClientRect();
    const scaleX = overlay.width / rect.width;
    const scaleY = overlay.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      rect,
    };
  };

  const getHiddenPoint = (rect: DOMRect, clientX: number, clientY: number) => {
    const hidden = hiddenCanvasRef.current!;
    const scaleX = hidden.width / rect.width;
    const scaleY = hidden.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!overlayCanvasRef.current) return;
    // Take a snapshot before mutating for undo
    snapshotState();
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    setIsDrawing(true);
    lastPointRef.current = { cx: e.clientX, cy: e.clientY } as any;

    const overlay = overlayCanvasRef.current;
    const octx = overlay!.getContext('2d')!;
    const { x, y, rect } = getOverlayPoint(e.clientX, e.clientY);
    const hiddenPt = getHiddenPoint(rect, e.clientX, e.clientY);
    const hidden = hiddenCanvasRef.current!;
    const hctx = hidden.getContext('2d')!;

    // Draw a starting dot
    const dpr = window.devicePixelRatio || 1;
    octx.fillStyle = brushColor;
    octx.beginPath();
    octx.arc(x, y, (brushSize * dpr) / 2, 0, Math.PI * 2);
    octx.fill();

    const hiddenScale = hidden.width / rect.width;
    hctx.fillStyle = brushColor;
    hctx.beginPath();
    hctx.arc(hiddenPt.x, hiddenPt.y, (brushSize * hiddenScale) / 2, 0, Math.PI * 2);
    hctx.fill();
  };

  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !overlayCanvasRef.current || !lastPointRef.current) return;
    const overlay = overlayCanvasRef.current;
    const hidden = hiddenCanvasRef.current!;
    const octx = overlay.getContext('2d')!;
    const hctx = hidden.getContext('2d')!;

    const prev = lastPointRef.current as any as { cx: number; cy: number };
    const prevOverlayPt = getOverlayPoint(prev.cx, prev.cy);
    const prevHiddenPt = getHiddenPoint(prevOverlayPt.rect, prev.cx, prev.cy);

    const curOverlayPt = getOverlayPoint(e.clientX, e.clientY);
    const curHiddenPt = getHiddenPoint(curOverlayPt.rect, e.clientX, e.clientY);

    const dpr = window.devicePixelRatio || 1;
    octx.strokeStyle = brushColor;
    octx.lineWidth = brushSize * dpr;
    octx.lineCap = 'round';
    octx.lineJoin = 'round';
    octx.beginPath();
    octx.moveTo(prevOverlayPt.x, prevOverlayPt.y);
    octx.lineTo(curOverlayPt.x, curOverlayPt.y);
    octx.stroke();

    const hiddenScale = hidden.width / curOverlayPt.rect.width;
    hctx.strokeStyle = brushColor;
    hctx.lineWidth = brushSize * hiddenScale;
    hctx.lineCap = 'round';
    hctx.lineJoin = 'round';
    hctx.beginPath();
    hctx.moveTo(prevHiddenPt.x, prevHiddenPt.y);
    hctx.lineTo(curHiddenPt.x, curHiddenPt.y);
    hctx.stroke();

    lastPointRef.current = { cx: e.clientX, cy: e.clientY } as any;
  };

  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    lastPointRef.current = null as any;
    try {
      (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const clearOverlay = () => {
    // snapshot for undo
    snapshotState();
    const overlay = overlayCanvasRef.current;
    const hidden = hiddenCanvasRef.current;
    if (overlay) overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
    if (hidden) hidden.getContext('2d')?.clearRect(0, 0, hidden.width, hidden.height);
    bumpHistory();
  };

  const applySelection = () => {
    if (!onApplySelection || !hiddenCanvasRef.current) return;
    try {
      const dataUrl = hiddenCanvasRef.current.toDataURL('image/png');
      // Show overlay preview on the main canvas
      setOverlayPreviewDataUrl(dataUrl);
      // Send overlay upstream for backend usage
      onApplySelection(dataUrl);
      setIsModalOpen(false);
      // After applying, maintain undo/redo state in case user reopens and continues editing later
    } catch (e) {
      console.error('Failed to export painted overlay', e);
    }
  };

  // Keyboard shortcuts for undo/redo while modal is open
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen]);

  if (!isVisible) return null;

  return (
    <div className={`${className || ''} flex flex-col bg-zinc-800 relative h-full`}>
      {/* Canvas Area */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative overflow-auto">
        {currentImage ? (
          <div className="bg-zinc-800 rounded-2xl p-6 max-w-full max-h-full overflow-auto shadow-2xl relative">
            {/* Action buttons positioned over the image */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button
                onClick={onClear}
                title="Clear Canvas"
                className="p-2 bg-zinc-800/90 hover:bg-zinc-700/90 text-white rounded-lg transition-colors duration-200 backdrop-blur-sm"
              >
                <RotateCcw size={16} />
              </button>
              
              <button
                onClick={handleSelectClick}
                title="Selective Edit"
                className="p-2 bg-zinc-800/90 hover:bg-zinc-700/90 text-white rounded-lg transition-colors duration-200 backdrop-blur-sm"
              >
                <Pen size={16} />
              </button>
              
              <button
                onClick={onDownload}
                title="Save Image"
                className="p-2 bg-blue-500/90 hover:bg-blue-500/90 text-white rounded-lg transition-colors duration-200 backdrop-blur-sm"
              >
                <Download size={16} />
              </button>
            </div>
            <div className="grid place-items-center">
              <img
                src={currentImage}
                alt="Generated Circuit Diagram"
                className="col-start-1 row-start-1 max-w-full h-auto rounded-xl"
                onLoad={() => console.log('Image loaded successfully')}
                onError={(e) => {
                  console.error('Image failed to load:', e);
                  console.error('Image src:', currentImage?.substring(0, 100));
                }}
              />
              {(overlayFromParent || overlayPreviewDataUrl) && (
                <img
                  src={overlayFromParent || overlayPreviewDataUrl!}
                  alt="Selection Overlay"
                  className="col-start-1 row-start-1 max-w-full h-auto rounded-xl pointer-events-none opacity-90"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white/5 rounded-2xl p-12 max-w-2xl text-center border-2 border-dashed border-zinc-600">
            <Zap size={64} className="text-zinc-500 mx-auto mb-4" />
            <h3 className="text-white text-xl font-medium mb-2">Circuit Canvas</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Your circuit diagrams will appear here. Start by describing a circuit 
              in Design mode, and AI will generate a visual schematic for you.
            </p>
          </div>
        )}
      </div>

      {/* Selection Preview Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative z-10 max-w-4xl max-h-[90vh] w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-t-xl border-b border-zinc-700">
              <h3 className="text-white text-lg font-semibold">Selective Edit</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
                title="Close preview"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Image Content */}
            <div className="bg-zinc-900 p-4 rounded-b-xl">
              {/* Controls */}
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-zinc-300">Brush</label>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="h-8 w-8 rounded-full bg-transparent cursor-pointer "
                    aria-label="Brush color"
                  />
                  <input
                    type="range"
                    min={2}
                    max={64}
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-40"
                    aria-label="Brush size"
                  />
                  <span className="text-xs text-zinc-400 w-8">{brushSize}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUndo}
                    className="px-3 py-1 text-sm rounded-md bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-50"
                    disabled={undoStack.current.length === 0}
                    title="Undo (Ctrl+Z)"
                  >
                    <span className="inline-flex items-center gap-1"><Undo2 size={16}/> Undo</span>
                  </button>
                  <button
                    onClick={handleRedo}
                    className="px-3 py-1 text-sm rounded-md bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-50"
                    disabled={redoStack.current.length === 0}
                    title="Redo (Ctrl+Y or Shift+Ctrl+Z)"
                  >
                    <span className="inline-flex items-center gap-1"><Redo2 size={16}/> Redo</span>
                  </button>
                  <button
                    onClick={clearOverlay}
                    className="px-3 py-1 text-sm rounded-md bg-zinc-800 hover:bg-zinc-700 text-white"
                  >
                    Clear
                  </button>
                  <button
                    onClick={applySelection}
                    className="px-3 py-1 text-sm rounded-md bg-blue-500 hover:bg-blue-500 text-white"
                  >
                    Apply Selection
                  </button>
                </div>
              </div>

              <div className="relative flex justify-center">
                {/* Preview image */}
                <img
                  ref={previewImgRef}
                  src={currentImage!}
                  alt="Circuit Diagram Preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg select-none"
                  onLoad={(e) => handleImageLoaded(e.currentTarget)}
                />
                {/* Drawing overlay */}
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 m-auto touch-none cursor-crosshair"
                  style={{maxWidth: '100%', maxHeight: '70vh'}}
                  onPointerDown={startDraw}
                  onPointerMove={drawMove}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};