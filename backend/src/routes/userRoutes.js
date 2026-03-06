import express from "express";
import User from "../models/User.js";
import { protect, directorOnly } from "../middleware/authMiddleware.js";
import asyncHandler from "express-async-handler";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints (Director only)
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Returns a list of all users (passwords excluded). Director only.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       branch:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not a director
 */
router.get(
  "/",
  protect,
  directorOnly,
  asyncHandler(async (req, res) => {
    const users = await User.find()
      .select("-password -__v")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  })
);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     description: Director only. Managers and agents must have a branch.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *               role:
 *                 type: string
 *                 enum: [director, manager, agent]
 *               branch:
 *                 type: string
 *                 enum: [Maganjo, Matugga]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already in use
 */
router.post(
  "/",
  protect,
  directorOnly,
  asyncHandler(async (req, res) => {
    const { name, email, password, role, branch } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !role) {
      res.status(400);
      throw new Error("Name, email, password, and role are required.");
    }

    const validRoles = ["director", "manager", "agent"];
    if (!validRoles.includes(role)) {
      res.status(400);
      throw new Error(`Invalid role. Allowed: ${validRoles.join(", ")}`);
    }

    const validBranches = ["Maganjo", "Matugga"];
    if (["manager", "agent"].includes(role)) {
      if (!branch || !validBranches.includes(branch)) {
        res.status(400);
        throw new Error(
          `Managers and agents must be assigned to a valid branch: ${validBranches.join(", ")}`
        );
      }
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409);
      throw new Error("Email address is already in use.");
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      branch: role === "director" ? undefined : branch,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        createdAt: user.createdAt,
      },
    });
  })
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     description: Partial update. Director only. Cannot change own role.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [director, manager, agent]
 *               branch:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Forbidden (e.g. self-role change)
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 */
router.put(
  "/:id",
  protect,
  directorOnly,
  asyncHandler(async (req, res) => {
  })
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Director only. Cannot delete self.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Cannot delete own account
 *       404:
 *         description: User not found
 */
router.delete(
  "/:id",
  protect,
  directorOnly,
  asyncHandler(async (req, res) => {
  })
);

export default router;