const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { showMyOrders } = require("../controllers/orderController");

const router = express.Router();

router.get("/",authMiddleware,showMyOrders);

module.exports = router;
