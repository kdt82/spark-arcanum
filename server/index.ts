import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { updateCardDatabase } from "./cron/database-update";

const app = express();

// Configure Express to handle large JSON files
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ extended: true, limit: '1000mb' }));

// Note: Timeout will be set on the HTTP server instance later

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Start server first
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Import and initialize MTG JSON service after server starts
    // This will populate the database with cards if needed
    import('./mtg/mtgjson-service').then(module => {
      const mtgJsonService = module.mtgJsonService;
      mtgJsonService.initialize().catch((initError: any) => {
        console.error("Failed to initialize MTG JSON service:", initError);
      });
      
      // Set up the cron job to update the card database
      // This will run every 24 hours to check for updates
      import('./cron/database-update').then(cronModule => {
        // Run the initial update check
        log("Setting up database update cron job");
        cronModule.updateCardDatabase().catch((cronError: any) => {
          console.error("Failed to run initial database update:", cronError);
        });
        
        // Schedule to run every 24 hours
        const HOURS_24 = 24 * 60 * 60 * 1000;
        setInterval(() => {
          log("Running scheduled database update");
          cronModule.updateCardDatabase().catch((cronError: any) => {
            console.error("Failed to run scheduled database update:", cronError);
          });
        }, HOURS_24);
      }).catch((cronImportError: any) => {
        console.error("Failed to import database update cron:", cronImportError);
      });
    }).catch((importError: any) => {
      console.error("Failed to import MTG JSON service:", importError);
    });
  });
})();
