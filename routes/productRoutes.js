const express = require("express");
const { homePage,getProducts,productDetails } = require("../controllers/productController");

const router = express.Router();

router.get("/",homePage);
router.get("/api",getProducts);
router.get("/:id",productDetails);

module.exports = router;
