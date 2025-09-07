import React, { useState } from 'react';
import { Download, RotateCcw, Zap, Pen, X } from 'lucide-react';

interface CanvasProps {
  currentImage: string | null;
  onClear: () => void;
  onDownload: () => void;
  isVisible: boolean;
  className?: string;
}

export const Canvas: React.FC<CanvasProps> = ({
  currentImage,
  onClear,
  onDownload,
  isVisible,
  className
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debug logging for image display
  React.useEffect(() => {
    console.log('Canvas currentImage updated:', {
      hasImage: !!currentImage,
      imageLength: currentImage ? currentImage.length : 0,
      imagePrefix: currentImage ? currentImage.substring(0, 50) : null,
      isDataURL: currentImage ? currentImage.startsWith('data:') : false
    });
  }, [currentImage]);

  const handleSelectClick = () => {
    if (currentImage) {
      setIsModalOpen(true);
    }
  };

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
            <img
              src={currentImage}
              alt="Generated Circuit Diagram"
              className="max-w-full h-auto rounded-xl"
              onLoad={() => console.log('Image loaded successfully')}
              onError={(e) => {
                console.error('Image failed to load:', e);
                console.error('Image src:', currentImage?.substring(0, 100));
              }}
            />
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
            <div className="bg-zinc-900 p-6 rounded-b-xl">
              <div className="flex justify-center">
                <img
                  src={currentImage!}
                  alt="Circuit Diagram Preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};