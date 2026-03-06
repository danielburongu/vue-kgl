// routes/salesRoutes.js
import express from "express";
import Sale from "../models/Sale.js";
import Procurement from "../models/Procurement.js";
import { protect, operationsOnly } from "../middleware/authMiddleware.js";
import asyncHandler from "express-async-handler";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales recording, listing and credit payment management
 */

/**
 * @swagger
 * /sales:
 *   post:
 *     summary: Record a new sale
 *     description: Creates cash or credit sale. Performs stock availability check.
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - produceName
 *               - quantity
 *               - pricePerKg
 *               - saleType
 *             properties:
 *               produceName:
 *                 type: string
 *               produceType:
 *                 type: string
 *               quantity:
 *                 type: number
 *               pricePerKg:
 *                 type: number
 *               saleType:
 *                 type: string
 *                 enum: [cash, credit]
 *               customerName:
 *                 type: string
 *               customerLocation:
 *                 type: string
 *               customerContact:
 *                 type: string
 *               customerNIN:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               agentName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sale recorded successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not operations role)
 *       409:
 *         description: Duplicate receipt number (very rare)
 */
router.post(
  "/",
  protect,
  operationsOnly,
  asyncHandler(async (req, res) => {
    try {
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
        branch: req.user.branch,
        recordedBy: req.user._id,
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
 * @swagger
 * /sales:
 *   get:
 *     summary: Get sales records (paginated)
 *     description: Director sees all branches; others see only own branch
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: produceName
 *         schema:
 *           type: string
 *       - in: query
 *         name: saleType
 *         schema:
 *           type: string
 *           enum: [cash, credit]
 *       - in: query
 *         name: isPaid
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Paginated list of sales
 *       401:
 *         description: Unauthorized
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
 * @swagger
 * /sales/{id}/pay:
 *   put:
 *     summary: Mark credit sale as paid
 *     description: Only operations users can mark credit sales as paid
 *     tags: [Sales]
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
 *         description: Sale marked as paid
 *       400:
 *         description: Not a credit sale or already paid
 *       403:
 *         description: Not authorized for this branch
 *       404:
 *         description: Sale not found
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

// Helper: Generate unique, readable receipt number
const generateReceiptNumber = (branch) => {
  const prefix = (branch || "UNK").slice(0, 3).toUpperCase();
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.floor(10000 + Math.random() * 90000);
  return `KGL-${prefix}-${datePart}-${random}`;
};

export default router;