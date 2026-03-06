// src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "node:dns/promises";
import swaggerUi from "swagger-ui-express";          
import swaggerSpec from "./config/swagger.js";        

// reliable DNS servers (Cloudflare + Google)
dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"]);
console.log("DNS servers set to:", dns.getServers());


// Import routes

import authRoutes        from "./routes/authRoutes.js";
import userRoutes        from "./routes/userRoutes.js";
import procurementRoutes from "./routes/procurementRoutes.js";
import salesRoutes       from "./routes/salesRoutes.js";


// Initialize Express app

const app = express();


// Middleware

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Swagger UI Documentation                 
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,           // keeps token after page refresh
    },
    customCss: ".swagger-ui .topbar { background-color: #1a365d; }",
    customSiteTitle: "Karibu Groceries API",
  })
);


// Routes
app.use("/api/auth",        authRoutes);
app.use("/api/users",       userRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/sales",       salesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[GLOBAL ERROR]", err);

  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// MongoDB + Server startup
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in .env file");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {

    console.log(" MongoDB Connected Successfully ");
    console.log(`Environment:   ${process.env.NODE_ENV || "development"}`);
    console.log(`Port:          ${PORT}`);
    console.log(`MongoDB URI:   ${MONGO_URI.includes("mongodb+srv") ? "mongodb+srv://..." : MONGO_URI}`);
    console.log("Server starting...");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Health check:  http://localhost:${PORT}/health`);
      console.log(`API Docs:      http://localhost:${PORT}/api-docs`); 
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:");
    console.error(err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

function gracefulShutdown() {
  console.log("\nReceived shutdown signal. Closing server...");
  mongoose.connection.close(false, () => {
    console.log("MongoDB connection closed.");
    process.exit(0);
  });
}