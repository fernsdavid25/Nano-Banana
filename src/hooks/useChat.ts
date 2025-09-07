import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, ChatSession, Mode } from '../types';
import { generateCircuit } from '../services/api';

// Convert a data URL (base64) to a Blob object URL
const dataUrlToBlobUrl = (dataUrl: string): string => {
  try {
    const [header, data] = dataUrl.split(',');
    const match = header.match(/data:(.*?);base64/);
    const mime = match ? match[1] : 'image/png';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    return url;
  } catch (e) {
    console.error('Failed to convert data URL to blob URL:', e);
    return dataUrl; // Fallback to original
  }
};

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('design');
  // currentImage: blob/object URL for reliable display in <img>
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  // currentImageDataUrl: original base64 data URL for sending to backend
  const [currentImageDataUrl, setCurrentImageDataUrl] = useState<string | null>(null);
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
    setCurrentImageDataUrl(null);

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
      setCurrentImageDataUrl(lastImageMessage?.imageDataUrl || null);
    }
  }, [sessions]);


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
        // Always attach the canvas image in data URL form if available
        currentImage: currentImageDataUrl || undefined,
        mode,
        apiKey
      });

      // If the backend returned an image data URL, convert it to a blob URL for more reliable rendering
      const imageUrl = response.imageUrl ? dataUrlToBlobUrl(response.imageUrl) : undefined;

      const aiMessage: Message = {
        id: generateId(),
        text: response.text || 'Generated circuit diagram',
        sender: 'ai',
        timestamp: new Date(),
        imageUrl,
        imageDataUrl: response.imageUrl
      };

      console.log('AI Message created:', {
        hasImageUrl: !!response.imageUrl,
        imageUrlLength: response.imageUrl ? response.imageUrl.length : 0,
        imageUrlPrefix: response.imageUrl ? response.imageUrl.substring(0, 50) : null
      });

      setMessages(prev => [...prev, aiMessage]);

      if (imageUrl) {
        console.log('Setting current image from response');
        setCurrentImage(imageUrl);
        setCurrentImageDataUrl(response.imageUrl!);
      } else {
        console.log('No image URL in response');
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
  }, [currentSessionId, mode, currentImageDataUrl, apiKey, isLoading, createNewSession]);

  const clearCanvas = useCallback(() => {
    setCurrentImage(null);
    setCurrentImageDataUrl(null);
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
          const dataUrl = reader.result as string; // base64 data URL
          // Save original data URL for backend
          setCurrentImageDataUrl(dataUrl);
          // Convert to blob URL for display
          const blobUrl = dataUrlToBlobUrl(dataUrl);
          setCurrentImage(blobUrl);
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
    currentImageDataUrl,
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