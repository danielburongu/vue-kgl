// routes/procurementRoutes.js
import express from "express";
import Procurement from "../models/Procurement.js";
import { protect, operationsOnly, branchOnly } from "../middleware/authMiddleware.js";
import asyncHandler from "express-async-handler";

const router = express.Router();

// ───────────────────────────────────────────────
// Helper: Validate input (moved to separate function for reuse)
const validateProcurementInput = (data, isUpdate = false) => {
  const errors = [];

  // produceName
  if (!data.produceName?.trim()) {
    errors.push("Produce name is required");
  } else if (!/^[a-zA-Z0-9\s\-&']{2,100}$/.test(data.produceName.trim())) {
    errors.push("Produce name must be 2–100 alphanumeric characters (spaces, -, &, ' allowed)");
  }

  // produceType (assuming enum from model)
  if (!data.produceType) {
    errors.push("Produce type is required");
  }

  // tonnage
  if (!data.tonnage || data.tonnage < 1) {
    errors.push("Tonnage must be at least 1 kg");
  }

  // cost
  if (!data.cost || data.cost < 1000) {
    errors.push("Total cost must be at least UGX 1,000");
  }

  // sellingPrice & margin check
  if (data.tonnage && data.cost && data.sellingPrice) {
    const costPerKg = data.cost / data.tonnage;
    if (data.sellingPrice <= costPerKg) {
      errors.push(`Selling price per kg must be higher than cost per kg (UGX ${costPerKg.toFixed(0)})`);
    }
  } else if (!data.sellingPrice) {
    errors.push("Selling price per kg is required");
  }

  // dealerName
  if (!data.dealerName?.trim() || data.dealerName.trim().length < 2) {
    errors.push("Dealer/supplier name must be at least 2 characters");
  }

  // dealerContact (Ugandan phone)
  if (!data.dealerContact?.match(/^(?:\+256|0)7[0-9]{8}$/)) {
    errors.push("Dealer contact must be a valid Ugandan phone number (e.g. 077xxxxxxx or +2567xxxxxxx)");
  }

  // On update: prevent changing critical fields
  if (isUpdate) {
    const protectedFields = ["branch", "recordedBy"];
    protectedFields.forEach(field => {
      if (data[field] !== undefined) {
        errors.push(`Cannot modify ${field} on update`);
      }
    });
  }

  return errors.length > 0 ? errors.join(" • ") : null;
};

// ───────────────────────────────────────────────
// CREATE procurement (manager/agent only)
router.post(
  "/",
  protect,
  operationsOnly,
  branchOnly(["Maganjo", "Matugga"]),
  asyncHandler(async (req, res) => {
    const validationError = validateProcurementInput(req.body);
    if (validationError) {
      res.status(400);
      throw new Error(validationError);
    }

    const procurement = await Procurement.create({
      ...req.body,
      branch: req.user.branch,
      recordedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Procurement recorded successfully",
      data: procurement,
    });
  })
);

// ───────────────────────────────────────────────
// GET all procurements
// - Director: all branches
// - Others: own branch only
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = req.user.role === "director" ? {} : { branch: req.user.branch };

    // Optional filters via query params
    const { produceName, produceType, startDate, endDate } = req.query;

    if (produceName) filter.produceName = { $regex: produceName, $options: "i" };
    if (produceType) filter.produceType = produceType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const procurements = await Procurement.find(filter)
      .sort({ createdAt: -1 })
      .populate("recordedBy", "name email");

    res.json({
      success: true,
      count: procurements.length,
      data: procurements,
    });
  })
);

// ───────────────────────────────────────────────
// UPDATE procurement (manager/agent only, same branch)
router.put(
  "/:id",
  protect,
  operationsOnly,
  asyncHandler(async (req, res) => {
    const procurement = await Procurement.findById(req.params.id);

    if (!procurement) {
      res.status(404);
      throw new Error("Procurement record not found");
    }

    // Branch protection
    if (procurement.branch !== req.user.branch) {
      res.status(403);
      throw new Error("You are not authorized to modify records from another branch");
    }

    const validationError = validateProcurementInput(req.body, true);
    if (validationError) {
      res.status(400);
      throw new Error(validationError);
    }

    // Prevent changing critical fields
    delete req.body.branch;
    delete req.body.recordedBy;

    Object.assign(procurement, req.body);

    const updated = await procurement.save();

    res.json({
      success: true,
      message: "Procurement updated successfully",
      data: updated,
    });
  })
);

// ───────────────────────────────────────────────
// DELETE procurement (manager/agent only, same branch)
router.delete(
  "/:id",
  protect,
  operationsOnly,
  asyncHandler(async (req, res) => {
    const procurement = await Procurement.findById(req.params.id);

    if (!procurement) {
      res.status(404);
      throw new Error("Procurement record not found");
    }

    if (procurement.branch !== req.user.branch) {
      res.status(403);
      throw new Error("You are not authorized to delete records from another branch");
    }

    await procurement.deleteOne();

    res.json({
      success: true,
      message: "Procurement record deleted successfully",
    });
  })
);

export default router;