const mongoose = require("mongoose");

const connectDB=()=>{
    mongoose.connect(process.env.MONGO_URI)
        .then(()=>{
            console.log("MongoDB connected successfully");
        })
        .catch((error)=>{
            console.log("MongoDB connection error:",error.message);
        });
};

module.exports = connectDB;
