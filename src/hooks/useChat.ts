import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, ChatSession, Mode } from '../types';
import { generateCircuit } from '../services/api';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('design');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('apiKey') || '';
    } catch {
      return '';
    }
  });

  const [showCanvas, setShowCanvas] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const createNewSession = useCallback(() => {
    const sessionId = generateId();
    const newSession: ChatSession = {
      id: sessionId,
      title: 'New Circuit Design',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(sessionId);
    setMessages([]);
    setCurrentImage(null);

    return sessionId;
  }, []);

  const loadSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      
      // Set current image to the last generated image
      const lastImageMessage = session.messages
        .slice()
        .reverse()
        .find(m => m.imageUrl);
      setCurrentImage(lastImageMessage?.imageUrl || null);
    }
  }, [sessions]);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, title, updatedAt: new Date() }
        : session
    ));
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !apiKey.trim()) return;
    if (isLoading) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = createNewSession();
    }

    const userMessage: Message = {
      id: generateId(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await generateCircuit({
        prompt: text,
        currentImage: currentImage || undefined,
        mode,
        apiKey
      });

      const aiMessage: Message = {
        id: generateId(),
        text: response.text || 'Generated circuit diagram',
        sender: 'ai',
        timestamp: new Date(),
        imageUrl: response.imageUrl
      };

      setMessages(prev => [...prev, aiMessage]);

      if (response.imageUrl) {
        setCurrentImage(response.imageUrl);
      }

      // Update session
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { 
              ...session, 
              messages: [...session.messages, userMessage, aiMessage],
              title: session.messages.length === 0 ? text.slice(0, 30) + '...' : session.title,
              updatedAt: new Date()
            }
          : session
      ));

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        text: 'Sorry, there was an error generating the circuit. Please check your API key and try again.',
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, mode, currentImage, apiKey, isLoading, createNewSession]);

  const clearCanvas = useCallback(() => {
    setCurrentImage(null);
    createNewSession();
  }, [createNewSession]);

  const downloadImage = useCallback(() => {
    if (!currentImage) return;

    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `circuit-diagram-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentImage]);

  // Attach an image from the user (PNG/JPEG/WEBP/HEIC/HEIF) and set it as current canvas image
  const attachImage = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result as string;
          setCurrentImage(url);
          resolve();
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }, []);

  // Persist API key
  useEffect(() => {
    try {
      if (apiKey) {
        localStorage.setItem('apiKey', apiKey);
      } else {
        localStorage.removeItem('apiKey');
      }
    } catch {
      // no-op if storage unavailable
    }
  }, [apiKey]);

  return {
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
    messagesEndRef,
    sendMessage,
    createNewSession,
    loadSession,
    clearCanvas,
    downloadImage
    , attachImage
  };
};