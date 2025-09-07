import { CircuitGenerationRequest, CircuitGenerationResponse } from '../types';

// Use the deployed FastAPI backend host, not the frontend host
const API_BASE_URL = 'https://nano-banana-backend.vercel.app';

interface PromptEnhancementRequest {
  prompt: string;
  apiKey: string;
}

interface PromptEnhancementResponse {
  enhanced_prompt: string;
  success: boolean;
  error?: string;
}

interface GenerateRequest extends CircuitGenerationRequest {
  apiKey: string;
}

export const generateCircuit = async (request: GenerateRequest): Promise<CircuitGenerationResponse> => {
  try {
    // Map frontend camelCase to backend snake_case expected by FastAPI
    const payload = {
      prompt: request.prompt,
      current_image: request.currentImage,
      painted_image: request.paintedImage,
      mode: request.mode,
      api_key: request.apiKey,
    };

    const response = await fetch(`${API_BASE_URL}/generate-circuit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Try to extract backend error details for better debugging
      let detail = '';
      try {
        const errData = await response.json();
        detail = errData?.detail ? ` - ${JSON.stringify(errData.detail)}` : '';
      } catch {}
      throw new Error(`HTTP error! status: ${response.status}${detail}`);
    }

    const data = await response.json();
    
    // Debug logging
    console.log('API Response data:', {
      text: data.text ? `${data.text.substring(0, 100)}...` : null,
      imageUrl: data.image_url ? `${data.image_url.substring(0, 50)}...` : null,
      success: data.success,
      error: data.error
    });
    
    // Normalize snake_case from backend to camelCase expected by the app
    const normalized: CircuitGenerationResponse = {
      text: data.text,
      imageUrl: data.image_url,
      success: data.success,
      error: data.error,
    };
    return normalized;
  } catch (error) {
    console.error('Error generating circuit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const enhancePrompt = async (request: PromptEnhancementRequest): Promise<string> => {
  try {
    const payload = {
      prompt: request.prompt,
      api_key: request.apiKey,
    };

    const response = await fetch(`${API_BASE_URL}/enhance-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PromptEnhancementResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to enhance prompt');
    }

    return data.enhanced_prompt;
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    throw error;
  }
};