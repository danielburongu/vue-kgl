// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "express-async-handler";

/**
 * Protect routes — verifies JWT and attaches user to req.user
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Bearer token from Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  
  // else if (req.cookies?.jwt) {
  //   token = req.cookies.jwt;
  // }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized — no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user (exclude sensitive fields)
    req.user = await User.findById(decoded.id).select(
      "-password -__v -resetPasswordToken -resetPasswordExpire"
    );

    if (!req.user) {
      res.status(401);
      throw new Error("User associated with this token no longer exists");
    }

    // Check account status
    if (!req.user.isActive) {
      res.status(403);
      throw new Error("Account is deactivated — contact support");
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      res.status(401);
      throw new Error("Session expired — please log in again");
    }

    if (error.name === "JsonWebTokenError") {
      res.status(401);
      throw new Error("Invalid token signature");
    }

    res.status(401);
    throw new Error("Not authorized — invalid token");
  }
});

/**
 * Restrict access to director role only
 */
export const directorOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "director") {
    res.status(403);
    throw new Error("Access denied — director privileges required");
  }
  next();
};

/**
 * Restrict access to operations roles (manager or agent)
 */
export const operationsOnly = (req, res, next) => {
  if (!req.user || !["manager", "agent"].includes(req.user.role)) {
    res.status(403);
    throw new Error("Access denied — operations team only (manager/agent)");
  }
  next();
};

/**
 * Restrict access to specific branch(es)
 * Usage examples:
 *   - branchOnly("Maganjo")
 *   - branchOnly(["Maganjo", "Matugga"])
 */
export const branchOnly = (allowedBranches) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authenticated");
    }

    const allowed = Array.isArray(allowedBranches)
      ? allowedBranches
      : [allowedBranches];

    if (!allowed.includes(req.user.branch)) {
      res.status(403);
      throw new Error(
        `Access restricted to branch: ${allowed.join(", ")}. Your branch: ${req.user.branch || "none"}`
      );
    }

    next();
  };
};

/**
 * Flexible role-based access control
 * Usage: restrictTo("director", "manager")
 */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Access denied. Allowed roles: ${allowedRoles.join(", ")}`
      );
    }
    next();
  };
};