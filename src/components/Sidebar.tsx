import React from 'react';
import { ChatSession } from '../types';
import { History, Plus, Key, X } from 'lucide-react';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  apiKey,
  onApiKeyChange,
  isOpen,
  onToggle
}) => {
  return (
    <div className={`fixed inset-y-0 left-0 w-80 bg-zinc-900 h-screen flex flex-col border-r border-zinc-800 z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="text-white text-xl font-semibold">Circuit Designer AI</h1>
        <button
          onClick={onToggle}
          aria-label="Close sidebar"
          className="p-2 rounded-md hover:bg-zinc-800 text-zinc-300"
        >
          <X size={18} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-lg transition-colors duration-200"
        >
          <Plus size={20} />
          <span>New Design</span>
        </button>
      </div>

      {/* History Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4 text-zinc-400">
            <History size={18} />
            <span className="font-medium">History</span>
          </div>
          
          <div className="space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 group hover:bg-zinc-800 ${
                  currentSessionId === session.id 
                    ? 'bg-zinc-800 border-l-2 border-blue-500' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <div className="text-sm line-clamp-2">
                  {session.title}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>

          {sessions.length === 0 && (
            <div className="text-center text-zinc-500 mt-8">
              <p className="text-sm">No chat history yet.</p>
              <p className="text-xs mt-2">Start your first circuit design!</p>
            </div>
          )}
        </div>
      </div>

      {/* API Key Section */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 mb-3 text-zinc-400">
          <Key size={18} />
          <span className="font-medium">API Key</span>
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter Gemini API Key"
          className="w-full bg-zinc-800 text-white px-3 py-2 rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm"
        />
        <p className="text-xs text-zinc-500 mt-2">
          Get your API key from Google AI Studio
        </p>
      </div>
    </div>
  );
};