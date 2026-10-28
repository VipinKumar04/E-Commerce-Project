const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    address: {
        fullName: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        postalCode: {
            type: String,
            required: true
        }
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            },
            name: {
                type: String,
                required: true
            },
            image: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            category: {
                type:String,
                required:true
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    },
    taxAmount: {
        type: Number,
        required: true
    },
    deliveryFee: {
        type: Number,
        required: true
    },
    membershipPlan: {
        type: String,
        default: null
    },
    membershipDiscount: {
        type: Number,
        default: 0
    },
    creditsUsed: {
        type: Number,
        default: 0
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
    paidAt: {
        type: Date,
        default: null
    }
},{
    timestamps: true
});

module.exports = mongoose.model("Order",orderSchema);
