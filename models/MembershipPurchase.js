const mongoose = require("mongoose");

const membershipPurchaseSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    planCode: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    creditsGranted: {
        type: Number,
        required: true
    },
    discountPercent: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        default: "pending"
    },
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    membershipStartsAt: {
        type: Date,
        default: null
    },
    membershipExpiresAt: {
        type: Date,
        default: null
    },
    benefitsApplied: {
        type: Boolean,
        default: false
    }
},{
    timestamps: true
});

module.exports = mongoose.model("MembershipPurchase",membershipPurchaseSchema);
