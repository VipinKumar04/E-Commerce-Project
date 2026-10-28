const express = require("express");
const {
    signup,
    verifyEmailPage,
    verifyEmail,
    login,
    logout,
    forgotPassword,
    resetPasswordPage,
    resetPassword
} = require("../controllers/authController");

const router = express.Router();

router.post("/signup",signup);
router.get("/verify-email/:token",verifyEmailPage);
router.post("/verify-email",verifyEmail);
router.post("/login",login);
router.post("/logout",logout);
router.post("/forgot-password",forgotPassword);
router.get("/reset-password",resetPasswordPage);
router.post("/reset-password",resetPassword);

module.exports = router;
