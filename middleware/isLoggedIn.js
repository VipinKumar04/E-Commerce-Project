const jwt = require("jsonwebtoken");
const User = require("../models/User");

const isLoggedIn = (req,res,next)=>{
    req.isLoggedIn = false;

    jwt.verify(req.cookies.token,process.env.JWT_SECRET,(error,decodedToken)=>{
        if(error || !decodedToken || !decodedToken.userId){
            return next();
        }

        User.findById(decodedToken.userId)
            .then((user)=>{
                if(user && user.isEmailVerified){
                    req.user = user;
                    req.isLoggedIn = true;
                }
                next();
            })
            .catch((error)=>{
                console.log("Login status check error:",error.message);
                next();
            });
    });
};

module.exports = isLoggedIn;
