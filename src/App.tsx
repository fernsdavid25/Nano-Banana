import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { ChatInterface } from './components/ChatInterface';
import { MessageHistory } from './components/MessageHistory';
import { useChat } from './hooks/useChat';
import { Menu, Monitor } from 'lucide-react';

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
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile view message
  if (isMobile) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Monitor size={64} className="text-zinc-400 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Desktop Required</h1>
          <p className="text-zinc-400 leading-relaxed">
            Circuit Designer AI is optimized for desktop use. Please open this application on a desktop or laptop computer for the best experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-800 text-white">
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

      {/* Top Header */}
      <div className="bg-zinc-900 border-b border-zinc-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-zinc-800 text-zinc-300 transition-colors"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-semibold text-white">Circuit Designer AI</h1>
        </div>
      </div>

      {/* Main Content Area - 50/50 Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Circuit Canvas - Left Half */}
        <div className="w-1/2 flex flex-col bg-zinc-800 border-r border-zinc-700">
          <div className="bg-zinc-900 border-b border-zinc-700 px-6 py-3">
            <h2 className="text-white font-medium text-center">Circuit Canvas</h2>
          </div>
          <Canvas
            currentImage={currentImage}
            onClear={clearCanvas}
            onDownload={downloadImage}
            isVisible={true}
            className="flex-1"
          />
        </div>

        {/* Chat Area - Right Half */}
        <div className="w-1/2 flex flex-col bg-zinc-800">
          <div className="bg-zinc-900 border-b border-zinc-700 px-6 py-3">
            <h2 className="text-white font-medium text-center">Chat</h2>
          </div>
          <MessageHistory messages={messages} isLoading={isLoading} />
        </div>
      </div>

      {/* Chat Interface - Full Width at Bottom */}
      <div className="border-t border-zinc-700 bg-zinc-900">
        <ChatInterface
          onSendMessage={sendMessage}
          isLoading={isLoading}
          mode={mode}
          onModeChange={setMode}
        />
      </div>

      {/* API Key Modal */}
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