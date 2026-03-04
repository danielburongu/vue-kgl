// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Exclude password by default
    },

    role: {
      type: String,
      enum: {
        values: ["director", "manager", "agent"],
        message: "{VALUE} is not a valid role",
      },
      required: [true, "User role is required"],
      default: "agent",
    },

    branch: {
      type: String,
      enum: {
        values: ["Maganjo", "Matugga"],
        message: "{VALUE} is not a valid branch",
      },
      required: [true, "Branch assignment is required"],
      default: "Maganjo",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ──────────────────────────────────────────────
   Password hashing middleware (Mongoose 7 Safe)
─────────────────────────────────────────────── */
userSchema.pre("save", async function () {
  // Only hash if password was modified
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ──────────────────────────────────────────────
   Compare password method
─────────────────────────────────────────────── */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/* ──────────────────────────────────────────────
   Virtual: displayName
─────────────────────────────────────────────── */
userSchema.virtual("displayName").get(function () {
  return `${this.name} (${this.role})`;
});

/* ──────────────────────────────────────────────
   Query helper: active users only
─────────────────────────────────────────────── */
userSchema.query.active = function () {
  return this.where({ isActive: true });
};

export default mongoose.model("User", userSchema);