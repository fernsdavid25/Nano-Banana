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

app = FastAPI(title="The Banana Board Backend")

# Logging configuration
logger = logging.getLogger("circuit_designer")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger.info("Backend starting up")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    # During development and across multiple deploy URLs, a permissive CORS avoids preflight failures.
    # If you need to lock this down later, replace with explicit origins for localhost and your prod domains.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class CircuitGenerationRequest(BaseModel):
    prompt: str
    current_image: Optional[str] = None
    painted_image: Optional[str] = None  # optional overlay/mask as base64 data URL
    mode: str = "design"  # "design" or "chat"
    api_key: str

class CircuitGenerationResponse(BaseModel):
    text: Optional[str] = None
    image_url: Optional[str] = None
    success: bool = True
    error: Optional[str] = None

class PromptEnhancementRequest(BaseModel):
    prompt: str
    api_key: str

class PromptEnhancementResponse(BaseModel):
    enhanced_prompt: str
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

def data_url_to_bytes(data_url: str) -> bytes:
    """Convert a base64 data URL or bare base64 string to bytes."""
    if data_url.startswith("data:"):
        try:
            data_url = data_url.split(",", 1)[1]
        except Exception:
            pass
    try:
        return base64.b64decode(data_url, validate=False)
    except Exception:
        # As a last resort, try interpreting as raw bytes string
        return data_url.encode()

# Best-effort MIME detection from image magic numbers
def detect_image_mime(image_bytes: bytes, fallback: str = "image/png") -> str:
    b = image_bytes.lstrip()
    try:
        if b.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if b.startswith(b"\xff\xd8"):
            return "image/jpeg"
        if b.startswith(b"GIF8"):
            return "image/gif"
        if b.startswith(b"BM"):
            return "image/bmp"
        if (b.startswith(b"II*\x00") or b.startswith(b"MM\x00*")):
            return "image/tiff"
        if b.startswith(b"RIFF") and b[8:12] == b"WEBP":
            return "image/webp"
        if b.startswith(b"<svg") or b.startswith(b"<?xml"):
            return "image/svg+xml"
    except Exception:
        pass
    return fallback if isinstance(fallback, str) and fallback.startswith("image/") else "image/png"

