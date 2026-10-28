const MembershipPurchase = require("../models/MembershipPurchase");
const User = require("../models/User");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const plans = {
    basic: {
        name: "Essential",
        price: 99,
        credits: 9,
        discountPercent: 5
    },
    premium: {
        name: "Plus",
        price: 199,
        credits: 19,
        discountPercent: 10
    }
};

const showMembershipPage = (req,res)=>{
    res.render("membership",{
        isLoggedIn: req.isLoggedIn,
        plans: plans,
        user: req.user || null,
        message: req.query.success ? "Membership activated successfully." : ""
    });
};

const createMembershipOrder = (req,res)=>{
    const plan = plans[req.body.planCode];

    if(!plan){
        return res.status(400).json({
            message: "Please choose a valid plan."
        });
    }

    MembershipPurchase.create({
        user: req.user._id,
        planCode: req.body.planCode,
        amount: plan.price,
        creditsGranted: plan.credits,
        discountPercent: plan.discountPercent
    })
        .then((purchase)=>{
            return razorpay.orders.create({
                amount: plan.price * 100,
                currency: "INR",
                receipt: purchase._id.toString()
            }).then((razorpayOrder)=>{
                purchase.razorpayOrderId = razorpayOrder.id;

                return purchase.save().then(()=>{
                    res.json({
                        key: process.env.RAZORPAY_KEY_ID,
                        purchaseId: purchase._id,
                        orderId: razorpayOrder.id,
                        amount: razorpayOrder.amount,
                        currency: razorpayOrder.currency
                    });
                });
            });
        })
        .catch((error)=>{
            console.log("Membership order error:",error.message);
            res.status(500).json({
                message: "Could not start membership payment."
            });
        });
};

const confirmMembershipPayment = (req,res)=>{
    const purchaseId = req.body.purchaseId;
    const paymentId = req.body.paymentId;
    const razorpayOrderId = req.body.orderId;

    if(!purchaseId || !paymentId || !razorpayOrderId){
        return res.status(400).json({
            message: "Payment details are missing."
        });
    }

    MembershipPurchase.findOne({
        _id: purchaseId,
        user: req.user._id,
        razorpayOrderId: razorpayOrderId
    })
        .then((purchase)=>{
            if(!purchase){
                return res.status(404).json({
                    message: "Membership purchase not found."
                });
            }

            if(purchase.benefitsApplied){
                return res.json({
                    success: true,
                    message: "Membership is already active."
                });
            }

            return razorpay.payments.fetch(paymentId).then((payment)=>{
                if(payment.order_id !== purchase.razorpayOrderId || payment.amount !== purchase.amount * 100 || payment.currency !== "INR" || payment.status !== "captured"){
                    return res.status(400).json({
                        message: "Payment could not be verified."
                    });
                }

                return User.findById(req.user._id).then((user)=>{
                    if(!user){
                        return res.status(404).json({
                            message: "User not found."
                        });
                    }

                    const now = new Date();
                    const currentExpiry = user.membershipExpiresAt && user.membershipExpiresAt > now ? user.membershipExpiresAt : now;
                    const startsAt = user.membershipExpiresAt && user.membershipExpiresAt > now ? user.membershipExpiresAt : now;
                    const expiresAt = new Date(currentExpiry);
                    expiresAt.setDate(expiresAt.getDate() + 30);

                    if(!user.membershipExpiresAt || user.membershipExpiresAt <= now){
                        user.membershipCredits = 0;
                    }

                    user.membershipPlan = purchase.planCode;
                    user.membershipCredits = user.membershipCredits + purchase.creditsGranted;
                    user.membershipExpiresAt = expiresAt;

                    return user.save().then(()=>{
                        purchase.paymentStatus = "paid";
                        purchase.razorpayPaymentId = payment.id;
                        purchase.membershipStartsAt = startsAt;
                        purchase.membershipExpiresAt = expiresAt;
                        purchase.benefitsApplied = true;

                        return purchase.save().then(()=>{
                            res.json({
                                success: true,
                                message: "Membership activated with " + purchase.creditsGranted + " credits."
                            });
                        });
                    });
                });
            });
        })
        .catch((error)=>{
            console.log("Membership payment confirmation error:",error.message);
            res.status(500).json({
                message: "Could not confirm membership payment."
            });
        });
};

module.exports = {
    showMembershipPage,
    createMembershipOrder,
    confirmMembershipPayment
};
