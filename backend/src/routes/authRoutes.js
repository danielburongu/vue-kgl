// routes/authRoutes.js
import express from "express";
import { register, login } from "../controllers/authController.js";
import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration and login endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account (implementation in authController)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [director, manager, agent]
 *               branch:
 *                 type: string
 *                 enum: [Maganjo, Matugga]
 *                 description: Required for manager/agent roles
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or missing fields
 *       409:
 *         description: Email already in use
 *       429:
 *         description: Too many registration attempts
 */
router.post("/register", register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user and get JWT token
 *     description: Authenticates user and returns JWT access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful - returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     branch:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/ping:
 *   get:
 *     summary: Health check for auth service
 *     description: Simple endpoint to verify auth routes are reachable
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Auth service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/ping", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Auth service is alive",
    timestamp: new Date().toISOString(),
  });
});

export default router;