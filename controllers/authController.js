const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../config/mailer");

const signup=(req,res)=>{
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    if(!username || !email || !password || !confirmPassword){
        return res.status(400).render("signup",{
            isLoggedIn: req.isLoggedIn,
            message: "All fields are required"
        });
    }

    if(password !== confirmPassword){
        return res.status(400).render("signup",{
            isLoggedIn: req.isLoggedIn,
            message: "Passwords do not match"
        });
    }

    User.findOne({ email: email})
        .then((existingUser)=>{
            if(existingUser){
                return res.status(400).render("signup",{
                    isLoggedIn: req.isLoggedIn,
                    message: "Email is already registered"
                });
            }

            return bcrypt.hash(password,10)
                .then((hashedPassword)=>{
                    const verificationToken = crypto.randomBytes(32).toString("hex");
                    const newUser = new User({
                        username: username,
                        email: email,
                        password: hashedPassword,
                        emailVerificationToken: verificationToken
                    });

                    return newUser.save()
                        .then(()=>{
                            const verificationLink = "http://localhost:3000/auth/verify-email/" + verificationToken;

                            return sendEmail({
                                to: email,
                                subject: "Verify your account",
                                text: "Hello " + username + ",Click this link to verify your email:\n" + verificationLink
                            });
                        })
                        .then(()=>{
                            return res.render("login",{
                                isLoggedIn: req.isLoggedIn,
                                message: "Account created. Please check your email to verify your account."
                            });
                        })
                        .catch((error)=>{
                            console.log("Signup error:",error.message);

                            if(error.code === 11000){
                                return res.status(400).render("signup",{
                                    isLoggedIn: req.isLoggedIn,
                                    message: "Email is already registered"
                                });
                            }

                            return res.status(500).render("signup",{
                                isLoggedIn: req.isLoggedIn,
                                message: "Account creation or verification email failed. Please try again."
                            });
                        });
                })
                .catch((error)=>{
                    console.log("Password hashing error:",error.message);

                    return res.status(500).render("signup",{
                        isLoggedIn: req.isLoggedIn,
                        message: "Could not create account. Please try again."
                    });
                });
        })
        .catch((error)=>{
            console.log("Signup error:",error.message);

            return res.status(500).render("signup",{
                isLoggedIn: req.isLoggedIn,
                message: "Server error. Please try again."
            });
        });
};

const verifyEmailPage=(req,res)=>{
    res.render("verify-email",{
        token: req.params.token,
        isLoggedIn: req.isLoggedIn,
        message: ""
    });
};

const verifyEmail =(req,res)=>{
    const token = req.body.token;

    if(!token){
        return res.status(400).render("verify-email",{
            token: "",
            isLoggedIn: req.isLoggedIn,
            message: "Verification token is missing."
        });
    }

    User.findOne({emailVerificationToken: token})
        .then((user)=>{
            if(!user){
                return res.status(400).render("verify-email",{
                    token: "",
                    isLoggedIn: req.isLoggedIn,
                    message: "Invalid verification link."
                });
            }

            user.isEmailVerified = true;
            user.emailVerificationToken = null;

            return user.save().then(()=>{
                return res.render("login",{
                    isLoggedIn: req.isLoggedIn,
                    message: "Email verified successfully. You can now log in."
                });
            });
        })
        .catch((error)=>{
            console.log("Email verification error:",error.message);

            return res.status(500).render("verify-email",{
                token: token,
                isLoggedIn: req.isLoggedIn,
                message: "Email verification failed. Please try again."
            });
        });
};

