import React, { useState, KeyboardEvent, useEffect, useRef } from 'react';
import { SendHorizontal, Plus, Sparkles } from 'lucide-react';
import { Mode } from '../types';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onAttachImage: (file: File) => void;
  onEnhancePrompt?: (prompt: string) => Promise<string>;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  isLoading,
  mode,
  onModeChange,
  onAttachImage,
  onEnhancePrompt
}) => {
  const [input, setInput] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const [controlsHeight, setControlsHeight] = useState<number>(0);

  // Auto-resize up to 3 lines, then scroll
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    const LINE_HEIGHT = 24; // px (approx for text-base)
    const PADDING_TOP = 16; // pt-4
    const PADDING_BOTTOM = 96; // pb-24 (extra space for controls)
    const MAX_HEIGHT = PADDING_TOP + PADDING_BOTTOM + LINE_HEIGHT * 3;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  };

  useEffect(() => {
    // measure controls height for dynamic padding
    const measure = () => {
      const h = controlsRef.current?.offsetHeight || 0;
      setControlsHeight(h);
      // also re-adjust text height since padding changes effective scroll height
      requestAnimationFrame(adjustHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    adjustHeight();
    return () => window.removeEventListener('resize', measure);
  }, []);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
      // Reset height after clearing
      requestAnimationFrame(adjustHeight);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEnhancePrompt = async () => {
    if (!input.trim() || !onEnhancePrompt || isEnhancing || isLoading) return;
    
    setIsEnhancing(true);
    try {
      const enhanced = await onEnhancePrompt(input.trim());
      setInput(enhanced);
      requestAnimationFrame(adjustHeight);
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="bg-zinc-900 p-6">
      {/* Input Area */}
      <div className="relative max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // Defer to next frame to ensure scrollHeight is accurate
            requestAnimationFrame(adjustHeight);
          }}
          onKeyPress={handleKeyPress}
          placeholder={"Type Here..."}
          className="w-full bg-zinc-800 text-white placeholder-zinc-400 rounded-2xl pt-4 pr-14 pl-12 border border-zinc-400 focus:border-blue-500 focus:outline-none resize-none transition-colors duration-200 text-base leading-6"
          rows={1}
          style={{ minHeight: '80px', maxHeight: '208px', paddingBottom: Math.max(controlsHeight + 16, 64) }}
          disabled={isLoading}
        />

        {/* Bottom-left controls */}
        <div ref={controlsRef} className="pointer-events-auto absolute left-4 bottom-3 flex items-center gap-3">
          {/* Hidden file input for images */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const allowed = [
                'image/png',
                'image/jpeg',
                'image/webp',
                'image/heic',
                'image/heif',
              ];
              if (!allowed.includes(file.type)) {
                // Silently ignore or provide minimal feedback
                e.currentTarget.value = '';
                return;
              }
              onAttachImage(file);
              // reset to allow selecting the same file again later
              e.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Attach image"
          >
            <Plus size={18} className="text-white/90" />
          </button>
          <div className="flex items-center gap-2">
            {/* Prompt Enhancement Button */}
            {onEnhancePrompt && input.trim() && (
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || isLoading}
                className="p-1 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Enhance prompt with AI"
              >
                <Sparkles size={16} className={`${isEnhancing ? 'animate-pulse text-yellow-400' : 'text-white/90'}`} />
              </button>
            )}
            <button
              onClick={() => onModeChange(mode === 'design' ? 'chat' : 'design')}
              className={`w-20 px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 border ${
                mode === 'design'
                  ? 'bg-blue-500 text-white border-blue-400'
                  : 'bg-white text-blue-500 border-blue-400'
              }`}
              title={`Switch to ${mode === 'design' ? 'Chat' : 'Design'} mode`}
            >
              {mode === 'design' ? 'Design' : 'Chat'}
            </button>
          </div>
        </div>

        {/* Bottom-right send icon */}
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="absolute right-4 bottom-3 text-white disabled:text-zinc-500 transition-opacity hover:opacity-80"
          aria-label="Send message"
        >
          <SendHorizontal size={20} />
        </button>
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