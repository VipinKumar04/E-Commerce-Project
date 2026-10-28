const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const showOrderSummary = (req,res,order)=>{
    const membershipActive = req.user.membershipExpiresAt && req.user.membershipExpiresAt > new Date();

    res.render("checkout-summary",{
        order: order,
        isLoggedIn: req.isLoggedIn,
        membershipActive: membershipActive,
        membershipCredits: membershipActive ? req.user.membershipCredits : 0
    });
};

const applyMembershipCredit = (req,res)=>{
    Order.findOne({
        _id: req.params.orderId,
        user: req.user._id,
        paymentStatus: "pending"
    })
        .then((order)=>{
            if(!order){
                return res.status(404).send("Order not found.");
            }

            if(!req.user.membershipExpiresAt || req.user.membershipExpiresAt <= new Date() || req.user.membershipCredits < 1){
                return res.status(400).send("You do not have an active membership credit.");
            }

            const discountPercent = req.user.membershipPlan === "premium" ? 10 : 5;
            order.membershipPlan = req.user.membershipPlan;
            order.membershipDiscount = Math.round(order.subtotal * discountPercent / 100);
            order.creditsUsed = 1;
            order.taxAmount = Math.round((order.subtotal - order.membershipDiscount) * 0.05);
            order.deliveryFee = 0;
            order.totalAmount = order.subtotal - order.membershipDiscount + order.taxAmount;

            return order.save().then(()=>{
                showOrderSummary(req,res,order);
            });
        })
        .catch((error)=>{
            console.log("Applying membership credit error:",error.message);
            res.status(500).send("Could not apply membership credit.");
        });
};

const removeMembershipCredit = (req,res)=>{
    Order.findOne({
        _id: req.params.orderId,
        user: req.user._id,
        paymentStatus: "pending"
    })
        .then((order)=>{
            if(!order){
                return res.status(404).send("Order not found.");
            }

            order.membershipPlan = null;
            order.membershipDiscount = 0;
            order.creditsUsed = 0;
            order.taxAmount = Math.round(order.subtotal * 0.05);
            order.deliveryFee = 50;
            order.totalAmount = order.subtotal + order.taxAmount + order.deliveryFee;

            return order.save().then(()=>{
                showOrderSummary(req,res,order);
            });
        })
        .catch((error)=>{
            console.log("Removing membership credit error:",error.message);
            res.status(500).send("Could not remove membership credit.");
        });
};

const showAddressForm = (req,res)=>{
    Cart.findOne({ user: req.user._id })
        .then((cart)=>{
            if(!cart || cart.items.length === 0){
                return res.redirect("/cart");
            }

            res.render("checkout-address",{
                isLoggedIn: req.isLoggedIn,
                message: "",
                formData: {},
                savedAddresses: req.user.addresses || []
            });
        })
        .catch((error)=>{
            console.log("Checkout page error:",error.message);
            res.status(500).send("Could not open checkout.");
        });
};

const createOrderFromCart = (req,res,address)=>{
    Cart.findOne({ user: req.user._id })
        .populate("items.product")
        .then((cart)=> {
            if(!cart || cart.items.length === 0){
                return res.redirect("/cart");
            }

            let subtotal = 0;
            const orderItems = [];

            for(let i = 0; i < cart.items.length; i++){
                const item = cart.items[i];

                if(item.quantity > item.product.stock){
                    return res.status(400).send(item.product.name + " does not have enough stock.");
                }

                subtotal = subtotal + item.product.price * item.quantity;

                orderItems.push({
                    product: item.product._id,
                    name: item.product.name,
                    image: item.product.image,
                    price: item.product.price,
                    quantity: item.quantity,
                    category: item.product.category
                });
            }

            const taxAmount = Math.round(subtotal * 0.05);
            const deliveryFee = 50;
            const totalAmount = subtotal + taxAmount + deliveryFee;

            return Order.create({
                user: req.user._id,
                address: address,
                items: orderItems,
                subtotal: subtotal,
                taxAmount: taxAmount,
                deliveryFee: deliveryFee,
                totalAmount: totalAmount,
                paymentStatus: "pending"
            }).then((order)=>{
                res.render("checkout-summary",{
                    order: order,
                    isLoggedIn: req.isLoggedIn,
                    membershipActive: req.user.membershipExpiresAt && req.user.membershipExpiresAt > new Date(),
                    membershipCredits: req.user.membershipExpiresAt && req.user.membershipExpiresAt > new Date() ? req.user.membershipCredits : 0
                });
            });
        })
        .catch((error)=> {
            console.log("Saving checkout details error:",error.message);
            res.status(500).send("Could not save your checkout details.");
        });
};

const saveAddressAndShowSummary = (req,res)=>{
    const address = {
        fullName: req.body.fullName.trim(),
        phone: req.body.phone.trim(),
        street:req.body.street.trim(),
        city:req.body.city.trim(),
        state:req.body.state.trim(),
        postalCode:req.body.postalCode.trim()
    };

    if(!address.fullName || !address.phone || !address.street || !address.city || !address.state || !address.postalCode){
        return res.status(400).render("checkout-address",{
            isLoggedIn: req.isLoggedIn,
            message: "Please fill in every address field.",
            formData: req.body,
            savedAddresses: req.user.addresses || []
        });
    }

    req.user.addresses.push(address);

    req.user.save()
        .then(()=>{
            createOrderFromCart(req,res,address);
        })
        .catch((error)=>{
            console.log("Saving address error:",error.message);
            res.status(500).send("Could not save your address.");
        });
};