const login =(req,res)=>{
    const email = req.body.email;
    const password = req.body.password;

    if(!email || !password){
        return res.status(400).render("login",{
            isLoggedIn: req.isLoggedIn,
            message: "Email and password are required"
        });
    }

    User.findOne({email: email})
        .then((user)=>{
            if(!user){
                return res.status(400).render("login",{
                    isLoggedIn: req.isLoggedIn,
                    message: "Invalid email or password"
                });
            }

            if(!user.isEmailVerified){
                return res.status(400).render("login",{
                    isLoggedIn: req.isLoggedIn,
                    message: "Please verify your email first"
                });
            }

            return bcrypt.compare(password,user.password)
                .then((passwordMatches)=>{
                    if(!passwordMatches){
                        return res.status(400).render("login",{
                            isLoggedIn: req.isLoggedIn,
                            message: "Invalid email or password"
                        });
                    }

                    const token = jwt.sign(
                        { userId: user._id },
                        process.env.JWT_SECRET,
                        { expiresIn: "1d" }
                    );

                    res.cookie("token",token,{
                        httpOnly: true
                    });

                    return res.redirect("/products");
                });
        })
        .catch((error)=>{
            console.log("Login error:",error.message);

            return res.status(500).render("login",{
                isLoggedIn: req.isLoggedIn,
                message: "Login failed. Please try again."
            });
        });
};

const logout = (req,res)=>{
    res.clearCookie("token",{
        httpOnly: true
    });

    return res.redirect("/login");
};

const forgotPassword = (req,res)=>{
    const email = req.body.email;

    if(!email){
        return res.status(400).render("forgot-password",{
            isLoggedIn: req.isLoggedIn,
            message: "Email is required"
        });
    }

    User.findOne({email: email})
        .then((user)=>{
            const responseMessage = "If the account exists, a reset link will be sent.";

            if(!user){
                return res.render("forgot-password",{
                    isLoggedIn: req.isLoggedIn,
                    message: responseMessage
                });
            }

            const resetToken = crypto.randomBytes(32).toString("hex");
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

            return user.save()
                .then(()=>{
                    const resetLink = "http://localhost:3000/auth/reset-password?token=" + resetToken;

                   return sendEmail({
                        to: user.email,
                        subject: "Reset your password",
                        text: "Use this link within 15 minutes:\n" + resetLink
                    });
                })
                .then(()=>{
                    return res.render("forgot-password",{
                        isLoggedIn: req.isLoggedIn,
                        message: responseMessage
                    });
                })
                .catch((error)=>{
                    console.log("Reset email error:",error.message);

                    return res.status(500).render("forgot-password",{
                        isLoggedIn: req.isLoggedIn,
                        message: "Could not send the reset email. Please try again."
                    });
                });
        })
        .catch((error)=>{
            console.log("Forgot password error:",error.message);

            return res.status(500).render("forgot-password",{
                isLoggedIn: req.isLoggedIn,
                message: "Could not process your request. Please try again."
            });
        });
};

const resetPasswordPage =(req,res)=>{
    res.render("reset-password",{
        token: req.query.token,
        isLoggedIn: req.isLoggedIn,
        message: ""
    });
};

const resetPassword = (req,res)=>{
    const token = req.body.token;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    if(!token || !password || !confirmPassword){
        return res.status(400).render("reset-password",{
            token: token || "",
            isLoggedIn: req.isLoggedIn,
            message: "All fields are required."
        });
    }

    if(password !== confirmPassword){
        return res.status(400).render("reset-password",{
            token: token,
            isLoggedIn: req.isLoggedIn,
            message: "Passwords do not match."
        });
    }

    User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    })
        .then((user)=>{
            if(!user){
                return res.status(400).render("reset-password",{
                    token: "",
                    isLoggedIn: req.isLoggedIn,
                    message: "Reset link is invalid or expired."
                });
            }

            return bcrypt.hash(password,10)
                .then((hashedPassword)=>{
                    user.password = hashedPassword;
                    user.resetPasswordToken = null;
                    user.resetPasswordExpires = null;

                    return user.save();
                })
                .then(()=>{
                    return res.render("login",{
                        isLoggedIn: req.isLoggedIn,
                        message: "Password reset successfully. Please log in."
                    });
                });
        })
        .catch((error)=>{
            console.log("Reset password error:",error.message);

            return res.status(500).render("reset-password",{
                token: token,
                isLoggedIn: req.isLoggedIn,
                message: "Could not reset password. Please try again."
            });
        });
};

module.exports = {
    signup,
    verifyEmailPage,
    verifyEmail,
    login,
    logout,
    forgotPassword,
    resetPasswordPage,
    resetPassword
};
