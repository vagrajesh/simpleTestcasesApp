# Test Case Generator

A full-stack app that takes a user story and generates structured test cases (Positive, Negative, Edge, E2E) using an LLM.

**Stack**: React + Vite + Tailwind CSS (frontend) · Node.js + Express (backend) · Groq or any local OpenAI-compatible LLM (Ollama / LM Studio)

---

## Prerequisites

- Node.js 18+ (native `fetch` required)
- npm 9+
- A Groq API key **or** a locally running LLM (Ollama / LM Studio)

---

## Quick Start

### 1. Clone / open the project

```
cd c:\Projects\simpleTestcasesApp
```

### 2. Install all dependencies

```bash
# Install server deps
npm install --prefix server

# Install client deps
npm install --prefix client

# (Optional) install root dev deps for the `npm run dev` shortcut
npm install
```

### 3. Configure the server

```bash
# Copy the example and fill in your values
copy .env.example server\.env   # Windows
cp  .env.example  server/.env   # macOS / Linux
```

Open `server/.env` and set:

| Variable | Description |
|---|---|
| `PORT` | Express port (default `3001`) |
| `CLIENT_ORIGIN` | Vite dev server origin (default `http://localhost:5173`) |
| `GROQ_API_KEY` | Your Groq API key — get one at [console.groq.com/keys](https://console.groq.com/keys) |
| `ALLOW_LOCAL_ENDPOINTS` | Set to `true` **only in dev** to allow calling `localhost` endpoints (Ollama, LM Studio) |

### 4. Run both servers

**Option A — single command (recommended)**

```bash
npm run dev   # from project root — starts server + client concurrently
```

**Option B — separate terminals**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Using Groq (cloud)

1. Set `GROQ_API_KEY` in `server/.env`
2. In the UI, select **Groq (Cloud)** and pick a model (e.g. `llama-3.3-70b-versatile`)
3. Paste your user story and click **Generate Test Cases**

---

## Using a Local LLM

### Ollama

```bash
# Install: https://ollama.com
ollama pull llama3.1:8b
ollama serve              # starts on http://localhost:11434 by default
```

In `server/.env`:
```
ALLOW_LOCAL_ENDPOINTS=true
```

In the UI:
- Provider: **Local LLM**
- Model: `llama3.1:8b`
- Endpoint: `http://localhost:11434`

### LM Studio

1. Download [LM Studio](https://lmstudio.ai/), load a model
2. Enable **Local Server** (Settings → Local Server → Start Server)
3. Default endpoint: `http://localhost:1234`

In `server/.env`:
```
ALLOW_LOCAL_ENDPOINTS=true
```

In the UI:
- Provider: **Local LLM**
- Endpoint: `http://localhost:1234`
- API Key: leave blank (LM Studio doesn't require one by default)

---

## API Reference

### `GET /api/health`

Returns `{ "status": "ok", "timestamp": "..." }`

---

### `POST /api/generate-test-cases`

**Request body**

```json
{
  "userStory": "As a customer, I want to reset my password so that I can regain access to my account.",
  "options": {
    "categories": ["positive", "negative", "edge", "e2e"]
  },
  "llm": {
    "provider": "groq",
    "model": "llama-3.3-70b-versatile",
    "endpoint": "http://localhost:11434",
    "apiKey": "optional-for-local-servers"
  }
}
```

**Success response**

```json
{
  "success": true,
  "testCases": [
    {
      "id": "TC-POS-01",
      "category": "positive",
      "title": "Successful password reset with valid email",
      "preconditions": "A registered account exists for user@example.com",
      "steps": ["Navigate to login page", "Click 'Forgot password'", "..."],
      "expectedResult": "A password reset email is sent within 60 seconds",
      "priority": "High"
    }
  ],
  "provider_used": "groq",
  "model_used": "llama-3.3-70b-versatile",
  "latency_ms": 2341
}
```

**Error response**

```json
{ "success": false, "error": "userStory must be at least 20 characters" }
```

HTTP status codes: `400` (validation), `502` (LLM error / bad JSON), `504` (timeout)

---

## Project Structure

```
testcase-generator/
├── client/                         # React + Vite frontend
│   ├── src/
│   │   ├── api/generateTestCases.js
│   │   ├── components/
│   │   │   ├── LLMSelector.jsx     # Provider / model / endpoint selector
│   │   │   ├── StoryInput.jsx      # Story textarea + category checkboxes
│   │   │   ├── ResultsPanel.jsx    # Grouped test case display
│   │   │   ├── TestCaseCard.jsx    # Individual test case card with copy button
│   │   │   └── ErrorBanner.jsx     # Error display with retry
│   │   ├── hooks/useTestCaseGenerator.js
│   │   ├── utils/exportUtils.js    # JSON / CSV export + clipboard
│   │   └── App.jsx
│   └── vite.config.js              # Proxy: /api → localhost:3001
│
├── server/                         # Node.js + Express backend
│   ├── src/
│   │   ├── index.js                # Entry point, rate limiting, CORS
│   │   ├── routes/generate.js      # POST /api/generate-test-cases
│   │   ├── services/llm/
│   │   │   ├── getLLM.js           # Provider factory
│   │   │   ├── providers/
│   │   │   │   ├── groq.js         # Groq (cloud) provider
│   │   │   │   └── local.js        # Local / Ollama / LM Studio provider
│   │   │   └── prompts/
│   │   │       └── systemPrompt.js # System prompt + few-shot examples
│   │   └── validators/
│   │       └── generateRequest.js  # Input + SSRF validation
│   └── .env.example
│
├── .env.example                    # Root-level example (copy to server/.env)
├── package.json                    # Root: concurrently dev script
└── README.md
```

---

## Security Notes

- **API keys**: The Groq API key is read from `server/.env` and never logged in full (masked as `gsk_***...ab12`). Per-request key overrides from the UI are held only in memory for the duration of the request.
- **localStorage**: The UI persists LLM config (including optional local API keys) to `localStorage`. This data stays in your browser and is only transmitted to your own backend when you click Generate — never to any third party directly.
- **SSRF guard**: The local provider endpoint is validated against private/loopback IP patterns before any outbound request is made. Set `ALLOW_LOCAL_ENDPOINTS=true` only in development.
- **Rate limiting**: 10 generation requests per minute per IP; 60 requests per minute globally.
- **Input limits**: User story capped at 4000 characters; request body capped at 32 KB.

---

## Adding Persistence (future)

The service layer uses plain in-memory objects. To add Postgres:
1. Create `server/src/repositories/testCaseRepository.js` wrapping a DB client
2. Inject it into `routes/generate.js` after a successful generation
3. Add a `GET /api/test-cases` route to retrieve history

No structural changes to the LLM pipeline are needed.
