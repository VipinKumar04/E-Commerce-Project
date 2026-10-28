const adminMiddleware = (req,res,next)=>{
    if(req.user && req.user.isAdmin){
        return next();
    }

    return res.status(403).send("Admin access only.");
};

module.exports = adminMiddleware;