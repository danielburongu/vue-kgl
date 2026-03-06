// routes/procurementRoutes.js
import express from "express";
import Procurement from "../models/Procurement.js";
import { protect, operationsOnly, branchOnly } from "../middleware/authMiddleware.js";
import asyncHandler from "express-async-handler";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Procurement
 *   description: Procurement (purchase) recording & management - manager/agent only
 */

/**
 * @swagger
 * /procurement:
 *   post:
 *     summary: Record new procurement (purchase)
 *     description: Creates a procurement record for the authenticated user's branch
 *     tags: [Procurement]
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
 *               - produceType
 *               - tonnage
 *               - cost
 *               - sellingPrice
 *               - dealerName
 *               - dealerContact
 *             properties:
 *               produceName:
 *                 type: string
 *               produceType:
 *                 type: string
 *               tonnage:
 *                 type: number
 *               cost:
 *                 type: number
 *               sellingPrice:
 *                 type: number
 *               dealerName:
 *                 type: string
 *               dealerContact:
 *                 type: string
 *     responses:
 *       201:
 *         description: Procurement recorded successfully
 *       400:
 *         description: Validation error (invalid values, phone format, etc.)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not operations role or invalid branch)
 */
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

/**
 * @swagger
 * /procurement:
 *   get:
 *     summary: Get procurement records
 *     description: Director sees all; others see only their branch
 *     tags: [Procurement]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: produceName
 *         schema:
 *           type: string
 *       - in: query
 *         name: produceType
 *         schema:
 *           type: string
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
 *         description: List of procurement records
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = req.user.role === "director" ? {} : { branch: req.user.branch };

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

/**
 * @swagger
 * /procurement/{id}:
 *   put:
 *     summary: Update a procurement record
 *     description: Only allowed for same-branch operations users
 *     tags: [Procurement]
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
 *     responses:
 *       200:
 *         description: Procurement updated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized (different branch)
 *       404:
 *         description: Record not found
 */
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

    if (procurement.branch !== req.user.branch) {
      res.status(403);
      throw new Error("You are not authorized to modify records from another branch");
    }

    const validationError = validateProcurementInput(req.body, true);
    if (validationError) {
      res.status(400);
      throw new Error(validationError);
    }

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

/**
 * @swagger
 * /procurement/{id}:
 *   delete:
 *     summary: Delete a procurement record
 *     description: Only allowed for same-branch operations users
 *     tags: [Procurement]
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
 *         description: Record deleted
 *       403:
 *         description: Not authorized (different branch)
 *       404:
 *         description: Record not found
 */
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


// Helper function

const validateProcurementInput = (data, isUpdate = false) => {
  const errors = [];

  if (!data.produceName?.trim()) {
    errors.push("Produce name is required");
  } else if (!/^[a-zA-Z0-9\s\-&']{2,100}$/.test(data.produceName.trim())) {
    errors.push("Produce name must be 2–100 alphanumeric characters (spaces, -, &, ' allowed)");
  }

  if (!data.produceType) {
    errors.push("Produce type is required");
  }

  if (!data.tonnage || data.tonnage < 1) {
    errors.push("Tonnage must be at least 1 kg");
  }

  if (!data.cost || data.cost < 1000) {
    errors.push("Total cost must be at least UGX 1,000");
  }

  if (data.tonnage && data.cost && data.sellingPrice) {
    const costPerKg = data.cost / data.tonnage;
    if (data.sellingPrice <= costPerKg) {
      errors.push(`Selling price per kg must be higher than cost per kg (UGX ${costPerKg.toFixed(0)})`);
    }
  } else if (!data.sellingPrice) {
    errors.push("Selling price per kg is required");
  }

  if (!data.dealerName?.trim() || data.dealerName.trim().length < 2) {
    errors.push("Dealer/supplier name must be at least 2 characters");
  }

  if (!data.dealerContact?.match(/^(?:\+256|0)7[0-9]{8}$/)) {
    errors.push("Dealer contact must be a valid Ugandan phone number (e.g. 077xxxxxxx or +2567xxxxxxx)");
  }

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

export default router;