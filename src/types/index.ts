export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CircuitGenerationRequest {
  prompt: string;
  currentImage?: string;
  mode: 'design' | 'chat';
}

export interface CircuitGenerationResponse {
  text?: string;
  imageUrl?: string;
  success: boolean;
  error?: string;
}

export type Mode = 'design' | 'chat';