import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import { User, Bot, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
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
              <div className="text-sm leading-relaxed">
                {/** Normalize common escaped sequences from API responses */}
                {(() => {
                  let text = message.text ?? '';
                  // Replace escaped newlines and tabs with actual characters
                  text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                  // Ensure a blank line before list items for GFM when needed
                  text = text.replace(/([^\n])\n(\s*[*-]\s)/g, '$1\n\n$2');
                  // Collapse excessive spaces
                  text = text.replace(/\u00A0/g, ' ');
                  return (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: (props: any) => <h1 className="text-lg font-semibold mb-2" {...props} />,
                        h2: (props: any) => <h2 className="text-base font-semibold mb-2" {...props} />,
                        h3: (props: any) => <h3 className="text-sm font-semibold mb-2" {...props} />,
                        p: (props: any) => <p className="mb-2" {...props} />,
                        ul: (props: any) => <ul className="list-disc pl-5 mb-2" {...props} />,
                        ol: (props: any) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                        li: (props: any) => <li className="mb-1" {...props} />,
                        strong: (props: any) => <strong className="font-semibold" {...props} />,
                        em: (props: any) => <em className="italic" {...props} />,
                        code: (props: any) => (
                          <code className={`bg-zinc-200 text-zinc-900 px-1 py-0.5 rounded ${props.className || ''}`} {...props} />
                        ),
                        a: (props: any) => <a className="text-blue-700 underline" target="_blank" rel="noreferrer" {...props} />,
                        hr: (props: any) => <hr className="my-3 border-zinc-400" {...props} />,
                      }}
                    >
                      {text}
                    </ReactMarkdown>
                  );
                })()}
              </div>
              
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
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
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