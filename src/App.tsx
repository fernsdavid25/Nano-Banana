import React from 'react';
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
    showCanvas,
    setShowCanvas,
    sendMessage,
    createNewSession,
    loadSession,
    clearCanvas,
    downloadImage
  } = useChat();

  const toggleCanvas = () => {
    setShowCanvas(!showCanvas);
  };

  const hasMessages = messages.length > 0;
  const showCanvasArea = mode === 'design' || (mode === 'chat' && showCanvas);

  return (
    <div className="flex h-screen bg-zinc-800 text-white">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={loadSession}
        onNewSession={createNewSession}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas Area */}
          {showCanvasArea && (
            <Canvas
              currentImage={currentImage}
              onClear={clearCanvas}
              onDownload={downloadImage}
              isVisible={true}
            />
          )}

          {/* Chat Area */}
          {mode === 'chat' && (
            <div className={`flex flex-col bg-zinc-800 ${showCanvas ? 'w-96 border-l border-zinc-700' : 'flex-1'}`}>
              <div className="bg-zinc-900 border-b border-zinc-700 px-4 py-3">
                <h2 className="text-white font-medium">Chat</h2>
              </div>
              
              <MessageHistory messages={messages} isLoading={isLoading} />
            </div>
          )}

          {/* Empty State for Design Mode */}
          {mode === 'design' && !currentImage && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-md mx-auto">
                <h2 className="text-2xl font-semibold text-white mb-4">
                  Welcome to Circuit Designer AI
                </h2>
                <p className="text-zinc-400 mb-8 leading-relaxed">
                  Describe any electronic circuit in natural language, and I'll generate a professional schematic diagram for you. Perfect for students, hobbyists, and engineers.
                </p>
                <div className="text-sm text-zinc-500 space-y-2">
                  <p>• "Design a simple LED blink circuit with 555 timer"</p>
                  <p>• "Create an amplifier circuit with op-amp"</p>
                  <p>• "Show me a voltage regulator using LM7805"</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Interface - Sticky at bottom */}
        <div className="border-t border-zinc-700">
          <ChatInterface
            onSendMessage={sendMessage}
            isLoading={isLoading}
            mode={mode}
            onModeChange={setMode}
            showCanvas={showCanvas}
            onToggleCanvas={toggleCanvas}
            hasMessages={hasMessages}
          />
        </div>
      </div>
    </div>
  );
}

export default App;