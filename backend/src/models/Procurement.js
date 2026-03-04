// models/Procurement.js
import mongoose from "mongoose";

const procurementSchema = new mongoose.Schema(
  {
    produceName: {
      type: String,
      required: [true, "Produce name is required"],
      trim: true,
      minlength: [2, "Produce name must be at least 2 characters"],
      maxlength: [100, "Produce name is too long"],
      match: [
        /^[a-zA-Z0-9\s\-&']+$/,
        "Produce name can only contain letters, numbers, spaces, hyphens, ampersands, and apostrophes",
      ],
    },

    produceType: {
      type: String,
      required: [true, "Produce type/category is required"],
      trim: true,
      minlength: [2, "Produce type must be at least 2 characters"],
      maxlength: [50, "Produce type is too long"],
      enum: {
        values: ["Vegetable", "Fruit", "Cereal", "Legume", "Root Crop", "Other"],
        message: "{VALUE} is not a valid produce type",
      },
    },

    tonnage: {
      type: Number,
      required: [true, "Tonnage (kg) is required"],
      min: [1, "Tonnage must be at least 1 kg"],
      max: [1000000, "Tonnage cannot exceed 1,000,000 kg"],
    },

    cost: {
      type: Number,
      required: [true, "Total procurement cost is required"],
      min: [1000, "Cost must be at least UGX 1,000"],
    },

    sellingPrice: {
      type: Number,
      required: [true, "Selling price per kg is required"],
      min: [1, "Selling price must be at least UGX 1 per kg"],
    },

    costPerKg: {
      type: Number,
    },

    dealerName: {
      type: String,
      required: [true, "Dealer/supplier name is required"],
      trim: true,
      minlength: [2, "Dealer name must be at least 2 characters"],
      maxlength: [100, "Dealer name is too long"],
    },

    dealerContact: {
      type: String,
      required: [true, "Dealer contact number is required"],
      trim: true,
      match: [
        /^(?:\+256|0)7[0-9]{8}$/,
        "Phone number must be a valid Ugandan format (e.g. 077xxxxxxx or +2567xxxxxxx)",
      ],
    },

    branch: {
      type: String,
      enum: {
        values: ["Maganjo", "Matugga"],
        message: "{VALUE} is not a valid branch",
      },
      required: [true, "Branch is required"],
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Who recorded this procurement is required"],
    },

    invoiceNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "unpaid",
    },

    paymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      trim: true,
    },

    qualityGrade: {
      type: String,
      enum: ["A", "B", "C", "Reject"],
      default: "B",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ──────────────────────────────────────────────
   Pre-validate hook: calculate costPerKg & enforce min profit
─────────────────────────────────────────────── */
procurementSchema.pre("validate", async function () {
  if (this.tonnage && this.cost) {
    this.costPerKg = Number((this.cost / this.tonnage).toFixed(2));

    const minSellingPrice = this.costPerKg * 1.2;
    if (this.sellingPrice < minSellingPrice) {
      this.invalidate(
        "sellingPrice",
        `Selling price must be at least 20% above cost per kg (minimum UGX ${minSellingPrice.toFixed(
          0
        )})`
      );
    }
  }
});

/* ──────────────────────────────────────────────
   Pre-save hook: auto-generate invoice number if missing
─────────────────────────────────────────────── */
procurementSchema.pre("save", async function () {
  if (!this.invoiceNumber) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(100 + Math.random() * 900);
    this.invoiceNumber = `PROC-${this.branch.slice(0, 3).toUpperCase()}-${datePart}-${random}`;
  }
});

/* ──────────────────────────────────────────────
   Virtuals
─────────────────────────────────────────────── */
procurementSchema.virtual("totalRevenuePotential").get(function () {
  return this.tonnage * this.sellingPrice;
});

procurementSchema.virtual("grossProfitPotential").get(function () {
  return this.totalRevenuePotential - this.cost;
});

procurementSchema.virtual("grossMargin").get(function () {
  if (this.cost === 0) return 0;
  return ((this.grossProfitPotential / this.cost) * 100).toFixed(1) + "%";
});

export default mongoose.model("Procurement", procurementSchema);