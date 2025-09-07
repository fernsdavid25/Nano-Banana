import { CircuitGenerationRequest, CircuitGenerationResponse } from '../types';

const API_BASE_URL = 'nano-banana-backend.vercel.app';

interface GenerateRequest extends CircuitGenerationRequest {
  apiKey: string;
}

export const generateCircuit = async (request: GenerateRequest): Promise<CircuitGenerationResponse> => {
  try {
    // Map frontend camelCase to backend snake_case expected by FastAPI
    const payload = {
      prompt: request.prompt,
      current_image: request.currentImage,
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
    return data;
  } catch (error) {
    console.error('Error generating circuit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};