# Temporary output directory for saving images
# NOTE: Vercel serverless has a read-only filesystem except for /tmp
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "/tmp/generated_images")
try:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
except Exception as e:
    logger.warning(f"Could not create OUTPUT_DIR {OUTPUT_DIR}: {e}. Falling back to /tmp")
    OUTPUT_DIR = "/tmp"

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
        
        # Selective edit path (always image output)
        is_selective = bool(request.painted_image) and bool(request.current_image)
        if is_selective:
            from google.genai import types

            # UPDATED Inpainting instruction (more prescriptive guardrails)
            instr = (
                "Edit only the painted/masked region. You are a professional electronics drafting assistant performing a "
                "precise inpainting edit on a technical circuit diagram. Follow these strict rules:\n"
                "- CHANGE SCOPE: Modify pixels only inside the provided overlay mask. Do NOT alter or move any elements outside the mask.\n"
                "- STYLE: Preserve the original schematic style (default to clean vector-style schematic: white background, black 1px/1pt lines, Helvetica-like labels). Match existing line weights, font size, alignment, and stroke caps.\n"
                "- SYMBOLS & LABELS: Use standard IEEE/IEC schematic symbols. If a component is replaced or its value changed, update the label text (e.g., \"BAT1 9VDC\" -> \"BAT1 12VDC\") positioned where the original label was located. Do NOT rename node identifiers unless explicitly requested.\n"
                "- ROUTING: Maintain orthogonal routing and wire junction conventions. Snap new wires to the existing grid so they remain orthogonal; avoid diagonal wires. Avoid creating unnecessary crossovers.\n"
                "- COMPONENTS: Do not add new components other than those explicitly requested in the user's edit prompt. If the user requests adding a component, place it cleanly on-grid and add a single-line label with value.\n"
                "- IMAGE OUTPUT: Return only the edited image (same format as input: PNG if input raster, SVG if input vector). Do not return explanatory text. Preserve original image resolution and DPI. Blend edges to avoid visible seams and keep antialiasing consistent.\n"
                "- SAFETY & VALIDATION: If the requested edit would create an obviously unsafe or invalid circuit (shorts, missing ground reference when required, or reversed polarity on polarized components), instead do NOT apply the edit and return a concise one-line text response explaining the conflict.\n\n"
                f"User edit instruction: {request.prompt}"
            )

            try:
                base_bytes = data_url_to_bytes(request.current_image)
                overlay_bytes = data_url_to_bytes(request.painted_image)

                base_mime = detect_image_mime(base_bytes, "image/png")
                # Overlay is always a transparent PNG from the UI
                overlay_mime = "image/png"

                contents = [
                    instr,
                    types.Part.from_bytes(data=base_bytes, mime_type=base_mime),
                    types.Part.from_bytes(data=overlay_bytes, mime_type=overlay_mime),
                ]

                logger.info(
                    f"Selective edit: base_mime={base_mime} base_size={len(base_bytes)} overlay_size={len(overlay_bytes)}"
                )

                response = client.models.generate_content(
                    model="gemini-2.5-flash-image-preview",
                    contents=contents,
                )

                # Extract image as in design path below
                text_response = ""
                image_b64_url = None
                parts = response.candidates[0].content.parts
                logger.info(f"Model returned {len(parts)} part(s) in selective edit")
                for idx, part in enumerate(parts):
                    if part.text is not None:
                        logger.info(f"part[{idx}] type=text len={len(part.text)}")
                        text_response += part.text
                    elif part.inline_data is not None:
                        logger.info(f"part[{idx}] type=inline_data mime={part.inline_data.mime_type}")
                        image_data = part.inline_data.data
                        mime_type = part.inline_data.mime_type or "image/png"

                        image_bytes = None
                        try:
                            b = image_data if isinstance(image_data, (bytes, bytearray)) else str(image_data).encode('utf-8')
                            decoded = base64.b64decode(b, validate=False)
                            if (
                                decoded.startswith(b"\x89PNG\r\n\x1a\n")
                                or decoded.startswith(b"\xff\xd8")
                                or decoded.startswith(b"RIFF")
                                or decoded.startswith(b"GIF8")
                            ):
                                image_bytes = decoded
                        except Exception:
                            pass
                        if image_bytes is None:
                            image_bytes = image_data if isinstance(image_data, (bytes, bytearray)) else bytes(image_data)

                        real_mime = detect_image_mime(image_bytes, mime_type)
                        if real_mime != mime_type:
                            logger.info(f"MIME corrected: model={mime_type} detected={real_mime}")
                        b64_data = base64.b64encode(image_bytes).decode()
                        image_b64_url = f"data:{real_mime};base64,{b64_data}"
                        logger.info(f"Created base64 data URL: {real_mime}, size: {len(image_bytes)} bytes")

                        try:
                            img = Image.open(io.BytesIO(image_bytes))
                            save_pil_image(img, prefix="output")
                            logger.info(f"Successfully saved PIL image: {img.size}")
                        except Exception as e:
                            logger.warning(f"Could not save as PIL image (this is OK): {e}")
                return CircuitGenerationResponse(
                    text=text_response or "Generated circuit diagram",
                    image_url=image_b64_url,
                    success=True,
                )
            except Exception as e:
                logger.error(f"Selective edit failed: {e}")
                raise

        if request.mode == "design":
            # Use Gemini 2.5 Flash Image Preview for design generation
            # Enhanced instruction based on Gemini best practices for circuit generation
            instruction = (
                "Create a detailed, professional electronic circuit schematic with the following specifications:\n"
                "- Use standard IEEE/IEC electronic symbols for all components\n"
                "- Include clear component labels with values (resistors in ohms, capacitors in farads, etc.)\n                "
                "- Show proper wire routing with minimal crossovers\n"
                "- Add connection points and node labels where appropriate\n"
                "- Include power supply connections (+V, GND) clearly marked\n"
                "- Use a clean, technical drawing style suitable for students and hobbyists\n"
                "- Ensure the circuit is buildable and follows electrical engineering best practices\n\n"
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

            # Extract text and image from response - Fixed based on Gemini docs
            text_response = ""
            image_b64_url = None
            
            parts = response.candidates[0].content.parts
            logger.info(f"Model returned {len(parts)} part(s) in design mode")
            
            for idx, part in enumerate(parts):
                if part.text is not None:
                    logger.info(f"part[{idx}] type=text len={len(part.text)}")
                    text_response += part.text
                elif part.inline_data is not None:
                    logger.info(f"part[{idx}] type=inline_data mime={part.inline_data.mime_type}")
                    # Get the raw image data
                    image_data = part.inline_data.data
                    mime_type = part.inline_data.mime_type or "image/png"

                    # Gemini may return inline_data.data as base64-encoded ASCII or as raw image bytes.
                    # If it's base64 text (e.g., starts with iVBOR... or /9j/), decode it first.
                    image_bytes = None
                    try:
                        # Ensure we have bytes to attempt base64 decode
                        b = image_data if isinstance(image_data, (bytes, bytearray)) else str(image_data).encode('utf-8')
                        # Use validate=False to tolerate newlines/whitespace sometimes present in SDK output
                        decoded = base64.b64decode(b, validate=False)
                        # Check for common image magic numbers after decoding
                        if (
                            decoded.startswith(b"\x89PNG\r\n\x1a\n")  # PNG
                            or decoded.startswith(b"\xff\xd8")          # JPEG
                            or decoded.startswith(b"RIFF")                 # WebP/AVI container
                            or decoded.startswith(b"GIF8")                 # GIF
                        ):
                            image_bytes = decoded
                            logger.info("inline_data appears to be base64 text; successfully decoded to raw image bytes")
                    except Exception:
                        # Not valid base64 text; fall back to original
                        pass

                    if image_bytes is None:
                        # Treat original as raw bytes
                        image_bytes = image_data if isinstance(image_data, (bytes, bytearray)) else bytes(image_data)

                    # Correct the MIME type based on the actual bytes to avoid browser decode failures
                    real_mime = detect_image_mime(image_bytes, mime_type)
                    if real_mime != mime_type:
                        logger.info(f"MIME corrected: model={mime_type} detected={real_mime}")
                    # Create base64 data URL from actual image bytes
                    b64_data = base64.b64encode(image_bytes).decode()
                    image_b64_url = f"data:{real_mime};base64,{b64_data}"
                    logger.info(f"Created base64 data URL: {mime_type}, size: {len(image_bytes)} bytes")

                    # Try to save as PIL image for debugging (optional, don't fail if this doesn't work)
                    try:
                        img = Image.open(io.BytesIO(image_bytes))
                        save_pil_image(img, prefix="output")
                        logger.info(f"Successfully saved PIL image: {img.size}")
                    except Exception as e:
                        logger.warning(f"Could not save as PIL image (this is OK): {e}")
                        # Save raw bytes as fallback for debugging
                        try:
                            ts = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
                            raw_path = os.path.join(OUTPUT_DIR, f"output-raw-{ts}.bin")
                            with open(raw_path, 'wb') as f:
                                f.write(image_bytes)
                            logger.info(f"Saved raw image bytes -> {raw_path}")
                        except Exception as e2:
                            logger.error(f"Failed to save raw bytes: {e2}")

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

@app.post("/enhance-prompt", response_model=PromptEnhancementResponse)
async def enhance_prompt(request: PromptEnhancementRequest):
    try:
        client = get_gemini_client(request.api_key)
        logger.info(f"/enhance-prompt prompt_len={len(request.prompt)}")
        
        # UPDATED Prompt Enhancement instruction
        # This requests a single MEDIUM-LENGTH enhanced prompt and provides tight guardrails.
        enhancement_instruction = """
        You are an expert electronics engineer and professional prompt-writer for image-generation models.
        Produce exactly ONE enhanced, MEDIUM-LENGTH image-generation prompt (2-4 sentences, ~40-120 words) optimized for generating a clean, buildable circuit schematic or a photorealistic top-down wiring photo depending on the user's original intention.

        Requirements & guardrails:
        - Output only the enhanced prompt text; do not include extra headings, explanations, or JSON.
        - If the original prompt implies a schematic (words like 'diagram', 'schematic', 'symbols'), default to: "clean vector schematic, white background, black 1px lines, Helvetica-like labels, standard IEEE/IEC symbols, SVG output, aspect ratio 4:3".
        - If the original prompt implies realism (words like 'real life', 'photo', 'top view', 'photorealistic'), default to: "photorealistic top-down wiring photo, neutral diffuse lighting, minimal shadows, high detail, show components mounted on a bench or PCB as appropriate, include camera/lens suggestions (e.g., 50mm equivalent, top-down), PNG output".
        - Always include a reasonable safe default for unspecified voltages/values: use 9V for single-cell battery examples, and suggest a 220Ω resistor for basic LED protection if an LED is present. If the prompt mentions a specific value, keep it unchanged.
        - Be explicit about wiring order and connectivity (e.g., "battery positive → switch → lamp → battery negative") and include node labels if relevant (NODE_A, NODE_B).
        - Include one-line safety guidance in the prompt when the design could be unsafe (e.g., "include series resistor to limit current for LEDs; ensure correct polarity for electrolytics").
        - Add a negative-style clause to avoid unwanted styles: "no perspective distortion, no color gradients in wires, no decorative backgrounds, no handwritten text".
        - Prefer vector/SVG for schematics and PNG for photorealistic renders; mention the recommended output format.
        - Keep the language precise and actionable for an image generator (avoid open-ended questions).

        Original prompt: {original_prompt}

        Enhanced prompt:
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[enhancement_instruction.format(original_prompt=request.prompt)]
        )
        
        enhanced_text = ""
        for part in response.candidates[0].content.parts:
            if part.text is not None:
                enhanced_text += part.text
        
        return PromptEnhancementResponse(
            enhanced_prompt=enhanced_text.strip(),
            success=True
        )
        
    except Exception as e:
        error_message = str(e)
        if "API_KEY" in error_message:
            error_message = "Invalid API key. Please check your Gemini API key."
        elif "quota" in error_message.lower():
            error_message = "API quota exceeded. Please check your Gemini API usage."
        
        return PromptEnhancementResponse(
            enhanced_prompt="",
            success=False,
            error=error_message
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
