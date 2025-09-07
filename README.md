# The Banana Board

A React web application for electronics hobbyists and students that generates and edits circuit diagrams from natural language text prompts using Google's Gemini AI models.

## Features

### Core Functionality
- **Text-to-Schematic Generation**: Describe circuits in natural language and get visual schematics
- **Iterative Editing**: Modify existing circuits with new text commands
- **Session State**: Conversational workflow that remembers current circuit context
- **Clear & Save**: Reset canvas or download generated diagrams
- **Chat History**: Persistent history of all design sessions

### Interface Modes
- **Design Mode**: Uses Gemini 2.5 Flash Image Preview for circuit generation
- **Chat Mode**: Uses Gemini 2.5 Flash for text-only electronics Q&A
- **Canvas Toggle**: View/hide canvas while chatting in Chat mode

### UI Features
- Dark theme with professional design
- 20-80 split layout (sidebar/main area)
- Sticky canvas and chat input areas
- Responsive design with smooth animations
- API key management in sidebar

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for development and building

### Backend
- **FastAPI** for REST API
- **Google Gemini AI** (2.5 Flash models)
- **Pillow** for image processing
- **Python 3.8+**

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Configuration
1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Enter the API key in the sidebar of the web application
3. The backend will use this key to authenticate with Google's Gemini models

## Usage

### Design Mode
1. Enter your Gemini API key in the sidebar
2. Select "Design" mode
3. Describe your circuit (e.g., "Create a simple LED blink circuit using a 555 timer")
4. The AI will generate a professional schematic diagram
5. Use "Clear" to start over or "Save" to download the diagram

### Chat Mode  
1. Switch to "Chat" mode
2. Ask questions about electronics, circuits, or components
3. Toggle canvas visibility while chatting
4. The AI maintains context of your current circuit design

### Example Prompts
- "Design a simple LED blink circuit with 555 timer"
- "Create an amplifier circuit with op-amp"
- "Show me a voltage regulator using LM7805"
- "Add a capacitor to smooth the output"
- "What resistor value should I use for a 5V LED?"

## Project Structure

```
circuit-designer-ai/
├── src/
│   ├── components/          # React components
│   │   ├── Sidebar.tsx     # Navigation and API key input
│   │   ├── Canvas.tsx      # Circuit display area
│   │   ├── ChatInterface.tsx # Input and mode controls
│   │   └── MessageHistory.tsx # Chat message display
│   ├── hooks/
│   │   └── useChat.ts      # Main chat logic and state
│   ├── services/
│   │   └── api.ts          # API service functions
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   └── App.tsx             # Main application component
├── backend/
│   ├── main.py             # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
└── README.md
```

## Development

### Running Both Services
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend  
cd backend && python -m uvicorn main:app --reload
```

### Building for Production
```bash
# Build frontend
npm run build

# Backend runs with uvicorn in production mode
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

- `POST /generate-circuit` - Generate or modify circuit diagrams
- `GET /health` - Health check endpoint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the README for common setup problems
- Review the example prompts for usage guidance
- Ensure your Gemini API key is valid and has sufficient quota