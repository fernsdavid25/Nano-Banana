import { CircuitGenerationRequest, CircuitGenerationResponse } from '../types';

const API_BASE_URL = 'http://localhost:8000';

interface GenerateRequest extends CircuitGenerationRequest {
  apiKey: string;
}

export const generateCircuit = async (request: GenerateRequest): Promise<CircuitGenerationResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-circuit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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