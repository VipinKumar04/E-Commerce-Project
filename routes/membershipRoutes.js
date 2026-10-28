const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { showMembershipPage,createMembershipOrder,confirmMembershipPayment } = require("../controllers/membershipController");

const router = express.Router();

router.get("/",showMembershipPage);
router.post("/create-order",authMiddleware,createMembershipOrder);
router.post("/confirm-payment",authMiddleware,confirmMembershipPayment);

module.exports = router;
