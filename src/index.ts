import "reflect-metadata";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { AppDataSource } from "./data-source";
import { config } from "./config";
import { Server as SocketIOServer } from "socket.io";
import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import {
  requestLogger,
  notFoundHandler,
} from "./middleware/logging.middleware";
import { createServer } from "http";
import { setupSocketHandlers } from "./ws/socket.handler";
import { AgoraService } from "./services/agora.service";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

const PORT = config.port;

// Middleware - More permissive CORS for development
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check route
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Agora test endpoint (for debugging)
app.get("/api/test-agora", (req: Request, res: Response) => {
  try {
    const agoraService = new AgoraService();
    const testChannel = "test-channel-" + Date.now();
    const testUid = 12345;

    const publisherToken = agoraService.generatePublisherToken(
      testChannel,
      testUid
    );
    const subscriberToken = agoraService.generateSubscriberToken(
      testChannel,
      0
    );

    res.json({
      success: true,
      message: "Agora token generation test successful",
      config: {
        configured: agoraService.isConfigured(),
        appId: agoraService.getAppId(),
      },
      publisher: {
        channelName: publisherToken.channelName,
        uid: publisherToken.uid,
        token: publisherToken.token.substring(0, 50) + "...",
        tokenLength: publisherToken.token.length,
        expiresAt: publisherToken.expiresAt,
      },
      subscriber: {
        channelName: subscriberToken.channelName,
        uid: subscriberToken.uid,
        token: subscriberToken.token.substring(0, 50) + "...",
        tokenLength: subscriberToken.token.length,
        expiresAt: subscriberToken.expiresAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// API routes
app.use("/api", routes);

setupSocketHandlers(io);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
AppDataSource.initialize()
  .then(() => {
    console.log("✅ Database connected successfully");
    httpServer.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket server is ready`);
    });
  })
  .catch((error) => {
    console.error("❌ Error during Data Source initialization:", error);
    process.exit(1);
  });

export default app;
