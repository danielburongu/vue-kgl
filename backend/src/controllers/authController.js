// controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// uncomment only after npm install express-validator
// import { validationResult } from "express-validator";

/**
 * REGISTER - Create a new user
 * Currently open — in production restrict to director only via middleware
 */
export const register = async (req, res) => {
  try {
    // Optional express-validator check (uncomment if installed)
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Validation failed",
    //     errors: errors.array(),
    //   });
    // }

    const { name, email, password, role, branch } = req.body;

    // Required fields
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Normalize & check existing user
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email address is already in use",
      });
    }

    // Role & branch validation
    const validRoles = ["director", "manager", "agent"];
    const validBranches = ["Maganjo", "Matugga"];

    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed: ${validRoles.join(", ")}`,
      });
    }

    if (branch && !validBranches.includes(branch)) {
      return res.status(400).json({
        success: false,
        message: `Invalid branch. Allowed: ${validBranches.join(", ")}`,
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password, // hashed via pre-save hook
      role: role || "agent",
      branch: role === "director" ? undefined : (branch || "Maganjo"),
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: selectSafeUserFields(user),
    });
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    handleErrorResponse(res, error, "Registration failed");
  }
};

/**
 * LOGIN
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const passwordValid = await user.comparePassword(password);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    // Non-blocking lastLogin update
    user.lastLogin = new Date();
    user.save({ validateBeforeSave: false }).catch((err) => {
      console.warn("[LOGIN] Failed to update lastLogin:", err.message);
    });

    res.json({
      success: true,
      token,
      user: selectSafeUserFields(user),
    });
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    handleErrorResponse(res, error, "Login failed");
  }
};

/**
 * GET /me - Protected route to get current user
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -__v -resetPasswordToken -resetPasswordExpire"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: selectSafeUserFields(user),
    });
  } catch (error) {
    console.error("[GET ME ERROR]", error);
    handleErrorResponse(res, error, "Failed to fetch user profile");
  }
};

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      branch: user.branch,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

function selectSafeUserFields(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch: user.branch,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function handleErrorResponse(res, error, defaultMessage) {
  const status = error.name === "ValidationError" ? 400 : 500;
  const isDev = process.env.NODE_ENV !== "production";

  res.status(status).json({
    success: false,
    message: isDev ? error.message || defaultMessage : defaultMessage,
    ...(isDev && { error: error.message, stack: error.stack?.split("\n").slice(0, 5) }),
  });
}