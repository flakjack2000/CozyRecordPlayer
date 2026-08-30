import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // OAuth Callback Route (popup sends postMessage to opener and closes)
  const callbackHandler = (req: express.Request, res: express.Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating with Spotify...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #121212;
              color: #ffffff;
            }
            .card {
              text-align: center;
              padding: 2.5rem;
              background: #1e1e1e;
              border-radius: 16px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.5);
              max-width: 360px;
            }
            .spinner {
              border: 3px solid rgba(255,255,255,0.1);
              border-top: 3px solid #1DB954;
              border-radius: 50%;
              width: 36px;
              height: 36px;
              animation: spin 1s linear infinite;
              margin: 0 auto 1.5rem;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h2 style="margin: 0 0 8px; font-size: 1.25rem;">Connecting Spotify</h2>
            <p style="color: #a7a7a7; font-size: 0.9rem; margin: 0;">Transferring authorization to your Vinyl Shelf...</p>
          </div>
          <script>
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const error = params.get('error');
            const state = params.get('state');

            if (window.opener) {
              window.opener.postMessage({
                type: 'SPOTIFY_AUTH_SUCCESS',
                code: code,
                error: error,
                state: state
              }, '*');
              setTimeout(() => {
                window.close();
              }, 600);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  };

  app.get(["/auth/callback", "/auth/callback/"], callbackHandler);

  // App Environment Configuration API
  app.get("/api/config", (req, res) => {
    res.json({
      spotifyClientId: process.env.SPOTIFY_CLIENT_ID || "",
      appUrl: process.env.APP_URL || "",
    });
  });

  // Proxy endpoint for Spotify Token exchange (if client prefers backend proxy)
  app.post("/api/spotify/token", async (req, res) => {
    try {
      const { code, code_verifier, redirect_uri, client_id, refresh_token, grant_type } = req.body;
      const actualClientId = client_id || process.env.SPOTIFY_CLIENT_ID;

      if (!actualClientId) {
        return res.status(400).json({ error: "Missing Spotify Client ID" });
      }

      const bodyParams = new URLSearchParams();
      if (grant_type === "refresh_token") {
        bodyParams.append("grant_type", "refresh_token");
        bodyParams.append("refresh_token", refresh_token);
        bodyParams.append("client_id", actualClientId);
      } else {
        bodyParams.append("grant_type", "authorization_code");
        bodyParams.append("code", code);
        bodyParams.append("redirect_uri", redirect_uri);
        bodyParams.append("client_id", actualClientId);
        bodyParams.append("code_verifier", code_verifier);
      }

      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      });

      const data = await tokenResponse.json();
      if (!tokenResponse.ok) {
        return res.status(tokenResponse.status).json(data);
      }

      res.json(data);
    } catch (err: any) {
      console.error("Token exchange error:", err);
      res.status(500).json({ error: "Failed to exchange token", details: err.message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vinyl Shelf Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
