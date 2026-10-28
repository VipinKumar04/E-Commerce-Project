const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        default: null
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    addresses: {
        type: [
            {
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
            }
        ],
        default: []
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    membershipPlan: {
        type: String,
        default: null
    },
    membershipExpiresAt: {
        type: Date,
        default: null
    },
    membershipCredits: {
        type: Number,
        default: 0,
        min: 0
    }
},{
    timestamps: true
});

module.exports = mongoose.model("User",userSchema);
