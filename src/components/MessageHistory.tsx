import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import { User, Bot, Clock } from 'lucide-react';

interface MessageHistoryProps {
  messages: Message[];
  isLoading: boolean;
}

export const MessageHistory: React.FC<MessageHistoryProps> = ({
  messages,
  isLoading
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot size={24} className="text-zinc-400" />
          </div>
          <h3 className="text-white text-lg font-medium mb-2">Start a Conversation</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Ask questions about electronics or describe a circuit you'd like to design. 
            Switch between Design and Chat modes using the buttons below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 ${
            message.sender === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.sender === 'ai' && (
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
          )}
          
          <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-first' : ''}`}>
            <div
              className={`p-3 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-zinc-300 text-zinc-800 ml-auto'
                  : 'bg-zinc-300 text-zinc-800'
              }`}
            >
              <p className="text-sm leading-relaxed font-medium">{message.text}</p>
              
              {message.imageUrl && (
                <div className="mt-3">
                  <img
                    src={message.imageUrl}
                    alt="Generated circuit"
                    className="max-w-full h-auto rounded-xl"
                  />
                </div>
              )}
            </div>
            
            <div className={`flex items-center gap-1 mt-1 text-xs text-zinc-500 ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}>
              <Clock size={12} />
              <span>
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          {message.sender === 'user' && (
            <div className="flex-shrink-0 w-8 h-8 bg-zinc-600 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div className="bg-zinc-300 p-4 rounded-2xl">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};