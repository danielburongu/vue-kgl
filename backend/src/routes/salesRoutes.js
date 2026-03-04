// routes/salesRoutes.js
import express from "express";
import Sale from "../models/Sale.js";
import Procurement from "../models/Procurement.js";
import { protect, operationsOnly } from "../middleware/authMiddleware.js";
import asyncHandler from "express-async-handler";

const router = express.Router();

// Helper: Generate unique, readable receipt number
const generateReceiptNumber = (branch) => {
  const prefix = (branch || "UNK").slice(0, 3).toUpperCase();
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.floor(10000 + Math.random() * 90000);
  return `KGL-${prefix}-${datePart}-${random}`;
};

/**
 * CREATE NEW SALE
 * - Protected: only operations roles (agent/manager)
 * - Uses authenticated user's branch and ID
 * - Detailed logging + full error handling
 */
router.post(
  "/",
  protect,
  operationsOnly,
  asyncHandler(async (req, res) => {
    try {
      // Debug logs (remove or reduce in production)
      console.log("[SALE CREATE] Payload received:", req.body);
      console.log("[SALE CREATE] Authenticated user:", {
        id: req.user._id.toString(),
        name: req.user.name,
        branch: req.user.branch,
        role: req.user.role,
      });

      const {
        produceName,
        produceType,
        quantity,
        pricePerKg,
        saleType,
        customerName,
        customerLocation,
        customerContact,
        customerNIN,
        dueDate,
        agentName,
      } = req.body;

      // 1. Input validation
      if (!produceName?.trim()) {
        res.status(400);
        throw new Error("Produce name is required.");
      }

      const qty = Number(quantity);
      const price = Number(pricePerKg);

      if (isNaN(qty) || qty <= 0) {
        res.status(400);
        throw new Error("Quantity must be a positive number.");
      }

      if (isNaN(price) || price <= 0) {
        res.status(400);
        throw new Error("Price per kg must be a positive number.");
      }

      if (!["cash", "credit"].includes(saleType)) {
        res.status(400);
        throw new Error("Sale type must be 'cash' or 'credit'.");
      }

      // 2. Credit-specific validation
      if (saleType === "credit") {
        if (!customerName?.trim() || customerName.trim().length < 2) {
          res.status(400);
          throw new Error("Customer name required for credit sales (min 2 chars).");
        }
        if (!customerLocation?.trim() || customerLocation.trim().length < 2) {
          res.status(400);
          throw new Error("Customer location required for credit sales.");
        }
        if (!customerContact || !/^(?:\+256|0)7[0-9]{8}$/.test(customerContact)) {
          res.status(400);
          throw new Error("Valid Ugandan phone number required for credit sales.");
        }
        if (!customerNIN?.trim() || customerNIN.trim().length < 10) {
          res.status(400);
          throw new Error("Valid NIN/ID required for credit sales (min 10 chars).");
        }
        if (!dueDate || isNaN(new Date(dueDate).getTime())) {
          res.status(400);
          throw new Error("Valid due date required for credit sales.");
        }
      }

      // 3. Branch-specific stock check (safe access)
      const procuredResult = await Procurement.aggregate([
        { $match: { branch: req.user.branch, produceName } },
        { $group: { _id: null, total: { $sum: "$tonnage" } } },
      ]);

      const soldResult = await Sale.aggregate([
        { $match: { branch: req.user.branch, produceName } },
        { $group: { _id: null, total: { $sum: "$quantity" } } },
      ]);

      const available = (procuredResult[0]?.total || 0) - (soldResult[0]?.total || 0);

      if (qty > available) {
        res.status(400);
        throw new Error(`Insufficient stock. Only ${available.toFixed(1)} kg available in ${req.user.branch}.`);
      }

      // 4. Create sale
      const totalAmount = qty * price;

      const sale = await Sale.create({
        receiptNumber: generateReceiptNumber(req.user.branch),
        produceName: produceName.trim(),
        produceType: produceType?.trim() || "Unknown",
        quantity: qty,
        pricePerKg: price,
        totalAmount,
        saleType,
        customerName: customerName.trim(),
        customerLocation: saleType === "credit" ? customerLocation?.trim() : undefined,
        customerContact: saleType === "credit" ? customerContact : undefined,
        customerNIN: saleType === "credit" ? customerNIN?.trim() : undefined,
        dueDate: saleType === "credit" && dueDate ? new Date(dueDate) : undefined,
        agentName: agentName?.trim() || req.user.name || "Unknown Agent",
        branch: req.user.branch,           // ← from authenticated user
        recordedBy: req.user._id,          // ← required field - now always set
      });

      res.status(201).json({
        success: true,
        message: "Sale recorded successfully",
        data: sale,
      });
    } catch (error) {
      console.error("[SALE CREATE ERROR]", {
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 6),
        code: error.code,
        name: error.name,
        payload: req.body,
        userId: req.user?._id?.toString(),
      });

      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((e) => ({
          field: e.path,
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Duplicate receipt number generated. Please try again.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error while creating sale",
        ...(process.env.NODE_ENV !== "production" && { detail: error.message }),
      });
    }
  })
);

/**
 * GET SALES (paginated + filtered)
 * - Director: sees all branches
 * - Others: only own branch
 */
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let filter = {};

    if (req.user.role !== "director") {
      filter.branch = req.user.branch;
    }

    const { search, produceName, saleType, isPaid, startDate, endDate } = req.query;

    if (search) {
      filter.$or = [
        { receiptNumber: { $regex: search, $options: "i" } },
        { produceName: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
      ];
    }

    if (produceName) filter.produceName = { $regex: produceName, $options: "i" };
    if (saleType) filter.saleType = saleType;
    if (isPaid !== undefined) filter.isPaid = isPaid === "true";

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("recordedBy", "name email")
      .lean();

    const total = await Sale.countDocuments(filter);

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      data: sales,
    });
  })
);

/**
 * MARK CREDIT SALE AS PAID
 */
router.put(
  "/:id/pay",
  protect,
  operationsOnly,
  asyncHandler(async (req, res) => {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      res.status(404);
      throw new Error("Sale not found");
    }

    if (req.user.role !== "director" && sale.branch !== req.user.branch) {
      res.status(403);
      throw new Error("Not authorized to modify sales from another branch");
    }

    if (sale.saleType !== "credit") {
      res.status(400);
      throw new Error("Only credit sales can be marked as paid");
    }

    if (sale.isPaid) {
      res.status(400);
      throw new Error("Sale is already marked as paid");
    }

    sale.isPaid = true;
    sale.paidAt = new Date();
    sale.paidBy = req.user._id;

    await sale.save();

    res.json({
      success: true,
      message: "Credit sale marked as paid",
      data: sale,
    });
  })
);

export default router;