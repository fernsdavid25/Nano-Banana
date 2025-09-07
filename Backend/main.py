from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import base64
import io
from PIL import Image
from google import genai
import os
from datetime import datetime
import logging

app = FastAPI(title="Circuit Designer AI Backend")

# Logging configuration
logger = logging.getLogger("circuit_designer")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger.info("Backend starting up")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://nano-banana-neon.vercel.app",
    ],
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

# Configure Gemini AI client
def get_gemini_client(api_key: str):
    return genai.Client(api_key=api_key)

def image_to_base64(image_data: bytes, mime_type: str = "image/png") -> str:
    """Convert image bytes to base64 data URL with provided MIME type"""
    safe_mime = mime_type if mime_type.startswith("image/") else "image/png"
    return f"data:{safe_mime};base64,{base64.b64encode(image_data).decode()}"

def base64_to_image(base64_string: str) -> Image.Image:
    """Convert base64 data URL to PIL Image"""
    if base64_string.startswith("data:image"):
        base64_string = base64_string.split(",")[1]
    
    image_data = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(image_data))

# Temporary output directory for saving images
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "generated_images")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def save_pil_image(img: Image.Image, prefix: str = "output") -> str:
    ts = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    path = os.path.join(OUTPUT_DIR, f"{prefix}-{ts}.png")
    try:
        img.save(path)
        logger.info(f"Saved image -> {path}")
    except Exception as e:
        logger.error(f"Failed to save image {path}: {e}")
    return path

@app.post("/generate-circuit", response_model=CircuitGenerationResponse)
async def generate_circuit(request: CircuitGenerationRequest):
    try:
        client = get_gemini_client(request.api_key)
        logger.info(
            f"/generate-circuit mode={request.mode} prompt_len={len(request.prompt)} has_image={bool(request.current_image)}"
        )
        
        if request.mode == "design":
            # Use Gemini 2.5 Flash Image Preview for design generation
            # Build prompt and contents. If an input image is provided, per best practices,
            # place the image first and the text instruction after it.
            instruction = (
                "Modify or create a professional electronic circuit schematic per the following requirements. "
                "Include standard symbols, clear labels, component values, and proper wire routing. "
                "Make it suitable for students and hobbyists to understand and build.\n\n"
            )

            contents = []
            if request.current_image:
                try:
                    current_img = base64_to_image(request.current_image)
                    # Save input image for debugging
                    save_pil_image(current_img, prefix="input")
                    contents.append(current_img)
                    contents.append(
                        f"{instruction}Update this circuit based on: {request.prompt}"
                    )
                except Exception as e:
                    print(f"Error processing current image: {e}")
                    # Fallback to text-only if image fails to decode
                    contents = [
                        (
                            "Create a detailed electronic circuit schematic based on this description: "
                            f"{request.prompt}\n\n{instruction}"
                        )
                    ]
            else:
                # Text-only generation when there's no base image
                contents = [
                    (
                        "Create a detailed electronic circuit schematic based on this description: "
                        f"{request.prompt}\n\n{instruction}"
                    )
                ]

            response = client.models.generate_content(
                model="gemini-2.5-flash-image-preview",
                contents=contents,
            )

            # Extract text and image from response
            text_response = ""
            image_b64_url = None
            try:
                parts = response.candidates[0].content.parts
                logger.info(f"Model returned {len(parts)} part(s) in design mode")
                for idx, part in enumerate(parts):
                    if getattr(part, "text", None) is not None:
                        logger.info(f"part[{idx}] type=text len={len(part.text)}")
                        text_response += part.text
                    elif getattr(part, "inline_data", None) is not None:
                        try:
                            # Convert inline image bytes to base64 data URL
                            data = part.inline_data.data
                            mime = getattr(part.inline_data, "mime_type", "image/png")
                            logger.info(f"part[{idx}] type=inline_data mime={mime}")
                            if isinstance(data, (bytes, bytearray)):
                                # Try to detect actual format to set correct MIME
                                img_bytes = data
                                detected_mime = None
                                try:
                                    _img = Image.open(io.BytesIO(img_bytes))
                                    fmt = (_img.format or '').upper()
                                    if fmt == 'PNG':
                                        detected_mime = 'image/png'
                                    elif fmt == 'JPEG' or fmt == 'JPG':
                                        detected_mime = 'image/jpeg'
                                    elif fmt == 'WEBP':
                                        detected_mime = 'image/webp'
                                    elif fmt == 'HEIC':
                                        detected_mime = 'image/heic'
                                    elif fmt == 'HEIF':
                                        detected_mime = 'image/heif'
                                except Exception:
                                    pass
                                if detected_mime:
                                    mime = detected_mime
                                b64 = base64.b64encode(img_bytes).decode()
                                image_b64_url = f"data:{mime};base64,{b64}"
                            elif isinstance(data, str):
                                # Already base64 string
                                image_b64_url = f"data:{mime};base64,{data}"
                                try:
                                    img_bytes = base64.b64decode(data)
                                except Exception:
                                    img_bytes = None
                            else:
                                # Fallback path tries to treat as bytes-like
                                b = bytes(data)
                                b64 = base64.b64encode(b).decode()
                                image_b64_url = f"data:{mime};base64,{b64}"
                                img_bytes = b
                            # Save output image if we have bytes
                            if img_bytes:
                                try:
                                    out_img = Image.open(io.BytesIO(img_bytes))
                                    save_pil_image(out_img, prefix="output")
                                except Exception as e:
                                    logger.error(f"Failed to decode/save output image via PIL: {e}")
                                    # Fallback: write raw bytes
                                    try:
                                        ts = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
                                        raw_path = os.path.join(OUTPUT_DIR, f"output-raw-{ts}.bin")
                                        with open(raw_path, 'wb') as f:
                                            f.write(img_bytes)
                                        logger.info(f"Saved raw bytes -> {raw_path}")
                                    except Exception as e2:
                                        logger.error(f"Failed to save raw bytes: {e2}")
                        except Exception as e:
                            print(f"Error extracting inline image: {e}")
            except Exception as e:
                print(f"Error parsing model response: {e}")

            return CircuitGenerationResponse(
                text=text_response or "Generated circuit diagram",
                image_url=image_b64_url,
                success=True,
            )
            
        else:
            # Use Gemini 2.5 Flash for chat mode (text only)
            
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
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents
            )
            
            # Extract text from response
            text_response = ""
            for part in response.candidates[0].content.parts:
                if part.text is not None:
                    text_response += part.text
            
            return CircuitGenerationResponse(
                text=text_response,
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
