# AI Service (Images + Chat)

A Dockerized Flask service for generating images and chat completions using OpenAI APIs.

## Setup

1. **Create `.env` file** in the `dalle` directory:

```bash
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Image model (for OpenAI: dall-e-2, dall-e-3)
IMAGE_MODEL=dall-e-3

# Chat model (for OpenAI: gpt-4o-mini, gpt-4o, gpt-3.5-turbo)
CHAT_MODEL=gpt-4o-mini

# Server configuration
PORT=5000
HOST=0.0.0.0
DEBUG=False
```

2. **Build and start the service**:

```bash
cd /path/to/roam-jet
docker compose up -d dalle
```

3. **Setup SSL certificate** for `dalle.roamjet.net`:

```bash
# Make sure nginx is running first
docker compose up -d nginx

# Request certificate (replace your-email@example.com with your email)
# For Docker Compose V2 (docker compose with space):
# Note: Need to override entrypoint because certbot service has custom entrypoint
docker compose run --rm --entrypoint "" certbot certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d dalle.roamjet.net

# For Docker Compose V1 (docker-compose with hyphen):
# docker-compose run --rm --entrypoint "" certbot certbot certonly --webroot \
#   --webroot-path=/var/www/certbot \
#   --email your-email@example.com \
#   --agree-tos \
#   --no-eff-email \
#   -d dalle.roamjet.net

# Alternative: Run certbot directly with docker run
# docker run --rm -v $(pwd)/certbot/www:/var/www/certbot -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d dalle.roamjet.net

# After certificate is obtained, update nginx.conf to redirect HTTP to HTTPS
# Then reload nginx
docker compose exec nginx nginx -s reload
```

**Quick command (copy and paste, replace email):**
```bash
# Docker Compose V2 (with entrypoint override):
docker compose run --rm --entrypoint "" certbot certbot certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d dalle.roamjet.net

# Docker Compose V1:
# docker-compose run --rm --entrypoint "" certbot certbot certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d dalle.roamjet.net

# Alternative: Direct docker run (works from any directory):
# docker run --rm -v $(pwd)/certbot/www:/var/www/certbot -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d dalle.roamjet.net
```

## API Endpoints

### POST `/generate`

Generate an image from a text prompt.

**Request:**
```json
{
  "prompt": "A beautiful, delicious-looking plate of pasta",
  "size": "1024x1024"
}
```

**Response:**
```json
{
  "url": "https://...",
  "revised_prompt": "A beautiful, delicious-looking plate of pasta..."
}
```

**Size options:**
- DALL-E 3: `1024x1024`, `1792x1024`, `1024x1792`
- DALL-E 2: `256x256`, `512x512`, `1024x1024`

### POST `/chat`

Generate chat completion from messages or prompt.

**Request (OpenAI format):**
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "max_tokens": 4000
}
```

**Request (Simple prompt format):**
```json
{
  "prompt": "Hello, how are you?",
  "model": "gpt-4o-mini",
  "temperature": 0.7
}
```

**Response (OpenAI compatible):**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "dalle"
}
```

## Usage from Frontend

The service is configured to work with the Muscle Up app.

### Image Generation
```javascript
const response = await fetch('https://dalle.roamjet.net/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'Your image description here',
    size: '1024x1024'
  })
});

const data = await response.json();
console.log(data.url); // Image URL
```

### Chat Completion
```javascript
const response = await fetch('https://dalle.roamjet.net/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      {role: 'user', content: 'Hello, how are you?'}
    ],
    model: 'gpt-4o-mini'
  })
});

const data = await response.json();
console.log(data.choices[0].message.content); // Chat response
```

## Troubleshooting

- **Check logs**: `docker-compose logs dalle`
- **Test image generation**: `curl -X POST http://localhost:5006/generate -H "Content-Type: application/json" -d '{"prompt":"test"}'`
- **Test chat completion**: `curl -X POST http://localhost:5006/chat -H "Content-Type: application/json" -d '{"prompt":"Hello"}'`
- **Verify API key**: Make sure your `.env` file has the correct API key

