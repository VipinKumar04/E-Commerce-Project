const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = (req,res,next)=>{
    if(req.user){
        return next();
    }

    if(!req.cookies || !req.cookies.token){
        return res.redirect("/login");
    }

    jwt.verify(req.cookies.token,process.env.JWT_SECRET,(error,decodedToken)=>{
        if(error || !decodedToken || !decodedToken.userId){
            res.clearCookie("token",{
                httpOnly: true
            });

            return res.redirect("/login");
        }

        User.findById(decodedToken.userId)
            .then((user)=>{
                if(!user || !user.isEmailVerified){
                    res.clearCookie("token",{
                        httpOnly: true
                    });

                    return res.redirect("/login");
                }

                req.user = user;
                next();
            })
            .catch((error)=>{
                console.log("Authentication database error:",error.message);

                return res.status(500).send("Authentication error. Please try again.");
            });
    });
};

module.exports = authMiddleware;
