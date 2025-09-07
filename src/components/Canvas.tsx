import React from 'react';
import { Download, RotateCcw, Image as ImageIcon } from 'lucide-react';

interface CanvasProps {
  currentImage: string | null;
  onClear: () => void;
  onDownload: () => void;
  isVisible: boolean;
}

export const Canvas: React.FC<CanvasProps> = ({
  currentImage,
  onClear,
  onDownload,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div className="flex-1 flex flex-col bg-zinc-800 relative">
      {/* Canvas Header */}
      <div className="bg-zinc-900 border-b border-zinc-700 px-6 py-4 flex items-center justify-between">
        <h2 className="text-white font-medium">Circuit Canvas</h2>
        
        {currentImage && (
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors duration-200"
            >
              <RotateCcw size={16} />
              <span className="text-sm">Clear</span>
            </button>
            
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors duration-200"
            >
              <Download size={16} />
              <span className="text-sm">Save</span>
            </button>
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-6 flex items-center justify-center">
        {currentImage ? (
          <div className="bg-white rounded-xl p-6 max-w-4xl max-h-full overflow-auto shadow-2xl">
            <img
              src={currentImage}
              alt="Generated Circuit Diagram"
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        ) : (
          <div className="bg-zinc-700 rounded-xl p-12 max-w-2xl text-center border-2 border-dashed border-zinc-600">
            <ImageIcon size={64} className="text-zinc-500 mx-auto mb-4" />
            <h3 className="text-white text-xl font-medium mb-2">Canvas Area</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Your circuit diagrams will appear here. Start by describing a circuit 
              in the input field below, and AI will generate a visual schematic for you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};