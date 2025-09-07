import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { ChatInterface } from './components/ChatInterface';
import { MessageHistory } from './components/MessageHistory';
import { useChat } from './hooks/useChat';

function App() {
  const {
    messages,
    sessions,
    currentSessionId,
    isLoading,
    mode,
    setMode,
    currentImage,
    apiKey,
    setApiKey,
    sendMessage,
    createNewSession,
    loadSession,
    clearCanvas,
    downloadImage
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingApiKey, setPendingApiKey] = useState(apiKey || '');
  const showCanvasArea = true; // Always show canvas

  return (
    <div className="flex h-screen bg-zinc-800 text-white">
      {/* Sidebar Overlay */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={loadSession}
        onNewSession={createNewSession}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((v) => !v)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden items-stretch min-h-0">
          {/* Canvas Area */}
          {showCanvasArea && (
            <Canvas
              currentImage={currentImage}
              onClear={clearCanvas}
              onDownload={downloadImage}
              isVisible={true}
              className="basis-[40%]"
            />
          )}

          {/* Chat Area - Always visible, 60% width */}
          <div className="basis-[60%] flex flex-col bg-zinc-800 border-l border-zinc-700 h-full">
            <div className="bg-zinc-900 border-b border-zinc-700 px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              >
                Menu
              </button>
              <h2 className="text-white font-medium">Chat</h2>
              <div className="w-16" />
            </div>
            <MessageHistory messages={messages} isLoading={isLoading} />
          </div>

          {/* Empty state overlay removed; Canvas has its own placeholder */}
        </div>

        {/* Chat Interface - Sticky at bottom */}
        <div className="border-t border-zinc-700">
          <ChatInterface
            onSendMessage={sendMessage}
            isLoading={isLoading}
            mode={mode}
            onModeChange={setMode}
          />
        </div>
      </div>

      {/* API Key Modal - blocks UI when apiKey is empty */}
      {(!apiKey || apiKey.trim() === '') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Enter API Key</h3>
            <p className="text-sm text-zinc-400 mb-4">Please paste your Gemini API key to continue.</p>
            <input
              type="password"
              value={pendingApiKey}
              onChange={(e) => setPendingApiKey(e.target.value)}
              placeholder="Enter Gemini API Key"
              className="w-full bg-zinc-800 text-white px-3 py-2 rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingApiKey('')}
                className="px-4 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  if (pendingApiKey.trim()) {
                    setApiKey(pendingApiKey.trim());
                  }
                }}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;