// routes/usersRoutes.js
import express from "express";
import User from "../models/User.js";
import { protect, directorOnly } from "../middleware/authMiddleware.js";
import asyncHandler from "express-async-handler"; // npm i express-async-handler

const router = express.Router();

/**
 * GET /users
 * - Director only
 * - Returns all users (without passwords)
 */
router.get(
  "/",
  protect,
  directorOnly,
  asyncHandler(async (req, res) => {
    const users = await User.find()
      .select("-password -__v") // exclude password & version key
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  })
);

/**
 * POST /users
 * - Create new user (director only)
 * - Enforces branch requirement for manager/agent
 */
router.post(
  "/",
  protect,
  directorOnly,
  asyncHandler(async (req, res) => {
    const { name, email, password, role, branch } = req.body;

    // Required fields
    if (!name?.trim() || !email?.trim() || !password || !role) {
      res.status(400);
      throw new Error("Name, email, password, and role are required.");
    }

    // Role validation
    const validRoles = ["director", "manager", "agent"];
    if (!validRoles.includes(role)) {
      res.status(400);
      throw new Error(`Invalid role. Allowed: ${validRoles.join(", ")}`);
    }

    // Branch enforcement
    const validBranches = ["Maganjo", "Matugga"];
    if (["manager", "agent"].includes(role)) {
      if (!branch || !validBranches.includes(branch)) {
        res.status(400);
        throw new Error(
          `Managers and agents must be assigned to a valid branch: ${validBranches.join(", ")}`
        );
      }
    } else if (role === "director" && branch) {
      // Optional: warn or prevent branch on director
    }

    // Check email uniqueness
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409);
      throw new Error("Email address is already in use.");
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // hashed in model pre-save
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
 * PUT /users/:id
 * - Update user (director only)
 * - Allows partial updates
 */
router.put(
  "/:id",
  protect,
  directorOnly,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const { name, email, role, branch, isActive } = req.body;

    // Prevent self-demotion or branch violation
    if (req.user._id.toString() === req.params.id) {
      if (role && role !== user.role) {
        res.status(403);
        throw new Error("You cannot change your own role.");
      }
    }

    // Branch validation on role change
    if (role && ["manager", "agent"].includes(role) && !branch) {
      res.status(400);
      throw new Error("Managers and agents must have a branch assigned.");
    }

    // Update only provided fields
    if (name) user.name = name.trim();
    if (email) {
      const existing = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: user._id },
      });
      if (existing) {
        res.status(409);
        throw new Error("Email already in use by another user.");
      }
      user.email = email.toLowerCase().trim();
    }
    if (role) user.role = role;
    if (branch !== undefined) user.branch = branch || undefined; // allow clearing for director
    if (isActive !== undefined) user.isActive = !!isActive;

    const updated = await user.save();

    res.json({
      success: true,
      message: "User updated successfully",
      data: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        branch: updated.branch,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      },
    });
  })
);

/**
 * DELETE /users/:id
 * - Director only
 * - Prevent self-deletion
 */
router.delete(
  "/:id",
  protect,
  directorOnly,
  asyncHandler(async (req, res) => {
    if (req.user._id.toString() === req.params.id) {
      res.status(403);
      throw new Error("You cannot delete your own account.");
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: `User ${user.name} (${user.email}) deleted successfully`,
    });
  })
);

export default router;