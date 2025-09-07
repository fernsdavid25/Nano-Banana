import React, { useState, KeyboardEvent } from 'react';
import { Send, Plus, Eye, EyeOff } from 'lucide-react';
import { Mode } from '../types';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  showCanvas: boolean;
  onToggleCanvas: () => void;
  hasMessages: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  isLoading,
  mode,
  onModeChange,
  showCanvas,
  onToggleCanvas,
  hasMessages
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-zinc-700 bg-zinc-900 p-4">
      {/* Mode Toggle and Canvas Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-zinc-400" />
          <button
            onClick={() => onModeChange('design')}
            className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${
              mode === 'design'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
          >
            Design
          </button>
          <button
            onClick={() => onModeChange('chat')}
            className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${
              mode === 'chat'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
          >
            Chat
          </button>
        </div>

        {mode === 'chat' && hasMessages && (
          <button
            onClick={onToggleCanvas}
            className="flex items-center gap-2 px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors duration-200"
          >
            {showCanvas ? (
              <>
                <EyeOff size={16} />
                <span className="text-sm">Hide Canvas</span>
              </>
            ) : (
              <>
                <Eye size={16} />
                <span className="text-sm">Show Canvas</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={mode === 'design' 
            ? "Describe the circuit you want to design..." 
            : "Ask questions about circuits and electronics..."
          }
          className="w-full bg-zinc-800 text-white placeholder-zinc-400 rounded-2xl px-4 py-3 pr-12 border border-zinc-700 focus:border-blue-500 focus:outline-none resize-none transition-colors duration-200"
          rows={1}
          style={{ minHeight: '48px', maxHeight: '120px' }}
          disabled={isLoading}
        />
        
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors duration-200"
        >
          <Send size={16} className="text-white ml-0.5" />
        </button>
      </div>

      {/* Status */}
      {isLoading && (
        <div className="mt-2 text-center">
          <span className="text-sm text-zinc-400">
            {mode === 'design' ? 'Generating circuit...' : 'Thinking...'}
          </span>
        </div>
      )}
    </div>
  );
};