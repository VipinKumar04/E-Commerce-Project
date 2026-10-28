const Order = require("../models/Order");

const showMyOrders = (req,res)=>{
    Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .then((orders)=>{
            res.render("orders",{
                orders: orders,
                isLoggedIn: req.isLoggedIn
            });
        })
        .catch((error)=>{
            console.log("Orders page error:",error.message);
            res.status(500).send("Could not load your orders.");
        });
};

module.exports = {
    showMyOrders
};
