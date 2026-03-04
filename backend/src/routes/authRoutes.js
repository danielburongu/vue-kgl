// routes/authRoutes.js
import express from "express";
import { register, login } from "../controllers/authController.js";
import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";

const router = express.Router();

// ───────────────────────────────────────────────
// Rate limiting — protects against brute-force attacks
// ───────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 minutes
  max: 10,                           // max 10 attempts per IP in window
  message: {
    success: false,
    message: "Too many login/registration attempts from this IP. Try again later.",
  },
  standardHeaders: true,             // sends RateLimit-* headers
  legacyHeaders: false,
  statusCode: 429,                   // proper 429 Too Many Requests

  // Use the official helper — handles IPv4 + IPv6 correctly
  keyGenerator: ipKeyGenerator,
});

// Apply to all auth routes
router.use(authLimiter);

// ───────────────────────────────────────────────
// Routes
// ───────────────────────────────────────────────

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// quick health check 
router.get("/ping", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Auth service is alive",
    timestamp: new Date().toISOString(),
  });
});

export default router;