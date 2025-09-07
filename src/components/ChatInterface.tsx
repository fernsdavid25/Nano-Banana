import React, { useState, KeyboardEvent } from 'react';
import { Send, Plus } from 'lucide-react';
import { Mode } from '../types';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  isLoading,
  mode,
  onModeChange
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
    <div className="bg-zinc-900 p-6">
      {/* Input Area */}
      <div className="relative max-w-4xl mx-auto">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={mode === 'design' 
            ? "Describe the circuit you want to design..." 
            : "Ask questions about circuits and electronics..."
          }
          className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-2xl px-6 py-4 pr-32 border border-zinc-700 focus:border-blue-500 focus:outline-none resize-none transition-colors duration-200 text-base"
          rows={1}
          style={{ minHeight: '56px', maxHeight: '120px' }}
          disabled={isLoading}
        />
        
        {/* Mode Toggle and Send Button */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-700 rounded-full p-1">
            <Plus size={14} className="text-zinc-400 ml-2" />
            <button
              onClick={() => onModeChange('design')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === 'design'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Design
            </button>
            <button
              onClick={() => onModeChange('chat')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === 'chat'
                  ? 'bg-zinc-600 text-white shadow-lg'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Chat
            </button>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors duration-200 ml-2"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Status */}
      {isLoading && (
        <div className="mt-3 text-center">
          <span className="text-sm text-zinc-400">
            {mode === 'design' ? 'Generating circuit...' : 'Thinking...'}
          </span>
        </div>
      )}
    </div>
  );
};