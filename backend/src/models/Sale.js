import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    produceName: {
      type: String,
      required: [true, "Produce name is required"],
      trim: true,
      minlength: [2, "Produce name must be at least 2 characters"],
    },

    produceType: {
      type: String,
      required: [true, "Produce type/category is required"],
      trim: true,
      minlength: [2, "Produce type must be at least 2 characters"],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity (kg) is required"],
      min: [0.1, "Quantity must be at least 0.1 kg"],
    },

    pricePerKg: {
      type: Number,
      required: [true, "Price per kg is required"],
      min: [0, "Price cannot be negative"],
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },

    saleType: {
      type: String,
      enum: ["cash", "credit"],
      required: [true, "Sale type (cash or credit) is required"],
    },

    agentName: {
      type: String,
      required: [true, "Sales agent name is required"],
      trim: true,
      minlength: [2, "Agent name must be at least 2 characters"],
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    branch: {
      type: String,
      enum: ["Maganjo", "Matugga", "Main Branch", "Other"], // ← expanded to avoid future issues
      required: [true, "Branch is required"],
      trim: true,
    },

    customerName: {
      type: String,
      required: [true, "Customer name is required for all sales"],
      trim: true,
      minlength: [2, "Customer name must be at least 2 characters"],
    },

    customerLocation: {
      type: String,
      required: function () {
        return this.saleType === "credit";
      },
      trim: true,
      minlength: [2, "Location must be at least 2 characters"],
    },

    customerContact: {
      type: String,
      required: function () {
        return this.saleType === "credit";
      },
      trim: true,
    },

    customerNIN: {
      type: String,
      required: function () {
        return this.saleType === "credit";
      },
      trim: true,
      minlength: [8, "NIN/ID should be at least 8 characters"],
    },

    dueDate: {
      type: Date,
      required: function () {
        return this.saleType === "credit";
      },
    },

    isPaid: {
      type: Boolean,
      default: false,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for convenience: remaining balance on credit
saleSchema.virtual("remainingBalance").get(function () {
  if (this.saleType !== "credit") return 0;
  return this.totalAmount - (this.amountPaid || 0);
});

saleSchema.set("toJSON", { virtuals: true });
saleSchema.set("toObject", { virtuals: true });

//  pre-save hook with async
saleSchema.pre("save", async function () {
  if (!this.receiptNumber) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.receiptNumber = `REC-${datePart}-${random}`;
  }
  // Promise resolves automatically
});

export default mongoose.model("Sale", saleSchema);