from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import base64
import io
from PIL import Image
import google.generativeai as genai
import os
from datetime import datetime

app = FastAPI(title="Circuit Designer AI Backend")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class CircuitGenerationRequest(BaseModel):
    prompt: str
    current_image: Optional[str] = None
    mode: str = "design"  # "design" or "chat"
    api_key: str

class CircuitGenerationResponse(BaseModel):
    text: Optional[str] = None
    image_url: Optional[str] = None
    success: bool = True
    error: Optional[str] = None

# Configure Gemini AI
def configure_gemini(api_key: str):
    genai.configure(api_key=api_key)

def image_to_base64(image_data: bytes) -> str:
    """Convert image bytes to base64 data URL"""
    return f"data:image/png;base64,{base64.b64encode(image_data).decode()}"

def base64_to_image(base64_string: str) -> Image.Image:
    """Convert base64 data URL to PIL Image"""
    if base64_string.startswith("data:image"):
        base64_string = base64_string.split(",")[1]
    
    image_data = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(image_data))

@app.post("/generate-circuit", response_model=CircuitGenerationResponse)
async def generate_circuit(request: CircuitGenerationRequest):
    try:
        configure_gemini(request.api_key)
        
        if request.mode == "design":
            # Use Gemini 2.5 Flash Image Preview for design generation
            model = genai.GenerativeModel("gemini-2.5-flash")
            
            # Create a comprehensive prompt for circuit generation
            circuit_prompt = f"""
            Create a detailed electronic circuit schematic based on this description: {request.prompt}
            
            Requirements:
            1. Generate a professional, clear schematic diagram
            2. Include all necessary components (resistors, capacitors, ICs, etc.)
            3. Show proper connections and wire routing
            4. Add component values and labels
            5. Use standard electronic symbols
            6. Include a title for the circuit
            7. Make it suitable for students and hobbyists to understand and build
            
            The output should be a clean, well-organized schematic that looks professional and is easy to read.
            """
            
            contents = [circuit_prompt]
            
            # Add current image context if available
            if request.current_image:
                try:
                    current_img = base64_to_image(request.current_image)
                    contents.append(current_img)
                    contents.append("Modify or improve this existing circuit based on the new requirements.")
                except Exception as e:
                    print(f"Error processing current image: {e}")
            
            response = model.generate_content(contents)
            
            # For now, return text response as we need to implement actual image generation
            # This is a placeholder - in production, you'd use the actual Gemini image generation API
            return CircuitGenerationResponse(
                text=response.text,
                success=True
            )
            
        else:
            # Use Gemini 2.5 Flash for chat mode (text only)
            model = genai.GenerativeModel("gemini-2.5-flash")
            
            chat_prompt = f"""
            You are an expert electronics engineer and educator. Answer this question about electronics, circuits, or related topics: {request.prompt}
            
            Provide helpful, accurate, and educational responses. Include practical tips, component recommendations, and safety considerations when relevant.
            """
            
            contents = [chat_prompt]
            
            # Add current image context if available
            if request.current_image:
                try:
                    current_img = base64_to_image(request.current_image)
                    contents.append(current_img)
                    contents.append("This is the current circuit being discussed. Please reference it in your response if relevant.")
                except Exception as e:
                    print(f"Error processing current image: {e}")
            
            response = model.generate_content(contents)
            
            return CircuitGenerationResponse(
                text=response.text,
                success=True
            )
            
    except Exception as e:
        error_message = str(e)
        if "API_KEY" in error_message:
            error_message = "Invalid API key. Please check your Gemini API key."
        elif "quota" in error_message.lower():
            error_message = "API quota exceeded. Please check your Gemini API usage."
        
        return CircuitGenerationResponse(
            success=False,
            error=error_message
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)