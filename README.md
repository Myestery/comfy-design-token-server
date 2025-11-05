# Comfy Design Token Server

Automated server for syncing Figma design tokens to GitHub using Claude AI for intelligent CSS merging.

## Overview

This server receives CSS design tokens from a Figma plugin, uses Claude AI to intelligently merge them with existing tokens in the GitHub repository, and automatically creates or updates pull requests.

## Features

- **Automated CSS Merging**: Uses Claude AI to intelligently merge new tokens while preserving existing formatting and comments
- **Smart Branch Management**: Automatically detects if previous PR was merged and creates new branch or updates existing one
- **GitHub Integration**: Creates and manages pull requests automatically
- **Simple Webhook**: Single endpoint to receive updates from Figma plugin

## Architecture

```
Figma Plugin → Transform to CSS → POST to Webhook
                                        ↓
                        Server receives CSS → Fetch current CSS from GitHub
                                        ↓
                        Claude AI merges CSS files
                                        ↓
                        Push to GitHub → Create/Update PR
```

## Installation

1. Clone the repository and navigate to the server directory:
```bash
cd comfy-design-token-server
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

4. Edit `.env` with your API keys and configuration:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=Comfy-Org
GITHUB_REPO=ComfyUI_frontend
TARGET_FILE_PATH=packages/design-system/src/css/style.css
BOT_BRANCH=bot-update-design-tokens
PORT=3000
```

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude AI
- `GITHUB_TOKEN`: Personal access token for user myestery with repo permissions
- `GITHUB_OWNER`: GitHub organization (Comfy-Org)
- `GITHUB_REPO`: Repository name (ComfyUI_frontend)
- `TARGET_FILE_PATH`: Path to the CSS file in the repo
- `BOT_BRANCH`: Branch name for automated updates (bot-update-design-tokens)
- `PORT`: Server port (default: 3000)

### GitHub Token Permissions

The GitHub token needs the following permissions:
- `repo` (Full control of private repositories)

## Usage

### Development

Start the server in development mode with auto-restart:
```bash
npm run dev
```

### Production

Start the server:
```bash
npm start
```

The server will start on the configured PORT (default: 3000) and display:
```
🚀 Comfy Design Token Server
📡 Listening on port 3000
🔗 Webhook URL: http://localhost:3000/webhook/figma-tokens
✅ Server ready to receive design token updates
```

## Workflow

1. **Figma Plugin Export**: User clicks "Export Variables" in Figma plugin
2. **CSS Generation**: Plugin transforms Figma variables to CSS
3. **Webhook POST**: Plugin sends CSS to server endpoint
4. **Branch Check**: Server checks if `bot-update-design-tokens` branch exists
   - **If NO**: Previous PR was merged
     - Fetch CSS from `main` branch
     - Create new `bot-update-design-tokens` branch
   - **If YES**: Branch exists with open PR
     - Fetch CSS from `bot-update-design-tokens` branch
5. **Claude AI Merge**: Server sends both CSS files to Claude with merge instructions
6. **GitHub Update**: Server pushes merged CSS to `bot-update-design-tokens` branch
7. **PR Management**:
   - If no PR exists: Create new PR with title "[automated] Update Design Tokens"
   - If PR exists: Updated branch will show in existing PR
8. **Response**: Server returns PR URL to Figma plugin

## API Endpoints

### `GET /`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Comfy Design Token Server",
  "version": "1.0.0"
}
```

### `POST /webhook/figma-tokens`

Receive CSS design tokens from Figma plugin.

**Request:**
- Content-Type: `text/plain`
- Body: CSS string

**Response (Success):**
```json
{
  "success": true,
  "message": "Design tokens updated successfully",
  "prUrl": "https://github.com/Comfy-Org/ComfyUI_frontend/pull/123"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Deployment

### Local Testing with ngrok

1. Start the server locally:
```bash
npm start
```

2. In another terminal, start ngrok:
```bash
ngrok http 3000
```

3. Update the Figma plugin's `WEBHOOK_URL` to the ngrok URL:
```typescript
const WEBHOOK_URL = 'https://your-ngrok-url.ngrok.io/webhook/figma-tokens';
```

### Production Deployment

Deploy to any Node.js hosting service:

- **Railway**: Connect GitHub repo, set environment variables
- **Render**: Deploy as Web Service, add environment variables
- **Vercel**: Deploy as Serverless Function (adjust server.js for serverless)
- **Heroku**: Deploy with Procfile: `web: node src/server.js`

## Project Structure

```
comfy-design-token-server/
├── src/
│   ├── server.js           # Express server and webhook endpoint
│   ├── workflow.js         # Main workflow orchestration
│   ├── claude-merger.js    # Claude AI CSS merging
│   ├── github-client.js    # GitHub API operations
│   └── css-parser.js       # CSS parsing utilities
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Error Handling

The server includes comprehensive error handling:
- Missing environment variables
- GitHub API errors (rate limits, permissions)
- Claude API errors (invalid key, rate limits)
- Invalid webhook payloads

All errors are logged to console and returned to the client with appropriate HTTP status codes.

## Development

### Adding New Features

The modular architecture makes it easy to extend:

- **GitHub operations**: Edit `src/github-client.js`
- **Claude prompts**: Edit `src/claude-merger.js`
- **Workflow logic**: Edit `src/workflow.js`
- **API endpoints**: Edit `src/server.js`

### Testing

Test the webhook locally with curl:

```bash
curl -X POST http://localhost:3000/webhook/figma-tokens \
  -H "Content-Type: text/plain" \
  -d ":root { --test-color: #ff0000; }"
```

## License

MIT
