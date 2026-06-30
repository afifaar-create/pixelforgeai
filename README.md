# PixelForge AI

A professional AI image generation website with user accounts, history, and modern UI.

## Features

- Professional landing page with responsive mobile layout
- User account registration and login using phone number
- History tracking for image generation requests
- Multi-image generation support (1-4 images)
- Download generated images
- Public-facing pages: Dashboard, Settings, Contact, About, Terms, Privacy

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file containing your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```

3. Start the server:
   ```bash
   npm start
   ```

3. Open `http://localhost:3000` in your browser.

## Deployment

This app is configured for deployment on Render.

### Render deployment steps

1. Create a new Web Service on Render.
2. Connect your repository.
3. Set the build command to `npm install`.
4. Set the start command to `npm start`.
5. Add `GEMINI_API_KEY` as a secret environment variable.
6. Deploy and use the generated public URL.

## Notes

- The server stores users and history in the `data/` directory.
- Image generation uses the Pollinations API and returns generated image URLs.
- For production, consider replacing the free image endpoint with a paid AI image service and add authentication.
