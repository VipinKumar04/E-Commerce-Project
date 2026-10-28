const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { showCart,addToCart,changeQuantity,removeFromCart } = require("../controllers/cartController");
const { showAddressForm,saveAddressAndShowSummary,useSavedAddress,startPayment,confirmPayment,applyMembershipCredit,removeMembershipCredit } = require("../controllers/checkoutController");

const router = express.Router();

router.get("/",authMiddleware,showCart);
router.post("/add/:productId",authMiddleware,addToCart);
router.post("/quantity/:productId",authMiddleware,changeQuantity);
router.post("/remove/:productId",authMiddleware,removeFromCart);
router.get("/checkout",authMiddleware,showAddressForm);
router.post("/checkout/address",authMiddleware,saveAddressAndShowSummary);
router.post("/checkout/saved-address",authMiddleware,useSavedAddress);
router.post("/membership-credit/:orderId",authMiddleware,applyMembershipCredit);
router.post("/remove-membership-credit/:orderId",authMiddleware,removeMembershipCredit);
router.post("/pay/:orderId",authMiddleware,startPayment);
router.post("/confirm-payment",authMiddleware,confirmPayment);

module.exports = router;