const useSavedAddress = (req,res)=> {
    let selectedAddress = null;

    for(let i = 0; i < req.user.addresses.length; i++){
        if(req.user.addresses[i]._id.toString() === req.body.addressId){
            selectedAddress = req.user.addresses[i];
        }
    }

    if(!selectedAddress){
        return res.status(400).send("Please choose a saved address.");
    }

    createOrderFromCart(req,res,selectedAddress);
};

const startPayment = (req,res)=> {
    Order.findOne({
        _id: req.params.orderId,
        user: req.user._id,
        paymentStatus: "pending"
    })
        .then((order)=>{
            if(!order){
                return res.status(404).json({
                    message: "Order not found."
                });
            }

            if(order.creditsUsed > 0 && (!req.user.membershipExpiresAt || req.user.membershipExpiresAt <= new Date() || req.user.membershipCredits < order.creditsUsed)){
                return res.status(400).json({
                    message: "Your membership credit is no longer available."
                });
            }

            return razorpay.orders.create({
                amount: Math.round(order.totalAmount * 100),
                currency: "INR",
                receipt: order._id.toString()
            }).then((razorpayOrder)=>{
                order.razorpayOrderId = razorpayOrder.id;

                return order.save().then(()=>{
                    res.json({
                        key: process.env.RAZORPAY_KEY_ID,
                        orderId: razorpayOrder.id,
                        amount: razorpayOrder.amount,
                        currency: razorpayOrder.currency
                    });
                });
            });
        })
        .catch((error)=>{
            console.log("Starting payment error:",error.message);
            res.status(500).json({
                message: "Could not start payment."
            });
        });
};

const confirmPayment = (req,res)=> {
    const paymentId = req.body.paymentId;
    const razorpayOrderId = req.body.orderId;

    if(!paymentId || !razorpayOrderId){
        return res.status(400).json({
            message: "Payment details are missing."
        });
    }

    Order.findOne({
        user: req.user._id,
        razorpayOrderId: razorpayOrderId
    })
        .then((order)=>{
            if(!order){
                return res.status(404).json({
                    message: "Order not found."
                });
            }

            return razorpay.payments.fetch(paymentId)
                .then((payment)=>{
                    const expectedAmount = Math.round(order.totalAmount * 100);

                    if(payment.order_id !== order.razorpayOrderId){
                        return res.status(400).json({
                            message: "Payment does not belong to this order."
                        });
                    }

                    if(payment.amount !== expectedAmount || payment.currency !== "INR"){
                        return res.status(400).json({
                            message: "Payment amount does not match the order."
                        });
                    }

                    if(payment.status !== "captured"){
                        return res.status(400).json({
                            message: "Payment has not been captured yet."
                        });
                    }

                    if(order.paymentStatus === "paid"){
                        if(!order.razorpayPaymentId){
                            order.razorpayPaymentId = payment.id;
                            return order.save().then(()=>{
                                res.json({
                                    success: true,
                                    message: "Payment was already confirmed."
                                });
                            });
                        }

                        return res.json({
                            success: true,
                            message: "Payment was already confirmed."
                        });
                    }

                    let itemNumber = 0;

                    const reduceNextProductStock = ()=>{
                        if(itemNumber >= order.items.length){
                            const savePaidOrder = ()=>{
                                order.paymentStatus = "paid";
                                order.razorpayPaymentId = payment.id;
                                order.paidAt = new Date();

                                return order.save().then(()=>{
                                    res.json({
                                        success: true,
                                        message: "Payment confirmed."
                                    });
                                });
                            };

                            if(order.creditsUsed > 0){
                                return User.findById(req.user._id).then((user)=>{
                                    if(!user || user.membershipCredits < order.creditsUsed || !user.membershipExpiresAt || user.membershipExpiresAt <= new Date()){
                                        throw new Error("Your membership credit is no longer available.");
                                    }

                                    user.membershipCredits = user.membershipCredits - order.creditsUsed;
                                    return user.save().then(savePaidOrder);
                                });
                            }

                            return savePaidOrder();
                        }

                        const orderItem = order.items[itemNumber];

                        return Product.findById(orderItem.product)
                            .then((product)=>{
                                if(!product){
                                    throw new Error("A product in this order no longer exists.");
                                }

                                if(product.stock < orderItem.quantity){
                                    throw new Error("There is not enough stock for " + product.name + ".");
                                }

                                product.stock = product.stock - orderItem.quantity;
                                return product.save();
                            })
                            .then(()=>{
                                itemNumber = itemNumber + 1;
                                return reduceNextProductStock();
                            });
                    };

                    return reduceNextProductStock();
                });
        })
        .catch((error)=>{
            console.log("Payment confirmation error:",error.message);
            res.status(500).json({
                message: "Could not confirm the payment."
            });
        });
};

module.exports = {
    showAddressForm,
    saveAddressAndShowSummary,
    useSavedAddress,
    startPayment,
    confirmPayment,
    applyMembershipCredit,
    removeMembershipCredit
};
